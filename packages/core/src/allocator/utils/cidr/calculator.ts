/**
 * @module allocator/utils/cidr/calculator
 * @description CIDR calculation and validation utilities.
 *
 * Provides functions for validating CIDR notation, calculating usable IPs,
 * checking for overlaps, and subdividing address blocks. These are the
 * foundational utilities used by the allocation engine.
 *
 * @remarks
 * All functions handle IPv4 CIDR notation in the format `a.b.c.d/n` where:
 * - `a.b.c.d` is a valid IPv4 address (each octet 0-255)
 * - `n` is the prefix length (0-32)
 *
 * @example
 * ```typescript
 * import {
 *   isValidIpv4Cidr,
 *   calculateUsableIps,
 *   subdivideIpv4Cidr
 * } from '@subnetter/core';
 *
 * if (isValidIpv4Cidr('10.0.0.0/16')) {
 *   const usable = calculateUsableIps('10.0.0.0/16');
 *   console.log(`Usable IPs: ${usable}`); // 65534
 *
 *   const subnets = subdivideIpv4Cidr('10.0.0.0/16', 24);
 *   console.log(`Subnets: ${subnets.length}`); // 256
 * }
 * ```
 *
 * @packageDocumentation
 */

import {
  isValidIpv4Cidr as validateCidr,
  checkCidrOverlap,
  calculateSubnetInfo,
  subdivideCidr,
} from '@subnetter/cidr-utils';
import { createLogger } from '../../../utils/logger';
import { AllocationError, ErrorCode } from '../../../utils/errors';

/**
 * Logger instance for CIDR calculator operations.
 * @internal
 */
const logger = createLogger('CidrCalculator');

/**
 * Validates if a string is valid IPv4 CIDR notation.
 *
 * @remarks
 * Checks that the string matches the format `a.b.c.d/n` where each
 * octet is 0-255 and the prefix length is 0-32.
 *
 * @param cidr - String to validate (e.g., "10.0.0.0/8")
 * @returns `true` if valid CIDR notation, `false` otherwise
 *
 * @example
 * ```typescript
 * isValidIpv4Cidr('10.0.0.0/8');      // true
 * isValidIpv4Cidr('192.168.1.0/24');  // true
 * isValidIpv4Cidr('256.0.0.0/8');     // false (invalid octet)
 * isValidIpv4Cidr('10.0.0.0/33');     // false (invalid prefix)
 * isValidIpv4Cidr('10.0.0.0');        // false (no prefix)
 * ```
 */
export function isValidIpv4Cidr(cidr: string): boolean {
  try {
    logger.trace(`Validating IPv4 CIDR: ${cidr}`);
    const result = validateCidr(cidr);
    logger.trace(`CIDR ${cidr} is ${result ? 'valid' : 'invalid'}`);
    return result;
  } catch (e) {
    logger.debug(`Error validating CIDR ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Calculates the number of usable IP addresses in a CIDR block.
 *
 * @remarks
 * For standard subnets (/30 and smaller prefix), usable IPs = 2^(32-prefix) - 2,
 * accounting for the network address and broadcast address.
 *
 * Special cases:
 * - `/31`: Returns 2 (point-to-point links, RFC 3021)
 * - `/32`: Returns 1 (single host)
 *
 * @param cidr - CIDR block to calculate (e.g., "10.0.0.0/24")
 * @returns Number of usable IP addresses
 *
 * @throws {@link AllocationError}
 * Thrown with `INVALID_CIDR_FORMAT` if the CIDR is malformed.
 *
 * @example
 * ```typescript
 * calculateUsableIps('10.0.0.0/24');  // 254
 * calculateUsableIps('10.0.0.0/16');  // 65534
 * calculateUsableIps('10.0.0.0/31');  // 2
 * calculateUsableIps('10.0.0.1/32');  // 1
 * ```
 */
export function calculateUsableIps(cidr: string): number {
  try {
    logger.trace(`Calculating usable IPs for ${cidr}`);

    if (!isValidIpv4Cidr(cidr)) {
      logger.warn(`Invalid IPv4 CIDR format: ${cidr}`);
      throw new AllocationError(
        `Invalid IPv4 CIDR format: ${cidr}`,
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr }
      );
    }

    const info = calculateSubnetInfo(cidr);
    logger.debug(`CIDR ${cidr} has ${info.usableIps} usable IPs`);

    return info.usableIps;
  } catch (e) {
    if (e instanceof AllocationError) {
      throw e;
    }
    logger.error(`Error calculating usable IPs for ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    throw new AllocationError(
      `Error calculating usable IPs for ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`,
      ErrorCode.INVALID_CIDR_FORMAT,
      { cidr, rawError: e }
    );
  }
}

/**
 * Checks if two CIDR blocks overlap.
 *
 * @remarks
 * Two CIDRs overlap if any IP address is contained in both blocks.
 * This includes cases where one block is entirely contained within another.
 *
 * @param cidr1 - First CIDR block
 * @param cidr2 - Second CIDR block
 * @returns `true` if the CIDRs overlap, `false` otherwise
 *
 * @throws {@link AllocationError}
 * Thrown with `INVALID_CIDR_FORMAT` if either CIDR is malformed.
 *
 * @example
 * ```typescript
 * doCidrsOverlap('10.0.0.0/8', '10.1.0.0/16');    // true (contained)
 * doCidrsOverlap('10.0.0.0/24', '10.0.0.128/25'); // true (overlaps)
 * doCidrsOverlap('10.0.0.0/24', '10.0.1.0/24');   // false (adjacent)
 * doCidrsOverlap('10.0.0.0/8', '172.16.0.0/12');  // false (separate)
 * ```
 */
export function doCidrsOverlap(cidr1: string, cidr2: string): boolean {
  try {
    logger.trace(`Checking if ${cidr1} and ${cidr2} overlap`);

    if (!isValidIpv4Cidr(cidr1)) {
      logger.warn(`Invalid IPv4 CIDR format for first CIDR: ${cidr1}`);
      throw new AllocationError(
        `Invalid IPv4 CIDR format for first CIDR: ${cidr1}`,
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr: cidr1 }
      );
    }

    if (!isValidIpv4Cidr(cidr2)) {
      logger.warn(`Invalid IPv4 CIDR format for second CIDR: ${cidr2}`);
      throw new AllocationError(
        `Invalid IPv4 CIDR format for second CIDR: ${cidr2}`,
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr: cidr2 }
      );
    }

    const result = checkCidrOverlap(cidr1, cidr2);
    logger.debug(`CIDRs ${cidr1} and ${cidr2} ${result ? 'do' : 'do not'} overlap`);
    return result;
  } catch (e) {
    if (e instanceof AllocationError) {
      throw e;
    }
    logger.error(`Error checking if CIDRs overlap (${cidr1}, ${cidr2}): ${e instanceof Error ? e.message : 'Unknown error'}`);
    throw new AllocationError(
      `Error checking if CIDRs overlap (${cidr1}, ${cidr2}): ${e instanceof Error ? e.message : 'Unknown error'}`,
      ErrorCode.CIDR_OVERLAP,
      { cidr1, cidr2, rawError: e }
    );
  }
}

/**
 * Subdivides a CIDR block into smaller blocks of a specified prefix length.
 *
 * @remarks
 * The new prefix length must be greater than or equal to the current prefix.
 * The number of resulting subnets is 2^(newPrefix - currentPrefix).
 *
 * @param cidr - CIDR block to subdivide (e.g., "10.0.0.0/16")
 * @param newPrefixLength - Target prefix length for subnets (must be >= current)
 * @returns Array of subdivided CIDR blocks in sequential order
 *
 * @throws {@link AllocationError}
 * Thrown with `INVALID_CIDR_FORMAT` if the CIDR is malformed or prefix > 32.
 *
 * @throws {@link AllocationError}
 * Thrown with `INSUFFICIENT_SPACE` if new prefix < current prefix.
 *
 * @example
 * ```typescript
 * // Split /16 into /24 subnets (256 subnets)
 * subdivideIpv4Cidr('10.0.0.0/16', 24);
 * // Returns: ['10.0.0.0/24', '10.0.1.0/24', ..., '10.0.255.0/24']
 *
 * // Split /24 into /26 subnets (4 subnets)
 * subdivideIpv4Cidr('192.168.1.0/24', 26);
 * // Returns: ['192.168.1.0/26', '192.168.1.64/26', '192.168.1.128/26', '192.168.1.192/26']
 *
 * // Same prefix returns original
 * subdivideIpv4Cidr('10.0.0.0/24', 24);
 * // Returns: ['10.0.0.0/24']
 * ```
 */
export function subdivideIpv4Cidr(cidr: string, newPrefixLength: number): string[] {
  try {
    logger.trace(`Subdividing ${cidr} into /${newPrefixLength} blocks`);

    if (!isValidIpv4Cidr(cidr)) {
      logger.warn(`Invalid IPv4 CIDR format: ${cidr}`);
      throw new AllocationError(
        `Invalid IPv4 CIDR format: ${cidr}`,
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr }
      );
    }

    const currentPrefix = parseInt(cidr.split('/')[1], 10);

    if (newPrefixLength === currentPrefix) {
      logger.debug(`New prefix length ${newPrefixLength} equals current prefix length ${currentPrefix}, returning original CIDR`);
      return [cidr];
    }

    if (newPrefixLength < currentPrefix) {
      logger.warn(`New prefix length ${newPrefixLength} must be greater than current prefix length ${currentPrefix}`);
      throw new AllocationError(
        `New prefix length ${newPrefixLength} must be greater than current prefix length ${currentPrefix}`,
        ErrorCode.INSUFFICIENT_SPACE,
        { cidr, currentPrefix, newPrefixLength }
      );
    }

    if (newPrefixLength > 32) {
      logger.warn(`New prefix length ${newPrefixLength} cannot be greater than 32`);
      throw new AllocationError(
        `New prefix length ${newPrefixLength} cannot be greater than 32`,
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr, newPrefixLength }
      );
    }

    const prefixDelta = newPrefixLength - currentPrefix;
    const subdivisionResult = subdivideCidr(cidr, prefixDelta);

    logger.debug(`Subdivided ${cidr} into ${subdivisionResult.subnets.length} blocks: ${subdivisionResult.subnets.join(', ')}`);
    return subdivisionResult.subnets;
  } catch (e) {
    if (e instanceof AllocationError) {
      throw e;
    }
    logger.error(`Error subdividing CIDR ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    throw new AllocationError(
      `Error subdividing CIDR ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`,
      ErrorCode.INSUFFICIENT_SPACE,
      { cidr, newPrefixLength, rawError: e }
    );
  }
}

/**
 * Calculates the minimum prefix bits needed to accommodate a count of subnets.
 *
 * @remarks
 * Returns the number of bits to add to a prefix length to create at least
 * `count` subnets. Formula: ceil(log2(count)).
 *
 * @param count - Number of subnets needed (must be positive)
 * @returns Number of bits to add to the current prefix
 *
 * @throws {@link AllocationError}
 * Thrown with `INVALID_OPERATION` if count is not positive.
 *
 * @example
 * ```typescript
 * calculateRequiredPrefixLength(1);   // 0 (no subdivision needed)
 * calculateRequiredPrefixLength(2);   // 1 (adds 1 bit)
 * calculateRequiredPrefixLength(3);   // 2 (needs 2 bits for 4 slots)
 * calculateRequiredPrefixLength(4);   // 2
 * calculateRequiredPrefixLength(5);   // 3 (needs 3 bits for 8 slots)
 * ```
 */
export function calculateRequiredPrefixLength(count: number): number {
  logger.trace(`Calculating prefix length required for ${count} subnets`);

  if (count <= 0) {
    logger.warn(`Count must be positive, got ${count}`);
    throw new AllocationError(
      `Count must be positive, got ${count}`,
      ErrorCode.INVALID_OPERATION,
      { count }
    );
  }

  // Calculate bits needed: ceil(log2(count))
  const bits = Math.ceil(Math.log2(count));
  logger.debug(`Need to add ${bits} bits to prefix to accommodate ${count} subnets`);

  return bits;
}

/**
 * Calculates the optimal prefix length for subdividing a CIDR to fit a count.
 *
 * @remarks
 * Determines the target prefix length that will provide at least `count`
 * equal-sized subnets from the given CIDR block.
 *
 * @param cidr - Source CIDR block to subdivide
 * @param count - Number of subnets needed
 * @returns Optimal prefix length for the subnets
 *
 * @throws {@link AllocationError}
 * Thrown with `INVALID_CIDR_FORMAT` if the CIDR is malformed.
 *
 * @throws {@link AllocationError}
 * Thrown with `INSUFFICIENT_SPACE` if the CIDR cannot accommodate the count
 * (would require prefix > 32).
 *
 * @example
 * ```typescript
 * // /16 can hold 256 /24 subnets
 * calculateOptimalPrefixLength('10.0.0.0/16', 100);  // 24
 *
 * // /24 can hold 4 /26 subnets
 * calculateOptimalPrefixLength('10.0.0.0/24', 4);    // 26
 *
 * // /24 cannot hold 1000 subnets (would need /34)
 * calculateOptimalPrefixLength('10.0.0.0/24', 1000); // throws INSUFFICIENT_SPACE
 * ```
 */
export function calculateOptimalPrefixLength(cidr: string, count: number): number {
  try {
    logger.trace(`Calculating optimal prefix length for ${cidr} to accommodate ${count} subnets`);

    if (!isValidIpv4Cidr(cidr)) {
      logger.warn(`Invalid IPv4 CIDR format: ${cidr}`);
      throw new AllocationError(
        `Invalid IPv4 CIDR format: ${cidr}`,
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr }
      );
    }

    const currentPrefix = parseInt(cidr.split('/')[1], 10);
    const requiredBits = calculateRequiredPrefixLength(count);
    const newPrefix = currentPrefix + requiredBits;

    if (newPrefix > 32) {
      logger.warn(`CIDR ${cidr} cannot accommodate ${count} subnets (would require prefix length ${newPrefix})`);
      throw new AllocationError(
        `CIDR ${cidr} cannot accommodate ${count} subnets (would require prefix length ${newPrefix})`,
        ErrorCode.INSUFFICIENT_SPACE,
        { cidr, count, requiredBits, newPrefix }
      );
    }

    logger.debug(`Optimal prefix length for ${cidr} to accommodate ${count} subnets is /${newPrefix}`);
    return newPrefix;
  } catch (e) {
    if (e instanceof AllocationError) {
      throw e;
    }
    logger.error(`Error calculating optimal prefix length: ${e instanceof Error ? e.message : 'Unknown error'}`);
    throw new AllocationError(
      `Error calculating optimal prefix length: ${e instanceof Error ? e.message : 'Unknown error'}`,
      ErrorCode.INSUFFICIENT_SPACE,
      { cidr, count, rawError: e }
    );
  }
}
