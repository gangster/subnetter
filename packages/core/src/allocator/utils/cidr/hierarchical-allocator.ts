/**
 * @module allocator/utils/cidr/hierarchical-allocator
 * @description Hierarchical CIDR allocation for cloud infrastructure.
 *
 * Allocates IP address space in a top-down hierarchy matching cloud
 * infrastructure: accounts → cloud providers → regions → availability
 * zones → subnets. Ensures contiguous, non-overlapping allocations at
 * each level.
 *
 * @remarks
 * The allocator supports:
 * - **Multi-cloud**: AWS, Azure, and GCP with provider-specific AZ naming
 * - **Account isolation**: Each account gets its own address space
 * - **CIDR overrides**: Cloud-specific base CIDRs for flexibility
 * - **Configurable prefix lengths**: Control block sizes at each level
 *
 * @example
 * ```typescript
 * import { HierarchicalAllocator, loadConfig } from '@subnetter/core';
 *
 * const config = loadConfig('./config.json');
 * const allocator = new HierarchicalAllocator(config);
 * const allocations = allocator.generateAllocations();
 *
 * // Group by region
 * const byRegion = allocations.reduce((acc, alloc) => {
 *   (acc[alloc.regionName] ??= []).push(alloc);
 *   return acc;
 * }, {});
 * ```
 *
 * @see {@link CidrAllocator} for the main allocation interface
 * @see {@link ContiguousAllocator} for the underlying block allocation
 *
 * @packageDocumentation
 */

import { isValidIpv4Cidr } from './calculator';
import { ContiguousAllocator } from './contiguous-allocator';
import { AllocationError, ErrorCode } from '../../../utils/errors';
import { createLogger } from '../../../utils/logger';
import type { Config, Allocation, Account, CloudConfig } from '../../../models/types';
import { ProviderDetector } from '../../utils/cloud';

/**
 * Logger instance for hierarchical allocator operations.
 * @internal
 */
const logger = createLogger('HierarchicalAllocator');

/**
 * Allocates CIDRs hierarchically for multi-cloud infrastructure.
 *
 * @remarks
 * The allocation hierarchy:
 * 1. **Base CIDR** → divided among accounts
 * 2. **Account CIDR** → divided among cloud providers/regions
 * 3. **Region CIDR** → divided among availability zones
 * 4. **AZ CIDR** → divided into subnets by type
 *
 * Each level uses a configurable prefix length:
 * - Account: defaults to /16 (65,534 addresses)
 * - Region: defaults to /20 (4,094 addresses)
 * - AZ: defaults to /24 (254 addresses)
 *
 * @example
 * ```typescript
 * import { HierarchicalAllocator, validateConfig } from '@subnetter/core';
 *
 * const config = validateConfig({
 *   baseCidr: '10.0.0.0/8',
 *   prefixLengths: { account: 16, region: 20, az: 24 },
 *   accounts: [{
 *     name: 'production',
 *     clouds: { aws: { regions: ['us-east-1', 'us-west-2'] } }
 *   }],
 *   subnetTypes: { public: 26, private: 24 }
 * });
 *
 * const allocator = new HierarchicalAllocator(config);
 * const allocations = allocator.generateAllocations();
 * ```
 */
export class HierarchicalAllocator {
  /**
   * Validated configuration for allocation.
   * @internal
   */
  private config: Config;

  /**
   * Root allocator for the base CIDR.
   * @internal
   */
  private rootAllocator: ContiguousAllocator;

  /**
   * Accumulated allocations from the current generation.
   * @internal
   */
  private allocations: Allocation[] = [];

  /**
   * AWS region to availability zone suffix mapping.
   *
   * @remarks
   * Maps AWS regions to their specific AZ letter suffixes.
   * Not all regions have the same AZs (e.g., us-west-1 has only a and c).
   *
   * @internal
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
   * Azure regions that support availability zones.
   *
   * @remarks
   * Not all Azure regions have AZ support. This list is used to
   * provide appropriate warnings during allocation.
   *
   * @internal
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
   * GCP region to zone suffix mapping.
   *
   * @remarks
   * Maps GCP regions to their available zone suffixes.
   * Some regions have non-standard suffixes (e.g., us-central1 includes 'f').
   *
   * @internal
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
   * @param config - Validated configuration for allocation
   *
   * @throws {@link AllocationError}
   * Thrown with `INVALID_CIDR_FORMAT` if the base CIDR is malformed.
   *
   * @example
   * ```typescript
   * const allocator = new HierarchicalAllocator(config);
   * ```
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
   * Generates allocations for all accounts, regions, and subnets.
   *
   * @remarks
   * Processes the entire configuration hierarchy and returns a flat
   * array of subnet allocations. Each call resets internal state,
   * ensuring deterministic output.
   *
   * @returns Array of {@link Allocation} objects for all subnets
   *
   * @example
   * ```typescript
   * const allocator = new HierarchicalAllocator(config);
   * const allocations = allocator.generateAllocations();
   *
   * console.log(`Generated ${allocations.length} subnets`);
   * ```
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
   * @param account - Account to process
   * @internal
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
      const accountPrefix = this.config.prefixLengths?.account || 16;
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
   * Processes legacy account format for backward compatibility.
   *
   * @param account - Account with legacy region format
   * @param accountAllocator - Allocator for this account
   * @internal
   */
  private processLegacyAccount(account: Account, accountAllocator: ContiguousAllocator): void {
    // @ts-expect-error - handling legacy format intentionally
    const regions = account.regions as string[];
    logger.debug(`Processing legacy account format with regions: ${regions.join(', ')}`);

    // For legacy format, detect provider from region
    regions.forEach(region => {
      const provider = ProviderDetector.detect(region);

      const cloudConfig: CloudConfig = {
        regions: [region]
      };

      this.processCloudConfig(account.name, provider, cloudConfig, accountAllocator);
    });
  }

  /**
   * Processes a cloud configuration for an account.
   *
   * @param accountName - Name of the account
   * @param providerName - Cloud provider identifier
   * @param cloudConfig - Cloud-specific configuration
   * @param accountAllocator - Allocator for this account
   * @param vpcCidr - Optional VPC CIDR override
   * @internal
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
    // Get the base CIDR of the account allocator (before any allocations modified it)
    const effectiveVpcCidr = vpcCidr || cloudConfig.baseCidr || accountAllocator.getBaseCidr();

    // Process each region
    cloudConfig.regions.forEach(regionName => {
      this.processRegion(accountName, regionName, providerName, accountAllocator, effectiveVpcCidr);
    });
  }

  /**
   * Processes a region for CIDR allocation.
   *
   * @param accountName - Name of the account
   * @param regionName - Region identifier
   * @param providerName - Cloud provider identifier
   * @param accountAllocator - Allocator for this account
   * @param vpcCidr - VPC CIDR for allocations
   * @internal
   */
  private processRegion(
    accountName: string,
    regionName: string,
    providerName: string,
    accountAllocator: ContiguousAllocator,
    vpcCidr: string
  ): void {
    logger.debug(`Processing region ${regionName} for account ${accountName}`);

    // Allocate a CIDR for this region
    const regionPrefix = this.config.prefixLengths?.region || 20;
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
   * @param accountName - Name of the account
   * @param regionName - Region identifier
   * @param azName - Availability zone identifier
   * @param providerName - Cloud provider identifier
   * @param regionCidr - CIDR of the region
   * @param vpcCidr - CIDR of the VPC
   * @param regionAllocator - Allocator for this region
   * @internal
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

    // Allocate a CIDR for this AZ
    const azPrefix = this.config.prefixLengths?.az || 24;
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
   * Processes a subnet allocation.
   *
   * @param accountName - Name of the account
   * @param regionName - Region identifier
   * @param azName - Availability zone identifier
   * @param providerName - Cloud provider identifier
   * @param regionCidr - CIDR of the region
   * @param vpcCidr - CIDR of the VPC
   * @param azCidr - CIDR of the availability zone
   * @param subnetType - Subnet role/type name
   * @param prefixLength - Prefix length for this subnet type
   * @param azAllocator - Allocator for this AZ
   * @internal
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
      // Allocate a CIDR for this subnet
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
   * Calculates usable IPs for a CIDR block.
   *
   * @param cidr - CIDR block
   * @returns Number of usable IP addresses
   * @internal
   */
  private calculateUsableIps(cidr: string): number {
    const prefix = parseInt(cidr.split('/')[1], 10);

    // Special cases for point-to-point and single host
    if (prefix === 32) return 1;
    if (prefix === 31) return 2;

    // Standard calculation: total - network - broadcast
    return Math.pow(2, 32 - prefix) - 2;
  }

  /**
   * Generates AZ names for a region based on cloud provider conventions.
   *
   * @param regionName - Region identifier
   * @param providerName - Cloud provider ('aws', 'azure', 'gcp')
   * @returns Array of availability zone names
   * @internal
   */
  private getAzNames(regionName: string, providerName: string): string[] {
    // Default to 3 AZs
    const defaultCount = 3;

    // AWS: region + letter suffix (us-east-1a)
    if (providerName === 'aws') {
      const azSuffixes = this.awsRegionToAzMap[regionName] || ['a', 'b', 'c'];
      const effectiveSuffixes = azSuffixes.slice(0, defaultCount);

      logger.debug(`Using AWS AZ suffixes for ${regionName}: ${effectiveSuffixes.join(', ')}`);
      return effectiveSuffixes.map(suffix => `${regionName}${suffix}`);
    }

    // Azure: region + number (eastus-1)
    if (providerName === 'azure') {
      const normalizedRegion = regionName.toLowerCase();
      const supportsZones = this.azureSupportedZoneRegions.includes(normalizedRegion);

      if (!supportsZones) {
        logger.warn(`Azure region ${regionName} may not support availability zones. Proceeding with default naming.`);
      }

      const azNumbers = [1, 2, 3].slice(0, defaultCount);
      logger.debug(`Using Azure AZ numbers for ${regionName}: ${azNumbers.join(', ')}`);

      return azNumbers.map(num => `${regionName}-${num}`);
    }

    // GCP: region + letter suffix with hyphen (us-central1-a)
    if (providerName === 'gcp') {
      const zoneSuffixes = this.gcpRegionToZoneMap[regionName] || ['a', 'b', 'c'];
      const effectiveSuffixes = zoneSuffixes.slice(0, defaultCount);

      logger.debug(`Using GCP zone suffixes for ${regionName}: ${effectiveSuffixes.join(', ')}`);
      return effectiveSuffixes.map(suffix => `${regionName}-${suffix}`);
    }

    // Unknown provider: generic naming
    logger.warn(`Unknown provider ${providerName}, using generic AZ naming`);
    return Array.from({ length: defaultCount }, (_, i) => `${regionName}-az${i+1}`);
  }
}
