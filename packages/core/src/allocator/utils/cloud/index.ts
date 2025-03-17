/**
 * Cloud Provider Module
 * 
 * Exports types, interfaces, and implementations for cloud providers.
 */

// Export types and interfaces
export * from './types';

// Export factory
export { CloudProviderFactory } from './provider-factory';

// Export provider implementations
export * from './providers';

// Export base classes
export { BaseCloudProvider } from './base-provider';

// Export deprecated classes for backward compatibility
export { ProviderDetector } from './provider';
export { AzHelper } from './az';

// Import necessary types
import { CloudProviderType, ICloudProvider } from './types';
import { CloudProviderFactory } from './provider-factory';

/**
 * Get a provider instance for the specified type
 * Helper function for easier access to providers
 * 
 * @param type The cloud provider type
 * @returns A cloud provider instance
 */
export function getProvider(type: CloudProviderType): ICloudProvider {
  const factory = CloudProviderFactory.getInstance();
  return factory.getProvider(type);
}

/**
 * Detect provider type from a region name
 * Helper function for easier detection
 * 
 * @param regionName The region name to detect provider for
 * @returns The detected provider type
 */
export function detectProviderType(regionName: string): CloudProviderType {
  const factory = CloudProviderFactory.getInstance();
  return factory.detectProviderType(regionName);
}

/**
 * Get a provider instance for a region
 * Helper function to get a provider based on a region name
 * 
 * @param regionName The region name to create a provider for
 * @returns A cloud provider instance
 */
export function getProviderForRegion(regionName: string): ICloudProvider {
  const factory = CloudProviderFactory.getInstance();
  const providerType = factory.detectProviderType(regionName);
  return factory.getProvider(providerType);
} 