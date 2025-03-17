/**
 * IP address manipulation utilities
 */

import { IpAddress, CidrErrorType } from './types';
import { validateIpv4Cidr, CidrError } from './validator';

/**
 * Converts an IPv4 address string to a numeric representation
 * 
 * @param ip IPv4 address string (e.g., "192.168.1.0")
 * @returns The numeric representation of the IP address
 * @throws {CidrError} If the IP address is invalid
 */
export function ipv4ToNumber(ip: string): number {
  const octets = ip.split('.');
  if (octets.length !== 4) {
    throw new CidrError(
      `Invalid IPv4 address: ${ip} (should have 4 octets)`,
      CidrErrorType.INVALID_IP
    );
  }

  // Convert each octet to a number and validate
  const octetValues = octets.map(octet => {
    const octetInt = parseInt(octet, 10);
    if (isNaN(octetInt) || octetInt < 0 || octetInt > 255) {
      throw new CidrError(
        `Invalid IPv4 address octet: ${octet} in ${ip} (each octet must be a number between 0 and 255)`,
        CidrErrorType.INVALID_IP
      );
    }
    return octetInt;
  });

  // Calculate the 32-bit value and ensure it's treated as an unsigned 32-bit integer
  return ((octetValues[0] * 256 * 256 * 256) +
          (octetValues[1] * 256 * 256) +
          (octetValues[2] * 256) +
          octetValues[3]) >>> 0;
}

/**
 * Converts a numeric IP address to an IPv4 string representation
 * 
 * @param num The numeric representation of an IPv4 address
 * @returns The IP address as a string (e.g., "192.168.1.0")
 * @throws {CidrError} If the number is outside the valid range for IPv4 addresses
 */
export function numberToIpv4(num: number): string {
  // Check for negative numbers or numbers too large
  if (num < 0 || num > 0xFFFFFFFF) {
    throw new CidrError(
      `Invalid IP number: ${num} (must be between 0 and 4294967295)`,
      CidrErrorType.INVALID_IP
    );
  }
  
  // Ensure we're working with an unsigned 32-bit integer
  const unsignedNum = num >>> 0;

  // Extract octets
  const octet1 = (unsignedNum >>> 24) & 0xFF;
  const octet2 = (unsignedNum >>> 16) & 0xFF;
  const octet3 = (unsignedNum >>> 8) & 0xFF;
  const octet4 = unsignedNum & 0xFF;

  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

/**
 * Creates an IpAddress object from a string
 * 
 * @param ip The IP address string (e.g., "192.168.1.0")
 * @returns An IpAddress object containing numeric and string representations
 * @throws {CidrError} If the IP address is invalid
 */
export function createIpAddress(ip: string): IpAddress {
  const ipNum = ipv4ToNumber(ip);
  const octets: [number, number, number, number] = [
    (ipNum >>> 24) & 0xFF,
    (ipNum >>> 16) & 0xFF,
    (ipNum >>> 8) & 0xFF,
    ipNum & 0xFF
  ];

  return {
    asNumber: ipNum,
    octets,
    asString: ip,
    toString: () => ip
  };
}

/**
 * Calculates a subnet mask based on the prefix length
 * 
 * @param prefixLength The prefix length (e.g., 24 from "192.168.1.0/24")
 * @returns The subnet mask as a number
 * @throws {CidrError} If the prefix length is invalid
 */
export function calculateSubnetMask(prefixLength: number): number {
  if (prefixLength < 0 || prefixLength > 32) {
    throw new CidrError(
      `Invalid prefix length: ${prefixLength} (must be between 0 and 32)`,
      CidrErrorType.INVALID_PREFIX
    );
  }
  
  // Special case for prefix 0
  if (prefixLength === 0) {
    return 0;
  }

  // Special case for prefix 32
  if (prefixLength === 32) {
    return 0xFFFFFFFF; // All bits set
  }
  
  // Create a mask with prefixLength 1's from the left
  return (0xFFFFFFFF << (32 - prefixLength)) >>> 0;
}

/**
 * Gets the network address (first IP) of a CIDR block
 * 
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24")
 * @returns The network address as an IpAddress object
 * @throws {CidrError} If the CIDR is invalid
 */
export function getNetworkAddress(cidr: string): IpAddress {
  validateIpv4Cidr(cidr);
  
  const [ipString, prefixString] = cidr.split('/');
  const prefix = parseInt(prefixString, 10);
  
  // For /32 CIDRs, the network address is the IP itself
  if (prefix === 32) {
    return createIpAddress(ipString);
  }
  
  const ipNum = ipv4ToNumber(ipString);
  const mask = calculateSubnetMask(prefix);
  
  // Apply mask to get network address (bitwise AND)
  const networkNum = (ipNum & mask) >>> 0;
  const networkIp = numberToIpv4(networkNum);
  
  return createIpAddress(networkIp);
}

/**
 * Gets the broadcast address (last IP) of a CIDR block
 * 
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24")
 * @returns The broadcast address as an IpAddress object
 * @throws {CidrError} If the CIDR is invalid
 */
export function getBroadcastAddress(cidr: string): IpAddress {
  validateIpv4Cidr(cidr);
  
  const [ipString, prefixString] = cidr.split('/');
  const prefix = parseInt(prefixString, 10);
  
  // For /32 CIDRs, the broadcast address is the IP itself
  if (prefix === 32) {
    return createIpAddress(ipString);
  }
  
  const ipNum = ipv4ToNumber(ipString);
  const mask = calculateSubnetMask(prefix);
  
  // Apply inverted mask to get broadcast address (bitwise OR with inverted mask)
  const broadcastNum = (ipNum | (~mask & 0xFFFFFFFF)) >>> 0;
  const broadcastIp = numberToIpv4(broadcastNum);
  
  return createIpAddress(broadcastIp);
} 