/**
 * @module client/types
 * @description NetBox API type definitions for REST API v4.x.
 *
 * Provides TypeScript interfaces for all NetBox objects used by Subnetter,
 * including IPAM (prefixes, aggregates, roles), DCIM (sites, locations),
 * Tenancy (tenants), and Extras (tags).
 *
 * ## Type Conventions
 *
 * - **Read Types**: Full objects returned from API (e.g., `Prefix`, `Site`)
 * - **Writable Types**: Create/update request bodies (e.g., `PrefixWritable`)
 * - **Nested Types**: Embedded references (e.g., `NestedRef`, `NestedTag`)
 * - **List Params**: Query parameters for list endpoints (e.g., `PrefixListParams`)
 *
 * ## NetBox 4.x Changes
 *
 * Key changes from NetBox 3.x:
 * - Prefixes use `scope_type` and `scope_id` instead of `site` field
 * - New `scope` nested reference in prefix responses
 *
 * @see {@link https://docs.netbox.dev/en/stable/models/ | NetBox Data Model}
 *
 * @packageDocumentation
 */

import { z } from 'zod';

// ============================================================================
// Common Types
// ============================================================================

/**
 * Nested object reference returned in API responses.
 *
 * @remarks
 * Many NetBox objects include references to related objects. These are
 * returned as nested objects with just the essential fields for display
 * and linking.
 *
 * @example
 * ```typescript
 * // A prefix's tenant reference:
 * {
 *   id: 1,
 *   url: 'https://netbox/api/tenancy/tenants/1/',
 *   display: 'Production',
 *   name: 'Production',
 *   slug: 'production'
 * }
 * ```
 */
export interface NestedRef {
  /** Unique identifier */
  id: number;
  /** Full API URL for the object */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Object name */
  name: string;
  /** URL-safe slug (optional on some types) */
  slug?: string;
}

/**
 * Choice field value for status, family, and other enumerated fields.
 *
 * @typeParam T - The string literal type for valid values
 *
 * @example
 * ```typescript
 * // Prefix status:
 * { value: 'active', label: 'Active' }
 * ```
 */
export interface ChoiceValue<T extends string = string> {
  /** Machine-readable value */
  value: T;
  /** Human-readable label */
  label: string;
}

/**
 * Standard paginated response wrapper for list endpoints.
 *
 * @typeParam T - The type of objects in the results array
 *
 * @example
 * ```typescript
 * const response: PaginatedResponse<Prefix> = await client.prefixes.list();
 * console.log(`Found ${response.count} prefixes`);
 * for (const prefix of response.results) {
 *   console.log(prefix.prefix);
 * }
 * ```
 */
export interface PaginatedResponse<T> {
  /** Total count of matching objects */
  count: number;
  /** URL to next page (null if no more pages) */
  next: string | null;
  /** URL to previous page (null if first page) */
  previous: string | null;
  /** Array of objects for this page */
  results: T[];
}

/**
 * API error response body.
 *
 * @remarks
 * When an API request fails, NetBox returns an error response with
 * a `detail` field and potentially additional context.
 */
export interface ApiError {
  /** Human-readable error message */
  detail?: string;
  /** Additional error context (field-specific errors, etc.) */
  [key: string]: unknown;
}

// ============================================================================
// IPAM Types
// ============================================================================

/**
 * Valid prefix status values.
 *
 * @remarks
 * - `container`: A supernet containing child prefixes
 * - `active`: Currently in use
 * - `reserved`: Reserved for future use
 * - `deprecated`: No longer in use
 */
export type PrefixStatus = 'container' | 'active' | 'reserved' | 'deprecated';

/**
 * IP address family.
 *
 * @remarks
 * Subnetter currently only supports IPv4 (family 4).
 */
export type IpFamily = 4 | 6;

/**
 * Prefix scope type for NetBox 4.x.
 *
 * @remarks
 * NetBox 4.x replaced the direct `site` relationship with a polymorphic
 * scope that can reference sites, locations, regions, or site groups.
 */
export type PrefixScopeType = 'dcim.site' | 'dcim.location' | 'dcim.region' | 'dcim.sitegroup' | null;

/**
 * NetBox Prefix object representing an IP network allocation.
 *
 * @remarks
 * Prefixes are the core IPAM object. They can be nested hierarchically
 * (parent/child relationships) and associated with tenants, sites, roles,
 * and VLANs.
 *
 * @example
 * ```typescript
 * const prefix: Prefix = {
 *   id: 1,
 *   prefix: '10.1.0.0/16',
 *   status: { value: 'active', label: 'Active' },
 *   tenant: { id: 1, name: 'Production', ... },
 *   // ... other fields
 * };
 * ```
 *
 * @see {@link PrefixWritable} for create/update fields
 */
export interface Prefix {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Display URL for the web UI */
  display_url: string;
  /** IP address family (4 or 6) */
  family: ChoiceValue<string>;
  /** CIDR notation (e.g., '10.1.0.0/16') */
  prefix: string;
  /**
   * Direct site reference (deprecated in NetBox 4.x)
   * @deprecated Use `scope` instead
   */
  site: NestedRef | null;
  /** Scope type for the prefix (NetBox 4.x) */
  scope_type: PrefixScopeType;
  /** Scope object ID (NetBox 4.x) */
  scope_id: number | null;
  /** Scope object reference (NetBox 4.x) */
  scope: NestedRef | null;
  /** VRF (Virtual Routing and Forwarding) reference */
  vrf: NestedRef | null;
  /** Tenant (owner) reference */
  tenant: NestedRef | null;
  /** VLAN reference */
  vlan: NestedRef | null;
  /** Operational status */
  status: ChoiceValue<PrefixStatus>;
  /** Functional role reference */
  role: NestedRef | null;
  /** Whether this is a pool for IP address assignment */
  is_pool: boolean;
  /** Whether to consider all IPs as utilized */
  mark_utilized: boolean;
  /** Brief description */
  description: string;
  /** Detailed comments (Markdown supported) */
  comments: string;
  /** Applied tags */
  tags: NestedTag[];
  /** Custom field values */
  custom_fields: Record<string, unknown>;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
  /** Number of child prefixes */
  children: number;
  /** Nesting depth in the prefix hierarchy */
  _depth: number;
}

/**
 * Prefix data for create/update operations.
 *
 * @remarks
 * For NetBox 4.x, use `scope_type` and `scope_id` instead of `site`.
 * Subnetter sets `scope_type: 'dcim.site'` when associating prefixes
 * with cloud regions (which are mapped to sites).
 *
 * @example
 * ```typescript
 * const newPrefix: PrefixWritable = {
 *   prefix: '10.1.0.0/16',
 *   status: 'reserved',
 *   scope_type: 'dcim.site',
 *   scope_id: 1,
 *   tenant: 1,
 *   role: 2,
 *   description: 'Production VPC',
 * };
 * ```
 */
export interface PrefixWritable {
  /** CIDR notation (required) */
  prefix: string;
  /**
   * Direct site ID (deprecated in NetBox 4.x)
   * @deprecated Use `scope_type` and `scope_id` instead
   */
  site?: number | null;
  /** Scope type for the prefix (NetBox 4.x) */
  scope_type?: PrefixScopeType;
  /** Scope object ID (NetBox 4.x) */
  scope_id?: number | null;
  /** VRF ID */
  vrf?: number | null;
  /** Tenant ID */
  tenant?: number | null;
  /** VLAN ID */
  vlan?: number | null;
  /** Operational status */
  status?: PrefixStatus;
  /** Role ID */
  role?: number | null;
  /** Whether this is a pool */
  is_pool?: boolean;
  /** Whether to mark all IPs utilized */
  mark_utilized?: boolean;
  /** Brief description */
  description?: string;
  /** Detailed comments */
  comments?: string;
  /** Tags to apply */
  tags?: TagWritable[];
  /** Custom field values */
  custom_fields?: Record<string, unknown>;
}

/**
 * NetBox Aggregate representing a top-level IP block.
 *
 * @remarks
 * Aggregates represent the root of the IP addressing hierarchy, typically
 * RFC 1918 private ranges or public allocations from an RIR.
 *
 * @see {@link AggregateWritable} for create/update fields
 */
export interface Aggregate {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** IP address family */
  family: ChoiceValue<string>;
  /** CIDR notation */
  prefix: string;
  /** Regional Internet Registry */
  rir: NestedRef;
  /** Tenant reference */
  tenant: NestedRef | null;
  /** Date when the aggregate was added */
  date_added: string | null;
  /** Brief description */
  description: string;
  /** Detailed comments */
  comments: string;
  /** Applied tags */
  tags: NestedTag[];
  /** Custom field values */
  custom_fields: Record<string, unknown>;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
}

/**
 * Aggregate data for create/update operations.
 *
 * @example
 * ```typescript
 * const aggregate: AggregateWritable = {
 *   prefix: '10.0.0.0/8',
 *   rir: 1, // RFC 1918
 *   description: 'Private network allocation',
 * };
 * ```
 */
export interface AggregateWritable {
  /** CIDR notation (required) */
  prefix: string;
  /** RIR ID (required) */
  rir: number;
  /** Tenant ID */
  tenant?: number | null;
  /** Date added */
  date_added?: string | null;
  /** Brief description */
  description?: string;
  /** Detailed comments */
  comments?: string;
  /** Tags to apply */
  tags?: TagWritable[];
  /** Custom field values */
  custom_fields?: Record<string, unknown>;
}

/**
 * Query parameters for listing aggregates.
 */
export interface AggregateListParams {
  /** Maximum results per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by prefix */
  prefix?: string;
  /** Filter by RIR ID */
  rir_id?: number;
  /** Filter by RIR slug */
  rir?: string;
  /** Filter by tenant ID */
  tenant_id?: number;
  /** Filter by tag(s) */
  tag?: string | string[];
}

/**
 * Query parameters for listing RIRs.
 */
export interface RirListParams {
  /** Maximum results per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by name */
  name?: string;
  /** Filter by slug */
  slug?: string;
  /** Filter by private flag */
  is_private?: boolean;
}

/**
 * NetBox Role for prefix/VLAN classification.
 *
 * @remarks
 * Roles categorize prefixes and VLANs by their function. Common roles
 * include 'public', 'private', 'management', etc.
 */
export interface Role {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Role name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Display weight (lower = higher priority) */
  weight: number;
  /** Brief description */
  description: string;
  /** Applied tags */
  tags: NestedTag[];
  /** Custom field values */
  custom_fields: Record<string, unknown>;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
  /** Number of prefixes with this role */
  prefix_count: number;
  /** Number of VLANs with this role */
  vlan_count: number;
}

/**
 * Role data for create/update operations.
 */
export interface RoleWritable {
  /** Role name (required) */
  name: string;
  /** URL-safe slug (required) */
  slug: string;
  /** Display weight */
  weight?: number;
  /** Brief description */
  description?: string;
  /** Tags to apply */
  tags?: TagWritable[];
  /** Custom field values */
  custom_fields?: Record<string, unknown>;
}

/**
 * NetBox RIR (Regional Internet Registry).
 *
 * @remarks
 * RIRs are required for creating aggregates. Subnetter creates an
 * 'RFC 1918' RIR for private address space.
 */
export interface Rir {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** RIR name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Whether this is for private address space */
  is_private: boolean;
  /** Brief description */
  description: string;
  /** Applied tags */
  tags: NestedTag[];
  /** Custom field values */
  custom_fields: Record<string, unknown>;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
  /** Number of aggregates */
  aggregate_count: number;
}

// ============================================================================
// DCIM Types
// ============================================================================

/**
 * NetBox Region for geographic hierarchy.
 *
 * @remarks
 * Regions provide geographic organization. Note: Subnetter uses Sites
 * for cloud regions to allow Site Groups for provider organization.
 */
export interface Region {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Region name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Parent region reference */
  parent: NestedRef | null;
  /** Brief description */
  description: string;
  /** Applied tags */
  tags: NestedTag[];
  /** Custom field values */
  custom_fields: Record<string, unknown>;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
  /** Number of sites in this region */
  site_count: number;
  /** Nesting depth */
  _depth: number;
}

/**
 * Region data for create/update operations.
 */
export interface RegionWritable {
  /** Region name (required) */
  name: string;
  /** URL-safe slug (required) */
  slug: string;
  /** Parent region ID */
  parent?: number | null;
  /** Brief description */
  description?: string;
  /** Tags to apply */
  tags?: TagWritable[];
  /** Custom field values */
  custom_fields?: Record<string, unknown>;
}

/**
 * Query parameters for listing regions.
 */
export interface RegionListParams {
  /** Maximum results per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by name */
  name?: string;
  /** Filter by slug */
  slug?: string;
  /** Filter by parent region ID */
  parent_id?: number;
  /** Filter by tag(s) */
  tag?: string | string[];
}

/**
 * NetBox Location for availability zones within sites.
 *
 * @remarks
 * Locations represent sub-divisions within sites. Subnetter maps cloud
 * availability zones to locations (e.g., 'us-east-1a').
 */
export interface Location {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Location name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Parent site reference (required) */
  site: NestedRef;
  /** Parent location reference */
  parent: NestedRef | null;
  /** Operational status */
  status: ChoiceValue<string>;
  /** Tenant reference */
  tenant: NestedRef | null;
  /** Brief description */
  description: string;
  /** Applied tags */
  tags: NestedTag[];
  /** Custom field values */
  custom_fields: Record<string, unknown>;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
  /** Number of racks */
  rack_count: number;
  /** Number of devices */
  device_count: number;
  /** Nesting depth */
  _depth: number;
}

/**
 * Location data for create/update operations.
 */
export interface LocationWritable {
  /** Location name (required) */
  name: string;
  /** URL-safe slug (required) */
  slug: string;
  /** Parent site ID (required) */
  site: number;
  /** Parent location ID */
  parent?: number | null;
  /** Operational status */
  status?: string;
  /** Tenant ID */
  tenant?: number | null;
  /** Brief description */
  description?: string;
  /** Tags to apply */
  tags?: TagWritable[];
  /** Custom field values */
  custom_fields?: Record<string, unknown>;
}

/**
 * Query parameters for listing locations.
 */
export interface LocationListParams {
  /** Maximum results per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by name */
  name?: string;
  /** Filter by slug */
  slug?: string;
  /** Filter by site ID */
  site_id?: number;
  /** Filter by site slug */
  site?: string;
  /** Filter by parent location ID */
  parent_id?: number;
  /** Filter by tag(s) */
  tag?: string | string[];
}

/**
 * NetBox Site Group for functional/logical grouping.
 *
 * @remarks
 * Site groups provide functional organization of sites. Subnetter maps
 * cloud providers to site groups (e.g., 'AWS', 'Azure', 'GCP').
 */
export interface SiteGroup {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Site group name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Parent site group reference */
  parent: NestedRef | null;
  /** Brief description */
  description: string;
  /** Applied tags */
  tags: NestedTag[];
  /** Custom field values */
  custom_fields: Record<string, unknown>;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
  /** Number of sites in this group */
  site_count: number;
  /** Nesting depth */
  _depth: number;
}

/**
 * Site Group data for create/update operations.
 */
export interface SiteGroupWritable {
  /** Site group name (required) */
  name: string;
  /** URL-safe slug (required) */
  slug: string;
  /** Parent site group ID */
  parent?: number | null;
  /** Brief description */
  description?: string;
  /** Tags to apply */
  tags?: TagWritable[];
  /** Custom field values */
  custom_fields?: Record<string, unknown>;
}

/**
 * Query parameters for listing site groups.
 */
export interface SiteGroupListParams {
  /** Maximum results per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by name */
  name?: string;
  /** Filter by slug */
  slug?: string;
  /** Filter by parent site group ID */
  parent_id?: number;
  /** Filter by tag(s) */
  tag?: string | string[];
}

/**
 * NetBox Site for physical/logical locations.
 *
 * @remarks
 * Sites represent physical or logical locations. Subnetter maps cloud
 * regions to sites (e.g., 'us-east-1' becomes a site under the 'AWS'
 * site group).
 */
export interface Site {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Site name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Operational status */
  status: ChoiceValue<string>;
  /** Geographic region reference */
  region: NestedRef | null;
  /** Site group reference */
  group: NestedRef | null;
  /** Tenant reference */
  tenant: NestedRef | null;
  /** Facility name */
  facility: string;
  /** Time zone */
  time_zone: string | null;
  /** Brief description */
  description: string;
  /** Physical address */
  physical_address: string;
  /** Shipping address */
  shipping_address: string;
  /** Geographic latitude */
  latitude: number | null;
  /** Geographic longitude */
  longitude: number | null;
  /** Detailed comments */
  comments: string;
  /** Applied tags */
  tags: NestedTag[];
  /** Custom field values */
  custom_fields: Record<string, unknown>;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
}

/**
 * Site data for create/update operations.
 */
export interface SiteWritable {
  /** Site name (required) */
  name: string;
  /** URL-safe slug (required) */
  slug: string;
  /** Operational status */
  status?: string;
  /** Geographic region ID */
  region?: number | null;
  /** Site group ID */
  group?: number | null;
  /** Tenant ID */
  tenant?: number | null;
  /** Facility name */
  facility?: string;
  /** Time zone */
  time_zone?: string | null;
  /** Brief description */
  description?: string;
  /** Physical address */
  physical_address?: string;
  /** Shipping address */
  shipping_address?: string;
  /** Geographic latitude */
  latitude?: number | null;
  /** Geographic longitude */
  longitude?: number | null;
  /** Detailed comments */
  comments?: string;
  /** Tags to apply */
  tags?: TagWritable[];
  /** Custom field values */
  custom_fields?: Record<string, unknown>;
}

// ============================================================================
// Tenancy Types
// ============================================================================

/**
 * NetBox Tenant for organizational ownership.
 *
 * @remarks
 * Tenants represent organizational ownership boundaries. Subnetter maps
 * cloud accounts to tenants.
 */
export interface Tenant {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Tenant name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Tenant group reference */
  group: NestedRef | null;
  /** Brief description */
  description: string;
  /** Detailed comments */
  comments: string;
  /** Applied tags */
  tags: NestedTag[];
  /** Custom field values */
  custom_fields: Record<string, unknown>;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
}

/**
 * Tenant data for create/update operations.
 */
export interface TenantWritable {
  /** Tenant name (required) */
  name: string;
  /** URL-safe slug (required) */
  slug: string;
  /** Tenant group ID */
  group?: number | null;
  /** Brief description */
  description?: string;
  /** Detailed comments */
  comments?: string;
  /** Tags to apply */
  tags?: TagWritable[];
  /** Custom field values */
  custom_fields?: Record<string, unknown>;
}

// ============================================================================
// Extras Types (Tags)
// ============================================================================

/**
 * Nested tag reference in API responses.
 */
export interface NestedTag {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Tag name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Hex color code (without #) */
  color: string;
}

/**
 * NetBox Tag for object labeling.
 *
 * @remarks
 * Tags provide flexible labeling for any NetBox object. Subnetter uses
 * a 'subnetter-managed' tag to identify objects it created.
 */
export interface Tag {
  /** Unique identifier */
  id: number;
  /** Full API URL */
  url: string;
  /** Human-readable display string */
  display: string;
  /** Tag name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Hex color code (without #) */
  color: string;
  /** Brief description */
  description: string;
  /** Object types this tag can be applied to */
  object_types: string[];
  /** Number of objects with this tag */
  tagged_items: number;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  last_updated: string;
}

/**
 * Tag data for create/update operations.
 */
export interface TagWritable {
  /** Tag name (required) */
  name: string;
  /** URL-safe slug (required) */
  slug: string;
  /** Hex color code (without #, e.g., 'ff0000') */
  color?: string;
  /** Brief description */
  description?: string;
  /** Object types this tag can be applied to */
  object_types?: string[];
}

// ============================================================================
// Client Configuration
// ============================================================================

/**
 * NetBox client configuration options.
 *
 * @example
 * ```typescript
 * const config: NetBoxConfig = {
 *   url: 'https://netbox.example.com',
 *   token: process.env.NETBOX_TOKEN!,
 *   timeout: 60000, // 60 seconds
 * };
 * ```
 */
export interface NetBoxConfig {
  /** NetBox base URL (e.g., 'https://netbox.example.com') */
  url: string;
  /** API token for authentication */
  token: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Verify SSL certificates (default: true) */
  verifySsl?: boolean;
}

/**
 * Zod schema for NetBox configuration validation.
 *
 * @remarks
 * Used internally by NetBoxClient to validate configuration before
 * creating the HTTP client.
 */
export const NetBoxConfigSchema = z.object({
  url: z.string().url('Invalid NetBox URL'),
  token: z.string().min(1, 'API token is required'),
  timeout: z.number().positive().optional().default(30000),
  verifySsl: z.boolean().optional().default(true),
});

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Common query parameters for list endpoints.
 */
export interface ListParams {
  /** Maximum results per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Field to order by (prefix with - for descending) */
  ordering?: string;
  /** Full-text search query */
  q?: string;
}

/**
 * Query parameters for listing prefixes.
 */
export interface PrefixListParams extends ListParams {
  /** Filter by exact prefix match */
  prefix?: string;
  /** Filter by site ID */
  site_id?: number;
  /** Filter by site slug */
  site?: string;
  /** Filter by tenant ID */
  tenant_id?: number;
  /** Filter by tenant slug */
  tenant?: string;
  /** Filter by role ID */
  role_id?: number;
  /** Filter by role slug */
  role?: string;
  /** Filter by status */
  status?: PrefixStatus;
  /** Filter by tag(s) */
  tag?: string | string[];
  /** Filter by parent prefix (prefixes within) */
  within?: string;
  /** Filter by parent prefix (including the parent) */
  within_include?: string;
  /** Filter by child prefix (prefixes containing) */
  contains?: string;
}

/**
 * Query parameters for listing sites.
 */
export interface SiteListParams extends ListParams {
  /** Filter by name */
  name?: string;
  /** Filter by slug */
  slug?: string;
  /** Filter by region ID */
  region_id?: number;
  /** Filter by tenant ID */
  tenant_id?: number;
  /** Filter by tag(s) */
  tag?: string | string[];
}

/**
 * Query parameters for listing tenants.
 */
export interface TenantListParams extends ListParams {
  /** Filter by name */
  name?: string;
  /** Filter by slug */
  slug?: string;
  /** Filter by tenant group ID */
  group_id?: number;
  /** Filter by tag(s) */
  tag?: string | string[];
}

/**
 * Query parameters for listing roles.
 */
export interface RoleListParams extends ListParams {
  /** Filter by name */
  name?: string;
  /** Filter by slug */
  slug?: string;
}

/**
 * Query parameters for listing tags.
 */
export interface TagListParams extends ListParams {
  /** Filter by name */
  name?: string;
  /** Filter by slug */
  slug?: string;
}
