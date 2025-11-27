/**
 * Maps Subnetter allocations to NetBox objects
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

/** Tag used to identify Subnetter-managed objects */
export const SUBNETTER_MANAGED_TAG = 'subnetter-managed';

/**
 * Slugify a string for use in NetBox
 * - Converts to lowercase
 * - Replaces spaces and special chars with hyphens
 * - Removes consecutive hyphens
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extract unique accounts from allocations
 */
export function extractAccounts(allocations: Allocation[]): string[] {
  const accounts = new Set<string>();
  for (const alloc of allocations) {
    accounts.add(alloc.accountName);
  }
  return Array.from(accounts);
}

/**
 * Extract unique cloud providers from allocations (for NetBox Site Groups)
 */
export function extractCloudProviders(allocations: Allocation[]): string[] {
  const providers = new Set<string>();
  for (const alloc of allocations) {
    providers.add(alloc.cloudProvider);
  }
  return Array.from(providers);
}

/**
 * Extract unique cloud regions from allocations (for NetBox Sites)
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
 * Extract unique availability zones from allocations (for NetBox Locations)
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
 * Extract unique subnet types (roles) from allocations
 */
export function extractRoles(allocations: Allocation[]): string[] {
  const roles = new Set<string>();
  for (const alloc of allocations) {
    roles.add(alloc.subnetRole);
  }
  return Array.from(roles);
}

/**
 * Map a Subnetter account to a NetBox Tenant
 */
export function mapAccountToTenant(accountName: string): TenantWritable {
  return {
    name: accountName,
    slug: slugify(accountName),
    description: `Cloud account managed by Subnetter`,
  };
}

/**
 * Get the full name for a cloud provider
 */
function getCloudProviderFullName(cloudProvider: string): string {
  const providerNames: Record<string, string> = {
    aws: 'Amazon Web Services',
    azure: 'Microsoft Azure',
    gcp: 'Google Cloud Platform',
  };
  return providerNames[cloudProvider.toLowerCase()] || cloudProvider.toUpperCase();
}

/**
 * Map a cloud provider to a NetBox Site Group (functional grouping)
 *
 * Site Groups are used for functional/logical organization, which is
 * appropriate for cloud providers (AWS, Azure, GCP).
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
 * Map a base CIDR to a NetBox Aggregate
 *
 * Aggregates represent the root of your IP addressing hierarchy.
 * They are typically RFC 1918 private ranges or public allocations.
 *
 * @param baseCidr - The base CIDR block (e.g., '10.0.0.0/8')
 * @param rirId - The ID of the RIR (e.g., RFC 1918)
 */
export function mapBaseCidrToAggregate(baseCidr: string, rirId: number): AggregateWritable {
  return {
    prefix: baseCidr,
    rir: rirId,
    description: `Root IP allocation for cloud infrastructure`,
  };
}

/**
 * Map a cloud region to a NetBox Site
 *
 * @param regionName - Cloud region name (e.g., 'us-east-1')
 * @param cloudProvider - Cloud provider (e.g., 'aws')
 * @param siteGroupId - ID of the parent NetBox Site Group (cloud provider)
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
 * Map an availability zone to a NetBox Location
 *
 * @param azName - Availability zone name (e.g., 'us-east-1a')
 * @param regionName - Cloud region name (e.g., 'us-east-1')
 * @param cloudProvider - Cloud provider (e.g., 'aws')
 * @param siteId - ID of the parent NetBox Site (cloud region)
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
 * Map a subnet type to a NetBox Role
 */
export function mapSubnetTypeToRole(subnetType: string): RoleWritable {
  return {
    name: subnetType,
    slug: slugify(subnetType),
    description: `Subnet role for ${subnetType.toLowerCase()} workloads`,
  };
}

/**
 * Options for mapping allocations to prefixes
 */
export interface MapPrefixOptions {
  /** Status to assign to prefixes (default: 'reserved') */
  status?: PrefixStatus;
  /** Tenant ID to assign (if known) */
  tenantId?: number;
  /** Site ID to assign (if known) - used for scope in NetBox 4.x */
  siteId?: number;
  /** Role ID to assign (if known) */
  roleId?: number;
}

/**
 * Map a Subnetter allocation to a NetBox Prefix
 *
 * Note: In NetBox 4.x, the site relationship is handled via scope_type and scope_id
 * instead of the deprecated site field.
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

/**
 * Generate a unique key for an allocation (for diffing)
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
 * Generate a unique key for a prefix (for diffing)
 */
export function prefixKey(prefix: { prefix: string; description?: string }): string {
  return prefix.prefix;
}

