/**
 * NetBox API type definitions
 * Based on NetBox REST API v4.x
 */

import { z } from 'zod';

// ============================================================================
// Common Types
// ============================================================================

/** Nested object reference (used in API responses) */
export interface NestedRef {
  id: number;
  url: string;
  display: string;
  name: string;
  slug?: string;
}

/** Choice field value (status, family, etc.) */
export interface ChoiceValue<T extends string = string> {
  value: T;
  label: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** API error response */
export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}

// ============================================================================
// IPAM Types
// ============================================================================

/** Prefix status values */
export type PrefixStatus = 'container' | 'active' | 'reserved' | 'deprecated';

/** IP family values */
export type IpFamily = 4 | 6;

/** Prefix scope type (NetBox 4.x) */
export type PrefixScopeType = 'dcim.site' | 'dcim.location' | 'dcim.region' | 'dcim.sitegroup' | null;

/** NetBox Prefix object */
export interface Prefix {
  id: number;
  url: string;
  display: string;
  display_url: string;
  family: ChoiceValue<string>;
  prefix: string;
  /** @deprecated Use scope instead in NetBox 4.x */
  site: NestedRef | null;
  /** Scope type for the prefix (NetBox 4.x) */
  scope_type: PrefixScopeType;
  /** Scope object ID (NetBox 4.x) */
  scope_id: number | null;
  /** Scope object reference (NetBox 4.x) */
  scope: NestedRef | null;
  vrf: NestedRef | null;
  tenant: NestedRef | null;
  vlan: NestedRef | null;
  status: ChoiceValue<PrefixStatus>;
  role: NestedRef | null;
  is_pool: boolean;
  mark_utilized: boolean;
  description: string;
  comments: string;
  tags: NestedTag[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
  children: number;
  _depth: number;
}

/** Create/Update Prefix request */
export interface PrefixWritable {
  prefix: string;
  /** @deprecated Use scope_type and scope_id instead in NetBox 4.x */
  site?: number | null;
  /** Scope type for the prefix (NetBox 4.x): 'dcim.site', 'dcim.location', etc. */
  scope_type?: PrefixScopeType;
  /** Scope object ID (NetBox 4.x) */
  scope_id?: number | null;
  vrf?: number | null;
  tenant?: number | null;
  vlan?: number | null;
  status?: PrefixStatus;
  role?: number | null;
  is_pool?: boolean;
  mark_utilized?: boolean;
  description?: string;
  comments?: string;
  tags?: TagWritable[];
  custom_fields?: Record<string, unknown>;
}

/** NetBox Aggregate object */
export interface Aggregate {
  id: number;
  url: string;
  display: string;
  family: ChoiceValue<string>;
  prefix: string;
  rir: NestedRef;
  tenant: NestedRef | null;
  date_added: string | null;
  description: string;
  comments: string;
  tags: NestedTag[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
}

/** Create/Update Aggregate request */
export interface AggregateWritable {
  prefix: string;
  rir: number;
  tenant?: number | null;
  date_added?: string | null;
  description?: string;
  comments?: string;
  tags?: TagWritable[];
  custom_fields?: Record<string, unknown>;
}

/** NetBox Role object (IPAM) */
export interface Role {
  id: number;
  url: string;
  display: string;
  name: string;
  slug: string;
  weight: number;
  description: string;
  tags: NestedTag[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
  prefix_count: number;
  vlan_count: number;
}

/** Create/Update Role request */
export interface RoleWritable {
  name: string;
  slug: string;
  weight?: number;
  description?: string;
  tags?: TagWritable[];
  custom_fields?: Record<string, unknown>;
}

/** NetBox RIR object */
export interface Rir {
  id: number;
  url: string;
  display: string;
  name: string;
  slug: string;
  is_private: boolean;
  description: string;
  tags: NestedTag[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
  aggregate_count: number;
}

// ============================================================================
// DCIM Types
// ============================================================================

/** NetBox Region object (for geographic/provider hierarchy) */
export interface Region {
  id: number;
  url: string;
  display: string;
  name: string;
  slug: string;
  parent: NestedRef | null;
  description: string;
  tags: NestedTag[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
  site_count: number;
  _depth: number;
}

/** Create/Update Region request */
export interface RegionWritable {
  name: string;
  slug: string;
  parent?: number | null;
  description?: string;
  tags?: TagWritable[];
  custom_fields?: Record<string, unknown>;
}

/** Region query parameters */
export interface RegionListParams {
  limit?: number;
  offset?: number;
  name?: string;
  slug?: string;
  parent_id?: number;
  tag?: string | string[];
}

/** NetBox Location object (for AZs within sites) */
export interface Location {
  id: number;
  url: string;
  display: string;
  name: string;
  slug: string;
  site: NestedRef;
  parent: NestedRef | null;
  status: ChoiceValue<string>;
  tenant: NestedRef | null;
  description: string;
  tags: NestedTag[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
  rack_count: number;
  device_count: number;
  _depth: number;
}

/** Create/Update Location request */
export interface LocationWritable {
  name: string;
  slug: string;
  site: number;
  parent?: number | null;
  status?: string;
  tenant?: number | null;
  description?: string;
  tags?: TagWritable[];
  custom_fields?: Record<string, unknown>;
}

/** Location query parameters */
export interface LocationListParams {
  limit?: number;
  offset?: number;
  name?: string;
  slug?: string;
  site_id?: number;
  site?: string;
  parent_id?: number;
  tag?: string | string[];
}

/** NetBox Site object */
export interface Site {
  id: number;
  url: string;
  display: string;
  name: string;
  slug: string;
  status: ChoiceValue<string>;
  region: NestedRef | null;
  group: NestedRef | null;
  tenant: NestedRef | null;
  facility: string;
  time_zone: string | null;
  description: string;
  physical_address: string;
  shipping_address: string;
  latitude: number | null;
  longitude: number | null;
  comments: string;
  tags: NestedTag[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
}

/** Create/Update Site request */
export interface SiteWritable {
  name: string;
  slug: string;
  status?: string;
  region?: number | null;
  group?: number | null;
  tenant?: number | null;
  facility?: string;
  time_zone?: string | null;
  description?: string;
  physical_address?: string;
  shipping_address?: string;
  latitude?: number | null;
  longitude?: number | null;
  comments?: string;
  tags?: TagWritable[];
  custom_fields?: Record<string, unknown>;
}

// ============================================================================
// Tenancy Types
// ============================================================================

/** NetBox Tenant object */
export interface Tenant {
  id: number;
  url: string;
  display: string;
  name: string;
  slug: string;
  group: NestedRef | null;
  description: string;
  comments: string;
  tags: NestedTag[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
}

/** Create/Update Tenant request */
export interface TenantWritable {
  name: string;
  slug: string;
  group?: number | null;
  description?: string;
  comments?: string;
  tags?: TagWritable[];
  custom_fields?: Record<string, unknown>;
}

// ============================================================================
// Extras Types (Tags)
// ============================================================================

/** Nested tag reference */
export interface NestedTag {
  id: number;
  url: string;
  display: string;
  name: string;
  slug: string;
  color: string;
}

/** NetBox Tag object */
export interface Tag {
  id: number;
  url: string;
  display: string;
  name: string;
  slug: string;
  color: string;
  description: string;
  object_types: string[];
  tagged_items: number;
  created: string;
  last_updated: string;
}

/** Create/Update Tag request */
export interface TagWritable {
  name: string;
  slug: string;
  color?: string;
  description?: string;
  object_types?: string[];
}

// ============================================================================
// Client Configuration
// ============================================================================

/** NetBox client configuration */
export interface NetBoxConfig {
  /** NetBox base URL (e.g., https://netbox.example.com) */
  url: string;
  /** API token for authentication */
  token: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Verify SSL certificates (default: true) */
  verifySsl?: boolean;
}

/** Zod schema for NetBox configuration validation */
export const NetBoxConfigSchema = z.object({
  url: z.string().url('Invalid NetBox URL'),
  token: z.string().min(1, 'API token is required'),
  timeout: z.number().positive().optional().default(30000),
  verifySsl: z.boolean().optional().default(true),
});

// ============================================================================
// Query Parameters
// ============================================================================

/** Common query parameters for list endpoints */
export interface ListParams {
  limit?: number;
  offset?: number;
  ordering?: string;
  q?: string;
}

/** Prefix query parameters */
export interface PrefixListParams extends ListParams {
  prefix?: string;
  site_id?: number;
  site?: string;
  tenant_id?: number;
  tenant?: string;
  role_id?: number;
  role?: string;
  status?: PrefixStatus;
  tag?: string | string[];
  within?: string;
  within_include?: string;
  contains?: string;
}

/** Site query parameters */
export interface SiteListParams extends ListParams {
  name?: string;
  slug?: string;
  region_id?: number;
  tenant_id?: number;
  tag?: string | string[];
}

/** Tenant query parameters */
export interface TenantListParams extends ListParams {
  name?: string;
  slug?: string;
  group_id?: number;
  tag?: string | string[];
}

/** Role query parameters */
export interface RoleListParams extends ListParams {
  name?: string;
  slug?: string;
}

/** Tag query parameters */
export interface TagListParams extends ListParams {
  name?: string;
  slug?: string;
}

