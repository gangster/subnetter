import { Allocation } from '../../models/types';
import { createLogger } from '../../utils/logger';
import { CidrTracker } from '../utils/tracking';
import { 
  calculateUsableIps, 
  subdivideIpv4Cidr 
} from '../utils/cidr';
import { AllocationError, ErrorCode } from '../../utils/errors';

// Create logger instance for the subnet allocator
const logger = createLogger('SubnetAllocator');

/**
 * Internal subnet type interface used for allocation
 */
interface InternalSubnetType {
  name: string;
  prefixLength: number;
}

/**
 * Class responsible for allocating subnets within availability zones.
 */
export class SubnetAllocator {
  /**
   * Calculates the effective prefix length for a subnet.
   * 
   * @param subnetType Name of the subnet type
   * @param prefixLength Desired prefix length
   * @param azPrefixLength AZ's prefix length
   * @returns The effective prefix length to use
   */
  public static calculateEffectivePrefixLength(
    subnetType: string,
    prefixLength: number,
    azPrefixLength: number
  ): number {
    let effectivePrefixLength = prefixLength;
    
    if (effectivePrefixLength < azPrefixLength) {
      logger.warn(`Subnet type ${subnetType} specifies prefix length ${prefixLength} which is less than AZ prefix length ${azPrefixLength}. Using AZ prefix length instead.`);
      effectivePrefixLength = azPrefixLength;
    }
    
    logger.debug(`Using effective prefix length ${effectivePrefixLength} for subnet type ${subnetType}`);
    return effectivePrefixLength;
  }

  /**
   * Subdivides a CIDR block for a subnet allocation.
   * 
   * @param subnetCidr The CIDR block to subdivide
   * @param effectivePrefixLength Desired prefix length
   * @param subnetType Name of the subnet type
   * @param azName Name of the AZ
   * @returns The allocated CIDR and updated remaining space
   */
  public static subdivideForSubnet(
    subnetCidr: string,
    effectivePrefixLength: number,
    subnetType: string,
    azName: string
  ): { allocatedCidr: string; updatedSpace: string[] } {
    // Allocate the subnet with the desired prefix length
    let allocatedCidr = subnetCidr;
    const currentPrefix = parseInt(subnetCidr.split('/')[1], 10);
    let updatedSpace: string[] = [];
    
    // Only subdivide if the effective prefix length is different from the current prefix
    if (effectivePrefixLength !== currentPrefix) {
      logger.debug(`Subdividing ${subnetCidr} into /${effectivePrefixLength} blocks for subnet type ${subnetType}`);
      try {
        const subdivided = subdivideIpv4Cidr(subnetCidr, effectivePrefixLength);
        allocatedCidr = subdivided[0]; // Take the first block
        
        // Add the remaining blocks back to the available space
        if (subdivided.length > 1) {
          updatedSpace = subdivided.slice(1);
          logger.debug(`Added ${subdivided.length - 1} remaining blocks back to available space`);
        }
      } catch (error) {
        SubnetAllocator.handleCidrError(
          error, 
          `Failed to allocate CIDR for subnet type ${subnetType} in AZ ${azName}`
        );
      }
    } else {
      logger.debug(`Using existing block ${subnetCidr} for subnet type ${subnetType} (no subdivision needed)`);
    }
    
    return { allocatedCidr, updatedSpace };
  }

  /**
   * Allocates a subnet within an availability zone.
   * 
   * @param accountName Name of the account
   * @param vpcName Name of the VPC (generated from region)
   * @param provider Cloud provider name
   * @param regionName Name of the region
   * @param azName Name of the availability zone
   * @param regionCidr CIDR of the region
   * @param vpcCidr CIDR of the VPC
   * @param azCidr CIDR of the availability zone
   * @param azPrefixLength Prefix length of the AZ
   * @param subnetType Subnet type to allocate
   * @param remainingSpace Array of remaining CIDR blocks
   * @param cidrTracker Tracker for CIDR allocations
   * @param allocations Optional array to append allocations to
   * @returns Updated array of remaining CIDR blocks
   */
  public static allocateSubnet(
    accountName: string,
    vpcName: string,
    provider: string,
    regionName: string,
    azName: string,
    regionCidr: string,
    vpcCidr: string,
    azCidr: string,
    azPrefixLength: number,
    subnetType: InternalSubnetType,
    remainingSpace: string[],
    cidrTracker: CidrTracker,
    allocations?: Allocation[]
  ): string[] {
    const type = subnetType.name;
    const prefixLength = subnetType.prefixLength;
    
    try {
      // Ensure there's space left
      if (remainingSpace.length === 0) {
        logger.warn(`No remaining space in AZ ${azName} for subnet type ${type}`);
        throw new AllocationError(`No remaining space in AZ ${azName} for subnet type ${type}`);
      }
      
      // Calculate effective prefix length
      const effectivePrefixLength = SubnetAllocator.calculateEffectivePrefixLength(
        type, prefixLength, azPrefixLength
      );
      
      // Take a block from the remaining space
      const subnetCidr = remainingSpace.shift();
      
      if (!subnetCidr) {
        throw new Error(`No remaining space available for subnet allocation in ${azName}`);
      }
      
      // Allocate the subnet
      const { allocatedCidr, updatedSpace } = SubnetAllocator.subdivideForSubnet(
        subnetCidr, effectivePrefixLength, type, azName
      );
      
      // Update remaining space
      remainingSpace.push(...updatedSpace);
      
      // Store that we've allocated this CIDR
      cidrTracker.add(allocatedCidr);
      
      // Calculate usable IPs
      const usableIps = calculateUsableIps(allocatedCidr);
      
      // Store the allocation
      allocations?.push({
        accountName,
        vpcName,
        cloudProvider: provider,
        regionName,
        availabilityZone: azName,
        regionCidr,
        vpcCidr,
        azCidr,
        subnetCidr: allocatedCidr,
        subnetRole: type,
        usableIps
      });
      
      logger.debug(`Successfully allocated subnet ${type} in ${azName} with ${usableIps} usable IPs`);
      
      return remainingSpace;
    } catch (error) {
      SubnetAllocator.handleCidrError(
        error, 
        `Failed to allocate subnet ${type} in AZ ${azName}`
      );
      
      // This won't be reached due to the error handler, but TypeScript needs it
      return remainingSpace;
    }
  }

  /**
   * Handles CIDR-related errors consistently.
   * 
   * @param error The error to handle
   * @param context Context information about the operation that failed
   * @throws {AllocationError} Always throws an AllocationError with context
   */
  private static handleCidrError(error: unknown, context: string): never {
    if (error instanceof AllocationError) {
      // If it's already an AllocationError, just rethrow it
      throw error;
    }
    
    if (error instanceof Error) {
      logger.error(`CIDR allocation error: ${context}: ${error.message}`);
      throw new AllocationError(
        `${context}: ${error.message}`,
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
        { context, originalError: error.message }
      );
    }
    
    logger.error(`Unexpected error during CIDR allocation: Unknown error`);
    throw new AllocationError(
      `${context}: Unknown error`,
      ErrorCode.UNKNOWN_ERROR,
      { context }
    );
  }
} 