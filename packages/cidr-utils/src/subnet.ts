/**
 * Subnet allocation utilities
 */

import { CidrErrorType } from './types';
import { validateIpv4Cidr, CidrError } from './validator';
import { normalizeCidr } from './parser';
import { checkCidrOverlap, subdivideCidr } from './calculator';

/**
 * Finds the next available CIDR block within a parent CIDR
 * 
 * @param parentCidr The parent CIDR block to allocate from
 * @param newPrefix The prefix length for the new subnet
 * @param allocatedCidrs Array of already allocated CIDR blocks to avoid
 * @returns A new non-overlapping CIDR block or null if no space is available
 * @throws {CidrError} If any CIDR is invalid
 */
export function findNextAvailableCidr(
  parentCidr: string,
  newPrefix: number,
  allocatedCidrs: string[]
): string | null {
  validateIpv4Cidr(parentCidr);
  
  // Normalize the parent CIDR to ensure we're working with the network address
  const normalizedParentCidr = normalizeCidr(parentCidr);
  
  const [, parentPrefixStr] = normalizedParentCidr.split('/');
  const parentPrefix = parseInt(parentPrefixStr, 10);
  
  // Validate new prefix length
  if (newPrefix < parentPrefix) {
    throw new CidrError(
      `Invalid prefix: ${newPrefix} is smaller than parent prefix ${parentPrefix}`,
      CidrErrorType.INVALID_PREFIX
    );
  }
  
  if (newPrefix > 32) {
    throw new CidrError(
      `Invalid prefix: ${newPrefix} exceeds maximum of 32`,
      CidrErrorType.INVALID_PREFIX
    );
  }
  
  // If parent CIDR and requested CIDR are the same size, just return parent if not already allocated
  if (parentPrefix === newPrefix) {
    // Check if parent CIDR overlaps with any allocated CIDR
    const isOverlapping = allocatedCidrs.some(
      allocatedCidr => checkCidrOverlap(normalizedParentCidr, allocatedCidr)
    );
    
    return isOverlapping ? null : normalizedParentCidr;
  }
  
  // Divide parent CIDR into subnets of the requested size
  const prefixDiff = newPrefix - parentPrefix;
  const result = subdivideCidr(normalizedParentCidr, prefixDiff);
  
  // Find the first subnet that doesn't overlap with allocated CIDRs
  for (const subnet of result.subnets) {
    const normalizedSubnet = normalizeCidr(subnet);
    const isOverlapping = allocatedCidrs.some(
      allocatedCidr => checkCidrOverlap(normalizedSubnet, allocatedCidr)
    );
    
    if (!isOverlapping) {
      return normalizedSubnet;
    }
  }
  
  // No available subnet found
  return null;
}

/**
 * Allocates multiple CIDR blocks of the same size from a parent CIDR
 * 
 * @param parentCidr The parent CIDR block to allocate from
 * @param newPrefix The prefix length for the new subnets
 * @param count Number of CIDR blocks to allocate
 * @param allocatedCidrs Array of already allocated CIDR blocks to avoid
 * @returns Array of allocated CIDR blocks, or empty array if there's not enough space
 * @throws {CidrError} If any CIDR is invalid
 */
export function allocateMultipleCidrs(
  parentCidr: string,
  newPrefix: number,
  count: number,
  allocatedCidrs: string[] = []
): string[] {
  validateIpv4Cidr(parentCidr);
  
  if (count <= 0) {
    return [];
  }
  
  const result: string[] = [];
  const currentAllocated = [...allocatedCidrs];
  
  for (let i = 0; i < count; i++) {
    const nextCidr = findNextAvailableCidr(parentCidr, newPrefix, currentAllocated);
    
    if (nextCidr === null) {
      // Not enough space for all requested CIDRs
      break;
    }
    
    result.push(nextCidr);
    currentAllocated.push(nextCidr);
  }
  
  return result;
}

/**
 * Checks if a CIDR block is available (not overlapping with allocated blocks)
 * 
 * @param cidr The CIDR block to check
 * @param allocatedCidrs Array of already allocated CIDR blocks
 * @returns true if the CIDR is available, false otherwise
 * @throws {CidrError} If any CIDR is invalid
 */
export function isCidrAvailable(cidr: string, allocatedCidrs: string[]): boolean {
  validateIpv4Cidr(cidr);
  
  const normalizedCidr = normalizeCidr(cidr);
  
  return !allocatedCidrs.some(allocatedCidr => checkCidrOverlap(normalizedCidr, allocatedCidr));
}

/**
 * Merges overlapping or adjacent CIDR blocks when possible
 * 
 * @param cidrs Array of CIDR blocks to merge
 * @returns Array of merged CIDR blocks (fewer or equal in number to input)
 * @throws {CidrError} If any CIDR is invalid
 */
export function mergeCidrs(cidrs: string[]): string[] {
  // Implementation of CIDR merging requires more complex algorithms
  // This is just a placeholder for now
  return [...cidrs];
} 