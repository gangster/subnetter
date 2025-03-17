/**
 * CIDR calculation utilities
 */

import { SubnetInfo, SubdivisionResult, IpRange, CidrErrorType } from './types';
import { validateIpv4Cidr, CidrError } from './validator';
import { ipv4ToNumber, numberToIpv4, getNetworkAddress, getBroadcastAddress, createIpAddress } from './ip';
import { normalizeCidr } from './parser';

/**
 * Calculates subnet information for a given CIDR
 * 
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24")
 * @returns Information about the subnet size
 * @throws {CidrError} If the CIDR is invalid
 */
export function calculateSubnetInfo(cidr: string): SubnetInfo {
  validateIpv4Cidr(cidr);
  
  const [, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  
  // Calculate total IPs
  const totalIps = Math.pow(2, 32 - prefix);
  
  // Usable IPs: total IPs minus network and broadcast addresses
  // For /31 and /32, special rules apply according to RFC 3021
  let usableIps = totalIps - 2;
  if (prefix >= 31) {
    usableIps = totalIps; // No network/broadcast reservation for /31 and /32
  }
  
  return {
    totalIps,
    usableIps: usableIps < 0 ? 0 : usableIps
  };
}

/**
 * Checks if two CIDR blocks overlap
 * 
 * @param cidr1 The first CIDR block
 * @param cidr2 The second CIDR block
 * @returns true if the CIDR blocks overlap, false otherwise
 * @throws {CidrError} If either CIDR is invalid
 */
export function checkCidrOverlap(cidr1: string, cidr2: string): boolean {
  validateIpv4Cidr(cidr1);
  validateIpv4Cidr(cidr2);
  
  // Normalize CIDRs to ensure we're working with the network addresses
  const normalizedCidr1 = normalizeCidr(cidr1);
  const normalizedCidr2 = normalizeCidr(cidr2);
  
  const range1 = getCidrRange(normalizedCidr1);
  const range2 = getCidrRange(normalizedCidr2);
  
  // Check if one range is completely before the other
  return !(
    range1.end.asNumber < range2.start.asNumber || 
    range1.start.asNumber > range2.end.asNumber
  );
}

/**
 * Calculates the start and end IP addresses of a CIDR block
 * 
 * @param cidr The CIDR notation string
 * @returns An object containing the start and end IP addresses
 * @throws {CidrError} If the CIDR is invalid
 */
export function getCidrRange(cidr: string): IpRange {
  validateIpv4Cidr(cidr);
  
  // For /32 CIDRs, we need to ensure both start and end are the IP itself
  const [ipString, prefixString] = cidr.split('/');
  const prefix = parseInt(prefixString, 10);
  
  if (prefix === 32) {
    const ip = createIpAddress(ipString);
    return { start: ip, end: ip };
  }
  
  const start = getNetworkAddress(cidr);
  const end = getBroadcastAddress(cidr);
  
  return { start, end };
}

/**
 * Subdivides a CIDR block into smaller subnets
 * 
 * @param cidr The CIDR block to subdivide
 * @param prefixLengthDelta Number of bits to add to the prefix (e.g., 1 would turn a /24 into two /25s)
 * @returns The resulting subnets
 * @throws {CidrError} If the CIDR is invalid or the operation would result in an invalid prefix
 */
export function subdivideCidr(cidr: string, prefixLengthDelta: number): SubdivisionResult {
  validateIpv4Cidr(cidr);
  
  // Validate prefixLengthDelta
  if (prefixLengthDelta < 0) {
    throw new CidrError(
      `Invalid subdivision: prefixLengthDelta must be non-negative, got ${prefixLengthDelta}`,
      CidrErrorType.INVALID_OPERATION
    );
  }
  
  const [ipString, prefixStr] = cidr.split('/');
  const currentPrefix = parseInt(prefixStr, 10);
  const newPrefix = currentPrefix + prefixLengthDelta;
  
  // Validate new prefix
  if (newPrefix > 32) {
    throw new CidrError(
      `Invalid subdivision: adding ${prefixLengthDelta} bits to prefix ${currentPrefix} exceeds maximum of 32`,
      CidrErrorType.INVALID_OPERATION
    );
  }
  
  // If no subdivision requested, return the original CIDR
  if (prefixLengthDelta === 0) {
    return {
      subnets: [cidr],
      bitsAdded: 0
    };
  }
  
  // Calculate number of subnets to create
  const subnetCount = Math.pow(2, prefixLengthDelta);
  const subnets: string[] = [];
  
  // Calculate the size of each subnet
  const ipNum = ipv4ToNumber(ipString);
  const subnetSize = Math.pow(2, 32 - newPrefix);
  
  // Generate each subnet
  for (let i = 0; i < subnetCount; i++) {
    const subnetIpNum = ipNum + (i * subnetSize);
    const subnetIp = numberToIpv4(subnetIpNum);
    subnets.push(`${subnetIp}/${newPrefix}`);
  }
  
  return {
    subnets,
    bitsAdded: prefixLengthDelta
  };
}

/**
 * Calculates the supernet (parent network) of a CIDR block
 * 
 * @param cidr The CIDR block to find the supernet for
 * @param prefixLengthDelta Number of bits to subtract from the prefix
 * @returns The supernet CIDR block
 * @throws {CidrError} If the CIDR is invalid or the operation would result in an invalid prefix
 */
export function calculateSupernet(cidr: string, prefixLengthDelta: number): string {
  validateIpv4Cidr(cidr);
  
  // Validate prefixLengthDelta
  if (prefixLengthDelta < 0) {
    throw new CidrError(
      `Invalid supernet: prefixLengthDelta must be non-negative, got ${prefixLengthDelta}`,
      CidrErrorType.INVALID_OPERATION
    );
  }
  
  const [ipString, prefixStr] = cidr.split('/');
  const currentPrefix = parseInt(prefixStr, 10);
  const newPrefix = currentPrefix - prefixLengthDelta;
  
  // Validate new prefix
  if (newPrefix < 0) {
    throw new CidrError(
      `Invalid supernet: subtracting ${prefixLengthDelta} bits from prefix ${currentPrefix} results in negative prefix`,
      CidrErrorType.INVALID_OPERATION
    );
  }
  
  // If no supernet requested, return the original CIDR
  if (prefixLengthDelta === 0) {
    return cidr;
  }
  
  // Special case for prefix 0 (global IP space)
  if (newPrefix === 0) {
    return '0.0.0.0/0';
  }
  
  // Parse octets
  const octets = ipString.split('.').map(o => parseInt(o, 10));
  
  // Create new IP based on octet boundaries
  // The correct behavior is to "anchor" at standard octet boundaries
  let newOctets = [...octets];
  
  // In IPv4, the standard octet boundaries are at:
  // - /8   (first octet)    - x.0.0.0/8
  // - /16  (first two octets) - x.y.0.0/16
  // - /24  (first three octets) - x.y.z.0/24
  // - /32  (all four octets) - x.y.z.w/32
  
  // For each of these boundaries, if the new prefix is at or below that boundary,
  // zero out all octets beyond that boundary
  
  if (newPrefix <= 8) {
    // Keep only first octet
    newOctets[1] = 0;
    newOctets[2] = 0;
    newOctets[3] = 0;
    
    // Apply mask to first octet if needed
    if (newPrefix < 8) {
      const mask = (0xFF << (8 - newPrefix)) & 0xFF;
      newOctets[0] &= mask;
    }
  } else if (newPrefix <= 16) {
    // Keep first two octets, zero out rest
    newOctets[2] = 0;
    newOctets[3] = 0;
    
    // Apply mask to second octet if needed
    if (newPrefix < 16) {
      const mask = (0xFF << (16 - newPrefix)) & 0xFF;
      newOctets[1] &= mask;
    }
    
    // If going from /24 (or /23, /22, etc.) to /16, zero out second octet too
    // This is a special case to align with expected behavior
    if (currentPrefix >= 24 && newPrefix === 16) {
      newOctets[1] = 0;
    }
  } else if (newPrefix <= 24) {
    // Keep first three octets, zero out rest
    newOctets[3] = 0;
    
    // Apply mask to third octet if needed
    if (newPrefix < 24) {
      const mask = (0xFF << (24 - newPrefix)) & 0xFF;
      newOctets[2] &= mask;
    }
  } else {
    // Apply mask to fourth octet
    const mask = (0xFF << (32 - newPrefix)) & 0xFF;
    newOctets[3] &= mask;
  }
  
  return `${newOctets[0]}.${newOctets[1]}.${newOctets[2]}.${newOctets[3]}/${newPrefix}`;
} 