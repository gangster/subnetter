/**
 * CIDR validation utilities
 */

import { CidrErrorType } from './types';

/**
 * Custom error class for CIDR-related errors
 */
export class CidrError extends Error {
  type: CidrErrorType;
  
  constructor(message: string, type: CidrErrorType) {
    super(message);
    this.type = type;
    this.name = 'CidrError';
    
    // This is needed for proper prototype chain in TypeScript
    Object.setPrototypeOf(this, CidrError.prototype);
  }
}

/**
 * Checks if a given string is a valid IPv4 CIDR notation
 * 
 * @param cidr The string to validate
 * @returns true if the string is a valid IPv4 CIDR notation, false otherwise
 */
export function isValidIpv4Cidr(cidr: string): boolean {
  try {
    validateIpv4Cidr(cidr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a CIDR notation string, throwing errors for invalid format
 * 
 * @param cidr The CIDR notation string to validate
 * @throws {CidrError} If the CIDR string is invalid
 */
export function validateIpv4Cidr(cidr: string): void {
  // Check basic format
  if (!cidr || typeof cidr !== 'string') {
    throw new CidrError(
      `Invalid CIDR notation: ${cidr} (must be a non-empty string)`,
      CidrErrorType.INVALID_FORMAT
    );
  }
  
  // Check CIDR format
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    throw new CidrError(
      `Invalid CIDR notation: ${cidr} (must be in format "ip/prefix")`,
      CidrErrorType.INVALID_FORMAT
    );
  }
  
  const [ip, prefixStr] = parts;
  
  // Validate IP address
  const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = ip.match(ipPattern);
  
  if (!ipMatch) {
    throw new CidrError(
      `Invalid IP address format: ${ip} (must be in format "x.x.x.x")`,
      CidrErrorType.INVALID_IP
    );
  }
  
  // Validate each octet
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(ipMatch[i], 10);
    if (octet < 0 || octet > 255) {
      throw new CidrError(
        `Invalid IP address octet: ${ipMatch[i]} in ${ip} (each octet must be between 0 and 255)`,
        CidrErrorType.INVALID_IP
      );
    }
  }
  
  // Validate prefix
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new CidrError(
      `Invalid prefix length: ${prefixStr} (must be between 0 and 32)`,
      CidrErrorType.INVALID_PREFIX
    );
  }
} 