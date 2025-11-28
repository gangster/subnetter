/**
 * @module output/validator
 * @description Post-allocation validation for CIDR conflicts.
 *
 * Provides functions to verify that generated allocations have no
 * overlapping CIDR blocks. This serves as a final safety check
 * before deploying network infrastructure.
 *
 * @remarks
 * While the allocation engine is designed to prevent overlaps,
 * validation provides defense-in-depth, especially useful when:
 * - Debugging allocation issues
 * - Validating manually edited allocations
 * - Verifying imported or merged allocation sets
 *
 * @example
 * ```typescript
 * import {
 *   CidrAllocator,
 *   validateNoOverlappingCidrs
 * } from '@subnetter/core';
 *
 * const allocations = allocator.generateAllocations();
 *
 * const result = validateNoOverlappingCidrs(allocations);
 * if (!result.valid) {
 *   console.error('Overlaps detected:', result.overlaps);
 * }
 *
 * // Or throw on overlap
 * validateNoOverlappingCidrs(allocations, true);
 * ```
 *
 * @packageDocumentation
 */

import type { Allocation } from '../models/types';
import { createLogger } from '../utils/logger';
import { doCidrsOverlap } from '../allocator/utils/cidr';
import { ValidationError, ErrorCode } from '../utils/errors';

/**
 * Logger instance for validation operations.
 * @internal
 */
const logger = createLogger('Validator');

/**
 * Information about a detected CIDR overlap.
 *
 * @remarks
 * Contains both the overlapping CIDRs and their full allocation context,
 * enabling detailed error reporting and debugging.
 *
 * @example
 * ```typescript
 * const result = validateNoOverlappingCidrs(allocations);
 * for (const overlap of result.overlaps) {
 *   console.log(`Conflict: ${overlap.cidr1} vs ${overlap.cidr2}`);
 *   console.log(`  ${overlap.allocation1.accountName}/${overlap.allocation1.regionName}`);
 *   console.log(`  ${overlap.allocation2.accountName}/${overlap.allocation2.regionName}`);
 * }
 * ```
 */
export interface OverlapInfo {
  /**
   * First overlapping CIDR block.
   */
  cidr1: string;

  /**
   * Second overlapping CIDR block.
   */
  cidr2: string;

  /**
   * Full allocation context for the first CIDR.
   */
  allocation1: Allocation;

  /**
   * Full allocation context for the second CIDR.
   */
  allocation2: Allocation;
}

/**
 * Result of CIDR overlap validation.
 *
 * @example
 * ```typescript
 * const result = validateNoOverlappingCidrs(allocations);
 *
 * if (result.valid) {
 *   console.log('No overlaps detected');
 * } else {
 *   console.log(`Found ${result.overlaps.length} conflicts`);
 * }
 * ```
 */
export interface ValidationResult {
  /**
   * Whether all allocations passed validation (no overlaps).
   */
  valid: boolean;

  /**
   * Array of detected overlaps. Empty if `valid` is `true`.
   */
  overlaps: OverlapInfo[];
}

/**
 * Validates that no subnet CIDR blocks in the allocations overlap.
 *
 * @remarks
 * Performs an O(n²) pairwise comparison of all subnet CIDRs. For large
 * allocation sets (1000+ subnets), this may take a few seconds.
 *
 * Two modes of operation:
 * - **Report mode** (default): Returns results for inspection
 * - **Throw mode**: Throws immediately on first overlap
 *
 * @param allocations - Array of allocation objects to validate
 * @param throwOnOverlap - If `true`, throws on first overlap instead of
 *                         collecting all overlaps. Default: `false`
 * @returns Validation result with `valid` flag and any detected overlaps
 *
 * @throws {@link ValidationError}
 * Thrown with `CIDR_OVERLAP` if `throwOnOverlap` is `true` and overlaps exist.
 *
 * @example
 * ```typescript
 * import { validateNoOverlappingCidrs } from '@subnetter/core';
 *
 * // Check and report
 * const result = validateNoOverlappingCidrs(allocations);
 * if (!result.valid) {
 *   console.error(`Found ${result.overlaps.length} overlapping CIDRs`);
 *   result.overlaps.forEach(o => {
 *     console.error(`  ${o.cidr1} ↔ ${o.cidr2}`);
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Throw on overlap (for CI/CD pipelines)
 * try {
 *   validateNoOverlappingCidrs(allocations, true);
 *   console.log('Validation passed');
 * } catch (error) {
 *   console.error('Validation failed:', error.message);
 *   process.exit(1);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Detailed overlap reporting
 * const { valid, overlaps } = validateNoOverlappingCidrs(allocations);
 * if (!valid) {
 *   for (const { cidr1, cidr2, allocation1, allocation2 } of overlaps) {
 *     console.log(`Overlap detected:`);
 *     console.log(`  ${cidr1} (${allocation1.accountName}, ${allocation1.availabilityZone}, ${allocation1.subnetRole})`);
 *     console.log(`  ${cidr2} (${allocation2.accountName}, ${allocation2.availabilityZone}, ${allocation2.subnetRole})`);
 *   }
 * }
 * ```
 */
export function validateNoOverlappingCidrs(
  allocations: Allocation[],
  throwOnOverlap: boolean = false
): ValidationResult {
  logger.debug(`Validating ${allocations.length} allocations for CIDR overlaps`);

  const result: ValidationResult = {
    valid: true,
    overlaps: []
  };

  // Pairwise comparison of all allocations
  for (let i = 0; i < allocations.length; i++) {
    const allocation1 = allocations[i];
    const cidr1 = allocation1.subnetCidr;

    for (let j = i + 1; j < allocations.length; j++) {
      const allocation2 = allocations[j];
      const cidr2 = allocation2.subnetCidr;

      // Skip if either is missing a CIDR
      if (!cidr1 || !cidr2) continue;

      try {
        if (doCidrsOverlap(cidr1, cidr2)) {
          logger.warn(`CIDR overlap detected: ${cidr1} (${allocation1.accountName}, ${allocation1.regionName}, ${allocation1.availabilityZone}, ${allocation1.subnetRole}) overlaps with ${cidr2} (${allocation2.accountName}, ${allocation2.regionName}, ${allocation2.availabilityZone}, ${allocation2.subnetRole})`);

          result.valid = false;
          result.overlaps.push({
            cidr1,
            cidr2,
            allocation1,
            allocation2
          });
        }
      } catch (error) {
        logger.error(`Error checking overlap between ${cidr1} and ${cidr2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  if (result.valid) {
    logger.info(`Validation successful! No CIDR overlaps detected in ${allocations.length} allocations.`);
  } else {
    const message = `Found ${result.overlaps.length} CIDR overlaps in ${allocations.length} allocations.`;
    logger.error(message);

    if (throwOnOverlap) {
      throw new ValidationError(
        message,
        ErrorCode.CIDR_OVERLAP,
        { overlaps: result.overlaps.map(o => ({ cidr1: o.cidr1, cidr2: o.cidr2 })) }
      );
    }
  }

  return result;
}
