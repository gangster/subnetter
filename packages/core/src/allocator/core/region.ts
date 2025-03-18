import { createLogger } from '../../utils/logger';
import { ProviderDetector } from '../utils/cloud/provider';
import { CidrTracker } from '../utils/tracking';
import { 
  calculateOptimalPrefixLength, 
  subdivideIpv4Cidr,
  calculateUsableIps
} from '../utils/cidr/calculator';
import { AllocationError, ErrorCode } from '../../utils/errors';
import { Allocation } from '../../models/types';

// Create logger instance for the region allocator
const logger = createLogger('RegionAllocator');

// Internal representation of a subnet type for allocation purposes
interface SubnetType {
  name: string;
  prefixLength: number;
}

/**
 * Utility class for allocating subnets within regions.
 */
export class RegionAllocator {
  /**
   * Processes a list of regions for an account.
   * 
   * @param accountName The account name
   * @param regions The list of regions to process
   * @param baseCidr The base CIDR for the VPC
   * @param cidrTracker A tracker for allocated CIDRs
   * @param subnetTypes The subnet types to allocate
   * @param provider The cloud provider name
   * @param regionPrefixLength Optional prefix length for regions
   * @param azPrefixLength Optional prefix length for availability zones
   * @param allocations Array to append allocations to
   */
  public static processRegions(
    accountName: string,
    regions: string[],
    baseCidr: string,
    cidrTracker: CidrTracker,
    subnetTypes: SubnetType[],
    provider: string,
    regionPrefixLength?: number,
    azPrefixLength?: number,
    allocations?: Allocation[]
  ): Allocation[] {
    // Local array if none provided
    const result = allocations || [];
    
    logger.debug(`Processing ${regions.length} regions for account ${accountName}`);
    
    // Process each region
    regions.forEach((regionName, index) => {
      try {
        // If the provider is explicitly specified, use it.
        // Otherwise, try to detect from the region name
        const effectiveProvider = provider || ProviderDetector.detect(regionName);
        
        // Calculate region CIDR and AZ CIDRs
        const regionCidr = this.calculateRegionCidr(
          baseCidr, 
          regionName, 
          index, 
          regionPrefixLength, 
          cidrTracker
        );
        
        // Get AZ names for this region
        const azNames = this.getAzNames(regionName, effectiveProvider);
        
        // Calculate AZ CIDRs for this region
        const azCidrs = this.calculateAzCidrs(
          regionCidr, 
          azNames.length, 
          azPrefixLength, 
          cidrTracker
        );
        
        // Allocate CIDRs for each AZ in the region
        const regionAllocations = allocateCidrsForRegion(
          accountName,
          regionName,
          regionCidr,
          baseCidr,
          azNames,
          azCidrs,
          subnetTypes,
          cidrTracker,
          effectiveProvider
        );
        
        // Add allocations to result
        result.push(...regionAllocations);
      } catch (error) {
        // Log the error and continue with next region
        if (error instanceof Error) {
          logger.error(`Error processing region ${regionName}: ${error.message}`);
        } else {
          logger.error(`Unknown error processing region ${regionName}`);
        }
        
        // Only rethrow AllocationErrors, swallow others
        if (error instanceof AllocationError) {
          throw error;
        }
      }
    });
    
    return result;
  }
  
  /**
   * Calculates the CIDR for a region.
   * 
   * @param baseCidr The base CIDR for the VPC
   * @param regionName The region name
   * @param regionIndex The index of the region
   * @param regionPrefixLength Optional prefix length for regions
   * @param cidrTracker A tracker for allocated CIDRs
   * @returns The CIDR for the region
   * @private
   */
  private static calculateRegionCidr(
    baseCidr: string,
    regionName: string,
    regionIndex: number,
    regionPrefixLength?: number,
    cidrTracker?: CidrTracker
  ): string {
    logger.debug(`Calculating CIDR for region ${regionName} with index ${regionIndex}`);
    
    // Parse the base CIDR
    const [, basePrefixStr] = baseCidr.split('/');
    const basePrefix = parseInt(basePrefixStr, 10);
    
    // Calculate effective prefix
    const effectivePrefix = regionPrefixLength || basePrefix + 4; // Default to base + 4
    
    // Calculate how many regions we can accommodate
    const maxRegions = Math.pow(2, effectivePrefix - basePrefix);
    
    // Check if region index is within bounds
    if (regionIndex >= maxRegions) {
      throw new AllocationError(
        `Region index ${regionIndex} exceeds maximum available regions (${maxRegions})`,
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
        {
          baseCidr,
          regionName,
          regionIndex,
          effectivePrefix,
          maxRegions
        }
      );
    }
    
    // Subdivide base CIDR into region-sized blocks
    const regionCidrs = subdivideIpv4Cidr(baseCidr, effectivePrefix);
    const regionCidr = regionCidrs[regionIndex];
    
    // Check if already allocated
    if (cidrTracker && cidrTracker.has(regionCidr)) {
      throw new AllocationError(
        `CIDR ${regionCidr} already allocated`,
        ErrorCode.CIDR_ALREADY_ALLOCATED,
        {
          regionName,
          cidr: regionCidr
        }
      );
    }
    
    // Track allocation
    if (cidrTracker) {
      cidrTracker.add(regionCidr);
    }
    
    logger.debug(`Allocated CIDR ${regionCidr} for region ${regionName}`);
    return regionCidr;
  }
  
  /**
   * Calculate CIDRs for availability zones.
   * 
   * @param regionCidr The CIDR for the region
   * @param azCount The number of AZs
   * @param azPrefixLength Optional prefix length for AZs
   * @param cidrTracker A tracker for allocated CIDRs
   * @returns An array of AZ CIDRs
   * @private
   */
  private static calculateAzCidrs(
    regionCidr: string,
    azCount: number,
    azPrefixLength?: number,
    cidrTracker?: CidrTracker
  ): string[] {
    logger.debug(`Calculating ${azCount} AZ CIDRs for region CIDR ${regionCidr}`);
    
    // Calculate optimal prefix based on AZ count
    const calculatedPrefix = calculateOptimalPrefixLength(regionCidr, azCount);
    
    // Use provided prefix or calculated one, whichever is larger
    const effectivePrefix = azPrefixLength ? 
      Math.max(calculatedPrefix, azPrefixLength) : 
      calculatedPrefix;
    
    // Check if the prefix is valid
    if (effectivePrefix > 30) {
      throw new AllocationError(
        `Effective AZ prefix length ${effectivePrefix} is too large (max 30)`,
        ErrorCode.INVALID_PREFIX_LENGTH,
        {
          regionCidr,
          azCount,
          effectivePrefix
        }
      );
    }
    
    // Subdivide region CIDR into AZ-sized blocks
    const azCidrs = subdivideIpv4Cidr(regionCidr, effectivePrefix);
    
    // Check if we have enough AZ CIDRs
    if (azCidrs.length < azCount) {
      throw new AllocationError(
        `Not enough address space for ${azCount} AZs in CIDR ${regionCidr}`,
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
        {
          regionCidr,
          azCount,
          availableCidrs: azCidrs.length
        }
      );
    }
    
    // Take the required number of AZ CIDRs
    const result = azCidrs.slice(0, azCount);
    
    // Track allocations
    if (cidrTracker) {
      result.forEach(cidr => {
        if (cidrTracker.has(cidr)) {
          throw new AllocationError(
            `CIDR ${cidr} already allocated`,
            ErrorCode.CIDR_ALREADY_ALLOCATED,
            {
              cidr
            }
          );
        }
        cidrTracker.add(cidr);
      });
    }
    
    logger.debug(`Allocated ${result.length} AZ CIDRs: ${result.join(', ')}`);
    return result;
  }
  
  /**
   * Generate AZ names for a region.
   * 
   * @param regionName The region name
   * @param providerName The cloud provider name
   * @returns An array of AZ names
   * @private
   */
  private static getAzNames(regionName: string, providerName: string): string[] {
    // For AWS, AZs are region + letters (a, b, c, etc.)
    if (providerName === 'aws') {
      return ['a', 'b', 'c', 'd', 'e', 'f'].map(letter => 
        `${regionName}${letter}`
      ).slice(0, 3); // Default to 3 AZs
    }
    
    // For Azure, AZs are numbered (1, 2, 3)
    if (providerName === 'azure') {
      const azNames = [];
      for (let i = 1; i <= 3; i++) {
        azNames.push(`${regionName}${i}`);
      }
      return azNames;
    }
    
    // For GCP, AZs are region + -a, -b, -c
    if (providerName === 'gcp') {
      return ['a', 'b', 'c'].map(letter => 
        `${regionName}-${letter}`
      );
    }
    
    // Default: just append numbers
    logger.warn(`Unknown provider ${providerName}, using generic AZ naming`);
    const azNames = [];
    for (let i = 1; i <= 3; i++) {
      azNames.push(`${regionName}-az${i}`);
    }
    return azNames;
  }
}

/**
 * Allocates CIDR blocks for subnets within a region, ensuring no overlaps.
 * 
 * @param accountName The account name
 * @param regionName The region name
 * @param regionCidr The CIDR for the region
 * @param baseCidr The base CIDR for the VPC
 * @param azNames The availability zone names
 * @param azCidrs The CIDRs for each availability zone
 * @param subnetTypes The subnet types and their prefix lengths
 * @param cidrTracker A tracker for allocated CIDRs
 * @param provider Cloud provider name
 * @returns An array of subnet allocations
 */
export function allocateCidrsForRegion(
  accountName: string,
  regionName: string,
  regionCidr: string,
  baseCidr: string,
  azNames: string[],
  azCidrs: string[],
  subnetTypes: SubnetType[],
  cidrTracker: CidrTracker,
  provider: string
): Allocation[] {
  const allocations: Allocation[] = [];
  
  try {
    logger.debug(`Allocating CIDRs for region ${regionName} in account ${accountName}`);
    
    // First check if we have the same number of AZs and CIDRs
    if (azNames.length !== azCidrs.length) {
      throw new AllocationError(
        `Mismatch between AZ names (${azNames.length}) and CIDRs (${azCidrs.length})`,
        ErrorCode.INVALID_OPERATION,
        {
          accountName,
          regionName,
          azNames,
          azCidrs
        }
      );
    }
    
    // Process each AZ
    for (let j = 0; j < azNames.length; j++) {
      const azName = azNames[j];
      const azCidr = azCidrs[j];
      
      if (!azCidr) {
        throw new AllocationError(
          `No CIDR available for AZ ${azName} at index ${j}. Available CIDRs: ${azCidrs.join(', ')}`,
          ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
          {
            accountName,
            regionName,
            azName,
            azIndex: j,
            availableCidrs: azCidrs
          }
        );
      }
      
      logger.debug(`Allocating CIDR ${azCidr} for AZ ${azName} in region ${regionName}`);
      
      // Store that we've allocated this CIDR
      cidrTracker.add(azCidr);
      
      // Set up basic allocation properties
      const vpcName = `${accountName}-vpc`;
      
      // Special case: If there's only one subnet type, assign the whole AZ CIDR to it
      if (subnetTypes.length === 1) {
        const subnetType = subnetTypes[0];
        const [azIp, azPrefixStr] = azCidr.split('/');
        const azPrefix = parseInt(azPrefixStr, 10);
        const effectivePrefix = Math.max(subnetType.prefixLength, azPrefix);
        
        const allocation: Allocation = {
          accountName,
          vpcName,
          cloudProvider: provider,
          regionName,
          availabilityZone: azName,
          regionCidr,
          vpcCidr: baseCidr,
          azCidr,
          subnetCidr: azPrefix === effectivePrefix ? azCidr : `${azIp}/${effectivePrefix}`,
          subnetRole: subnetType.name,
          usableIps: calculateUsableIps(`${azIp}/${effectivePrefix}`)
        };
        
        allocations.push(allocation);
        logger.debug(`Allocated ${allocation.subnetCidr} to ${subnetType.name} in AZ ${azName} (single subnet type)`);
        continue;
      }
      
      // For multiple subnet types:
      // Determine the number of equal subdivisions we need to create
      const targetSubdivisionCount = subnetTypes.length;
      
      // Calculate the optimal prefix length for dividing the AZ CIDR evenly
      const subdivisionPrefix = calculateOptimalPrefixLength(azCidr, targetSubdivisionCount);
      
      // Check if we can fit all subnet types
      if (subdivisionPrefix > 30) {
        logger.warn(`Cannot optimally subdivide AZ CIDR ${azCidr} to fit ${targetSubdivisionCount} subnet types. Using max prefix length of 30.`);
      }
      
      // Create equal-sized subdivisions from the AZ CIDR
      const actualSubdivisionPrefix = Math.min(subdivisionPrefix, 30);
      const azSubdivisions = subdivideIpv4Cidr(azCidr, actualSubdivisionPrefix);
      
      logger.debug(`Subdivided AZ CIDR ${azCidr} into ${azSubdivisions.length} blocks with prefix /${actualSubdivisionPrefix}`);
      
      // Ensure we have enough subdivisions
      if (azSubdivisions.length < targetSubdivisionCount) {
        logger.warn(`Could not create enough subdivisions (${azSubdivisions.length}) for all subnet types (${targetSubdivisionCount}). Some subnet types will not be allocated.`);
      }
      
      // Assign each subnet type to a different subdivision
      // This ensures non-overlapping CIDRs
      for (let k = 0; k < Math.min(subnetTypes.length, azSubdivisions.length); k++) {
        const subnetType = subnetTypes[k];
        const baseSubnetCidr = azSubdivisions[k]; // Each subnet type gets a different subdivision
        
        // If the subnet type needs a smaller subnet than the subdivision, use the first part
        const [subnetIp, subnetPrefixStr] = baseSubnetCidr.split('/');
        const subnetPrefix = parseInt(subnetPrefixStr, 10);
        const effectivePrefix = Math.max(subnetType.prefixLength, subnetPrefix);
        
        // The final subnet CIDR
        const finalSubnetCidr = effectivePrefix === subnetPrefix 
          ? baseSubnetCidr 
          : `${subnetIp}/${effectivePrefix}`;
        
        // Create the allocation
        const allocation: Allocation = {
          accountName,
          vpcName,
          cloudProvider: provider,
          regionName,
          availabilityZone: azName,
          regionCidr,
          vpcCidr: baseCidr,
          azCidr,
          subnetCidr: finalSubnetCidr,
          subnetRole: subnetType.name,
          usableIps: calculateUsableIps(finalSubnetCidr)
        };
        
        // Add to results and track allocation
        allocations.push(allocation);
        cidrTracker.add(finalSubnetCidr);
        
        logger.debug(`Allocated ${finalSubnetCidr} to ${subnetType.name} in AZ ${azName}`);
      }
      
      // If we couldn't allocate all subnet types, log a warning
      if (subnetTypes.length > azSubdivisions.length) {
        const unallocatedTypes = subnetTypes.slice(azSubdivisions.length)
          .map(t => t.name)
          .join(', ');
        
        logger.warn(`Could not allocate space for subnet types: ${unallocatedTypes} in AZ ${azName}`);
      }
    }
    
    return allocations;
  } catch (error) {
    if (error instanceof AllocationError) {
      throw error;
    }
    
    logger.error(`Error allocating CIDRs for region ${regionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new AllocationError(
      `Error allocating CIDRs for region ${regionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ErrorCode.UNKNOWN_ERROR,
      {
        accountName,
        regionName,
        rawError: error
      }
    );
  }
}