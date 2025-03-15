import { 
  Config, 
  Allocation, 
  Account,
  CloudConfig
} from '../../models/types';
import { createLogger } from '../../utils/logger';
import { CidrTracker } from '../utils/tracking';
import { ProviderDetector } from '../utils/cloud';
import { normalizeSubnetTypes } from '../common/helpers';
import { RegionAllocator } from './region';

// Create logger instance for the allocator
const logger = createLogger('CidrAllocator');

/**
 * Class responsible for allocating CIDRs at each level of the hierarchy.
 * 
 * The allocation follows a top-down approach:
 * 1. Start with a base CIDR block
 * 2. Divide it among accounts (or cloud-specific account configurations)
 * 3. For each account, divide its CIDR among regions
 * 4. For each region, divide its CIDR among availability zones
 * 5. For each AZ, divide its CIDR among subnet types
 * 
 * The allocation is deterministic, meaning the same input will always produce
 * the same output, and ensures no CIDR overlaps occur.
 */
export class CidrAllocator {
  /**
   * The normalized configuration with subnet types in array format for internal use.
   */
  private normalizedSubnetTypes: Array<{name: string; prefixLength: number}>;

  /**
   * Tracker for allocated CIDRs.
   */
  private cidrTracker: CidrTracker;

  /**
   * Creates a new CIDR allocator with the provided configuration.
   * 
   * @param config The configuration to use for allocation, including base CIDR,
   *               accounts, regions, and subnet types
   * @param cidrTracker Optional tracker for allocated CIDRs (for dependency injection)
   */
  constructor(
    private config: Config, 
    cidrTracker?: CidrTracker
  ) {
    logger.debug('Initializing CidrAllocator with configuration');
    logger.trace('Configuration details:', config);
    
    // Convert subnet types to array format for internal use
    this.normalizedSubnetTypes = normalizeSubnetTypes(config.subnetTypes);
    
    // Initialize helpers
    this.cidrTracker = cidrTracker || new CidrTracker();
  }

  /**
   * Generates IP allocations for all accounts, regions, and subnets.
   * This is the main entry point for the allocation process.
   * 
   * The allocation process follows these steps:
   * 1. Reset the list of allocated CIDRs
   * 2. For each account, process its cloud-specific configurations
   * 3. For each cloud configuration, process its regions
   * 4. For each region, process its availability zones
   * 5. For each AZ, process its subnet types
   * 
   * @returns An array of allocation objects representing all subnet allocations
   * @throws {AllocationError} If the allocation cannot be completed due to insufficient
   *                          space, overlapping CIDRs, or invalid inputs
   * 
   * @example
   * const allocator = new CidrAllocator(config);
   * const allocations = allocator.generateAllocations();
   * // allocations contains all subnet CIDRs for all accounts, regions, and AZs
   */
  public generateAllocations(): Allocation[] {
    // Reset allocated CIDRs
    this.cidrTracker.reset();
    
    // Allocations to return
    const allocations: Allocation[] = [];
    
    logger.debug('Starting allocation process');
    logger.debug(`Base CIDR: ${this.config.baseCidr}`);
    logger.debug(`Account count: ${this.config.accounts.length}`);
    
    // Process each account
    this.config.accounts.forEach(account => {
      logger.debug(`Processing account: ${account.name}`);
      
      // Process cloud-specific configurations
      logger.debug(`Processing cloud configurations for account: ${account.name}`);
      this.processCloudConfigurations(account, allocations);
    });
    
    logger.info(`Generated ${allocations.length} total subnet allocations`);
    return allocations;
  }

  /**
   * Processes cloud-specific configurations for an account.
   * 
   * @param account The account to process
   * @param allocations Array to append allocations to
   * @private
   */
  private processCloudConfigurations(account: Account, allocations: Allocation[]): void {
    // Handle legacy format with regions directly on the account
    if (this.hasLegacyFormat(account)) {
      this.processLegacyAccount(account, allocations);
      return;
    }
    
    // Process each cloud provider configuration
    if (!account.clouds) {
      logger.warn(`No cloud configurations found for account ${account.name}, skipping`);
      return;
    }
    
    Object.entries(account.clouds).forEach(([providerName, cloudConfig]) => {
      this.processCloudConfig(account.name, providerName, cloudConfig, allocations);
    });
  }

  /**
   * Checks if an account uses the legacy format (regions instead of clouds).
   * 
   * @param account The account to check
   * @returns True if the account uses the legacy format
   * @private
   */
  private hasLegacyFormat(account: Account): boolean {
    // @ts-expect-error - checking for legacy format intentionally
    return account.regions && !account.clouds;
  }

  /**
   * Processes an account in legacy format.
   * 
   * @param account The account to process
   * @param allocations Array to append allocations to
   * @private
   */
  private processLegacyAccount(account: Account, allocations: Allocation[]): void {
    // @ts-expect-error - handling legacy format intentionally
    const regions = account.regions as string[];
    logger.debug(`Processing legacy account format with regions: ${regions.join(', ')}`);
    
    // For legacy format, we'll use AWS as the default provider or detect from region
    regions.forEach(region => {
      const provider = ProviderDetector.detect(region);
      RegionAllocator.processRegions(
        account.name,
        [region],
        this.config.baseCidr,
        this.cidrTracker,
        this.normalizedSubnetTypes,
        provider,
        this.config.prefixLengths?.region,
        this.config.prefixLengths?.az,
        allocations
      );
    });
  }

  /**
   * Processes a cloud configuration for an account.
   * 
   * @param accountName The name of the account
   * @param providerName The name of the cloud provider
   * @param cloudConfig The cloud configuration
   * @param allocations Array to append allocations to
   * @private
   */
  private processCloudConfig(
    accountName: string, 
    providerName: string,
    cloudConfig: CloudConfig,
    allocations: Allocation[]
  ): void {
    if (!cloudConfig) {
      logger.warn(`Empty cloud config for provider ${providerName} in account ${accountName}, skipping`);
      return;
    }
    
    // Get the regions for this provider
    const regions = cloudConfig.regions || [];
    logger.debug(`Account ${accountName} has ${regions.length} regions for provider ${providerName}`);
    
    // Get the base CIDR for this cloud config, falling back to the global base CIDR
    const baseCidr = cloudConfig.baseCidr || this.config.baseCidr;
    logger.debug(`Using base CIDR ${baseCidr} for account ${accountName}, provider ${providerName}`);
    
    // Process the regions
    RegionAllocator.processRegions(
      accountName, 
      regions, 
      baseCidr,
      this.cidrTracker,
      this.normalizedSubnetTypes,
      providerName,
      this.config.prefixLengths?.region,
      this.config.prefixLengths?.az,
      allocations
    );
  }
} 