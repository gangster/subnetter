import { Allocation } from '../../models/types';
import { createLogger } from '../../utils/logger';
import { AzHelper, ProviderDetector } from '../utils/cloud';
import { CidrTracker } from '../utils/tracking';
import { 
  calculateOptimalPrefixLength, 
  subdivideIpv4Cidr,
  calculateUsableIps
} from '../utils/cidr';
import { AllocationError, ErrorCode } from '../../utils/errors';

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
 * Class responsible for allocating CIDR blocks at the region and AZ level.
 */
export class RegionAllocator {
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
    allocations: Allocation[] = []
  ): void {
    // Skip if no regions
    if (regions.length === 0) {
      logger.warn(`No regions specified for account ${accountName}, skipping`);
      return;
    }
    
    try {
      // Calculate optimal prefix for regions if not specified
      const regionPrefixLength = regionPrefix || 
        calculateOptimalPrefixLength(baseCidr, regions.length);
      
      logger.debug(`Using region prefix length /${regionPrefixLength} for account ${accountName}`);
      
      // Divide the account CIDR into region blocks
      const regionCidrs = subdivideIpv4Cidr(baseCidr, regionPrefixLength);
      logger.debug(`Subdivided ${baseCidr} into ${regionCidrs.length} region CIDRs`);
      
      // Standard number of AZs per region
      const azCount = 3;
      
      // Allocate for each region
      for (let i = 0; i < regions.length; i++) {
        const regionName = regions[i];
        const regionCidr = regionCidrs[i];
        
        if (!regionCidr) {
          throw new AllocationError(
            `No CIDR available for region ${regionName} at index ${i}. Available CIDRs: ${regionCidrs.join(', ')}`,
            ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
            {
              accountName,
              regionName,
              regionIndex: i,
              availableCidrs: regionCidrs
            }
          );
        }
        
        logger.debug(`Allocating CIDR ${regionCidr} for region ${regionName} in account ${accountName}`);
        
        // Store that we've allocated this CIDR
        cidrTracker.add(regionCidr);
        
        // Calculate the optimal prefix length for AZs
        const azPrefixLength = azPrefix || 
          calculateOptimalPrefixLength(regionCidr, azCount);
        logger.debug(`Using AZ prefix length /${azPrefixLength} for region ${regionName}`);
        
        // Divide the region CIDR into AZ CIDRs
        const azCidrs = subdivideIpv4Cidr(regionCidr, azPrefixLength);
        logger.debug(`Subdivided ${regionCidr} into ${azCidrs.length} AZ CIDRs`);
        
        // Generate AZ names
        const azNames = AzHelper.generateNames(regionName, azCount);
        
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
          
          // Extract the AZ prefix length from the CIDR
          const actualAzPrefixLength = parseInt(azCidr.split('/')[1], 10);
          
          // Use the SubnetAllocator to process subnets for this AZ
          const currentProvider = provider || ProviderDetector.detect(regionName);
          const vpcName = `${accountName}-vpc`;
          
          // Process each subnet type
          for (const subnetType of subnetTypes) {
            // Create allocation
            const allocation: Allocation = {
              accountName,
              vpcName,
              cloudProvider: currentProvider,
              regionName,
              availabilityZone: azName,
              regionCidr,
              vpcCidr: baseCidr,
              azCidr,
              subnetCidr: '', // Will be calculated below
              cidr: '', // Legacy field, same as subnetCidr
              subnetRole: subnetType.name,
              usableIps: 0 // Will be calculated below
            };
            
            // Calculate subnet CIDR
            try {
              // Calculate the effective prefix length for this subnet
              const subnetPrefix = Math.max(subnetType.prefixLength, actualAzPrefixLength);
              
              // Calculate the subnet CIDR
              const subnetCidrs = subdivideIpv4Cidr(azCidr, subnetPrefix);
              allocation.subnetCidr = subnetCidrs[0];
              allocation.cidr = subnetCidrs[0]; // Legacy field
              
              // Calculate usable IPs
              allocation.usableIps = calculateUsableIps(allocation.subnetCidr);
              
              // Add the allocation
              allocations.push(allocation);
              
              // Track the CIDR
              cidrTracker.add(allocation.subnetCidr);
              
              logger.debug(`Added allocation for ${subnetType.name} subnet in AZ ${azName}: ${allocation.subnetCidr}`);
            } catch (error) {
              if (error instanceof AllocationError) {
                throw error;
              }
              
              const context = `Error allocating subnet for type ${subnetType.name} in AZ ${azName}, region ${regionName}`;
              
              if (error instanceof Error) {
                logger.error(`${context}: ${error.message}`);
                throw new AllocationError(
                  `${context}: ${error.message}`,
                  ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
                  {
                    accountName,
                    regionName,
                    azName,
                    subnetType: subnetType.name,
                    rawError: error.message
                  }
                );
              }
              
              // Handle unknown errors
              logger.error(`Unknown error: ${context}`);
              throw new AllocationError(
                `${context}: Unknown error`,
                ErrorCode.UNKNOWN_ERROR,
                {
                  accountName,
                  regionName,
                  azName,
                  subnetType: subnetType.name
                }
              );
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof AllocationError) {
        throw error;
      }
      
      const context = `Error processing regions for account ${accountName}`;
      
      if (error instanceof Error) {
        logger.error(`${context}: ${error.message}`);
        throw new AllocationError(
          `${context}: ${error.message}`,
          ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
          {
            accountName,
            regions,
            baseCidr,
            rawError: error.message
          }
        );
      }
      
      // Handle unknown errors
      logger.error(`Unknown error: ${context}`);
      throw new AllocationError(
        `${context}: Unknown error`,
        ErrorCode.UNKNOWN_ERROR,
        {
          accountName,
          regions,
          baseCidr
        }
      );
    }
  }
  
  // TODO: Complete instance implementation in future enhancement
  /*
  private subnetAllocator: SubnetAllocator;
  private azHelper: AzHelper;
  
  constructor(
    private cidrTracker: CidrTracker,
    private subnetTypes: Array<InternalSubnetType>,
    private providerDetector: ProviderDetector
  ) {
    this.subnetAllocator = new SubnetAllocator(this.cidrTracker, this.subnetTypes);
    this.azHelper = providerDetector.getAzHelper();
  }
  
  public allocateRegion(
    accountName: string,
    vpcName: string,
    cloudProvider: string,
    baseRegionCidr: string,
    regionName: string
  ): Allocation[] {
    logger.debug(`Allocating CIDR blocks for region: ${regionName} in account: ${accountName} with base CIDR: ${baseRegionCidr}`);
    
    // Get the AZs for the region
    const azs = this.azHelper.getAvailabilityZones(regionName);
    logger.debug(`Region ${regionName} has ${azs.length} availability zones: ${azs.join(', ')}`);
    
    try {
      // Calculate the optimal prefix length for the AZs
      const azPrefixLength = calculateOptimalPrefixLength(baseRegionCidr, azs.length);
      logger.debug(`Using prefix length ${azPrefixLength} for AZs in region ${regionName}`);
      
      // Divide the region CIDR into AZ CIDRs
      const azCidrs = subdivideIpv4Cidr(baseRegionCidr, azPrefixLength);
      logger.debug(`Divided region CIDR ${baseRegionCidr} into ${azCidrs.length} AZ CIDRs: ${azCidrs.join(', ')}`);
      
      // Allocate subnets for each AZ
      const allocations: Allocation[] = [];
      
      azs.forEach((az, index) => {
        logger.debug(`Allocating subnets for AZ: ${az}`);
        
        // Get the CIDR for this AZ
        const azCidr = azCidrs[index];
        
        if (!azCidr) {
          const message = `No CIDR available for AZ ${az} at index ${index}. Available CIDRs: ${azCidrs.join(', ')}`;
          logger.error(message);
          throw new AllocationError(
            message, 
            ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
            {
              accountName,
              vpcName,
              regionName,
              az,
              azIndex: index,
              availableCidrs: azCidrs
            }
          );
        }
        
        // Track allocation of AZ CIDR
        this.cidrTracker.add(azCidr);
        
        // Allocate subnets for this AZ
        const azAllocations = this.subnetAllocator.allocateSubnets(
          accountName,
          vpcName,
          cloudProvider,
          regionName,
          baseRegionCidr,
          az,
          azCidr
        );
        
        allocations.push(...azAllocations);
      });
      
      return allocations;
    } catch (error) {
      const context = `Error allocating region ${regionName} in account ${accountName}`;
      
      if (error instanceof AllocationError) {
        throw error;
      }
      
      if (error instanceof Error) {
        logger.error(`CIDR allocation error: ${context}: ${error.message}`);
        throw new AllocationError(
          `${context}: ${error.message}`,
          ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
          { 
            accountName, 
            vpcName, 
            cloudProvider,
            regionName, 
            baseRegionCidr,
            rawError: error.message
          }
        );
      }
      
      // Handle unknown errors
      logger.error(`Unknown error during CIDR allocation: ${context}`);
      throw new AllocationError(
        `${context}: Unknown error`,
        ErrorCode.UNKNOWN_ERROR,
        { 
          accountName, 
          vpcName, 
          cloudProvider,
          regionName, 
          baseRegionCidr
        }
      );
    }
  }
  */
} 