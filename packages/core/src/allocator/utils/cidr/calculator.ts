import { 
  isValidIpv4Cidr as validateCidr,
  checkCidrOverlap,
  calculateSubnetInfo,
  subdivideCidr,
} from '@subnetter/cidr-utils';
import { createLogger } from '../../../utils/logger';
import { AllocationError, ErrorCode } from '../../../utils/errors';

// Create logger instance for the calculator
const logger = createLogger('CidrCalculator');

/**
 * Validates if the provided string is a valid IPv4 CIDR.
 * 
 * @param cidr The CIDR string to validate (e.g., "10.0.0.0/8")
 * @returns True if the CIDR is valid, false otherwise
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
 * For IPv4, this is 2^(32-prefix) - 2 for network and broadcast addresses.
 * But for /31 and /32, we return special values.
 * 
 * @param cidr The CIDR block to calculate usable IPs for
 * @returns The number of usable IP addresses
 * @throws {AllocationError} If the CIDR is invalid
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
 * @param cidr1 First CIDR block
 * @param cidr2 Second CIDR block
 * @returns True if the CIDRs overlap, false otherwise
 * @throws {AllocationError} If either CIDR is invalid
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
 * Subdivides an IPv4 CIDR block into smaller blocks of a specified prefix length.
 * 
 * @param cidr The CIDR block to subdivide
 * @param newPrefixLength The prefix length for the subdivided blocks
 * @returns Array of subdivided CIDR blocks
 * @throws {AllocationError} If the CIDR is invalid or can't be subdivided as requested
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
 * Calculates the minimum prefix length required to accommodate a given number of subnets.
 * 
 * @param count The number of subnets needed
 * @returns The minimum prefix length delta required
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
  
  // Calculate how many bits we need to add to the prefix to get 2^bits >= count
  const bits = Math.ceil(Math.log2(count));
  logger.debug(`Need to add ${bits} bits to prefix to accommodate ${count} subnets`);
  
  return bits;
}

/**
 * Calculates the optimal prefix length for subdividing a CIDR block
 * to accommodate a given number of subnets.
 * 
 * @param cidr The CIDR block to subdivide
 * @param count The number of subnets needed
 * @returns The optimal new prefix length
 * @throws {AllocationError} If the CIDR is invalid or can't accommodate the requested number
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