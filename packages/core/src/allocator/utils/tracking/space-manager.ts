import { subdivideIpv4Cidr } from '../cidr';
import { createLogger } from '../../../utils/logger';

// Create logger instance for the space manager
const logger = createLogger('RemainingSpaceManager');

/**
 * Manages the remaining CIDR space during allocation.
 */
export class RemainingSpaceManager {
  /**
   * Updates the remaining space after allocating a CIDR block.
   * 
   * @param remainingSpace Array of available CIDR blocks
   * @param allocatedCidr The CIDR block that was just allocated
   * @returns Updated array of available CIDR blocks
   */
  public updateAfterAllocation(remainingSpace: string[], allocatedCidr: string): string[] {
    logger.trace(`Updating remaining space after allocating ${allocatedCidr}`);
    logger.trace(`Current remaining space: ${remainingSpace.join(', ')}`);
    
    // Remove the allocated CIDR from the space we used to allocate it
    const usedSpace = remainingSpace[0];
    
    // If we used the entire block, just remove it
    if (usedSpace === allocatedCidr) {
      logger.trace(`Used entire space ${usedSpace}, removing it`);
      return remainingSpace.slice(1);
    }
    
    // Otherwise, find all remaining subnets one prefix level higher than the allocated block
    const allocatedPrefix = parseInt(allocatedCidr.split('/')[1], 10);
    const newPrefix = allocatedPrefix + 1;
    logger.trace(`Subdividing ${usedSpace} at prefix /${newPrefix} to find remaining space`);
    
    // Subdivide the used space into smaller blocks
    const subdivided = subdivideIpv4Cidr(usedSpace, newPrefix);
    
    // Keep all blocks except the allocated one
    const remaining = subdivided.filter(block => block !== allocatedCidr);
    logger.trace(`After subdivision, remaining blocks: ${remaining.join(', ')}`);
    
    // Return the new remaining space
    return [...remaining, ...remainingSpace.slice(1)];
  }
} 