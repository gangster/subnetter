import { createLogger } from '../../../../utils/logger';
import { BaseCloudProvider } from '../base-provider';
import { CloudProviderType, RegionInfo } from '../types';

// Create logger instance for the Azure provider
const logger = createLogger('AzureCloudProvider');

/**
 * Azure Cloud Provider Implementation
 * 
 * Handles Azure-specific region and AZ naming, detection, and information.
 * Azure uses a different AZ naming pattern compared to AWS and GCP.
 */
export class AzureCloudProvider extends BaseCloudProvider {
  /**
   * Provider type
   */
  protected readonly type = CloudProviderType.AZURE;
  
  /**
   * Display name
   */
  protected readonly displayName = 'Microsoft Azure';
  
  /**
   * Azure region patterns
   */
  protected readonly regionPatterns: RegExp[] = [
    // Standard Azure regions (eastus, westeurope, etc.)
    /^(east|west|central|north|south|southeast|northeast|northwest|southwest)+(us|europe|asia|australia|india|japan|korea|brazil|france|germany|norway|switzerland|uae|uk|africa)\d*$/i,
    // Azure Government regions
    /^usgov(virginia|texas|arizona|iowa)$/i,
    // Azure China regions
    /^china(east|north|northeast|northwest|southeast|southwest)\d*$/i,
    // Special Azure regions like japaneast, southeastasia
    /^(japaneast|japanwest|southeastasia|southindia|westindia|centralindia|eastasia|southeastasia)$/i
  ];
  
  /**
   * Azure regions information
   */
  protected readonly regionsInfo: Map<string, RegionInfo> = new Map([
    // North America
    ['eastus', {
      name: 'eastus',
      displayName: 'East US',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'East'
      }
    }],
    ['eastus2', {
      name: 'eastus2',
      displayName: 'East US 2',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'East'
      }
    }],
    ['centralus', {
      name: 'centralus',
      displayName: 'Central US',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'Central'
      }
    }],
    ['northcentralus', {
      name: 'northcentralus',
      displayName: 'North Central US',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'North Central'
      }
    }],
    ['southcentralus', {
      name: 'southcentralus',
      displayName: 'South Central US',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'South Central'
      }
    }],
    ['westus', {
      name: 'westus',
      displayName: 'West US',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'West'
      }
    }],
    ['westus2', {
      name: 'westus2',
      displayName: 'West US 2',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'West'
      }
    }],
    ['westus3', {
      name: 'westus3',
      displayName: 'West US 3',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'United States',
        region: 'West'
      }
    }],
    ['canadacentral', {
      name: 'canadacentral',
      displayName: 'Canada Central',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'Canada',
        region: 'Central'
      }
    }],
    ['canadaeast', {
      name: 'canadaeast',
      displayName: 'Canada East',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'North America',
        country: 'Canada',
        region: 'East'
      }
    }],
    
    // Europe
    ['northeurope', {
      name: 'northeurope',
      displayName: 'North Europe',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Ireland',
        region: 'North'
      }
    }],
    ['westeurope', {
      name: 'westeurope',
      displayName: 'West Europe',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Netherlands',
        region: 'West'
      }
    }],
    ['uksouth', {
      name: 'uksouth',
      displayName: 'UK South',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'United Kingdom',
        region: 'South'
      }
    }],
    ['ukwest', {
      name: 'ukwest',
      displayName: 'UK West',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'United Kingdom',
        region: 'West'
      }
    }],
    ['francecentral', {
      name: 'francecentral',
      displayName: 'France Central',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'France',
        region: 'Central'
      }
    }],
    ['francesouth', {
      name: 'francesouth',
      displayName: 'France South',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'France',
        region: 'South'
      }
    }],
    ['germanywestcentral', {
      name: 'germanywestcentral',
      displayName: 'Germany West Central',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Europe',
        country: 'Germany',
        region: 'West Central'
      }
    }],
    
    // Asia Pacific
    ['eastasia', {
      name: 'eastasia',
      displayName: 'East Asia',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Hong Kong',
        region: 'East'
      }
    }],
    ['southeastasia', {
      name: 'southeastasia',
      displayName: 'Southeast Asia',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Singapore',
        region: 'Southeast'
      }
    }],
    ['japaneast', {
      name: 'japaneast',
      displayName: 'Japan East',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Japan',
        region: 'East'
      }
    }],
    ['japanwest', {
      name: 'japanwest',
      displayName: 'Japan West',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'Japan',
        region: 'West'
      }
    }],
    ['australiaeast', {
      name: 'australiaeast',
      displayName: 'Australia East',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Oceania',
        country: 'Australia',
        region: 'East'
      }
    }],
    ['australiasoutheast', {
      name: 'australiasoutheast',
      displayName: 'Australia Southeast',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Oceania',
        country: 'Australia',
        region: 'Southeast'
      }
    }],
    ['southindia', {
      name: 'southindia',
      displayName: 'South India',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'India',
        region: 'South'
      }
    }],
    ['centralindia', {
      name: 'centralindia',
      displayName: 'Central India',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Asia',
        country: 'India',
        region: 'Central'
      }
    }]
  ]);
  
  /**
   * Generate availability zone names for Azure
   * In Azure, zones are named as region-1, region-2, region-3, e.g., eastus-1
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
    
    logger.debug(`Generating ${effectiveCount} AZ names for Azure region ${normalizedRegion}`);
    
    // Azure uses 1, 2, 3, etc. for zone names
    const azNames = Array.from({ length: effectiveCount }, (_, i) => {
      return `${normalizedRegion}-${i + 1}`;
    });
    
    return azNames;
  }
  
  /**
   * Normalize Azure region name
   * Remove spaces and convert to lowercase
   * 
   * @param regionName The region name to normalize
   * @returns The normalized region name
   */
  public normalizeRegionName(regionName: string): string {
    // Remove spaces and convert to lowercase
    return regionName.replace(/\s+/g, '').toLowerCase();
  }
} 