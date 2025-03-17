import { createLogger } from '../../../utils/logger';
import { CloudProviderType, ICloudProvider } from './types';
import { AwsCloudProvider, AzureCloudProvider, GcpCloudProvider } from './providers';

// Create logger instance
const logger = createLogger('CloudProviderFactory');

/**
 * Factory for creating cloud provider instances
 * Implements the Factory pattern to create and cache provider instances
 */
export class CloudProviderFactory {
  /**
   * Singleton instance
   */
  private static instance: CloudProviderFactory;
  
  /**
   * Provider instances mapped by provider type
   */
  private providers: Map<CloudProviderType, ICloudProvider> = new Map();
  
  // Pre-initialize provider instances for pattern detection
  private readonly awsProvider = new AwsCloudProvider();
  private readonly azureProvider = new AzureCloudProvider();
  private readonly gcpProvider = new GcpCloudProvider();
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Pre-cache provider instances
    this.providers.set(CloudProviderType.AWS, this.awsProvider);
    this.providers.set(CloudProviderType.AZURE, this.azureProvider);
    this.providers.set(CloudProviderType.GCP, this.gcpProvider);
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CloudProviderFactory {
    if (!CloudProviderFactory.instance) {
      CloudProviderFactory.instance = new CloudProviderFactory();
    }
    
    return CloudProviderFactory.instance;
  }
  
  /**
   * Get a provider instance for the specified type
   * 
   * @param type Provider type
   * @returns Provider instance
   */
  public getProvider(type: CloudProviderType): ICloudProvider {
    // Since we preloaded all providers, we should always have it
    const provider = this.providers.get(type);
    
    if (!provider) {
      logger.warn(`Unsupported provider type: ${type}, falling back to AWS`);
      const awsProvider = this.providers.get(CloudProviderType.AWS);
      
      if (!awsProvider) {
        throw new Error('AWS provider not found, this should never happen');
      }
      
      return awsProvider;
    }
    
    return provider;
  }
  
  /**
   * Detect provider type from region name
   * 
   * @param regionName Region name to check
   * @returns Detected provider type
   */
  public detectProviderType(regionName: string): CloudProviderType {
    logger.trace(`Detecting provider type for region: ${regionName}`);
    
    // Handle null or empty region names
    if (!regionName) {
      logger.warn(`Null or empty region name provided, defaulting to AWS`);
      return CloudProviderType.AWS;
    }
    
    // Normalize region name to lowercase
    const normalizedRegion = regionName.toLowerCase();
    
    // Check AWS region pattern
    if (this.awsProvider.matchesRegion(normalizedRegion)) {
      logger.trace(`Region ${regionName} matched AWS pattern`);
      return CloudProviderType.AWS;
    }
    
    // Check Azure region pattern
    if (this.azureProvider.matchesRegion(normalizedRegion)) {
      logger.trace(`Region ${regionName} matched Azure pattern`);
      return CloudProviderType.AZURE;
    }
    
    // Check GCP region pattern
    if (this.gcpProvider.matchesRegion(normalizedRegion)) {
      logger.trace(`Region ${regionName} matched GCP pattern`);
      return CloudProviderType.GCP;
    }
    
    // Default to AWS if no match
    logger.warn(`Region ${regionName} did not match any known provider, defaulting to AWS`);
    return CloudProviderType.AWS;
  }
} 