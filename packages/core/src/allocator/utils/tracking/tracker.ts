import { doCidrsOverlap } from '../cidr';
import { createLogger } from '../../../utils/logger';

// Create logger instance for the tracker
const logger = createLogger('CidrTracker');

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
   * Checks if a CIDR is already allocated or overlaps with an allocated CIDR.
   * 
   * @param cidr The CIDR to check
   * @returns True if the CIDR is already allocated or overlaps with an allocated CIDR
   */
  public isAllocated(cidr: string): boolean {
    logger.trace(`Checking if CIDR ${cidr} is already allocated`);
    
    for (const allocatedCidr of this.allocatedCidrs) {
      if (doCidrsOverlap(cidr, allocatedCidr)) {
        logger.trace(`CIDR ${cidr} overlaps with ${allocatedCidr}`);
        return true;
      }
    }
    
    logger.trace(`CIDR ${cidr} is not allocated`);
    return false;
  }
} 