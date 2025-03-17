import { createLogger } from '../../../utils/logger';
import { getProviderForRegion } from './index';

// Create logger instance for the AZ helper
const logger = createLogger('AzHelper');

/**
 * Utility class for AZ-related operations.
 * @deprecated Use the cloud provider implementations directly instead.
 */
export class AzHelper {
  /**
   * Generates availability zone names for a region.
   * 
   * @param regionName The name of the region
   * @param count The number of AZs to generate
   * @returns Array of AZ names
   * @deprecated Use the cloud provider implementations directly instead.
   */
  public static generateNames(regionName: string, count: number): string[] {
    logger.trace(`Generating ${count} AZ names for region ${regionName}`);
    
    // For backward compatibility, handle Azure regions specially
    if (regionName.toLowerCase().match(/^(eastus|westus|northcentralus|southcentralus|eastus2|centralus|westus2|westcentralus|usgovvirginia|usgovtexas|usgovarizona|usdodeast|usdodcentral|chinaeast|chinanorth|chinaeast2|chinanorth2|germanycentral|germanynortheast|francecentral|francesouth|uksouth|ukwest|northeurope|westeurope|japaneast|japanwest|brazilsouth|australiaeast|australiasoutheast|southindia|centralindia|westindia|canadacentral|canadaeast|koreacentral|koreasouth|southafricanorth|southafricawest|uaecentral|uaenorth|switzerlandnorth|switzerlandwest|norwayeast|norwaywest|brazilsoutheast|westus3|swedencentral|swedensouth|qatarcentral|polandcentral|italynorth|malaysiasouth|mexicocentral|spaincentral|taiwannorth|taiwanwest|israelcentral|austriaeast|chilecentral|malaysiawest|denmarkeast|denmarkwest|jioindiawest|jioindiacentral|newzealandnorth|newzealandsouth|southeastasia|eastasia)$/)) {
      // Generate Azure-style AZ names with letter suffix for backward compatibility
      return Array.from({ length: count }, (_, i) => {
        const suffix = String.fromCharCode(97 + i); // 97 is ASCII for 'a'
        return `${regionName}${suffix}`;
      });
    }
    
    // Get the appropriate provider for the region
    const provider = getProviderForRegion(regionName);
    
    // Use the provider to generate AZ names
    return provider.generateAzNames(regionName, count);
  }
} 