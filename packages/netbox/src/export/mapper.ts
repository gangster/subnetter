/**
 * Maps Subnetter allocations to NetBox objects
 */

import type { Allocation } from '@subnetter/core';
import type {
  PrefixWritable,
  SiteWritable,
  TenantWritable,
  RoleWritable,
  TagWritable,
  PrefixStatus,
} from '../client/types.js';

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
 * Extract unique regions from allocations
 */
export function extractRegions(allocations: Allocation[]): Array<{ region: string; provider: string }> {
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
    description: `Subnetter managed account: ${accountName}`,
    tags: [{ name: SUBNETTER_MANAGED_TAG, slug: slugify(SUBNETTER_MANAGED_TAG) }],
  };
}

/**
 * Map a cloud region to a NetBox Site
 */
export function mapRegionToSite(
  regionName: string,
  cloudProvider: string,
): SiteWritable {
  return {
    name: regionName,
    slug: slugify(regionName),
    status: 'active',
    description: `${cloudProvider.toUpperCase()} region: ${regionName}`,
    tags: [
      { name: SUBNETTER_MANAGED_TAG, slug: slugify(SUBNETTER_MANAGED_TAG) },
      { name: cloudProvider, slug: slugify(cloudProvider) },
    ],
  };
}

/**
 * Map a subnet type to a NetBox Role
 */
export function mapSubnetTypeToRole(subnetType: string): RoleWritable {
  return {
    name: subnetType,
    slug: slugify(subnetType),
    description: `Subnet role: ${subnetType}`,
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
  /** Site ID to assign (if known) */
  siteId?: number;
  /** Role ID to assign (if known) */
  roleId?: number;
}

/**
 * Map a Subnetter allocation to a NetBox Prefix
 */
export function mapAllocationToPrefix(
  allocation: Allocation,
  options: MapPrefixOptions = {},
): PrefixWritable {
  const { status = 'reserved', tenantId, siteId, roleId } = options;

  // Build description
  const description = [
    allocation.accountName,
    allocation.regionName,
    allocation.availabilityZone,
    allocation.subnetRole,
  ].join(' / ');

  // Build tags
  const tags: TagWritable[] = [
    { name: SUBNETTER_MANAGED_TAG, slug: slugify(SUBNETTER_MANAGED_TAG) },
    { name: allocation.cloudProvider, slug: slugify(allocation.cloudProvider) },
    { name: `az:${allocation.availabilityZone}`, slug: slugify(`az-${allocation.availabilityZone}`) },
  ];

  return {
    prefix: allocation.subnetCidr,
    status,
    tenant: tenantId ?? undefined,
    site: siteId ?? undefined,
    role: roleId ?? undefined,
    description,
    tags,
    custom_fields: {
      subnetter_account: allocation.accountName,
      subnetter_region: allocation.regionName,
      subnetter_az: allocation.availabilityZone,
      subnetter_role: allocation.subnetRole,
      subnetter_usable_ips: allocation.usableIps,
    },
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

