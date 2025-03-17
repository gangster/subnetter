/**
 * Represents a cloud service provider (AWS, Azure, GCP).
 */
export interface CloudProvider {
  name: string;
  regions: string[];
}

/**
 * Represents a cloud-specific configuration for an account.
 */
export interface CloudConfig {
  baseCidr?: string;
  regions: string[];
}

/**
 * Represents a logical account within a cloud provider.
 */
export interface RawAccount {
  name: string;
  clouds: Record<string, CloudConfig>;
}

/**
 * Normalized account representation with consistent property names.
 */
export interface Account {
  name: string;
  clouds: Record<string, CloudConfig>;
}

/**
 * Represents a geographical region within an account.
 */
export interface Region {
  name: string;
  availabilityZones: string[];
  cidr?: string;
}

/**
 * Represents an availability zone within a region.
 */
export interface AvailabilityZone {
  name: string;
  cidr?: string;
}

/**
 * Represents a complete IPv4 CIDR allocation for a specific subnet.
 */
export interface Allocation {
  accountName: string;
  vpcName: string;
  cloudProvider: string;
  regionName: string;
  availabilityZone: string;
  regionCidr: string;
  vpcCidr: string;
  azCidr: string;
  subnetCidr: string;
  cidr: string; // Duplicate of subnetCidr for compatibility
  subnetRole: string;
  usableIps: number;
}

/**
 * Represents a map of subnet names to prefix lengths.
 */
export type SubnetTypesMap = Record<string, number>;

/**
 * Raw configuration for CIDR allocation.
 */
export interface RawConfig {
  baseCidr: string;
  prefixLengths?: {
    account?: number;
    region?: number;
    az?: number;
  };
  cloudProviders?: string[];
  accounts: RawAccount[];
  subnetTypes: SubnetTypesMap; // Only supports map format now
}

/**
 * Represents the validated configuration.
 */
export interface Config {
  baseCidr: string;
  prefixLengths?: {
    account?: number;
    region?: number;
    az?: number;
  };
  cloudProviders: string[];
  accounts: Account[];
  subnetTypes: SubnetTypesMap; // Only supports map format now
} 