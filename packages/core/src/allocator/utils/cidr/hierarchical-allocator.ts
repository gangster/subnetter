import { isValidIpv4Cidr } from './calculator';
import { ContiguousAllocator } from './contiguous-allocator';
import { AllocationError, ErrorCode } from '../../../utils/errors';
import { createLogger } from '../../../utils/logger';
import { Config, Allocation, Account, CloudConfig } from '../../../models/types';
import { ProviderDetector } from '../../utils/cloud';

// Create logger instance for the hierarchical allocator
const logger = createLogger('HierarchicalAllocator');

/**
 * Allocates CIDRs hierarchically using a contiguous allocation strategy.
 * The allocations are made in a hierarchical manner (accounts -> regions -> AZs -> subnets)
 * with contiguous blocks at each level to ensure no overlaps occur.
 */
export class HierarchicalAllocator {
  private config: Config;
  private rootAllocator: ContiguousAllocator;
  private allocations: Allocation[] = [];
  
  /**
   * Region-specific AWS availability zone mappings
   * Maps AWS regions to their specific AZ suffixes
   * @private
   */
  private readonly awsRegionToAzMap: Record<string, string[]> = {
    'us-east-1': ['a', 'b', 'c', 'd', 'e', 'f'],
    'us-east-2': ['a', 'b', 'c'],
    'us-west-1': ['a', 'c'],
    'us-west-2': ['a', 'b', 'c', 'd'],
    'ca-central-1': ['a', 'b', 'd'],
    'ca-west-1': ['a', 'b', 'c'],
    'sa-east-1': ['a', 'b', 'c'],
    'eu-west-1': ['a', 'b', 'c'],
    'eu-west-2': ['a', 'b', 'c'],
    'eu-west-3': ['a', 'b', 'c'],
    'eu-north-1': ['a', 'b', 'c'],
    'eu-south-1': ['a', 'b', 'c'],
    'eu-south-2': ['a', 'b', 'c'],
    'eu-central-1': ['a', 'b', 'c'],
    'eu-central-2': ['a', 'b', 'c'],
    'ap-northeast-1': ['a', 'c', 'd'],
    'ap-northeast-2': ['a', 'b', 'c'],
    'ap-northeast-3': ['a', 'b', 'c'],
    'ap-southeast-1': ['a', 'b', 'c'],
    'ap-southeast-2': ['a', 'b', 'c'],
    'ap-southeast-3': ['a', 'b', 'c'],
    'ap-southeast-4': ['a', 'b', 'c'],
    'ap-south-1': ['a', 'b', 'c'],
    'ap-south-2': ['a', 'b', 'c'],
    'ap-east-1': ['a', 'b', 'c'],
    'me-south-1': ['a', 'b', 'c'],
    'me-central-1': ['a', 'b', 'c'],
    'af-south-1': ['a', 'b', 'c'],
    'il-central-1': ['a', 'b', 'c']
  };

  /**
   * List of Azure regions that support availability zones
   * @private
   */
  private readonly azureSupportedZoneRegions: string[] = [
    'brazilsouth', 'canadacentral', 'centralus', 'eastus', 'eastus2', 
    'southcentralus', 'westus2', 'westus3', 'francecentral', 
    'germanywestcentral', 'northeurope', 'norwayeast', 'swedencentral', 
    'switzerlandnorth', 'uksouth', 'westeurope', 'australiaeast', 
    'centralindia', 'japaneast', 'koreacentral', 'southeastasia', 
    'qatarcentral', 'southafricanorth', 'uaenorth'
  ];

  /**
   * Region-specific GCP availability zone mappings
   * Maps GCP regions to their specific zone suffixes
   * @private
   */
  private readonly gcpRegionToZoneMap: Record<string, string[]> = {
    'us-central1': ['a', 'b', 'c', 'f'],
    'us-east1': ['b', 'c', 'd'],
    'us-east4': ['a', 'b', 'c'],
    'us-east5': ['a', 'b', 'c'],
    'us-south1': ['a', 'b', 'c'],
    'us-west1': ['a', 'b', 'c'],
    'us-west2': ['a', 'b', 'c'],
    'us-west3': ['a', 'b', 'c'],
    'us-west4': ['a', 'b', 'c'],
    'northamerica-northeast1': ['a', 'b', 'c'],
    'northamerica-northeast2': ['a', 'b', 'c'],
    'southamerica-east1': ['a', 'b', 'c'],
    'southamerica-west1': ['a', 'b', 'c'],
    'europe-central2': ['a', 'b', 'c'],
    'europe-north1': ['a', 'b', 'c'],
    'europe-southwest1': ['a', 'b', 'c'],
    'europe-west1': ['b', 'c', 'd'],
    'europe-west2': ['a', 'b', 'c'],
    'europe-west3': ['a', 'b', 'c'],
    'europe-west4': ['a', 'b', 'c'],
    'europe-west6': ['a', 'b', 'c'],
    'europe-west8': ['a', 'b', 'c'],
    'europe-west9': ['a', 'b', 'c'],
    'europe-west10': ['a', 'b', 'c'],
    'europe-west12': ['a', 'b', 'c'],
    'asia-east1': ['a', 'b', 'c'],
    'asia-east2': ['a', 'b', 'c'],
    'asia-northeast1': ['a', 'b', 'c'],
    'asia-northeast2': ['a', 'b', 'c'],
    'asia-northeast3': ['a', 'b', 'c'],
    'asia-south1': ['a', 'b', 'c'],
    'asia-south2': ['a', 'b', 'c'],
    'asia-southeast1': ['a', 'b', 'c'],
    'asia-southeast2': ['a', 'b', 'c'],
    'australia-southeast1': ['a', 'b', 'c'],
    'australia-southeast2': ['a', 'b', 'c'],
    'me-central1': ['a', 'b', 'c'],
    'me-central2': ['a', 'b', 'c'],
    'me-west1': ['a', 'b', 'c'],
    'africa-south1': ['a', 'b', 'c']
  };

  /**
   * Creates a new HierarchicalAllocator with the specified configuration.
   * 
   * @param config The configuration to use for allocation
   */
  constructor(config: Config) {
    logger.debug('Initializing HierarchicalAllocator with configuration');
    logger.trace('Configuration details:', config);
    
    this.config = config;
    
    // Initialize the root allocator with the base CIDR
    if (!isValidIpv4Cidr(config.baseCidr)) {
      throw new AllocationError(
        `Invalid base CIDR format: ${config.baseCidr}`,
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr: config.baseCidr }
      );
    }
    
    this.rootAllocator = new ContiguousAllocator(config.baseCidr);
  }
  
  /**
   * Generates IP allocations for all accounts, regions, and subnets.
   * 
   * @returns An array of allocation objects representing all subnet allocations
   */
  public generateAllocations(): Allocation[] {
    // Reset any previous allocations
    this.allocations = [];
    this.rootAllocator.reset();
    
    logger.debug('Starting hierarchical allocation process');
    logger.debug(`Base CIDR: ${this.config.baseCidr}`);
    logger.debug(`Account count: ${this.config.accounts.length}`);
    
    // Process each account
    this.config.accounts.forEach(account => {
      this.processAccount(account);
    });
    
    logger.info(`Generated ${this.allocations.length} total subnet allocations`);
    return this.allocations;
  }
  
  /**
   * Processes an account for CIDR allocation.
   * 
   * @param account The account to process
   * @private
   */
  private processAccount(account: Account): void {
    logger.debug(`Processing account: ${account.name}`);
    
    // Look for account-specific CIDRs in cloud configs
    let accountCidr: string | undefined;
    let useAccountSpecificCidr = false;
    
    if (account.clouds) {
      // Search for a cloud config with a baseCidr
      Object.values(account.clouds).forEach(cloudConfig => {
        if (cloudConfig.baseCidr) {
          accountCidr = cloudConfig.baseCidr;
          useAccountSpecificCidr = true;
          logger.debug(`Using account-specific CIDR ${accountCidr} for account ${account.name}`);
        }
      });
    }
    
    // Use account-specific CIDR or allocate from root
    let accountAllocator: ContiguousAllocator;
    
    if (useAccountSpecificCidr && accountCidr) {
      // Use the specified CIDR for this account
      accountAllocator = new ContiguousAllocator(accountCidr);
    } else {
      // Allocate a CIDR for this account from the root allocator
      const accountPrefix = this.config.prefixLengths?.account || 16; // Default to /16
      const allocatedCidr = this.rootAllocator.allocate(`/${accountPrefix}`);
      accountAllocator = new ContiguousAllocator(allocatedCidr);
    }
    
    // Process cloud-specific configurations
    if (account.clouds) {
      Object.entries(account.clouds).forEach(([providerName, cloudConfig]) => {
        this.processCloudConfig(account.name, providerName, cloudConfig, accountAllocator, useAccountSpecificCidr ? accountCidr : undefined);
      });
    } else {
      // Handle legacy format with regions directly on the account
      this.processLegacyAccount(account, accountAllocator);
    }
  }
  
  /**
   * Processes a legacy account format.
   * 
   * @param account The account to process
   * @param accountAllocator The allocator for this account
   * @private
   */
  private processLegacyAccount(account: Account, accountAllocator: ContiguousAllocator): void {
    // @ts-expect-error - handling legacy format intentionally
    const regions = account.regions as string[];
    logger.debug(`Processing legacy account format with regions: ${regions.join(', ')}`);
    
    // For legacy format, we'll use AWS as the default provider or detect from region
    regions.forEach(region => {
      const provider = ProviderDetector.detect(region);
      
      // Create a simple cloud config for this region
      const cloudConfig: CloudConfig = {
        regions: [region]
      };
      
      this.processCloudConfig(account.name, provider, cloudConfig, accountAllocator);
    });
  }
  
  /**
   * Processes a cloud configuration for an account.
   * 
   * @param accountName The name of the account
   * @param providerName The name of the cloud provider
   * @param cloudConfig The cloud configuration
   * @param accountAllocator The allocator for this account
   * @param vpcCidr Optional VPC CIDR if using an account-specific CIDR
   * @private
   */
  private processCloudConfig(
    accountName: string, 
    providerName: string,
    cloudConfig: CloudConfig,
    accountAllocator: ContiguousAllocator,
    vpcCidr?: string
  ): void {
    if (!cloudConfig || !cloudConfig.regions || cloudConfig.regions.length === 0) {
      logger.warn(`Empty or invalid cloud config for provider ${providerName} in account ${accountName}, skipping`);
      return;
    }
    
    // Use cloud-specific CIDR or the account CIDR
    const effectiveVpcCidr = vpcCidr || cloudConfig.baseCidr || accountAllocator.getAvailableSpace().split('/')[0] + '/8';
    
    // Process each region
    cloudConfig.regions.forEach(regionName => {
      this.processRegion(accountName, regionName, providerName, accountAllocator, effectiveVpcCidr);
    });
  }
  
  /**
   * Processes a region for CIDR allocation.
   * 
   * @param accountName The name of the account
   * @param regionName The name of the region
   * @param providerName The name of the cloud provider
   * @param accountAllocator The allocator for this account
   * @param vpcCidr VPC CIDR to use in allocations
   * @private
   */
  private processRegion(
    accountName: string,
    regionName: string,
    providerName: string,
    accountAllocator: ContiguousAllocator,
    vpcCidr: string
  ): void {
    logger.debug(`Processing region ${regionName} for account ${accountName}`);
    
    // Allocate a CIDR for this region from the account allocator
    const regionPrefix = this.config.prefixLengths?.region || 20; // Default to /20
    const regionCidr = accountAllocator.allocate(`/${regionPrefix}`);
    
    // Create an allocator for this region
    const regionAllocator = new ContiguousAllocator(regionCidr);
    
    // Get AZ names for this region
    const azNames = this.getAzNames(regionName, providerName);
    logger.debug(`Region ${regionName} has ${azNames.length} availability zones`);
    
    // Process each availability zone
    azNames.forEach(azName => {
      this.processAz(accountName, regionName, azName, providerName, regionCidr, vpcCidr, regionAllocator);
    });
  }
  
  /**
   * Processes an availability zone for CIDR allocation.
   * 
   * @param accountName The name of the account
   * @param regionName The name of the region
   * @param azName The name of the availability zone
   * @param providerName The name of the cloud provider
   * @param regionCidr The CIDR of the region
   * @param vpcCidr The CIDR of the VPC
   * @param regionAllocator The allocator for this region
   * @private
   */
  private processAz(
    accountName: string,
    regionName: string,
    azName: string,
    providerName: string,
    regionCidr: string,
    vpcCidr: string,
    regionAllocator: ContiguousAllocator
  ): void {
    logger.debug(`Processing AZ ${azName} for region ${regionName}`);
    
    // Allocate a CIDR for this AZ from the region allocator
    const azPrefix = this.config.prefixLengths?.az || 24; // Default to /24
    const azCidr = regionAllocator.allocate(`/${azPrefix}`);
    
    // Create an allocator for this AZ
    const azAllocator = new ContiguousAllocator(azCidr);
    
    // Process subnet types
    if (typeof this.config.subnetTypes === 'object') {
      Object.entries(this.config.subnetTypes).forEach(([subnetType, prefixLength]) => {
        this.processSubnet(
          accountName,
          regionName,
          azName,
          providerName,
          regionCidr,
          vpcCidr,
          azCidr,
          subnetType,
          prefixLength,
          azAllocator
        );
      });
    }
  }
  
  /**
   * Processes a subnet for CIDR allocation.
   * 
   * @param accountName The name of the account
   * @param regionName The name of the region
   * @param azName The name of the availability zone
   * @param providerName The name of the cloud provider
   * @param regionCidr The CIDR of the region
   * @param vpcCidr The CIDR of the VPC
   * @param azCidr The CIDR of the availability zone
   * @param subnetType The type of the subnet
   * @param prefixLength The prefix length for the subnet
   * @param azAllocator The allocator for this availability zone
   * @private
   */
  private processSubnet(
    accountName: string,
    regionName: string,
    azName: string,
    providerName: string,
    regionCidr: string,
    vpcCidr: string,
    azCidr: string,
    subnetType: string,
    prefixLength: number,
    azAllocator: ContiguousAllocator
  ): void {
    logger.debug(`Processing subnet type ${subnetType} with prefix length ${prefixLength} for AZ ${azName}`);
    
    try {
      // Allocate a CIDR for this subnet from the AZ allocator
      const subnetCidr = azAllocator.allocate(`/${prefixLength}`);
      
      // Add the allocation
      this.allocations.push({
        accountName,
        vpcName: `${accountName}-vpc`,
        cloudProvider: providerName,
        regionName,
        availabilityZone: azName,
        regionCidr,
        vpcCidr,
        azCidr,
        subnetCidr,
        subnetRole: subnetType,
        usableIps: this.calculateUsableIps(subnetCidr)
      });
      
      logger.debug(`Allocated subnet ${subnetType} in ${azName} with CIDR ${subnetCidr}`);
    } catch (error) {
      if (error instanceof AllocationError) {
        logger.warn(`Could not allocate subnet type ${subnetType} in AZ ${azName}: ${error.message}`);
      } else {
        logger.error(`Unexpected error allocating subnet type ${subnetType} in AZ ${azName}:`, error);
      }
    }
  }
  
  /**
   * Calculates the number of usable IP addresses in a CIDR block.
   * 
   * @param cidr The CIDR block
   * @returns The number of usable IP addresses
   * @private
   */
  private calculateUsableIps(cidr: string): number {
    const prefix = parseInt(cidr.split('/')[1], 10);
    
    // Special cases for /31 and /32
    if (prefix === 32) return 1;
    if (prefix === 31) return 2;
    
    // For all other prefixes, we need to subtract 2 for network and broadcast addresses
    return Math.pow(2, 32 - prefix) - 2;
  }
  
  /**
   * Generates AZ names for a region.
   * 
   * @param regionName The region name
   * @param providerName The cloud provider name
   * @returns An array of AZ names
   * @private
   */
  private getAzNames(regionName: string, providerName: string): string[] {
    // Default to 3 AZs if not otherwise specified
    const defaultCount = 3;
    
    // For AWS, AZs are region + letters (a, b, c, etc.)
    if (providerName === 'aws') {
      // Use region-specific AZ suffixes if available, or fall back to a, b, c
      const azSuffixes = this.awsRegionToAzMap[regionName] || ['a', 'b', 'c'];
      // Limit to the first 3 AZs by default to avoid excessive allocations
      const effectiveSuffixes = azSuffixes.slice(0, defaultCount);
      
      logger.debug(`Using AWS AZ suffixes for ${regionName}: ${effectiveSuffixes.join(', ')}`);
      return effectiveSuffixes.map(suffix => `${regionName}${suffix}`);
    }
    
    // For Azure, check if the region supports AZs
    if (providerName === 'azure') {
      // Normalize region name to lower case
      const normalizedRegion = regionName.toLowerCase();
      
      // Check if the region supports AZs
      const supportsZones = this.azureSupportedZoneRegions.includes(normalizedRegion);
      
      if (!supportsZones) {
        logger.warn(`Azure region ${regionName} may not support availability zones. Proceeding with default naming.`);
      }
      
      // Azure uses numeric zone designations (1, 2, 3)
      const azNumbers = [1, 2, 3].slice(0, defaultCount);
      logger.debug(`Using Azure AZ numbers for ${regionName}: ${azNumbers.join(', ')}`);
      
      // Return in the format: regionName-1, regionName-2, regionName-3
      return azNumbers.map(num => `${regionName}-${num}`);
    }
    
    // For GCP, AZs are region + -a, -b, -c (with specific variations)
    if (providerName === 'gcp') {
      // Use region-specific zone suffixes if available, or fall back to a, b, c
      const zoneSuffixes = this.gcpRegionToZoneMap[regionName] || ['a', 'b', 'c'];
      // Limit to the first 3 zones by default to avoid excessive allocations
      const effectiveSuffixes = zoneSuffixes.slice(0, defaultCount);
      
      logger.debug(`Using GCP zone suffixes for ${regionName}: ${effectiveSuffixes.join(', ')}`);
      return effectiveSuffixes.map(suffix => `${regionName}-${suffix}`);
    }
    
    // Default: just append numbers with az prefix for unknown providers
    logger.warn(`Unknown provider ${providerName}, using generic AZ naming`);
    return Array.from({ length: defaultCount }, (_, i) => `${regionName}-az${i+1}`);
  }
} 