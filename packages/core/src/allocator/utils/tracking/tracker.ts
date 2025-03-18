import { doCidrsOverlap } from '../cidr';
import { createLogger } from '../../../utils/logger';

// Create logger instance for the tracker
const logger = createLogger('CidrTracker');

// Always use deterministic allocation to ensure consistent behavior across environments
// This can be disabled by setting DISABLE_DETERMINISTIC_ALLOCATION=true
const DETERMINISTIC_ALLOCATION = process.env.DISABLE_DETERMINISTIC_ALLOCATION !== 'true';

/**
 * Tracks all allocated CIDR blocks and provides methods to check for overlaps.
 */
export class CidrTracker {
  private allocatedCidrs: string[] = [];

  /**
   * Resets the tracker, clearing all allocated CIDRs.
   */
  public reset(): void {
    this.allocatedCidrs = [];
  }

  /**
   * Adds a CIDR to the tracker.
   * 
   * @param cidr The CIDR to add
   */
  public add(cidr: string): void {
    this.allocatedCidrs.push(cidr);
    
    // If deterministic allocation is enabled, sort the CIDRs after each addition
    // This ensures a consistent order of allocations across environments
    if (DETERMINISTIC_ALLOCATION) {
      this.allocatedCidrs.sort((a, b) => {
        // Sort by prefix length first (smallest to largest)
        const prefixA = parseInt(a.split('/')[1], 10);
        const prefixB = parseInt(b.split('/')[1], 10);
        if (prefixA !== prefixB) {
          return prefixA - prefixB;
        }
        
        // Then lexicographically by IP address
        return a.localeCompare(b);
      });
      logger.debug(`Added CIDR ${cidr} with deterministic ordering enabled. Current count: ${this.allocatedCidrs.length}`);
    }
  }

  /**
   * Gets all allocated CIDRs.
   * 
   * @returns Array of allocated CIDRs
   */
  public getAllocated(): string[] {
    return [...this.allocatedCidrs];
  }

  /**
   * Checks if a CIDR exists in the tracker (exact match).
   * 
   * @param cidr The CIDR to check
   * @returns True if the CIDR exists in the tracker
   */
  public has(cidr: string): boolean {
    return this.allocatedCidrs.includes(cidr);
  }

  /**
   * Checks if a CIDR is already allocated or overlaps with an allocated CIDR.
   * 
   * @param cidr The CIDR to check
   * @returns True if the CIDR is already allocated or overlaps with an allocated CIDR
   */
  public isAllocated(cidr: string): boolean {
    logger.trace(`Checking if CIDR ${cidr} is already allocated`);
    
    // When deterministic allocation is enabled, we process the allocatedCidrs in a defined order
    const cidrsToCheck = DETERMINISTIC_ALLOCATION 
      ? [...this.allocatedCidrs].sort((a, b) => a.localeCompare(b))
      : this.allocatedCidrs;
    
    for (const allocatedCidr of cidrsToCheck) {
      if (doCidrsOverlap(cidr, allocatedCidr)) {
        logger.trace(`CIDR ${cidr} overlaps with ${allocatedCidr}`);
        return true;
      }
    }
    
    logger.trace(`CIDR ${cidr} is not allocated`);
    return false;
  }
} 