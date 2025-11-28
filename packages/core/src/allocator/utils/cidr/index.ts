/**
 * @module allocator/utils/cidr
 * @description CIDR calculation, validation, and allocation utilities.
 *
 * Provides the foundational CIDR operations used by the allocation engine:
 * - Validation of IPv4 CIDR notation
 * - Usable IP calculation
 * - Overlap detection
 * - Block subdivision
 * - Contiguous and hierarchical allocation
 *
 * @example
 * ```typescript
 * import {
 *   isValidIpv4Cidr,
 *   calculateUsableIps,
 *   doCidrsOverlap,
 *   subdivideIpv4Cidr,
 *   ContiguousAllocator
 * } from '@subnetter/core';
 *
 * // Validate and calculate
 * if (isValidIpv4Cidr('10.0.0.0/16')) {
 *   console.log(`Usable IPs: ${calculateUsableIps('10.0.0.0/16')}`);
 * }
 *
 * // Check overlaps
 * if (doCidrsOverlap('10.0.0.0/24', '10.0.0.128/25')) {
 *   console.log('CIDRs overlap!');
 * }
 *
 * // Subdivide
 * const subnets = subdivideIpv4Cidr('10.0.0.0/24', 26);
 * // ['10.0.0.0/26', '10.0.0.64/26', '10.0.0.128/26', '10.0.0.192/26']
 *
 * // Contiguous allocation
 * const allocator = new ContiguousAllocator('10.0.0.0/16');
 * const subnet1 = allocator.allocate('/24');
 * const subnet2 = allocator.allocate('/24');
 * ```
 *
 * @packageDocumentation
 */

export {
  isValidIpv4Cidr,
  calculateUsableIps,
  doCidrsOverlap,
  subdivideIpv4Cidr,
  calculateRequiredPrefixLength,
  calculateOptimalPrefixLength
} from './calculator';

export { ContiguousAllocator } from './contiguous-allocator';
export { HierarchicalAllocator } from './hierarchical-allocator';
