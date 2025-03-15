import { Allocation } from '../../models/types';
import { createLogger } from '../../utils/logger';
import { AzHelper, ProviderDetector } from '../utils/cloud';
import { CidrTracker } from '../utils/tracking';
import { 
  CidrError, 
  calculateOptimalPrefixLength, 
  subdivideIpv4Cidr 
} from '../utils/cidr';
import { AllocationError } from '../common/errors';
import { SubnetAllocator } from './subnet';

// Create logger instance for the region allocator
const logger = createLogger('RegionAllocator');

/**
 * Internal subnet type interface used for allocation
 */
interface InternalSubnetType {
  name: string;
  prefixLength: number;
}

/**
 * Class responsible for allocating CIDR blocks for regions and AZs.
 */
export class RegionAllocator {
  /**
   * Calculates CIDR blocks for regions.
   * 
   * @param accountName Name of the account (for logging)
   * @param regions Array of region names
   * @param baseCidr Base CIDR to allocate from
   * @param specifiedRegionPrefix Optional specified region prefix
   * @returns The calculated region prefix length and CIDR blocks
   */
  public static calculateRegionalCidrs(
    accountName: string,
    regions: string[],
    baseCidr: string,
    specifiedRegionPrefix?: number
  ): { regionPrefixLength: number; regionCidrs: string[] } {
    const regionCount = regions.length;
    
    try {
      // Calculate optimal prefix for regions if not specified
      const regionPrefixLength = specifiedRegionPrefix || 
        calculateOptimalPrefixLength(baseCidr, regionCount);
      
      // Divide the account CIDR into region blocks
      const regionCidrs = subdivideIpv4Cidr(baseCidr, regionPrefixLength);
      
      return { regionPrefixLength, regionCidrs };
    } catch (error) {
      RegionAllocator.handleCidrError(
        error, 
        `Failed to calculate regional CIDRs for account ${accountName}`
      );
      
      // This line won't be reached due to the error handling, but TypeScript requires it
      return { regionPrefixLength: 0, regionCidrs: [] };
    }
  }

  /**
   * Calculates CIDR blocks for availability zones within a region.
   * 
   * @param accountName Name of the account (for logging)
   * @param regionName Name of the region
   * @param regionCidr CIDR block for the region
   * @param azCount Number of AZs to allocate
   * @param specifiedAzPrefix Optional specified AZ prefix
   * @returns The calculated AZ data including names and CIDR blocks
   */
  public static calculateAzCidrs(
    accountName: string,
    regionName: string,
    regionCidr: string,
    azCount: number,
    specifiedAzPrefix?: number
  ): { azPrefixLength: number; azCidrs: string[]; azNames: string[] } {
    try {
      // Calculate optimal prefix for AZs if not specified
      const azPrefixLength = specifiedAzPrefix ||
        calculateOptimalPrefixLength(regionCidr, azCount);
      
      logger.debug(`Using AZ prefix length /${azPrefixLength} for region ${regionName}`);
      
      // Divide the region CIDR into AZ blocks
      const azCidrs = subdivideIpv4Cidr(regionCidr, azPrefixLength);
      logger.debug(`Subdivided ${regionCidr} into ${azCidrs.length} AZ CIDRs`);
      
      // Generate AZ names
      const azNames = AzHelper.generateNames(regionName, azCount);
      
      return { azPrefixLength, azCidrs, azNames };
    } catch (error) {
      RegionAllocator.handleCidrError(
        error, 
        `Failed to calculate AZ CIDRs for region ${regionName} in account ${accountName}`
      );
      
      // This line won't be reached due to the error handling, but TypeScript requires it
      return { azPrefixLength: 0, azCidrs: [], azNames: [] };
    }
  }

  /**
   * Processes regions for an account or cloud configuration.
   * 
   * @param accountName Name of the account
   * @param regions Array of region names
   * @param baseCidr Base CIDR to allocate from
   * @param cidrTracker Tracker for allocated CIDRs
   * @param subnetTypes Array of subnet types to allocate
   * @param provider Optional cloud provider name
   * @param regionPrefix Optional region prefix length
   * @param azPrefix Optional AZ prefix length
   * @param allocations Optional array to append allocations to
   */
  public static processRegions(
    accountName: string,
    regions: string[],
    baseCidr: string,
    cidrTracker: CidrTracker,
    subnetTypes: InternalSubnetType[],
    provider?: string,
    regionPrefix?: number,
    azPrefix?: number,
    allocations?: Allocation[]
  ): void {
    // Skip if no regions
    if (regions.length === 0) {
      logger.warn(`No regions specified for account ${accountName}, skipping`);
      return;
    }
    
    // Calculate regional CIDR blocks
    const { regionPrefixLength, regionCidrs } = RegionAllocator.calculateRegionalCidrs(
      accountName, regions, baseCidr, regionPrefix
    );
    
    logger.debug(`Using region prefix length /${regionPrefixLength} for account ${accountName}`);
    logger.debug(`Subdivided ${baseCidr} into ${regionCidrs.length} region CIDRs`);
    
    // Process each region
    RegionAllocator.processRegionalAllocations(
      accountName,
      regions,
      regionCidrs,
      baseCidr,
      cidrTracker,
      subnetTypes,
      provider,
      azPrefix,
      allocations
    );
  }

  /**
   * Processes allocations for multiple regions.
   * 
   * @param accountName Name of the account
   * @param regions Array of region names
   * @param regionCidrs Array of CIDR blocks for regions
   * @param baseCidr Base CIDR (for VPC)
   * @param cidrTracker Tracker for allocated CIDRs
   * @param subnetTypes Array of subnet types to allocate
   * @param provider Optional cloud provider name
   * @param azPrefix Optional AZ prefix length
   * @param allocations Optional array to append allocations to
   */
  private static processRegionalAllocations(
    accountName: string,
    regions: string[],
    regionCidrs: string[],
    baseCidr: string,
    cidrTracker: CidrTracker,
    subnetTypes: InternalSubnetType[],
    provider?: string,
    azPrefix?: number,
    allocations?: Allocation[]
  ): void {
    try {
      // Standard number of AZs per region
      const azCount = 3;
      
      // Allocate for each region
      for (let i = 0; i < regions.length; i++) {
        const regionName = regions[i];
        const regionCidr = regionCidrs[i];
        
        logger.debug(`Allocating CIDR ${regionCidr} for region ${regionName} in account ${accountName}`);
        
        // Store that we've allocated this CIDR
        cidrTracker.add(regionCidr);
        
        // Calculate AZ CIDRs
        const azData = RegionAllocator.calculateAzCidrs(
          accountName, regionName, regionCidr, azCount, azPrefix
        );
        
        // Process each AZ
        RegionAllocator.processAzAllocations(
          accountName,
          `${accountName}-vpc`,
          provider || ProviderDetector.detect(regionName),
          regionName,
          azData.azNames,
          azData.azCidrs,
          regionCidr,
          baseCidr,
          cidrTracker,
          subnetTypes,
          allocations
        );
      }
    } catch (error) {
      RegionAllocator.handleCidrError(
        error, 
        `Failed to process regional allocations for account ${accountName}`
      );
    }
  }

  /**
   * Processes allocations for multiple availability zones.
   * 
   * @param accountName Name of the account
   * @param vpcName Name of the VPC
   * @param provider Cloud provider name
   * @param regionName Name of the region
   * @param azNames Array of AZ names
   * @param azCidrs Array of CIDR blocks for AZs
   * @param regionCidr CIDR block for the region
   * @param vpcCidr CIDR block for the VPC
   * @param cidrTracker Tracker for allocated CIDRs
   * @param subnetTypes Array of subnet types to allocate
   * @param allocations Optional array to append allocations to
   */
  private static processAzAllocations(
    accountName: string,
    vpcName: string,
    provider: string,
    regionName: string,
    azNames: string[],
    azCidrs: string[],
    regionCidr: string,
    vpcCidr: string,
    cidrTracker: CidrTracker,
    subnetTypes: InternalSubnetType[],
    allocations?: Allocation[]
  ): void {
    // Process each AZ
    for (let j = 0; j < azNames.length; j++) {
      const azName = azNames[j];
      const azCidr = azCidrs[j];
      
      logger.debug(`Allocating CIDR ${azCidr} for AZ ${azName} in region ${regionName}`);
      
      // Store that we've allocated this CIDR
      cidrTracker.add(azCidr);
      
      // Process subnets for this AZ
      RegionAllocator.processAzSubnets(
        accountName,
        vpcName,
        provider,
        regionName,
        azName,
        regionCidr,
        vpcCidr,
        azCidr,
        cidrTracker,
        subnetTypes,
        allocations
      );
    }
  }

  /**
   * Processes subnets for an availability zone.
   * 
   * @param accountName Name of the account
   * @param vpcName Name of the VPC
   * @param provider Cloud provider name
   * @param regionName Name of the region
   * @param azName Name of the availability zone
   * @param regionCidr CIDR block for the region
   * @param vpcCidr CIDR block for the VPC
   * @param azCidr CIDR block for the availability zone
   * @param cidrTracker Tracker for allocated CIDRs
   * @param subnetTypes Array of subnet types to allocate
   * @param allocations Optional array to append allocations to
   */
  private static processAzSubnets(
    accountName: string,
    vpcName: string,
    provider: string,
    regionName: string,
    azName: string,
    regionCidr: string,
    vpcCidr: string,
    azCidr: string,
    cidrTracker: CidrTracker,
    subnetTypes: InternalSubnetType[],
    allocations?: Allocation[]
  ): void {
    // Extract the AZ prefix length from the CIDR
    const azPrefixLength = parseInt(azCidr.split('/')[1], 10);
    logger.debug(`AZ prefix length: ${azPrefixLength}`);

    // Sort subnet types by prefix length (largest networks first)
    // This ensures we allocate larger networks before smaller ones to optimize space usage
    const sortedSubnetTypes = [...subnetTypes].sort((a, b) => a.prefixLength - b.prefixLength);
    
    // Start with the entire AZ as available space
    let remainingSpace = [azCidr];
    
    // Process each subnet type
    for (const subnetType of sortedSubnetTypes) {
      remainingSpace = SubnetAllocator.allocateSubnet(
        accountName,
        vpcName,
        provider,
        regionName,
        azName,
        regionCidr,
        vpcCidr,
        azCidr,
        azPrefixLength,
        subnetType,
        remainingSpace,
        cidrTracker,
        allocations
      );
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
    if (error instanceof CidrError) {
      logger.error(`CIDR allocation error: ${context}: ${error.message}`);
      throw new AllocationError(`${context}: ${error.message}`);
    }
    
    logger.error(`Unexpected error during CIDR allocation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error instanceof Error 
      ? new AllocationError(`${context}: ${error.message}`) 
      : new AllocationError(`${context}: Unknown error`);
  }
} 