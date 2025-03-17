/**
 * Types and interfaces for cloud provider abstraction.
 * This file defines the contracts that all cloud provider implementations must follow.
 */

/**
 * Cloud provider identifiers
 */
export enum CloudProviderType {
  AWS = 'aws',
  AZURE = 'azure',
  GCP = 'gcp',
  UNKNOWN = 'unknown'
}

/**
 * Region information structure
 */
export interface RegionInfo {
  /**
   * The name of the region as used by the cloud provider
   */
  name: string;
  
  /**
   * The provider-specific display name of the region (e.g., "US East (N. Virginia)")
   */
  displayName?: string;
  
  /**
   * Default number of availability zones in this region
   */
  defaultAzCount: number;
  
  /**
   * Maximum supported availability zones in this region
   */
  maxAzCount: number;
  
  /**
   * Whether the region is generally available (not in preview)
   */
  isGenerallyAvailable?: boolean;
  
  /**
   * Geographic location of the region
   */
  geography?: {
    continent: string;
    country: string;
    region?: string;
  };
}

/**
 * Availability Zone information structure
 */
export interface AzInfo {
  /**
   * The name of the availability zone
   */
  name: string;
  
  /**
   * The provider-specific display name of the AZ
   */
  displayName?: string;
  
  /**
   * Whether the AZ is generally available
   */
  isGenerallyAvailable?: boolean;
}

/**
 * Core interface that all cloud providers must implement
 */
export interface ICloudProvider {
  /**
   * Get the type of this cloud provider
   */
  getType(): CloudProviderType;
  
  /**
   * Get the name of this cloud provider
   */
  getName(): string;
  
  /**
   * Test if a region name belongs to this provider
   * 
   * @param regionName The region name to test
   * @returns True if the region belongs to this provider
   */
  matchesRegion(regionName: string): boolean;
  
  /**
   * Generate availability zone names for a region
   * 
   * @param regionName The name of the region
   * @param count The number of AZs to generate
   * @returns Array of AZ names
   */
  generateAzNames(regionName: string, count: number): string[];
  
  /**
   * Get the default number of availability zones for a region
   * 
   * @param regionName The name of the region
   * @returns The default number of AZs (typically 3)
   */
  getDefaultAzCount(regionName: string): number;
  
  /**
   * Normalize a region name to the provider's standard format
   * 
   * @param regionName The region name to normalize
   * @returns The normalized region name
   */
  normalizeRegionName(regionName: string): string;
  
  /**
   * Get information about a specific region
   * 
   * @param regionName The name of the region
   * @returns Region information or undefined if not found
   */
  getRegionInfo(regionName: string): RegionInfo | undefined;
  
  /**
   * Validate if a region name is valid for this provider
   * 
   * @param regionName The region name to validate
   * @returns True if the region is valid
   */
  isValidRegion(regionName: string): boolean;
} 