import { createLogger } from '../../../utils/logger';
import { CloudProviderType, ICloudProvider, RegionInfo } from './types';

// Create logger instance for the base provider
const logger = createLogger('BaseCloudProvider');

/**
 * Abstract base class for cloud provider implementations.
 * Provides common functionality and enforces the ICloudProvider interface.
 */
export abstract class BaseCloudProvider implements ICloudProvider {
  /**
   * The type of this cloud provider
   */
  protected abstract readonly type: CloudProviderType;
  
  /**
   * The display name of this cloud provider
   */
  protected abstract readonly displayName: string;
  
  /**
   * Array of region pattern regexes that match this provider's regions
   */
  protected abstract readonly regionPatterns: RegExp[];
  
  /**
   * Map of region information by region name
   */
  protected abstract readonly regionsInfo: Map<string, RegionInfo>;
  
  /**
   * Default number of availability zones if not specified for a region
   */
  protected readonly defaultAzCount: number = 3;
  
  /**
   * Get the type of this provider
   */
  public getType(): CloudProviderType {
    return this.type;
  }
  
  /**
   * Get the display name of this provider
   */
  public getName(): string {
    return this.displayName;
  }
  
  /**
   * Test if a region name matches this provider's pattern
   * 
   * @param regionName The region name to test
   * @returns True if the region matches this provider's pattern
   */
  public matchesRegion(regionName: string): boolean {
    if (!regionName) {
      return false;
    }
    
    for (const pattern of this.regionPatterns) {
      if (pattern.test(regionName)) {
        logger.debug(`Region ${regionName} matches pattern for ${this.displayName}`);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get the default number of availability zones for a region
   * 
   * @param regionName The name of the region
   * @returns The default number of AZs (typically 3)
   */
  public getDefaultAzCount(regionName: string): number {
    const regionInfo = this.getRegionInfo(regionName);
    return regionInfo?.defaultAzCount || this.defaultAzCount;
  }
  
  /**
   * Normalize a region name to the provider's standard format
   * This is a default implementation that can be overridden by subclasses
   * 
   * @param regionName The region name to normalize
   * @returns The normalized region name
   */
  public normalizeRegionName(regionName: string): string {
    return regionName.toLowerCase();
  }
  
  /**
   * Get information about a specific region
   * 
   * @param regionName The name of the region
   * @returns Region information or undefined if not found
   */
  public getRegionInfo(regionName: string): RegionInfo | undefined {
    const normalizedName = this.normalizeRegionName(regionName);
    return this.regionsInfo.get(normalizedName);
  }
  
  /**
   * Validate if a region name is valid for this provider
   * 
   * @param regionName The region name to validate
   * @returns True if the region is valid
   */
  public isValidRegion(regionName: string): boolean {
    const normalizedName = this.normalizeRegionName(regionName);
    return this.matchesRegion(normalizedName) || this.regionsInfo.has(normalizedName);
  }
  
  /**
   * Generate availability zone names for a region
   * Default implementation adds letters (a, b, c) as suffixes to region name
   * Should be overridden by provider-specific implementations if needed
   * 
   * @param regionName The name of the region
   * @param count The number of AZs to generate
   * @returns Array of AZ names
   */
  public generateAzNames(regionName: string, count: number): string[] {
    logger.trace(`Generating ${count} AZ names for region ${regionName} using base implementation`);
    
    // Get region info to check the maximum number of zones
    const regionInfo = this.getRegionInfo(regionName);
    let actualCount = count;
    
    // If region info exists, ensure we don't exceed the maximum zone count
    if (regionInfo && count > regionInfo.maxAzCount) {
      logger.warn(`Requested ${count} AZs for ${regionName}, but maximum is ${regionInfo.maxAzCount}. Using maximum.`);
      actualCount = regionInfo.maxAzCount;
    }
    
    const azNames: string[] = [];
    
    // Generate AZ names (e.g., us-east-1a, us-east-1b, us-east-1c)
    for (let i = 0; i < actualCount; i++) {
      const suffix = String.fromCharCode(97 + i); // 97 is ASCII for 'a'
      azNames.push(`${regionName}${suffix}`);
    }
    
    logger.trace(`Generated AZ names: ${azNames.join(', ')}`);
    return azNames;
  }
} 