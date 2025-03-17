import { createLogger } from '../../../utils/logger';
import { CloudProviderFactory } from './provider-factory';
import { CloudProviderType } from './types';

// Create logger instance for the provider detector
const logger = createLogger('ProviderDetector');

/**
 * Utility class for cloud provider detection.
 * @deprecated Use CloudProviderFactory.detectProviderType or the helper function detectProviderType instead.
 */
export class ProviderDetector {
  /**
   * Gets the cloud provider for a region based on naming conventions.
   * 
   * @param regionName The name of the region
   * @returns The detected cloud provider string
   * @deprecated Use CloudProviderFactory.detectProviderType or the helper function detectProviderType instead.
   */
  public static detect(regionName: string): string {
    logger.trace(`Inferring provider for region ${regionName}`);
    
    // Use the CloudProviderFactory for detection
    const factory = CloudProviderFactory.getInstance();
    const providerType = factory.detectProviderType(regionName);
    
    // Convert the provider type to a string (lowercase)
    let providerString: string;
    
    switch (providerType) {
      case CloudProviderType.AWS:
        providerString = 'aws';
        break;
      case CloudProviderType.AZURE:
        providerString = 'azure';
        break;
      case CloudProviderType.GCP:
        providerString = 'gcp';
        break;
      default:
        logger.warn(`Unknown provider type ${providerType} for region ${regionName}, defaulting to AWS`);
        providerString = 'aws';
    }
    
    return providerString;
  }
} 