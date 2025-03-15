const { overlap: overlapCidr } = require('fast-cidr-tools');

/**
 * Parse a CIDR string into its components
 * @param cidr The CIDR string to parse
 * @returns The parsed CIDR components
 */
function parseCidr(cidr: string): { cidr: string; ip: string; prefix: number; version: number } {
  const [ip, prefix] = cidr.split('/');
  const prefixNum = parseInt(prefix, 10);
  return {
    cidr,
    ip,
    prefix: prefixNum,
    version: ip.includes(':') ? 6 : 4
  };
}
import { createLogger } from '../../../utils/logger';

// Create logger instance for the calculator
const logger = createLogger('CidrCalculator');

/**
 * Error thrown when CIDR operations fail.
 */
export class CidrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CidrError';
  }
}

/**
 * Validates if the provided string is a valid IPv4 CIDR.
 * 
 * @param cidr The CIDR string to validate (e.g., "10.0.0.0/8")
 * @returns True if the CIDR is valid, false otherwise
 */
export function isValidIpv4Cidr(cidr: string): boolean {
  try {
    logger.trace(`Validating IPv4 CIDR: ${cidr}`);
    
    if (typeof cidr !== 'string') {
      logger.debug('Invalid CIDR: Not a string');
      return false;
    }

    // Check basic format
    const parts = cidr.split('/');
    if (parts.length !== 2) {
      logger.debug(`Invalid CIDR format: ${cidr} (missing prefix)`);
      return false;
    }

    const ipPart = parts[0];
    const prefixPart = parts[1];

    // Validate IP part
    const ipOctets = ipPart.split('.');
    if (ipOctets.length !== 4) {
      logger.debug(`Invalid IP format in CIDR: ${ipPart} (incorrect number of octets)`);
      return false;
    }

    for (const octet of ipOctets) {
      const num = parseInt(octet, 10);
      if (isNaN(num) || num < 0 || num > 255 || octet !== num.toString()) {
        logger.debug(`Invalid IP octet in CIDR: ${octet}`);
        return false;
      }
    }

    // Validate prefix part
    const prefix = parseInt(prefixPart, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32 || prefixPart !== prefix.toString()) {
      logger.debug(`Invalid prefix in CIDR: ${prefixPart}`);
      return false;
    }

    logger.trace(`CIDR ${cidr} is valid`);
    return true;
  } catch (e) {
    logger.debug(`Error validating CIDR ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Calculates the number of usable IP addresses in a CIDR block.
 * For IPv4, this is 2^(32-prefix) - 2 for network and broadcast addresses.
 * But for /31 and /32, we return special values.
 * 
 * @param cidr The CIDR block to calculate usable IPs for
 * @returns The number of usable IP addresses
 * @throws {CidrError} If the CIDR is invalid
 */
export function calculateUsableIps(cidr: string): number {
  try {
    logger.trace(`Calculating usable IPs for ${cidr}`);
    
    if (!isValidIpv4Cidr(cidr)) {
      logger.warn(`Invalid IPv4 CIDR format: ${cidr}`);
      throw new CidrError(`Invalid IPv4 CIDR format: ${cidr}`);
    }
    
    const prefix = parseInt(cidr.split('/')[1], 10);
    
    // Special cases
    if (prefix === 32) {
      logger.debug(`CIDR ${cidr} is a /32, which has 1 usable IP`);
      return 1; // A single IP
    }
    if (prefix === 31) {
      logger.debug(`CIDR ${cidr} is a /31, which has 2 usable IPs`);
      return 2; // Point-to-point link with 2 usable IPs (RFC 3021)
    }
    
    // Standard case: 2^(32-prefix) - 2 (for network and broadcast)
    const usableIps = Math.pow(2, 32 - prefix) - 2;
    logger.debug(`CIDR ${cidr} has ${usableIps} usable IPs`);
    
    return usableIps;
  } catch (e) {
    if (e instanceof CidrError) {
      throw e;
    }
    logger.error(`Error calculating usable IPs for ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    throw new CidrError(`Error calculating usable IPs for ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

/**
 * Checks if two CIDR blocks overlap.
 * 
 * @param cidr1 First CIDR block
 * @param cidr2 Second CIDR block
 * @returns True if the CIDRs overlap, false otherwise
 * @throws {CidrError} If either CIDR is invalid
 */
export function doCidrsOverlap(cidr1: string, cidr2: string): boolean {
  try {
    logger.trace(`Checking if ${cidr1} and ${cidr2} overlap`);
    
    if (!isValidIpv4Cidr(cidr1)) {
      logger.warn(`Invalid IPv4 CIDR format for first CIDR: ${cidr1}`);
      throw new CidrError(`Invalid IPv4 CIDR format for first CIDR: ${cidr1}`);
    }
    
    if (!isValidIpv4Cidr(cidr2)) {
      logger.warn(`Invalid IPv4 CIDR format for second CIDR: ${cidr2}`);
      throw new CidrError(`Invalid IPv4 CIDR format for second CIDR: ${cidr2}`);
    }
    
    // Parse the CIDRs to get versions
    const parsed1 = parseCidr(cidr1);
    const parsed2 = parseCidr(cidr2);
    
    if (parsed1.version !== parsed2.version) {
      logger.debug(`CIDRs are different IP versions: ${parsed1.version} and ${parsed2.version}`);
      return false; // Different IP versions can't overlap
    }
    
    // Perform a more optimized check for IPv4
    if (parsed1.version === 4) {
      // Extract prefixes
      const prefix1 = parsed1.prefix;
      const prefix2 = parsed2.prefix;
      
      // Convert IP addresses to numbers for easier comparison
      const ip1Parts = parsed1.ip.split('.').map((octet: string) => parseInt(octet, 10));
      const ip2Parts = parsed2.ip.split('.').map((octet: string) => parseInt(octet, 10));
      
      const ipNum1 = (ip1Parts[0] << 24) | (ip1Parts[1] << 16) | (ip1Parts[2] << 8) | ip1Parts[3];
      const ipNum2 = (ip2Parts[0] << 24) | (ip2Parts[1] << 16) | (ip2Parts[2] << 8) | ip2Parts[3];
      
      // Calculate network masks and networks for comparison
      const mask1 = prefix1 === 0 ? 0 : (~0 >>> (32 - prefix1)) << (32 - prefix1);
      const mask2 = prefix2 === 0 ? 0 : (~0 >>> (32 - prefix2)) << (32 - prefix2);
      
      const network1 = ipNum1 & mask1;
      const network2 = ipNum2 & mask2;
      
      // Check if either network contains the other
      const lastAddr1 = network1 | (~mask1 & 0xffffffff);
      const lastAddr2 = network2 | (~mask2 & 0xffffffff);
      
      const result = (
        (network1 <= network2 && lastAddr1 >= network2) || // network2 inside network1
        (network2 <= network1 && lastAddr2 >= network1)    // network1 inside network2
      );
      
      logger.debug(`CIDRs ${cidr1} and ${cidr2} ${result ? 'do' : 'do not'} overlap`);
      return result;
    }
    
    // Use cidr-tools as a fallback for non-IPv4 or if our check fails
    const result = Boolean(overlapCidr([cidr1], cidr2));
    logger.debug(`CIDRs ${cidr1} and ${cidr2} ${result ? 'do' : 'do not'} overlap (via cidr-tools)`);
    return result;
  } catch (e) {
    if (e instanceof CidrError) {
      throw e;
    }
    logger.error(`Error checking if CIDRs overlap (${cidr1}, ${cidr2}): ${e instanceof Error ? e.message : 'Unknown error'}`);
    throw new CidrError(`Error checking if CIDRs overlap (${cidr1}, ${cidr2}): ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

/**
 * Subdivides an IPv4 CIDR block into smaller blocks of a specified prefix length.
 * 
 * @param cidr The CIDR block to subdivide
 * @param newPrefixLength The prefix length for the subdivided blocks
 * @returns Array of subdivided CIDR blocks
 * @throws {CidrError} If the CIDR is invalid or can't be subdivided as requested
 */
export function subdivideIpv4Cidr(cidr: string, newPrefixLength: number): string[] {
  try {
    logger.trace(`Subdividing ${cidr} into /${newPrefixLength} blocks`);
    
    if (!isValidIpv4Cidr(cidr)) {
      logger.warn(`Invalid IPv4 CIDR format: ${cidr}`);
      throw new CidrError(`Invalid IPv4 CIDR format: ${cidr}`);
    }
    
    // Parse the CIDR
    const parsed = parseCidr(cidr);
    
    // Ensure it's an IPv4 address
    if (parsed.version !== 4) {
      logger.warn(`Expected IPv4 CIDR but got IPv${parsed.version}: ${cidr}`);
      throw new CidrError(`Expected IPv4 CIDR but got IPv${parsed.version}: ${cidr}`);
    }
    
    // Get current prefix length
    const currentPrefixLength = parsed.prefix;
    
    // Special case: if the new prefix equals the current prefix, just return the original CIDR
    if (newPrefixLength === currentPrefixLength) {
      logger.debug(`New prefix equals current prefix (${currentPrefixLength}), returning original CIDR`);
      return [cidr];
    }
    
    // Ensure new prefix length is greater than current
    if (newPrefixLength < currentPrefixLength) {
      logger.warn(`New prefix length (${newPrefixLength}) must be greater than current prefix length (${currentPrefixLength})`);
      throw new CidrError(`New prefix length (${newPrefixLength}) must be greater than current prefix length (${currentPrefixLength})`);
    }
    
    // Ensure new prefix length doesn't exceed 32
    if (newPrefixLength > 32) {
      logger.warn(`New prefix length (${newPrefixLength}) cannot be greater than 32`);
      throw new CidrError(`New prefix length (${newPrefixLength}) cannot be greater than 32`);
    }
    
    // Calculate number of subnets to create
    const numSubnets = Math.pow(2, newPrefixLength - currentPrefixLength);
    logger.debug(`Subdividing into ${numSubnets} subnets`);
    
    // Parse the base IP
    const ipParts = parsed.ip.split('.').map((part: string) => parseInt(part, 10));
    let baseIpNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    
    // Calculate subnet size in number of IPs
    const subnetSize = Math.pow(2, 32 - newPrefixLength);
    
    // Create the subnets
    const subnets: string[] = [];
    for (let i = 0; i < numSubnets; i++) {
      // Calculate the IP for this subnet
      const subnetIpNum = baseIpNum + (i * subnetSize);
      
      // Convert back to dotted decimal
      const subnetIp = [
        (subnetIpNum >>> 24) & 255,
        (subnetIpNum >>> 16) & 255,
        (subnetIpNum >>> 8) & 255,
        subnetIpNum & 255
      ].join('.');
      
      // Create the CIDR notation
      const subnetCidr = `${subnetIp}/${newPrefixLength}`;
      subnets.push(subnetCidr);
    }
    
    logger.trace(`Subdivided ${cidr} into ${subnets.length} subnets: ${subnets.join(', ')}`);
    return subnets;
  } catch (e) {
    if (e instanceof CidrError) {
      throw e;
    }
    logger.error(`Error subdividing CIDR ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    throw new CidrError(`Error subdividing CIDR ${cidr}: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

/**
 * Calculates the required prefix length to accommodate a certain number of subnets.
 * 
 * @param count The number of subnets needed
 * @returns The required prefix length increase
 */
export function calculateRequiredPrefixLength(count: number): number {
  if (count <= 0) {
    logger.warn(`Count must be a positive integer, got ${count}`);
    throw new CidrError('Count must be a positive integer');
  }
  
  logger.trace(`Calculating required prefix length for ${count} subnets`);
  
  // Calculate the number of bits needed to represent 'count' subnets
  // We need to find the smallest n where 2^n >= count
  const prefixIncrease = Math.ceil(Math.log2(count));
  logger.debug(`Required prefix increase for ${count} subnets is ${prefixIncrease}`);
  
  return prefixIncrease;
}

/**
 * Calculates the optimal prefix length for a given CIDR and number of subnets.
 * 
 * @param cidr The starting CIDR block (e.g., "10.0.0.0/16")
 * @param count The number of subnets needed
 * @returns The optimal prefix length for the subnets
 * @throws {CidrError} If the CIDR is invalid or cannot accommodate the requested subnets
 */
export function calculateOptimalPrefixLength(cidr: string, count: number): number {
  try {
    logger.trace(`Calculating optimal prefix length for CIDR ${cidr} with ${count} subnets`);
    
    // Validate CIDR format first
    if (!isValidIpv4Cidr(cidr)) {
      logger.warn(`Invalid IPv4 CIDR format: ${cidr}`);
      throw new CidrError(`Invalid IPv4 CIDR format: ${cidr}`);
    }
    
    // Parse the CIDR using cidr-tools
    const parsed = parseCidr(cidr);
    
    // Ensure it's an IPv4 address
    if (parsed.version !== 4) {
      logger.warn(`Expected IPv4 CIDR but got IPv${parsed.version}: ${cidr}`);
      throw new CidrError(`Expected IPv4 CIDR but got IPv${parsed.version}: ${cidr}`);
    }
    
    const currentPrefixLength = parsed.prefix;
    logger.debug(`Current prefix length is ${currentPrefixLength}`);
    
    // Calculate how many additional bits we need for the given number of regions
    const additionalBits = calculateRequiredPrefixLength(count);
    logger.debug(`Additional bits needed: ${additionalBits}`);
    
    // Calculate the new prefix length
    const newPrefixLength = currentPrefixLength + additionalBits;
    logger.debug(`New prefix length: ${newPrefixLength}`);
    
    // Ensure the new prefix length doesn't exceed 32 (IPv4 limit)
    if (newPrefixLength > 32) {
      logger.error(`Cannot allocate ${count} regions within ${cidr}. Required prefix length ${newPrefixLength} exceeds limit of 32.`);
      throw new CidrError(`Cannot allocate ${count} regions within ${cidr}. Required prefix length ${newPrefixLength} exceeds limit of 32.`);
    }
    
    return newPrefixLength;
  } catch (e) {
    if (e instanceof CidrError) {
      throw e;
    }
    logger.error(`Error calculating optimal prefix length for ${cidr} with ${count} regions: ${e instanceof Error ? e.message : 'Unknown error'}`);
    throw new CidrError(`Error calculating optimal prefix length for ${cidr} with ${count} regions: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
} 