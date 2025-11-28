/**
 * @module models/types
 * @description Core type definitions for Subnetter's CIDR allocation system.
 *
 * This module defines the data structures used throughout Subnetter for
 * representing cloud infrastructure, network configurations, and IP allocations.
 *
 * @example
 * ```typescript
 * import type { Config, Allocation, Account } from '@subnetter/core';
 *
 * const config: Config = {
 *   baseCidr: '10.0.0.0/8',
 *   accounts: [{ name: 'prod', clouds: { aws: { regions: ['us-east-1'] } } }],
 *   subnetTypes: { public: 24, private: 24 },
 *   cloudProviders: ['aws']
 * };
 * ```
 *
 * @packageDocumentation
 */

/**
 * Represents a cloud service provider with its available regions.
 *
 * @remarks
 * This interface is primarily used for configuration validation and
 * provider-specific logic. Subnetter supports AWS, Azure, and GCP.
 *
 * @example
 * ```typescript
 * const awsProvider: CloudProvider = {
 *   name: 'aws',
 *   regions: ['us-east-1', 'us-west-2', 'eu-west-1']
 * };
 * ```
 */
export interface CloudProvider {
  /**
   * The identifier for the cloud provider.
   * Typically lowercase: 'aws', 'azure', or 'gcp'.
   */
  name: string;

  /**
   * List of region identifiers available for this provider.
   * Uses provider-native naming (e.g., 'us-east-1' for AWS, 'eastus' for Azure).
   */
  regions: string[];
}

/**
 * Cloud-specific configuration for an account.
 *
 * Allows overriding the base CIDR and specifying regions for a specific
 * cloud provider within an account.
 *
 * @example
 * ```typescript
 * const awsConfig: CloudConfig = {
 *   baseCidr: '10.100.0.0/16',  // Optional override
 *   regions: ['us-east-1', 'us-west-2']
 * };
 * ```
 */
export interface CloudConfig {
  /**
   * Optional CIDR block override for this cloud provider.
   * When specified, allocations for this cloud use this CIDR instead of
   * the global `baseCidr`. Must be valid IPv4 CIDR notation.
   */
  baseCidr?: string;

  /**
   * Regions to allocate subnets in for this cloud provider.
   * Each region will receive its own set of availability zones and subnets.
   */
  regions: string[];
}

/**
 * Raw account configuration as read from the config file.
 *
 * @remarks
 * This represents the account structure before normalization. After loading,
 * accounts are normalized to the {@link Account} interface.
 *
 * @example
 * ```typescript
 * const rawAccount: RawAccount = {
 *   name: 'production',
 *   clouds: {
 *     aws: { regions: ['us-east-1', 'us-west-2'] },
 *     azure: { regions: ['eastus', 'westus2'] }
 *   }
 * };
 * ```
 *
 * @see {@link Account} for the normalized representation
 */
export interface RawAccount {
  /**
   * Unique identifier for the account.
   * Used in output CSV and for organizational purposes.
   * Cannot be empty.
   */
  name: string;

  /**
   * Cloud provider configurations for this account.
   * Keys are provider names ('aws', 'azure', 'gcp'), values are cloud configs.
   */
  clouds: Record<string, CloudConfig>;
}

/**
 * Normalized account representation with consistent property names.
 *
 * @remarks
 * Accounts represent logical organizational units (e.g., AWS accounts,
 * Azure subscriptions, or GCP projects). Each account can span multiple
 * cloud providers with different region configurations.
 *
 * @example
 * ```typescript
 * const account: Account = {
 *   name: 'ecommerce-prod',
 *   clouds: {
 *     aws: { regions: ['us-east-1'] },
 *     gcp: { baseCidr: '10.200.0.0/16', regions: ['us-central1'] }
 *   }
 * };
 * ```
 */
export interface Account {
  /**
   * Unique identifier for the account.
   * Used in VPC naming and CSV output. Must be non-empty.
   */
  name: string;

  /**
   * Cloud provider configurations keyed by provider name.
   * Supports 'aws', 'azure', and 'gcp' as keys.
   */
  clouds: Record<string, CloudConfig>;
}

/**
 * Represents a geographical region within a cloud provider.
 *
 * @remarks
 * Regions contain availability zones and are assigned a CIDR block
 * from the account's address space. The CIDR is calculated during
 * allocation based on `prefixLengths.region`.
 *
 * @example
 * ```typescript
 * const region: Region = {
 *   name: 'us-east-1',
 *   availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
 *   cidr: '10.0.0.0/20'  // Assigned during allocation
 * };
 * ```
 */
export interface Region {
  /**
   * Provider-specific region identifier.
   * Examples: 'us-east-1' (AWS), 'eastus' (Azure), 'us-central1' (GCP).
   */
  name: string;

  /**
   * Availability zones within this region.
   * Naming follows provider conventions:
   * - AWS: 'us-east-1a', 'us-east-1b'
   * - Azure: 'eastus-1', 'eastus-2'
   * - GCP: 'us-central1-a', 'us-central1-b'
   */
  availabilityZones: string[];

  /**
   * CIDR block assigned to this region.
   * Populated during allocation; not specified in input config.
   */
  cidr?: string;
}

/**
 * Represents an availability zone within a region.
 *
 * @remarks
 * Availability zones provide fault isolation within a region.
 * Each AZ receives its own CIDR block, subdivided into subnets
 * by type (public, private, etc.).
 *
 * @example
 * ```typescript
 * const az: AvailabilityZone = {
 *   name: 'us-east-1a',
 *   cidr: '10.0.0.0/24'  // Assigned during allocation
 * };
 * ```
 */
export interface AvailabilityZone {
  /**
   * Provider-specific availability zone identifier.
   * Typically includes the region name as a prefix.
   */
  name: string;

  /**
   * CIDR block assigned to this availability zone.
   * Populated during allocation; not specified in input config.
   */
  cidr?: string;
}

/**
 * Represents a complete IPv4 CIDR allocation for a specific subnet.
 *
 * @remarks
 * This is the primary output type from the allocation process.
 * Each allocation represents a single subnet with its full context:
 * account, region, AZ, and role. Allocations are written to CSV
 * and used for infrastructure provisioning.
 *
 * @example
 * ```typescript
 * const allocation: Allocation = {
 *   accountName: 'production',
 *   vpcName: 'production-vpc',
 *   cloudProvider: 'aws',
 *   regionName: 'us-east-1',
 *   availabilityZone: 'us-east-1a',
 *   regionCidr: '10.0.0.0/20',
 *   vpcCidr: '10.0.0.0/16',
 *   azCidr: '10.0.0.0/24',
 *   subnetCidr: '10.0.0.0/26',
 *   subnetRole: 'public',
 *   usableIps: 62
 * };
 * ```
 *
 * @see {@link CidrAllocator} for generating allocations
 * @see {@link writeAllocationsToCsv} for exporting allocations
 */
export interface Allocation {
  /**
   * Name of the account this subnet belongs to.
   * Matches the `name` field from the account configuration.
   */
  accountName: string;

  /**
   * Name of the VPC containing this subnet.
   * Typically derived as `{accountName}-vpc`.
   */
  vpcName: string;

  /**
   * Cloud provider identifier: 'aws', 'azure', or 'gcp'.
   */
  cloudProvider: string;

  /**
   * Region where this subnet is located.
   * Uses provider-native naming conventions.
   */
  regionName: string;

  /**
   * Availability zone containing this subnet.
   */
  availabilityZone: string;

  /**
   * CIDR block allocated to the region.
   * Parent of the AZ CIDR.
   */
  regionCidr: string;

  /**
   * CIDR block for the entire VPC.
   * May equal the account's base CIDR or a cloud-specific override.
   */
  vpcCidr: string;

  /**
   * CIDR block allocated to the availability zone.
   * Parent of the subnet CIDR.
   */
  azCidr: string;

  /**
   * CIDR block for this specific subnet.
   * The most specific CIDR in the hierarchy.
   */
  subnetCidr: string;

  /**
   * Role or purpose of this subnet.
   * Matches a key from `subnetTypes` (e.g., 'public', 'private', 'database').
   */
  subnetRole: string;

  /**
   * Number of usable IP addresses in this subnet.
   * Calculated as 2^(32-prefix) - 2 for network and broadcast addresses.
   * Special cases: /31 returns 2, /32 returns 1.
   */
  usableIps: number;
}

/**
 * Maps subnet type names to their prefix lengths.
 *
 * @remarks
 * Subnet types define the purpose and size of subnets created in each AZ.
 * Common patterns include public subnets for internet-facing resources,
 * private subnets for internal services, and specialized subnets for
 * databases or Kubernetes pods.
 *
 * @example
 * ```typescript
 * const subnetTypes: SubnetTypesMap = {
 *   public: 26,    // 62 usable IPs per AZ
 *   private: 24,   // 254 usable IPs per AZ
 *   database: 27,  // 30 usable IPs per AZ
 *   kubernetes: 22 // 1022 usable IPs for pod networking
 * };
 * ```
 */
export type SubnetTypesMap = Record<string, number>;

/**
 * Raw configuration as read from a JSON or YAML file.
 *
 * @remarks
 * This interface represents the configuration before validation and
 * normalization. Use {@link loadConfig} to parse and validate config files,
 * or {@link validateConfig} to validate config objects directly.
 *
 * @example
 * ```typescript
 * const rawConfig: RawConfig = {
 *   baseCidr: '10.0.0.0/8',
 *   prefixLengths: {
 *     account: 16,
 *     region: 20,
 *     az: 24
 *   },
 *   accounts: [
 *     {
 *       name: 'production',
 *       clouds: {
 *         aws: { regions: ['us-east-1', 'us-west-2'] }
 *       }
 *     }
 *   ],
 *   subnetTypes: {
 *     public: 26,
 *     private: 24
 *   }
 * };
 * ```
 *
 * @see {@link Config} for the validated configuration type
 * @see {@link loadConfig} for loading from files
 */
export interface RawConfig {
  /**
   * Root CIDR block for all allocations.
   * Must be valid IPv4 CIDR notation (e.g., '10.0.0.0/8').
   * All subnets are carved from this address space unless overridden.
   */
  baseCidr: string;

  /**
   * Optional prefix length overrides for each hierarchy level.
   * Controls the size of CIDR blocks at account, region, and AZ levels.
   */
  prefixLengths?: {
    /**
     * Prefix length for account-level CIDR blocks.
     * @defaultValue 16
     */
    account?: number;

    /**
     * Prefix length for region-level CIDR blocks.
     * @defaultValue 20
     */
    region?: number;

    /**
     * Prefix length for availability zone CIDR blocks.
     * @defaultValue 24
     */
    az?: number;
  };

  /**
   * Optional list of cloud providers to include.
   * When omitted, providers are inferred from account configurations.
   */
  cloudProviders?: string[];

  /**
   * Account configurations defining the allocation structure.
   * Each account can span multiple cloud providers and regions.
   */
  accounts: RawAccount[];

  /**
   * Subnet types and their prefix lengths.
   * Keys are subnet role names, values are CIDR prefix lengths (1-32).
   */
  subnetTypes: SubnetTypesMap;
}

/**
 * Validated and normalized configuration for CIDR allocation.
 *
 * @remarks
 * This interface represents a fully validated configuration ready for
 * use with {@link CidrAllocator}. It guarantees all required fields
 * are present and correctly formatted.
 *
 * @example
 * ```typescript
 * import { loadConfig, CidrAllocator } from '@subnetter/core';
 *
 * const config: Config = loadConfig('./config.json');
 * const allocator = new CidrAllocator(config);
 * const allocations = allocator.generateAllocations();
 * ```
 *
 * @see {@link loadConfig} for creating Config from files
 * @see {@link validateConfig} for validating config objects
 * @see {@link CidrAllocator} for generating allocations
 */
export interface Config {
  /**
   * Root CIDR block for all allocations.
   * Validated as proper IPv4 CIDR notation.
   */
  baseCidr: string;

  /**
   * Prefix length configuration for hierarchy levels.
   * May be undefined if using default values.
   */
  prefixLengths?: {
    /** Prefix length for account blocks. */
    account?: number;
    /** Prefix length for region blocks. */
    region?: number;
    /** Prefix length for AZ blocks. */
    az?: number;
  };

  /**
   * List of cloud providers in use.
   * Normalized to always be an array (empty if none specified).
   */
  cloudProviders: string[];

  /**
   * Normalized account configurations.
   */
  accounts: Account[];

  /**
   * Subnet type definitions mapping names to prefix lengths.
   */
  subnetTypes: SubnetTypesMap;
}
