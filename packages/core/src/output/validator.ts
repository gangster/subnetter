import { Allocation } from '../models/types';
import { createLogger } from '../utils/logger';
import { doCidrsOverlap } from '../allocator/utils/cidr';
import { ValidationError, ErrorCode } from '../utils/errors';

// Create logger instance for validation operations
const logger = createLogger('Validator');

/**
 * Interface for detected overlap information
 */
export interface OverlapInfo {
  cidr1: string;
  cidr2: string;
  allocation1: Allocation;
  allocation2: Allocation;
}

/**
 * Interface for the validation result
 */
export interface ValidationResult {
  valid: boolean;
  overlaps: OverlapInfo[];
}

/**
 * Validates that no CIDR blocks in the allocations overlap.
 * 
 * @param allocations Array of allocation objects to validate
 * @param throwOnOverlap Whether to throw an error if overlaps are detected (default: false)
 * @returns ValidationResult containing validation status and any detected overlaps
 * @throws {ValidationError} If throwOnOverlap is true and overlaps are detected
 */
export function validateNoOverlappingCidrs(
  allocations: Allocation[], 
  throwOnOverlap: boolean = false
): ValidationResult {
  logger.debug(`Validating ${allocations.length} allocations for CIDR overlaps`);
  
  const result: ValidationResult = {
    valid: true,
    overlaps: []
  };
  
  // Check each allocation against all others that follow it
  for (let i = 0; i < allocations.length; i++) {
    const allocation1 = allocations[i];
    const cidr1 = allocation1.subnetCidr;
    
    for (let j = i + 1; j < allocations.length; j++) {
      const allocation2 = allocations[j];
      const cidr2 = allocation2.subnetCidr;
      
      // Skip if either is missing a CIDR
      if (!cidr1 || !cidr2) continue;
      
      try {
        if (doCidrsOverlap(cidr1, cidr2)) {
          logger.warn(`CIDR overlap detected: ${cidr1} (${allocation1.accountName}, ${allocation1.regionName}, ${allocation1.availabilityZone}, ${allocation1.subnetRole}) overlaps with ${cidr2} (${allocation2.accountName}, ${allocation2.regionName}, ${allocation2.availabilityZone}, ${allocation2.subnetRole})`);
          
          result.valid = false;
          result.overlaps.push({
            cidr1,
            cidr2,
            allocation1,
            allocation2
          });
        }
      } catch (error) {
        logger.error(`Error checking overlap between ${cidr1} and ${cidr2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  if (result.valid) {
    logger.info(`Validation successful! No CIDR overlaps detected in ${allocations.length} allocations.`);
  } else {
    const message = `Found ${result.overlaps.length} CIDR overlaps in ${allocations.length} allocations.`;
    logger.error(message);
    
    if (throwOnOverlap) {
      throw new ValidationError(
        message,
        ErrorCode.CIDR_OVERLAP,
        { overlaps: result.overlaps.map(o => ({ cidr1: o.cidr1, cidr2: o.cidr2 })) }
      );
    }
  }
  
  return result;
} 