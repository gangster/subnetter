import { createLogger } from '../../../utils/logger';
import { 
  detectCloudProviderFromRegion, 
  CloudProvider 
} from '../../../utils/region-detector';

// Create logger instance for the provider detector
const logger = createLogger('ProviderDetector');

/**
 * Utility class for cloud provider detection.
 */
export class ProviderDetector {
  /**
   * Gets the cloud provider for a region based on naming conventions.
   * Uses the region detector utility for accurate provider detection.
   * 
   * @param regionName The name of the region
   * @returns The detected cloud provider string
   */
  public static detect(regionName: string): string {
    logger.trace(`Inferring provider for region ${regionName}`);
    
    // Use the region detector
    const provider = detectCloudProviderFromRegion(regionName);
    
    if (provider === CloudProvider.UNKNOWN) {
      logger.warn(`Could not determine provider for region ${regionName}, defaulting to AWS`);
      return 'aws';
    }
    
    return provider;
  }
} 