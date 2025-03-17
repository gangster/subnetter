import { createLogger } from '../../../../utils/logger';
import { BaseCloudProvider } from '../base-provider';
import { CloudProviderType, RegionInfo } from '../types';

// Create logger instance for the GCP provider
const logger = createLogger('GcpCloudProvider');

/**
 * Google Cloud Platform Provider Implementation
 * 
 * Handles GCP-specific region and zone naming, detection, and information.
 * GCP uses regions and zones rather than availability zones.
 */
export class GcpCloudProvider extends BaseCloudProvider {
  /**
   * Provider type
   */
  public readonly type = CloudProviderType.GCP;
  
  /**
   * Display name
   */
  public readonly displayName = 'Google Cloud Platform';
  
  /**
   * GCP region patterns
   */
  public readonly regionPatterns = [
    /^(us|northamerica|southamerica|europe|asia|australia)-(central|east|west|south|north|northeast|southeast|northwest|southwest)[0-9](-[a-z])?$/,
  ];
  
  /**
   * GCP regions information
   */
  public readonly regionsInfo: Map<string, RegionInfo> = new Map([
    ['us-central1', {
      name: 'us-central1',
      displayName: 'Council Bluffs, Iowa, North America',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'Central'
      }
    }],
    ['us-east1', {
      name: 'us-east1',
      displayName: 'South Carolina',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'East'
      }
    }],
    ['us-east4', {
      name: 'us-east4',
      displayName: 'Northern Virginia',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'East'
      }
    }],
    ['us-west1', {
      name: 'us-west1',
      displayName: 'Oregon',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'West'
      }
    }],
    ['us-west2', {
      name: 'us-west2',
      displayName: 'Los Angeles',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'West'
      }
    }],
    ['us-west3', {
      name: 'us-west3',
      displayName: 'Salt Lake City',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'West'
      }
    }],
    ['us-west4', {
      name: 'us-west4',
      displayName: 'Las Vegas',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'West'
      }
    }],
    ['northamerica-northeast1', {
      name: 'northamerica-northeast1',
      displayName: 'Montreal',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'Canada',
        region: 'Northeast'
      }
    }],
    ['southamerica-east1', {
      name: 'southamerica-east1',
      displayName: 'São Paulo',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'South America',
        country: 'Brazil',
        region: 'East'
      }
    }],
    ['europe-west1', {
      name: 'europe-west1',
      displayName: 'Belgium',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Belgium',
        region: 'West'
      }
    }],
    ['europe-west2', {
      name: 'europe-west2',
      displayName: 'London',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'United Kingdom',
        region: 'West'
      }
    }],
    ['europe-west3', {
      name: 'europe-west3',
      displayName: 'Frankfurt',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Germany',
        region: 'West'
      }
    }],
    ['europe-west4', {
      name: 'europe-west4',
      displayName: 'Netherlands',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Netherlands',
        region: 'West'
      }
    }],
    ['europe-west6', {
      name: 'europe-west6',
      displayName: 'Zurich',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Switzerland',
        region: 'West'
      }
    }],
    ['europe-north1', {
      name: 'europe-north1',
      displayName: 'Finland',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Finland',
        region: 'North'
      }
    }],
    ['asia-east1', {
      name: 'asia-east1',
      displayName: 'Taiwan',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Taiwan',
        region: 'East'
      }
    }],
    ['asia-east2', {
      name: 'asia-east2',
      displayName: 'Hong Kong',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Hong Kong',
        region: 'East'
      }
    }],
    ['asia-northeast1', {
      name: 'asia-northeast1',
      displayName: 'Tokyo',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Japan',
        region: 'Northeast'
      }
    }],
    ['asia-northeast2', {
      name: 'asia-northeast2',
      displayName: 'Osaka',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Japan',
        region: 'Northeast'
      }
    }],
    ['asia-northeast3', {
      name: 'asia-northeast3',
      displayName: 'Seoul',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'South Korea',
        region: 'Northeast'
      }
    }],
    ['asia-south1', {
      name: 'asia-south1',
      displayName: 'Mumbai',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'India',
        region: 'South'
      }
    }],
    ['asia-southeast1', {
      name: 'asia-southeast1',
      displayName: 'Singapore',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Singapore',
        region: 'Southeast'
      }
    }],
    ['australia-southeast1', {
      name: 'australia-southeast1',
      displayName: 'Sydney',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Oceania',
        country: 'Australia',
        region: 'Southeast'
      }
    }],
  ]);
  
  /**
   * Generate availability zone names for GCP
   * In GCP, zones are named as region+a, region+b, region+c, e.g., us-central1a
   * 
   * @param regionName - The region name
   * @param count - The number of AZs to generate
   * @returns Array of AZ names
   */
  public generateAzNames(regionName: string, count: number): string[] {
    const normalizedRegion = this.normalizeRegionName(regionName);
    const regionInfo = this.getRegionInfo(normalizedRegion);
    
    // Ensure count doesn't exceed max AZs for the region
    const effectiveCount = Math.min(count, regionInfo?.maxAzCount || this.defaultAzCount);
    
    logger.debug(`Generating ${effectiveCount} AZ names for GCP region ${normalizedRegion}`);
    
    // GCP uses a, b, c, etc. for zone names
    const azNames = Array.from({ length: effectiveCount }, (_, i) => {
      const zoneSuffix = String.fromCharCode(97 + i); // 97 is ASCII for 'a'
      return `${normalizedRegion}${zoneSuffix}`;
    });
    
    return azNames;
  }
  
  /**
   * Normalize region name to lowercase
   * 
   * @param regionName - The region name to normalize
   * @returns Normalized region name
   */
  public normalizeRegionName(regionName: string): string {
    return regionName.toLowerCase();
  }
} 