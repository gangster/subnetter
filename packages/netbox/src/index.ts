/**
 * @subnetter/netbox - NetBox IPAM integration for Subnetter
 *
 * This package provides integration between Subnetter and NetBox,
 * enabling export of Subnetter allocations to NetBox's IPAM system.
 *
 * @packageDocumentation
 */

// Client
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

// Export
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

