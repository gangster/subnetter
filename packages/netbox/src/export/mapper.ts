/**
 * @module export/mapper
 * @description Maps Subnetter allocations to NetBox objects.
 *
 * Provides functions to transform Subnetter's allocation data model into
 * NetBox's object model. Each function creates a "writable" object suitable
 * for NetBox's create/update API endpoints.
 *
 * ## Mapping Summary
 *
 * | Subnetter Concept | NetBox Object | Mapper Function |
 * |-------------------|---------------|-----------------|
 * | Account | Tenant | {@link mapAccountToTenant} |
 * | Cloud Provider | Site Group | {@link mapCloudProviderToSiteGroup} |
 * | Cloud Region | Site | {@link mapRegionToSite} |
 * | Availability Zone | Location | {@link mapAzToLocation} |
 * | Subnet Type | Role | {@link mapSubnetTypeToRole} |
 * | Allocation | Prefix | {@link mapAllocationToPrefix} |
 * | Base CIDR | Aggregate | {@link mapBaseCidrToAggregate} |
 *
 * ## Extraction Functions
 *
 * Helper functions extract unique values from allocations:
 * - {@link extractAccounts} - Unique account names
 * - {@link extractCloudProviders} - Unique cloud providers
 * - {@link extractCloudRegions} - Unique region/provider pairs
 * - {@link extractAvailabilityZones} - Unique AZ/region/provider tuples
 * - {@link extractRoles} - Unique subnet types
 *
 * @see {@link ./exporter} for the export orchestration
 *
 * @packageDocumentation
 */

import type { Allocation } from '@subnetter/core';
import type {
  PrefixWritable,
  SiteWritable,
  SiteGroupWritable,
  TenantWritable,
  RoleWritable,
  LocationWritable,
  AggregateWritable,
  PrefixStatus,
} from '../client/types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tag name used to identify Subnetter-managed objects in NetBox.
 *
 * @remarks
 * This tag is applied to objects created by Subnetter to distinguish them
 * from manually-created objects. It can be used for filtering and cleanup.
 */
export const SUBNETTER_MANAGED_TAG = 'subnetter-managed';

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a string to a URL-safe slug for use in NetBox.
 *
 * @remarks
 * Slugs in NetBox must be lowercase alphanumeric with hyphens.
 * This function:
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Trims leading/trailing hyphens
 *
 * @param str - Input string to slugify
 * @returns URL-safe slug
 *
 * @example
 * ```typescript
 * slugify('AWS Production')  // 'aws-production'
 * slugify('us-east-1')       // 'us-east-1'
 * slugify('My App (Dev)')    // 'my-app-dev'
 * ```
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Returns the full display name for a cloud provider.
 *
 * @param cloudProvider - Provider identifier (aws, azure, gcp)
 * @returns Full provider name for display
 *
 * @example
 * ```typescript
 * getCloudProviderFullName('aws')   // 'Amazon Web Services'
 * getCloudProviderFullName('azure') // 'Microsoft Azure'
 * getCloudProviderFullName('gcp')   // 'Google Cloud Platform'
 * getCloudProviderFullName('other') // 'OTHER'
 * ```
 *
 * @internal
 */
function getCloudProviderFullName(cloudProvider: string): string {
  const providerNames: Record<string, string> = {
    aws: 'Amazon Web Services',
    azure: 'Microsoft Azure',
    gcp: 'Google Cloud Platform',
  };
  return providerNames[cloudProvider.toLowerCase()] || cloudProvider.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts unique account names from allocations.
 *
 * @param allocations - Array of Subnetter allocations
 * @returns Array of unique account names
 *
 * @example
 * ```typescript
 * const accounts = extractAccounts(allocations);
 * // ['production', 'staging', 'development']
 * ```
 */
export function extractAccounts(allocations: Allocation[]): string[] {
  const accounts = new Set<string>();
  for (const alloc of allocations) {
    accounts.add(alloc.accountName);
  }
  return Array.from(accounts);
}

/**
 * Extracts unique cloud providers from allocations.
 *
 * @remarks
 * Cloud providers are mapped to NetBox Site Groups for functional grouping.
 *
 * @param allocations - Array of Subnetter allocations
 * @returns Array of unique cloud provider identifiers
 *
 * @example
 * ```typescript
 * const providers = extractCloudProviders(allocations);
 * // ['aws', 'azure', 'gcp']
 * ```
 */
export function extractCloudProviders(allocations: Allocation[]): string[] {
  const providers = new Set<string>();
  for (const alloc of allocations) {
    providers.add(alloc.cloudProvider);
  }
  return Array.from(providers);
}

/**
 * Extracts unique cloud regions with their providers from allocations.
 *
 * @remarks
 * Cloud regions are mapped to NetBox Sites, grouped under their provider's
 * Site Group.
 *
 * @param allocations - Array of Subnetter allocations
 * @returns Array of region/provider pairs
 *
 * @example
 * ```typescript
 * const regions = extractCloudRegions(allocations);
 * // [
 * //   { region: 'us-east-1', provider: 'aws' },
 * //   { region: 'eastus', provider: 'azure' },
 * // ]
 * ```
 */
export function extractCloudRegions(allocations: Allocation[]): Array<{ region: string; provider: string }> {
  const regions = new Map<string, string>();
  for (const alloc of allocations) {
    const key = `${alloc.cloudProvider}:${alloc.regionName}`;
    if (!regions.has(key)) {
      regions.set(key, alloc.cloudProvider);
    }
  }
  return Array.from(regions.entries()).map(([key, provider]) => ({
    region: key.split(':')[1],
    provider,
  }));
}

/**
 * Extracts unique availability zones with their region and provider.
 *
 * @remarks
 * Availability zones are mapped to NetBox Locations, which are children
 * of Sites (regions).
 *
 * @param allocations - Array of Subnetter allocations
 * @returns Array of AZ/region/provider tuples
 *
 * @example
 * ```typescript
 * const azs = extractAvailabilityZones(allocations);
 * // [
 * //   { az: 'us-east-1a', region: 'us-east-1', provider: 'aws' },
 * //   { az: 'us-east-1b', region: 'us-east-1', provider: 'aws' },
 * // ]
 * ```
 */
export function extractAvailabilityZones(allocations: Allocation[]): Array<{
  az: string;
  region: string;
  provider: string;
}> {
  const azs = new Map<string, { region: string; provider: string }>();
  for (const alloc of allocations) {
    const key = `${alloc.cloudProvider}:${alloc.regionName}:${alloc.availabilityZone}`;
    if (!azs.has(key)) {
      azs.set(key, {
        region: alloc.regionName,
        provider: alloc.cloudProvider,
      });
    }
  }
  return Array.from(azs.entries()).map(([key, { region, provider }]) => ({
    az: key.split(':')[2],
    region,
    provider,
  }));
}

/**
 * Extracts unique subnet types (roles) from allocations.
 *
 * @remarks
 * Subnet types are mapped to NetBox Roles, which categorize prefixes
 * by their function (e.g., 'public', 'private', 'database').
 *
 * @param allocations - Array of Subnetter allocations
 * @returns Array of unique subnet type names
 *
 * @example
 * ```typescript
 * const roles = extractRoles(allocations);
 * // ['public', 'private', 'database']
 * ```
 */
export function extractRoles(allocations: Allocation[]): string[] {
  const roles = new Set<string>();
  for (const alloc of allocations) {
    roles.add(alloc.subnetRole);
  }
  return Array.from(roles);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a Subnetter account name to a NetBox Tenant.
 *
 * @remarks
 * Tenants in NetBox represent organizational ownership. Each cloud account
 * becomes a tenant, allowing prefixes to be associated with their owning
 * account.
 *
 * @param accountName - Cloud account name
 * @returns Tenant object for NetBox API
 *
 * @example
 * ```typescript
 * const tenant = mapAccountToTenant('Production AWS');
 * // {
 * //   name: 'Production AWS',
 * //   slug: 'production-aws',
 * //   description: 'Cloud account managed by Subnetter',
 * // }
 * ```
 */
export function mapAccountToTenant(accountName: string): TenantWritable {
  return {
    name: accountName,
    slug: slugify(accountName),
    description: `Cloud account managed by Subnetter`,
  };
}

/**
 * Maps a cloud provider to a NetBox Site Group.
 *
 * @remarks
 * Site Groups provide functional/logical organization in NetBox. Subnetter
 * uses them to group cloud regions by provider (AWS, Azure, GCP).
 *
 * @param cloudProvider - Cloud provider identifier (aws, azure, gcp)
 * @returns Site Group object for NetBox API
 *
 * @example
 * ```typescript
 * const siteGroup = mapCloudProviderToSiteGroup('aws');
 * // {
 * //   name: 'Amazon Web Services',
 * //   slug: 'aws',
 * //   description: 'Cloud infrastructure provider - Amazon Web Services',
 * // }
 * ```
 */
export function mapCloudProviderToSiteGroup(cloudProvider: string): SiteGroupWritable {
  const fullName = getCloudProviderFullName(cloudProvider);

  return {
    name: fullName,
    slug: slugify(cloudProvider),
    description: `Cloud infrastructure provider - ${fullName}`,
  };
}

/**
 * Maps a base CIDR to a NetBox Aggregate.
 *
 * @remarks
 * Aggregates represent the root of the IP addressing hierarchy in NetBox.
 * Subnetter creates one for the base CIDR to properly anchor the prefix
 * hierarchy.
 *
 * @param baseCidr - Base CIDR block (e.g., '10.0.0.0/8')
 * @param rirId - ID of the RIR (typically RFC 1918 for private ranges)
 * @returns Aggregate object for NetBox API
 *
 * @example
 * ```typescript
 * const aggregate = mapBaseCidrToAggregate('10.0.0.0/8', 1);
 * // {
 * //   prefix: '10.0.0.0/8',
 * //   rir: 1,
 * //   description: 'Root IP allocation for cloud infrastructure',
 * // }
 * ```
 */
export function mapBaseCidrToAggregate(baseCidr: string, rirId: number): AggregateWritable {
  return {
    prefix: baseCidr,
    rir: rirId,
    description: `Root IP allocation for cloud infrastructure`,
  };
}

/**
 * Maps a cloud region to a NetBox Site.
 *
 * @remarks
 * Sites in NetBox represent physical or logical locations. Cloud regions
 * are mapped to sites, grouped under their provider's Site Group.
 *
 * @param regionName - Cloud region name (e.g., 'us-east-1')
 * @param cloudProvider - Cloud provider identifier
 * @param siteGroupId - Optional ID of the parent Site Group
 * @returns Site object for NetBox API
 *
 * @example
 * ```typescript
 * const site = mapRegionToSite('us-east-1', 'aws', 1);
 * // {
 * //   name: 'us-east-1',
 * //   slug: 'us-east-1',
 * //   status: 'active',
 * //   group: 1,
 * //   description: 'Amazon Web Services region in us-east-1',
 * // }
 * ```
 */
export function mapRegionToSite(
  regionName: string,
  cloudProvider: string,
  siteGroupId?: number,
): SiteWritable {
  const providerName = getCloudProviderFullName(cloudProvider);

  return {
    name: regionName,
    slug: slugify(regionName),
    status: 'active',
    group: siteGroupId ?? undefined,
    description: `${providerName} region in ${regionName}`,
  };
}

/**
 * Maps an availability zone to a NetBox Location.
 *
 * @remarks
 * Locations in NetBox represent sub-divisions within sites. Availability
 * zones are mapped to locations, which are children of their region's Site.
 *
 * @param azName - Availability zone name (e.g., 'us-east-1a')
 * @param regionName - Parent region name
 * @param cloudProvider - Cloud provider identifier
 * @param siteId - ID of the parent Site (cloud region)
 * @returns Location object for NetBox API
 *
 * @example
 * ```typescript
 * const location = mapAzToLocation('us-east-1a', 'us-east-1', 'aws', 1);
 * // {
 * //   name: 'us-east-1a',
 * //   slug: 'us-east-1a',
 * //   site: 1,
 * //   status: 'active',
 * //   description: 'Amazon Web Services availability zone us-east-1a in us-east-1',
 * // }
 * ```
 */
export function mapAzToLocation(
  azName: string,
  regionName: string,
  cloudProvider: string,
  siteId: number,
): LocationWritable {
  const providerName = getCloudProviderFullName(cloudProvider);

  return {
    name: azName,
    slug: slugify(azName),
    site: siteId,
    status: 'active',
    description: `${providerName} availability zone ${azName} in ${regionName}`,
  };
}

/**
 * Maps a subnet type to a NetBox Role.
 *
 * @remarks
 * Roles in NetBox categorize prefixes by their function. Each subnet type
 * in Subnetter (e.g., 'public', 'private') becomes a role.
 *
 * @param subnetType - Subnet type name
 * @returns Role object for NetBox API
 *
 * @example
 * ```typescript
 * const role = mapSubnetTypeToRole('public');
 * // {
 * //   name: 'public',
 * //   slug: 'public',
 * //   description: 'Subnet role for public workloads',
 * // }
 * ```
 */
export function mapSubnetTypeToRole(subnetType: string): RoleWritable {
  return {
    name: subnetType,
    slug: slugify(subnetType),
    description: `Subnet role for ${subnetType.toLowerCase()} workloads`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prefix Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for mapping allocations to prefixes.
 */
export interface MapPrefixOptions {
  /**
   * Status to assign to the prefix.
   * @defaultValue 'reserved'
   */
  status?: PrefixStatus;
  /** Tenant ID to assign (maps from account) */
  tenantId?: number;
  /** Site ID to assign (maps from region, used for scope in NetBox 4.x) */
  siteId?: number;
  /** Role ID to assign (maps from subnet type) */
  roleId?: number;
}

/**
 * Maps a Subnetter allocation to a NetBox Prefix.
 *
 * @remarks
 * This is the main mapping function that converts a Subnetter allocation
 * into a NetBox prefix. It handles:
 * - CIDR notation
 * - Status assignment
 * - Tenant (account) association
 * - Site scope (NetBox 4.x)
 * - Role (subnet type) association
 * - Descriptive text generation
 *
 * In NetBox 4.x, the site relationship is handled via `scope_type` and
 * `scope_id` instead of the deprecated `site` field.
 *
 * @param allocation - Subnetter allocation to map
 * @param options - Optional configuration for the mapping
 * @returns Prefix object for NetBox API
 *
 * @example
 * ```typescript
 * const prefix = mapAllocationToPrefix(allocation, {
 *   status: 'reserved',
 *   tenantId: 1,
 *   siteId: 2,
 *   roleId: 3,
 * });
 * // {
 * //   prefix: '10.1.1.0/24',
 * //   status: 'reserved',
 * //   tenant: 1,
 * //   scope_type: 'dcim.site',
 * //   scope_id: 2,
 * //   role: 3,
 * //   description: 'public subnet in us-east-1a (Amazon Web Services us-east-1)',
 * // }
 * ```
 */
export function mapAllocationToPrefix(
  allocation: Allocation,
  options: MapPrefixOptions = {},
): PrefixWritable {
  const { status = 'reserved', tenantId, siteId, roleId } = options;

  // Build a descriptive description
  const providerName = getCloudProviderFullName(allocation.cloudProvider);
  const description = `${allocation.subnetRole} subnet in ${allocation.availabilityZone} (${providerName} ${allocation.regionName})`;

  return {
    prefix: allocation.subnetCidr,
    status,
    tenant: tenantId ?? undefined,
    // NetBox 4.x uses scope_type and scope_id instead of site
    scope_type: siteId ? 'dcim.site' : undefined,
    scope_id: siteId ?? undefined,
    role: roleId ?? undefined,
    description,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Generation (for diffing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a unique key for an allocation for comparison purposes.
 *
 * @param allocation - Subnetter allocation
 * @returns Unique string key combining all identifying fields
 *
 * @example
 * ```typescript
 * const key = allocationKey(allocation);
 * // 'production::aws::us-east-1::us-east-1a::public::10.1.1.0/24'
 * ```
 */
export function allocationKey(allocation: Allocation): string {
  return [
    allocation.accountName,
    allocation.cloudProvider,
    allocation.regionName,
    allocation.availabilityZone,
    allocation.subnetRole,
    allocation.subnetCidr,
  ].join('::');
}

/**
 * Generates a unique key for a prefix for comparison purposes.
 *
 * @param prefix - Prefix object with at least a prefix field
 * @returns The CIDR as the unique key
 *
 * @example
 * ```typescript
 * const key = prefixKey({ prefix: '10.1.1.0/24' });
 * // '10.1.1.0/24'
 * ```
 */
export function prefixKey(prefix: { prefix: string; description?: string }): string {
  return prefix.prefix;
}
