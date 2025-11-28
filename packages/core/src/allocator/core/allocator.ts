/**
 * @module allocator/core/allocator
 * @description Main CIDR allocation orchestrator for Subnetter.
 *
 * Provides the primary interface for generating hierarchical IP address
 * allocations from a configuration. The allocator divides address space
 * in a top-down manner: base CIDR → accounts → regions → AZs → subnets.
 *
 * @remarks
 * The allocation process is deterministic—the same configuration always
 * produces the same output. This ensures reproducibility and makes it
 * safe to regenerate allocations without causing drift.
 *
 * @example
 * ```typescript
 * import { CidrAllocator, loadConfig } from '@subnetter/core';
 *
 * const config = loadConfig('./config.json');
 * const allocator = new CidrAllocator(config);
 * const allocations = allocator.generateAllocations();
 *
 * console.log(`Generated ${allocations.length} subnet allocations`);
 * ```
 *
 * @see {@link loadConfig} for loading configuration files
 * @see {@link Allocation} for the output format
 * @see {@link HierarchicalAllocator} for the underlying allocation engine
 *
 * @packageDocumentation
 */

import type {
  Config,
  Allocation
} from '../../models/types';
import { createLogger } from '../../utils/logger';
import { CidrTracker } from '../utils/tracking';
import { HierarchicalAllocator } from '../utils/cidr';

/**
 * Logger instance for the allocator module.
 * @internal
 */
const logger = createLogger('CidrAllocator');

/**
 * Main class for allocating CIDRs across a cloud infrastructure hierarchy.
 *
 * @remarks
 * The allocation follows a top-down approach:
 * 1. Start with a base CIDR block (e.g., 10.0.0.0/8)
 * 2. Divide among accounts (each gets a /16 by default)
 * 3. For each account's cloud, divide among regions (/20 by default)
 * 4. For each region, divide among availability zones (/24 by default)
 * 5. For each AZ, allocate subnets by type (configurable prefix lengths)
 *
 * The allocation is:
 * - **Deterministic**: Same input always produces same output
 * - **Contiguous**: Allocations are sequential within each level
 * - **Non-overlapping**: Guaranteed no CIDR conflicts
 *
 * @example
 * ```typescript
 * import { CidrAllocator, loadConfig, writeAllocationsToCsv } from '@subnetter/core';
 *
 * // Load and allocate
 * const config = loadConfig('./config.json');
 * const allocator = new CidrAllocator(config);
 * const allocations = allocator.generateAllocations();
 *
 * // Write results
 * await writeAllocationsToCsv(allocations, './allocations.csv');
 * ```
 *
 * @example
 * ```typescript
 * // With custom CIDR tracker for testing
 * import { CidrAllocator, CidrTracker } from '@subnetter/core';
 *
 * const tracker = new CidrTracker();
 * const allocator = new CidrAllocator(config, tracker);
 * allocator.generateAllocations();
 *
 * // Inspect tracked CIDRs
 * console.log(tracker.getAllocated());
 * ```
 */
export class CidrAllocator {
  /**
   * Normalized subnet types in array format for internal processing.
   * @internal
   */
  private normalizedSubnetTypes: Array<{name: string; prefixLength: number}>;

  /**
   * Tracker for all allocated CIDR blocks.
   * Used to detect overlaps and for testing/debugging.
   * @internal
   */
  private cidrTracker: CidrTracker;

  /**
   * The underlying hierarchical allocator engine.
   * @internal
   */
  private hierarchicalAllocator: HierarchicalAllocator;

  /**
   * Creates a new CIDR allocator with the provided configuration.
   *
   * @param config - Validated configuration specifying base CIDR, accounts,
   *                 regions, and subnet types
   * @param cidrTracker - Optional tracker for dependency injection in tests.
   *                      If not provided, a new tracker is created.
   *
   * @example
   * ```typescript
   * const allocator = new CidrAllocator(config);
   * ```
   *
   * @example
   * ```typescript
   * // With custom tracker for testing
   * const tracker = new CidrTracker();
   * const allocator = new CidrAllocator(config, tracker);
   * ```
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
   *
   * @remarks
   * This is the main entry point for the allocation process. It processes
   * the entire configuration hierarchy and returns a flat array of subnet
   * allocations.
   *
   * Each call resets internal state, so calling multiple times will
   * produce identical results (deterministic behavior).
   *
   * @returns Array of {@link Allocation} objects representing all subnet
   *          allocations across the infrastructure
   *
   * @throws {@link AllocationError}
   * Thrown if allocation fails due to insufficient space, invalid CIDRs,
   * or configuration errors.
   *
   * @example
   * ```typescript
   * const allocator = new CidrAllocator(config);
   * const allocations = allocator.generateAllocations();
   *
   * // Process allocations
   * allocations.forEach(alloc => {
   *   console.log(`${alloc.accountName}/${alloc.regionName}/${alloc.availabilityZone}: ${alloc.subnetCidr}`);
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Filter by cloud provider
   * const awsAllocations = allocations.filter(a => a.cloudProvider === 'aws');
   * console.log(`AWS has ${awsAllocations.length} subnets`);
   * ```
   */
  public generateAllocations(): Allocation[] {
    // Reset allocated CIDRs for fresh generation
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
   * @remarks
   * Handles both object format (`{ public: 24 }`) and array format
   * (`[{ name: 'public', prefixLength: 24 }]`). Internally, array
   * format is used for consistent iteration.
   *
   * @param subnetTypes - Subnet types from configuration
   * @returns Normalized array of subnet type definitions
   *
   * @internal
   */
  private normalizeSubnetTypes(
    subnetTypes: Record<string, number> | Array<{name: string; prefixLength: number}>
  ): Array<{name: string; prefixLength: number}> {
    if (Array.isArray(subnetTypes)) {
      return subnetTypes;
    }

    return Object.entries(subnetTypes).map(([name, prefixLength]) => ({
      name,
      prefixLength: typeof prefixLength === 'number' ? prefixLength : parseInt(prefixLength, 10)
    }));
  }
}
