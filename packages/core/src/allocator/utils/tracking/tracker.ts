/**
 * @module allocator/utils/tracking/tracker
 * @description CIDR block tracking and overlap detection.
 *
 * Maintains a registry of allocated CIDR blocks and provides methods
 * to check for overlaps. Used internally by allocators to ensure
 * no duplicate or overlapping allocations.
 *
 * @remarks
 * The tracker supports deterministic ordering when
 * `DISABLE_DETERMINISTIC_ALLOCATION` is not set to 'true'. This ensures
 * consistent behavior across environments and test runs.
 *
 * @example
 * ```typescript
 * import { CidrTracker } from '@subnetter/core';
 *
 * const tracker = new CidrTracker();
 *
 * tracker.add('10.0.0.0/24');
 * tracker.add('10.0.1.0/24');
 *
 * console.log(tracker.isAllocated('10.0.0.0/25')); // true (overlaps)
 * console.log(tracker.isAllocated('10.0.2.0/24')); // false
 * ```
 *
 * @packageDocumentation
 */

import { doCidrsOverlap } from '../cidr';
import { createLogger } from '../../../utils/logger';

/**
 * Logger instance for tracker operations.
 * @internal
 */
const logger = createLogger('CidrTracker');

/**
 * Controls whether deterministic ordering is enabled.
 *
 * @remarks
 * Set `DISABLE_DETERMINISTIC_ALLOCATION=true` to disable sorting.
 * By default, allocations are sorted for consistent ordering.
 *
 * @internal
 */
const DETERMINISTIC_ALLOCATION = process.env.DISABLE_DETERMINISTIC_ALLOCATION !== 'true';

/**
 * Tracks allocated CIDR blocks and detects overlaps.
 *
 * @remarks
 * The tracker maintains an ordered list of allocated CIDRs and provides
 * methods to check for overlaps. When deterministic allocation is enabled
 * (default), CIDRs are sorted after each addition to ensure consistent
 * ordering across environments.
 *
 * @example
 * ```typescript
 * import { CidrTracker } from '@subnetter/core';
 *
 * const tracker = new CidrTracker();
 *
 * // Add allocations
 * tracker.add('10.0.0.0/24');
 * tracker.add('10.0.1.0/24');
 * tracker.add('172.16.0.0/16');
 *
 * // Check for overlaps
 * tracker.isAllocated('10.0.0.128/25'); // true (contained in 10.0.0.0/24)
 * tracker.isAllocated('10.0.2.0/24');   // false (no overlap)
 *
 * // Check exact match
 * tracker.has('10.0.0.0/24'); // true
 * tracker.has('10.0.0.0/25'); // false (not exact match)
 *
 * // Get all allocations
 * console.log(tracker.getAllocated());
 * // ['10.0.0.0/24', '10.0.1.0/24', '172.16.0.0/16']
 *
 * // Reset for reuse
 * tracker.reset();
 * ```
 */
export class CidrTracker {
  /**
   * List of allocated CIDR blocks.
   * @internal
   */
  private allocatedCidrs: string[] = [];

  /**
   * Resets the tracker, clearing all recorded allocations.
   *
   * @remarks
   * Use before regenerating allocations to start fresh.
   *
   * @example
   * ```typescript
   * tracker.add('10.0.0.0/24');
   * tracker.reset();
   * console.log(tracker.getAllocated()); // []
   * ```
   */
  public reset(): void {
    this.allocatedCidrs = [];
  }

  /**
   * Adds a CIDR block to the tracker.
   *
   * @remarks
   * When deterministic allocation is enabled (default), the list is
   * sorted after each addition by prefix length (ascending) and then
   * lexicographically by IP address. This ensures consistent ordering
   * regardless of insertion order.
   *
   * @param cidr - CIDR block to add (e.g., "10.0.0.0/24")
   *
   * @example
   * ```typescript
   * tracker.add('10.0.1.0/24');
   * tracker.add('10.0.0.0/24');
   *
   * // With deterministic allocation, order is normalized:
   * console.log(tracker.getAllocated());
   * // ['10.0.0.0/24', '10.0.1.0/24']
   * ```
   */
  public add(cidr: string): void {
    this.allocatedCidrs.push(cidr);

    // Sort for deterministic ordering
    if (DETERMINISTIC_ALLOCATION) {
      this.allocatedCidrs.sort((a, b) => {
        // Sort by prefix length first (smallest to largest)
        const prefixA = parseInt(a.split('/')[1], 10);
        const prefixB = parseInt(b.split('/')[1], 10);
        if (prefixA !== prefixB) {
          return prefixA - prefixB;
        }

        // Then lexicographically by IP address
        return a.localeCompare(b);
      });
      logger.debug(`Added CIDR ${cidr} with deterministic ordering enabled. Current count: ${this.allocatedCidrs.length}`);
    }
  }

  /**
   * Gets all allocated CIDR blocks.
   *
   * @returns Copy of the allocated CIDRs array
   *
   * @example
   * ```typescript
   * tracker.add('10.0.0.0/24');
   * tracker.add('10.0.1.0/24');
   *
   * const cidrs = tracker.getAllocated();
   * console.log(cidrs); // ['10.0.0.0/24', '10.0.1.0/24']
   * ```
   */
  public getAllocated(): string[] {
    return [...this.allocatedCidrs];
  }

  /**
   * Checks if a CIDR block exists in the tracker (exact match).
   *
   * @remarks
   * This checks for an exact string match, not overlap detection.
   * Use {@link isAllocated} to check for overlaps.
   *
   * @param cidr - CIDR block to check
   * @returns `true` if the exact CIDR exists in the tracker
   *
   * @example
   * ```typescript
   * tracker.add('10.0.0.0/24');
   *
   * tracker.has('10.0.0.0/24'); // true (exact match)
   * tracker.has('10.0.0.0/25'); // false (not exact match, even though contained)
   * ```
   */
  public has(cidr: string): boolean {
    return this.allocatedCidrs.includes(cidr);
  }

  /**
   * Checks if a CIDR block overlaps with any allocated block.
   *
   * @remarks
   * Returns `true` if the given CIDR overlaps with any previously
   * allocated block. This includes both containment (one inside
   * another) and partial overlap scenarios.
   *
   * When deterministic allocation is enabled, the check processes
   * CIDRs in sorted order for consistent behavior.
   *
   * @param cidr - CIDR block to check for overlap
   * @returns `true` if the CIDR overlaps with any allocated block
   *
   * @example
   * ```typescript
   * tracker.add('10.0.0.0/24');
   *
   * // Contained within allocated block
   * tracker.isAllocated('10.0.0.0/25');   // true
   * tracker.isAllocated('10.0.0.128/25'); // true
   *
   * // Contains allocated block
   * tracker.isAllocated('10.0.0.0/16');   // true
   *
   * // No overlap
   * tracker.isAllocated('10.0.1.0/24');   // false
   * tracker.isAllocated('172.16.0.0/16'); // false
   * ```
   */
  public isAllocated(cidr: string): boolean {
    logger.trace(`Checking if CIDR ${cidr} is already allocated`);

    // Process in sorted order for deterministic behavior
    const cidrsToCheck = DETERMINISTIC_ALLOCATION
      ? [...this.allocatedCidrs].sort((a, b) => a.localeCompare(b))
      : this.allocatedCidrs;

    for (const allocatedCidr of cidrsToCheck) {
      if (doCidrsOverlap(cidr, allocatedCidr)) {
        logger.trace(`CIDR ${cidr} overlaps with ${allocatedCidr}`);
        return true;
      }
    }

    logger.trace(`CIDR ${cidr} is not allocated`);
    return false;
  }
}
