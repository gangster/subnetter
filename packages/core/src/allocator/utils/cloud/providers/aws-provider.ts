import { createLogger } from '../../../../utils/logger';
import { BaseCloudProvider } from '../base-provider';
import { CloudProviderType, RegionInfo } from '../types';

// Create logger instance for the AWS provider
const logger = createLogger('AwsCloudProvider');

/**
 * AWS Cloud Provider Implementation
 * 
 * Handles AWS-specific region and AZ naming, detection, and information.
 */
export class AwsCloudProvider extends BaseCloudProvider {
  /**
   * Provider type
   */
  protected readonly type = CloudProviderType.AWS;
  
  /**
   * Display name
   */
  protected readonly displayName = 'Amazon Web Services';
  
  /**
   * AWS region patterns
   */
  protected readonly regionPatterns: RegExp[] = [
    // Standard AWS regions (us-east-1, eu-west-2, ap-southeast-1, etc.)
    /^(us|eu|ap|sa|ca|af|me)-(east|west|north|south|central|southeast|northeast|northwest|southwest)+-\d$/i,
    // AWS GovCloud regions
    /^us-gov-(east|west)-\d$/i,
    // AWS China regions
    /^cn-(north|northwest)-\d$/i,
    // AWS with additional qualifiers (Local Zones, Wavelength Zones)
    /^(us|eu|ap|sa|ca|af|me)-(east|west|north|south|central)+-\d-[a-z0-9-]+$/i
  ];
  
  /**
   * AWS regions information
   */
  protected readonly regionsInfo: Map<string, RegionInfo> = new Map([
    // North America
    ['us-east-1', {
      name: 'us-east-1',
      displayName: 'US East (N. Virginia)',
      defaultAzCount: 6,
      maxAzCount: 6,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'East'
      }
    }],
    ['us-east-2', {
      name: 'us-east-2',
      displayName: 'US East (Ohio)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'East'
      }
    }],
    ['us-west-1', {
      name: 'us-west-1',
      displayName: 'US West (N. California)',
      defaultAzCount: 2,
      maxAzCount: 2,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'West'
      }
    }],
    ['us-west-2', {
      name: 'us-west-2',
      displayName: 'US West (Oregon)',
      defaultAzCount: 4,
      maxAzCount: 4,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'West'
      }
    }],
    ['ca-central-1', {
      name: 'ca-central-1',
      displayName: 'Canada (Central)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'Canada',
        region: 'Central'
      }
    }],
    
    // Europe
    ['eu-north-1', {
      name: 'eu-north-1',
      displayName: 'EU North (Stockholm)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Sweden',
        region: 'North'
      }
    }],
    ['eu-west-1', {
      name: 'eu-west-1',
      displayName: 'EU West (Ireland)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Ireland',
        region: 'West'
      }
    }],
    ['eu-west-2', {
      name: 'eu-west-2',
      displayName: 'EU West (London)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'United Kingdom',
        region: 'West'
      }
    }],
    ['eu-west-3', {
      name: 'eu-west-3',
      displayName: 'EU West (Paris)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'France',
        region: 'West'
      }
    }],
    ['eu-central-1', {
      name: 'eu-central-1',
      displayName: 'EU Central (Frankfurt)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Germany',
        region: 'Central'
      }
    }],
    
    // Asia Pacific
    ['ap-east-1', {
      name: 'ap-east-1',
      displayName: 'Asia Pacific (Hong Kong)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Hong Kong',
        region: 'East'
      }
    }],
    ['ap-south-1', {
      name: 'ap-south-1',
      displayName: 'Asia Pacific (Mumbai)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'India',
        region: 'South'
      }
    }],
    ['ap-northeast-1', {
      name: 'ap-northeast-1',
      displayName: 'Asia Pacific (Tokyo)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Japan',
        region: 'Northeast'
      }
    }],
    ['ap-northeast-2', {
      name: 'ap-northeast-2',
      displayName: 'Asia Pacific (Seoul)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'South Korea',
        region: 'Northeast'
      }
    }],
    ['ap-northeast-3', {
      name: 'ap-northeast-3',
      displayName: 'Asia Pacific (Osaka)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Japan',
        region: 'Northeast'
      }
    }],
    ['ap-southeast-1', {
      name: 'ap-southeast-1',
      displayName: 'Asia Pacific (Singapore)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Singapore',
        region: 'Southeast'
      }
    }],
    ['ap-southeast-2', {
      name: 'ap-southeast-2',
      displayName: 'Asia Pacific (Sydney)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Oceania',
        country: 'Australia',
        region: 'Southeast'
      }
    }],
    
    // South America
    ['sa-east-1', {
      name: 'sa-east-1',
      displayName: 'South America (São Paulo)',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'South America',
        country: 'Brazil',
        region: 'East'
      }
    }]
  ]);
  
  /**
   * Generate availability zone names for a region in AWS format
   * AWS AZs follow the pattern: region + letter (e.g., us-east-1a, us-east-1b)
   * 
   * @param regionName The name of the region
   * @param count The number of AZs to generate
   * @returns Array of AZ names
   */
  public generateAzNames(regionName: string, count: number): string[] {
    logger.trace(`Generating ${count} AWS AZ names for region ${regionName}`);
    
    // Get region info to check the maximum number of AZs
    const regionInfo = this.getRegionInfo(regionName);
    let actualCount = count;
    
    // If region info exists, ensure we don't exceed the maximum AZ count
    if (regionInfo && count > regionInfo.maxAzCount) {
      logger.warn(`Requested ${count} AZs for ${regionName}, but maximum is ${regionInfo.maxAzCount}. Using maximum.`);
      actualCount = regionInfo.maxAzCount;
    }
    
    const azNames: string[] = [];
    
    // Generate AWS-style AZ names (e.g., us-east-1a, us-east-1b, us-east-1c)
    for (let i = 0; i < actualCount; i++) {
      const suffix = String.fromCharCode(97 + i); // 97 is ASCII for 'a'
      azNames.push(`${regionName}${suffix}`);
    }
    
    logger.trace(`Generated AWS AZ names: ${azNames.join(', ')}`);
    return azNames;
  }
  
  /**
   * Normalize AWS region name
   * For AWS, this simply converts to lowercase
   * 
   * @param regionName The region name to normalize
   * @returns The normalized region name
   */
  public normalizeRegionName(regionName: string): string {
    return regionName.toLowerCase();
  }
} 