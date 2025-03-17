import { createLogger } from './logger';

const logger = createLogger('RegionDetector');

/**
 * Enumeration of supported cloud providers
 */
export enum CloudProvider {
  AWS = 'aws',
  AZURE = 'azure',
  GCP = 'gcp',
  UNKNOWN = 'unknown'
}

// Regular expression patterns for different cloud providers
const AWS_REGION_PATTERNS = [
  // Standard AWS regions (us-east-1, eu-west-2, ap-southeast-1, etc.)
  /^(us|eu|ap|sa|ca|af|me)-(east|west|north|south|central|southeast|northeast|northwest|southwest)+-\d$/i,
  // AWS GovCloud regions
  /^us-gov-(east|west)-\d$/i,
  // AWS China regions
  /^cn-(north|northwest)-\d$/i,
  // AWS with additional qualifiers (Local Zones, Wavelength Zones)
  /^(us|eu|ap|sa|ca|af|me)-(east|west|north|south|central)+-\d-[a-z0-9-]+$/i
];

const AZURE_REGION_PATTERNS = [
  // Standard Azure regions (eastus, westeurope, etc.)
  /^(east|west|central|north|south|southeast|northeast|northwest|southwest)+(us|europe|asia|australia|india|japan|korea|brazil|france|germany|norway|switzerland|uae|uk|africa)\d*$/i,
  // Azure Government regions
  /^usgov(virginia|texas|arizona|iowa)$/i,
  // Azure China regions
  /^china(east|north|northeast|northwest|southeast|southwest)\d*$/i,
  // Special Azure regions like japaneast, southeastasia
  /^(japaneast|japanwest|southeastasia|southindia|westindia|centralindia|eastasia|southeastasia)$/i
];

const GCP_REGION_PATTERNS = [
  // Standard GCP regions (us-central1, europe-west4, asia-east1, etc.)
  /^(us|europe|asia|australia|southamerica|northamerica)-(east|west|north|south|central|northeast|northwest|southeast|southwest)\d+$/i
];

/**
 * Detects the cloud provider based on the region name
 * 
 * @param regionName The name of the region to analyze
 * @returns The detected cloud provider or UNKNOWN if not recognized
 */
export function detectCloudProviderFromRegion(regionName: string): CloudProvider {
  logger.trace(`Detecting provider for region: ${regionName}`);
  
  if (!regionName) {
    logger.warn('Empty region name provided, returning UNKNOWN');
    return CloudProvider.UNKNOWN;
  }

  // Check AWS patterns
  for (const pattern of AWS_REGION_PATTERNS) {
    if (pattern.test(regionName)) {
      logger.debug(`Detected AWS region: ${regionName}`);
      return CloudProvider.AWS;
    }
  }

  // Check Azure patterns
  for (const pattern of AZURE_REGION_PATTERNS) {
    if (pattern.test(regionName)) {
      logger.debug(`Detected Azure region: ${regionName}`);
      return CloudProvider.AZURE;
    }
  }

  // Check GCP patterns
  for (const pattern of GCP_REGION_PATTERNS) {
    if (pattern.test(regionName)) {
      logger.debug(`Detected GCP region: ${regionName}`);
      return CloudProvider.GCP;
    }
  }

  // Handle special cases and ambiguities
  if (/^us-east\d+$/i.test(regionName) || 
      /^us-west\d+$/i.test(regionName) || 
      /^us-central\d+$/i.test(regionName) ||
      /^europe-west\d+$/i.test(regionName) ||
      /^asia-east\d+$/i.test(regionName)) {
    logger.debug(`Detected GCP region (special case): ${regionName}`);
    return CloudProvider.GCP;
  }

  logger.warn(`Could not determine provider for region ${regionName}, returning UNKNOWN`);
  return CloudProvider.UNKNOWN;
} 