import { 
  Config, 
  Allocation
} from '../../models/types';
import { createLogger } from '../../utils/logger';
import { CidrTracker } from '../utils/tracking';
import { HierarchicalAllocator } from '../utils/cidr';

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
   * The hierarchical allocator used for contiguous allocation.
   */
  private hierarchicalAllocator: HierarchicalAllocator;

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
    this.normalizedSubnetTypes = this.normalizeSubnetTypes(config.subnetTypes);
    
    // Initialize helpers
    this.cidrTracker = cidrTracker || new CidrTracker();
    
    // Initialize the hierarchical allocator
    this.hierarchicalAllocator = new HierarchicalAllocator(config);
  }

  /**
   * Generates IP allocations for all accounts, regions, and subnets.
   * This is the main entry point for the allocation process.
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
    
    logger.debug('Starting allocation process using hierarchical allocator');
    logger.debug(`Base CIDR: ${this.config.baseCidr}`);
    logger.debug(`Account count: ${this.config.accounts.length}`);
    
    // Use the hierarchical allocator to generate allocations
    const allocations = this.hierarchicalAllocator.generateAllocations();
    
    // Register all allocations with the CIDR tracker
    allocations.forEach(allocation => {
      this.cidrTracker.add(allocation.subnetCidr);
    });
    
    logger.info(`Generated ${allocations.length} total subnet allocations`);
    return allocations;
  }
  
  /**
   * Normalizes subnet types to a consistent array format.
   * 
   * @param subnetTypes The subnet types from the configuration
   * @returns Normalized subnet types as an array
   * @private
   */
  private normalizeSubnetTypes(subnetTypes: Record<string, number> | Array<{name: string; prefixLength: number}>): Array<{name: string; prefixLength: number}> {
    if (Array.isArray(subnetTypes)) {
      return subnetTypes;
    }
    
    return Object.entries(subnetTypes).map(([name, prefixLength]) => ({
      name,
      prefixLength: typeof prefixLength === 'number' ? prefixLength : parseInt(prefixLength, 10)
    }));
  }
} 