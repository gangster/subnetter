/**
 * CIDR parsing utilities
 */

import { ParsedCidr } from './types';
import { validateIpv4Cidr } from './validator';
import { ipv4ToNumber, calculateSubnetMask } from './ip';

/**
 * Parses a CIDR notation string into its components
 * 
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24")
 * @returns A ParsedCidr object containing the components of the CIDR
 * @throws {CidrError} If the CIDR is invalid
 */
export function parseCidr(cidr: string): ParsedCidr {
  // Validate the CIDR before parsing
  validateIpv4Cidr(cidr);
  
  const [ipString, prefixString] = cidr.split('/');
  const prefix = parseInt(prefixString, 10);
  
  return {
    cidr,
    ip: ipString,
    prefix,
    version: 4 // Only supporting IPv4 for now
  };
}

/**
 * Normalizes a CIDR block to ensure the IP portion represents the network address
 * 
 * @param cidr The CIDR notation string (e.g., "192.168.1.100/24")
 * @returns The normalized CIDR with network address (e.g., "192.168.1.0/24")
 * @throws {CidrError} If the CIDR is invalid
 */
export function normalizeCidr(cidr: string): string {
  validateIpv4Cidr(cidr);
  
  const [ip, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  
  // Special cases: /32 CIDRs represent a single IP, so no normalization needed
  if (prefix === 32) {
    return cidr;
  }
  
  const ipNum = ipv4ToNumber(ip);
  const mask = calculateSubnetMask(prefix);
  
  // Apply the mask to get the network address
  const networkNum = ipNum & mask;
  
  // Convert back to string format
  const octets = [
    (networkNum >>> 24) & 0xFF,
    (networkNum >>> 16) & 0xFF,
    (networkNum >>> 8) & 0xFF,
    networkNum & 0xFF
  ].join('.');
  
  return `${octets}/${prefix}`;
} 