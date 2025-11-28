/**
 * @module @subnetter/netbox
 * @description NetBox IPAM integration for Subnetter.
 *
 * This package provides bidirectional integration between Subnetter's CIDR
 * allocations and NetBox's IP Address Management (IPAM) system. It enables
 * organizations to maintain a single source of truth for their IP addressing
 * across multi-cloud environments.
 *
 * ## Features
 *
 * - **Export to NetBox**: Sync Subnetter allocations to NetBox prefixes
 * - **Automatic Object Creation**: Creates supporting objects (tenants, sites, roles)
 * - **Hierarchical Mapping**: Maps cloud concepts to NetBox's data model
 * - **Dry-Run Mode**: Preview changes before applying them
 * - **Idempotent Operations**: Safe to run repeatedly without duplicates
 *
 * ## NetBox Object Mapping
 *
 * Subnetter maps cloud concepts to NetBox objects as follows:
 *
 * | Subnetter Concept | NetBox Object | Description |
 * |-------------------|---------------|-------------|
 * | Base CIDR | Aggregate | Top-level IP block (e.g., 10.0.0.0/8) |
 * | Cloud Provider | Site Group | Functional grouping (AWS, Azure, GCP) |
 * | Cloud Region | Site | Geographic location (us-east-1) |
 * | Availability Zone | Location | Sub-division within a site |
 * | Account | Tenant | Ownership/billing boundary |
 * | Subnet Type | Role | Network function (public, private) |
 * | Subnet CIDR | Prefix | Actual IP allocation |
 *
 * ## Usage
 *
 * @example Basic export to NetBox
 * ```typescript
 * import { NetBoxClient, NetBoxExporter } from '@subnetter/netbox';
 * import { CidrAllocator, loadConfig } from '@subnetter/core';
 *
 * // Load configuration and generate allocations
 * const config = await loadConfig('config.json');
 * const allocator = new CidrAllocator(config);
 * const allocations = allocator.generateAllocations();
 *
 * // Create NetBox client
 * const client = new NetBoxClient({
 *   url: 'https://netbox.example.com',
 *   token: process.env.NETBOX_TOKEN,
 * });
 *
 * // Export to NetBox (dry-run first)
 * const exporter = new NetBoxExporter(client);
 * const result = await exporter.export(allocations, {
 *   dryRun: true,
 *   baseCidr: config.baseCidr,
 * });
 *
 * console.log(`Would create: ${result.summary.created}`);
 * console.log(`Would update: ${result.summary.updated}`);
 * ```
 *
 * @example Using the NetBox client directly
 * ```typescript
 * import { NetBoxClient } from '@subnetter/netbox';
 *
 * const client = new NetBoxClient({
 *   url: 'https://netbox.example.com',
 *   token: 'your-api-token',
 * });
 *
 * // List all prefixes
 * const prefixes = await client.prefixes.listAll();
 *
 * // Find a specific prefix
 * const prefix = await client.prefixes.findByPrefix('10.1.0.0/16');
 *
 * // Create a new prefix
 * await client.prefixes.create({
 *   prefix: '10.2.0.0/16',
 *   status: 'reserved',
 *   description: 'New allocation',
 * });
 * ```
 *
 * ## API Compatibility
 *
 * This package is designed for NetBox 4.x. Key differences from 3.x:
 * - Prefixes use `scope_type` and `scope_id` instead of `site` field
 * - API endpoints remain largely the same
 *
 * @see {@link https://docs.netbox.dev/en/stable/ | NetBox Documentation}
 * @see {@link https://github.com/gangster/subnetter | Subnetter Repository}
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────────────────
// Client Exports
// ─────────────────────────────────────────────────────────────────────────────

export { NetBoxClient, NetBoxApiError } from './client/NetBoxClient';
export type {
  NetBoxConfig,
  Prefix,
  PrefixWritable,
  PrefixListParams,
  PrefixStatus,
  PrefixScopeType,
  Region,
  RegionWritable,
  RegionListParams,
  SiteGroup,
  SiteGroupWritable,
  SiteGroupListParams,
  Site,
  SiteWritable,
  Location,
  LocationWritable,
  LocationListParams,
  Tenant,
  TenantWritable,
  Role,
  RoleWritable,
  Tag,
  TagWritable,
  Aggregate,
  AggregateWritable,
  AggregateListParams,
  Rir,
  RirListParams,
  PaginatedResponse,
  NestedRef,
  NestedTag,
} from './client/types';

// ─────────────────────────────────────────────────────────────────────────────
// Export Module
// ─────────────────────────────────────────────────────────────────────────────

export { NetBoxExporter } from './export/exporter';
export type {
  ExportOptions,
  ExportResult,
  PlannedChange,
  OperationType,
} from './export/exporter';
export {
  SUBNETTER_MANAGED_TAG,
  slugify,
  mapAccountToTenant,
  mapCloudProviderToSiteGroup,
  mapBaseCidrToAggregate,
  mapRegionToSite,
  mapAzToLocation,
  mapSubnetTypeToRole,
  mapAllocationToPrefix,
  extractAccounts,
  extractCloudProviders,
  extractCloudRegions,
  extractAvailabilityZones,
  extractRoles,
} from './export/mapper';
