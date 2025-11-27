/**
 * @subnetter/netbox - NetBox IPAM integration for Subnetter
 *
 * This package provides integration between Subnetter and NetBox,
 * enabling export of Subnetter allocations to NetBox's IPAM system.
 *
 * @packageDocumentation
 */

// Client
export { NetBoxClient, NetBoxApiError } from './client/NetBoxClient.js';
export type {
  NetBoxConfig,
  Prefix,
  PrefixWritable,
  PrefixListParams,
  PrefixStatus,
  Site,
  SiteWritable,
  Tenant,
  TenantWritable,
  Role,
  RoleWritable,
  Tag,
  TagWritable,
  Aggregate,
  AggregateWritable,
  PaginatedResponse,
  NestedRef,
  NestedTag,
} from './client/types.js';

// Export
export { NetBoxExporter } from './export/exporter.js';
export type {
  ExportOptions,
  ExportResult,
  PlannedChange,
  OperationType,
} from './export/exporter.js';
export {
  SUBNETTER_MANAGED_TAG,
  slugify,
  mapAccountToTenant,
  mapRegionToSite,
  mapSubnetTypeToRole,
  mapAllocationToPrefix,
  extractAccounts,
  extractRegions,
  extractRoles,
} from './export/mapper.js';

