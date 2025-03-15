import { createLogger } from '../../../utils/logger';

// Create logger instance for the AZ helper
const logger = createLogger('AzHelper');

/**
 * Utility class for AZ-related operations.
 */
export class AzHelper {
  /**
   * Generates availability zone names for a region.
   * 
   * @param regionName The name of the region
   * @param count The number of AZs to generate
   * @returns Array of AZ names
   */
  public static generateNames(regionName: string, count: number): string[] {
    logger.trace(`Generating ${count} AZ names for region ${regionName}`);
    
    const azNames: string[] = [];
    
    // Generate AZ names (e.g., us-east-1a, us-east-1b, us-east-1c)
    for (let i = 0; i < count; i++) {
      const suffix = String.fromCharCode(97 + i); // 97 is ASCII for 'a'
      azNames.push(`${regionName}${suffix}`);
    }
    
    logger.trace(`Generated AZ names: ${azNames.join(', ')}`);
    return azNames;
  }
} 