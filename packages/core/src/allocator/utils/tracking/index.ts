/**
 * @module allocator/utils/tracking
 * @description CIDR allocation tracking and space management.
 *
 * Provides utilities for tracking allocated CIDR blocks and managing
 * remaining address space. Used internally by allocators to prevent
 * overlaps and optimize utilization.
 *
 * @example
 * ```typescript
 * import { CidrTracker, RemainingSpaceManager } from '@subnetter/core';
 *
 * // Track allocated CIDRs
 * const tracker = new CidrTracker();
 * tracker.add('10.0.0.0/24');
 * tracker.add('10.0.1.0/24');
 *
 * console.log(tracker.isAllocated('10.0.0.128/25')); // true (overlaps)
 * console.log(tracker.isAllocated('10.0.2.0/24'));   // false
 * ```
 *
 * @packageDocumentation
 */

export { CidrTracker } from './tracker';
export { RemainingSpaceManager } from './space-manager';
