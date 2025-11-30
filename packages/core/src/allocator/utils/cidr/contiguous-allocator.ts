/**
 * @module allocator/utils/cidr/contiguous-allocator
 * @description Contiguous CIDR block allocation within a base range.
 *
 * Provides sequential, non-overlapping CIDR allocation from a base block.
 * Allocations are made contiguously, starting from the beginning of the
 * address space and advancing after each allocation.
 *
 * @remarks
 * This allocator ensures:
 * - **Contiguous allocation**: No gaps between allocated blocks
 * - **Sequential ordering**: Allocations proceed in address order
 * - **No overlaps**: Each allocation is guaranteed unique
 * - **Deterministic**: Same sequence of allocations produces same results
 *
 * @example
 * ```typescript
 * import { ContiguousAllocator } from '@subnetter/core';
 *
 * const allocator = new ContiguousAllocator('10.0.0.0/16');
 *
 * const subnet1 = allocator.allocate('/24'); // '10.0.0.0/24'
 * const subnet2 = allocator.allocate('/24'); // '10.0.1.0/24'
 * const subnet3 = allocator.allocate('/24'); // '10.0.2.0/24'
 * ```
 *
 * @see {@link HierarchicalAllocator} for multi-level allocation
 *
 * @packageDocumentation
 */

import { isValidIpv4Cidr } from './calculator';
import { AllocationError, ErrorCode } from '../../../utils/errors';
import { createLogger } from '../../../utils/logger';
import * as ipaddr from 'ipaddr.js';

/**
 * Logger instance for contiguous allocator operations.
 * @internal
 */
const logger = createLogger('ContiguousAllocator');

/**
 * Allocates CIDR blocks contiguously from a base CIDR.
 *
 * @remarks
 * The allocator maintains an internal pointer that advances after each
 * allocation. All allocations are sequential and non-overlapping.
 *
 * Use {@link reset} to return to the initial state and reallocate
 * from the beginning.
 *
 * @example
 * ```typescript
 * import { ContiguousAllocator } from '@subnetter/core';
 *
 * // Create allocator with /16 base (65,536 addresses)
 * const allocator = new ContiguousAllocator('10.0.0.0/16');
 *
 * // Allocate /24 subnets (256 addresses each)
 * const subnet1 = allocator.allocate('/24'); // '10.0.0.0/24'
 * const subnet2 = allocator.allocate('/24'); // '10.0.1.0/24'
 *
 * // Check remaining space
 * console.log(allocator.getAvailableSpace()); // '10.0.2.0/16'
 *
 * // Reset and reallocate
 * allocator.reset();
 * const fresh = allocator.allocate('/24'); // '10.0.0.0/24' again
 * ```
 *
 * @example
 * ```typescript
 * // Mixed prefix lengths
 * const allocator = new ContiguousAllocator('192.168.0.0/24');
 *
 * allocator.allocate('/26'); // '192.168.0.0/26' (64 addresses)
 * allocator.allocate('/27'); // '192.168.0.64/27' (32 addresses)
 * allocator.allocate('/27'); // '192.168.0.96/27' (32 addresses)
 * ```
 */
export class ContiguousAllocator {
  /**
   * Original base CIDR for this allocator.
   * @internal
   */
  private baseCidr: string;

  /**
   * Parsed base IP address.
   * @internal
   */
  private baseIp: ipaddr.IPv4;

  /**
   * Prefix length of the base CIDR.
   * @internal
   */
  private basePrefix: number;

  /**
   * Current position for the next allocation.
   * @internal
   */
  private currentIp: ipaddr.IPv4;

  /**
   * List of all allocated CIDR blocks.
   * @internal
   */
  private allocatedCidrs: string[] = [];

  /**
   * Creates a new ContiguousAllocator with the specified base CIDR.
   *
   * @param baseCidr - Base CIDR block to allocate from (e.g., "10.0.0.0/16")
   *
   * @throws {@link AllocationError}
   * Thrown with `INVALID_CIDR_FORMAT` if the base CIDR is malformed.
   *
   * @example
   * ```typescript
   * const allocator = new ContiguousAllocator('10.0.0.0/8');
   * ```
   */
  constructor(baseCidr: string) {
    if (!isValidIpv4Cidr(baseCidr)) {
      throw new AllocationError(
        `Invalid CIDR format: ${baseCidr}`,
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr: baseCidr }
      );
    }

    this.baseCidr = baseCidr;
    const [ipString, prefixString] = baseCidr.split('/');
    this.basePrefix = parseInt(prefixString, 10);
    this.baseIp = ipaddr.IPv4.parse(ipString);
    this.currentIp = this.baseIp;

    logger.debug(`Initialized contiguous allocator with base CIDR ${baseCidr}`);
  }

  /**
   * Allocates a CIDR block with the specified prefix length.
   *
   * @remarks
   * The allocation is made contiguously from the current position.
   * After allocation, the internal pointer advances to the next
   * available address.
   *
   * @param prefixLength - Prefix length for the new block.
   *                       Can include leading slash (e.g., "/24" or "24").
   * @returns The allocated CIDR block
   *
   * @throws {@link AllocationError}
   * Thrown with `INVALID_PREFIX_LENGTH` if the prefix is invalid (not 0-32).
   *
   * @throws {@link AllocationError}
   * Thrown with `INSUFFICIENT_ADDRESS_SPACE` if the requested block is larger
   * than the base CIDR or there's not enough space remaining.
   *
   * @example
   * ```typescript
   * const allocator = new ContiguousAllocator('10.0.0.0/16');
   *
   * allocator.allocate('/24');  // '10.0.0.0/24'
   * allocator.allocate('24');   // '10.0.1.0/24' (both formats work)
   * allocator.allocate('/20');  // '10.0.16.0/20' (larger block)
   * ```
   */
  public allocate(prefixLength: string): string {
    // Parse the prefix length (strip the / if present)
    const prefix = parseInt(prefixLength.startsWith('/') ? prefixLength.slice(1) : prefixLength, 10);

    // Verify the prefix is valid
    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      throw new AllocationError(
        `Invalid prefix length: ${prefixLength}`,
        ErrorCode.INVALID_PREFIX_LENGTH,
        { prefixLength }
      );
    }

    // Verify the requested block is not larger than the base CIDR
    if (prefix < this.basePrefix) {
      throw new AllocationError(
        `Requested prefix length ${prefix} is smaller than base CIDR prefix ${this.basePrefix}`,
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
        {
          requestedPrefix: prefix,
          basePrefix: this.basePrefix,
          baseCidr: this.baseCidr
        }
      );
    }

    // Calculate the size of the block in IP addresses
    const blockSize = Math.pow(2, 32 - prefix);

    // Verify we have enough space left
    const maxIp = this.baseIp.toByteArray().reduce((acc, byte, i) => acc + byte * Math.pow(256, 3 - i), 0);
    let currentIpValue = this.currentIp.toByteArray().reduce((acc, byte, i) => acc + byte * Math.pow(256, 3 - i), 0);
    const baseBlockSize = Math.pow(2, 32 - this.basePrefix);

    // Align current position to proper CIDR boundary for the requested prefix
    // A /24 must start on a 256-address boundary, /26 on 64-address boundary, etc.
    const alignedIpValue = Math.ceil(currentIpValue / blockSize) * blockSize;
    if (alignedIpValue !== currentIpValue) {
      logger.debug(`Aligning from ${this.currentIp.toString()} to next /${prefix} boundary`);
      currentIpValue = alignedIpValue;
      
      // Update currentIp to the aligned position
      const octet1 = (currentIpValue >> 24) & 0xFF;
      const octet2 = (currentIpValue >> 16) & 0xFF;
      const octet3 = (currentIpValue >> 8) & 0xFF;
      const octet4 = currentIpValue & 0xFF;
      this.currentIp = ipaddr.IPv4.parse(`${octet1}.${octet2}.${octet3}.${octet4}`);
    }

    if (currentIpValue + blockSize > maxIp + baseBlockSize) {
      throw new AllocationError(
        `Not enough space left for allocation with prefix /${prefix}`,
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
        {
          baseCidr: this.baseCidr,
          requestedPrefix: prefix,
          currentPosition: this.currentIp.toString()
        }
      );
    }

    // Create the CIDR block (now properly aligned)
    const allocatedCidr = `${this.currentIp.toString()}/${prefix}`;
    logger.debug(`Allocated CIDR block ${allocatedCidr}`);

    // Advance the current position
    const newIpValue = currentIpValue + blockSize;
    const octet1 = (newIpValue >> 24) & 0xFF;
    const octet2 = (newIpValue >> 16) & 0xFF;
    const octet3 = (newIpValue >> 8) & 0xFF;
    const octet4 = newIpValue & 0xFF;

    this.currentIp = ipaddr.IPv4.parse(`${octet1}.${octet2}.${octet3}.${octet4}`);

    // Add to allocated CIDRs
    this.allocatedCidrs.push(allocatedCidr);

    return allocatedCidr;
  }

  /**
   * Gets the current available space starting position.
   *
   * @remarks
   * Returns the CIDR notation for where the next allocation would start.
   * The prefix length matches the base CIDR prefix.
   *
   * @returns CIDR representing the start of available space
   *
   * @example
   * ```typescript
   * const allocator = new ContiguousAllocator('10.0.0.0/16');
   * console.log(allocator.getAvailableSpace()); // '10.0.0.0/16'
   *
   * allocator.allocate('/24');
   * console.log(allocator.getAvailableSpace()); // '10.0.1.0/16'
   * ```
   */
  public getAvailableSpace(): string {
    return `${this.currentIp.toString()}/${this.basePrefix}`;
  }

  /**
   * Resets the allocator to its initial state.
   *
   * @remarks
   * Clears all allocation history and returns the pointer to the
   * beginning of the address space. Useful for testing or when
   * regenerating allocations.
   *
   * @example
   * ```typescript
   * const allocator = new ContiguousAllocator('10.0.0.0/16');
   *
   * allocator.allocate('/24'); // '10.0.0.0/24'
   * allocator.allocate('/24'); // '10.0.1.0/24'
   *
   * allocator.reset();
   *
   * allocator.allocate('/24'); // '10.0.0.0/24' (starts over)
   * ```
   */
  public reset(): void {
    this.currentIp = this.baseIp;
    this.allocatedCidrs = [];
    logger.debug('Reset allocator to initial state');
  }

  /**
   * Gets all previously allocated CIDR blocks.
   *
   * @returns Copy of the array of allocated CIDRs in allocation order
   *
   * @example
   * ```typescript
   * const allocator = new ContiguousAllocator('10.0.0.0/16');
   *
   * allocator.allocate('/24');
   * allocator.allocate('/24');
   *
   * console.log(allocator.getAllocatedCidrs());
   * // ['10.0.0.0/24', '10.0.1.0/24']
   * ```
   */
  public getAllocatedCidrs(): string[] {
    return [...this.allocatedCidrs];
  }
}
