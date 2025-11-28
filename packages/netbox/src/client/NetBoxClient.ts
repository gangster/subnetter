/**
 * @module client/NetBoxClient
 * @description NetBox REST API client for IPAM operations.
 *
 * Provides a typed, Promise-based interface for interacting with NetBox's
 * REST API. Handles authentication, pagination, and error transformation.
 *
 * ## Supported Endpoints
 *
 * | Category | Endpoint | Object Type |
 * |----------|----------|-------------|
 * | IPAM | `/ipam/prefixes/` | IP prefix allocations |
 * | IPAM | `/ipam/aggregates/` | Top-level IP blocks |
 * | IPAM | `/ipam/roles/` | Prefix/VLAN roles |
 * | IPAM | `/ipam/rirs/` | Regional Internet Registries |
 * | DCIM | `/dcim/sites/` | Physical/logical sites |
 * | DCIM | `/dcim/site-groups/` | Site groupings |
 * | DCIM | `/dcim/regions/` | Geographic regions |
 * | DCIM | `/dcim/locations/` | Locations within sites |
 * | Tenancy | `/tenancy/tenants/` | Tenant organizations |
 * | Extras | `/extras/tags/` | Object tags |
 *
 * @see {@link https://docs.netbox.dev/en/stable/rest-api/overview/ | NetBox REST API}
 *
 * @packageDocumentation
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  NetBoxConfigSchema,
  type NetBoxConfig,
  type PaginatedResponse,
  type ApiError,
  type Prefix,
  type PrefixWritable,
  type PrefixListParams,
  type Site,
  type SiteWritable,
  type SiteListParams,
  type SiteGroup,
  type SiteGroupWritable,
  type SiteGroupListParams,
  type Region,
  type RegionWritable,
  type RegionListParams,
  type Location,
  type LocationWritable,
  type LocationListParams,
  type Tenant,
  type TenantWritable,
  type TenantListParams,
  type Role,
  type RoleWritable,
  type RoleListParams,
  type Tag,
  type TagWritable,
  type TagListParams,
  type Aggregate,
  type AggregateWritable,
  type AggregateListParams,
  type Rir,
  type RirListParams,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Error thrown when a NetBox API request fails.
 *
 * @remarks
 * This error captures the HTTP status code and any response body from NetBox,
 * making it easier to diagnose API failures. Common status codes:
 * - 400: Bad Request (validation errors)
 * - 401: Unauthorized (invalid token)
 * - 403: Forbidden (insufficient permissions)
 * - 404: Not Found (resource doesn't exist)
 * - 500: Internal Server Error
 *
 * @example
 * ```typescript
 * try {
 *   await client.prefixes.create({ prefix: 'invalid' });
 * } catch (err) {
 *   if (err instanceof NetBoxApiError) {
 *     console.error(`API Error: ${err.message} (HTTP ${err.statusCode})`);
 *     console.error('Response:', err.response);
 *   }
 * }
 * ```
 */
export class NetBoxApiError extends Error {
  /**
   * Creates a new NetBox API error.
   *
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code from the response
   * @param response - Parsed error response body from NetBox
   */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: ApiError,
  ) {
    super(message);
    this.name = 'NetBoxApiError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NetBox REST API client.
 *
 * @remarks
 * Provides typed methods for interacting with NetBox's REST API. Each resource
 * type (prefixes, sites, tenants, etc.) is exposed as a property with CRUD
 * operations.
 *
 * The client handles:
 * - Authentication via API token
 * - Request/response serialization
 * - Pagination for list operations
 * - Error transformation to {@link NetBoxApiError}
 *
 * All list operations support both paginated (`list`) and complete (`listAll`)
 * variants. The `listAll` method handles pagination automatically.
 *
 * @example Basic usage
 * ```typescript
 * const client = new NetBoxClient({
 *   url: 'https://netbox.example.com',
 *   token: 'your-api-token',
 * });
 *
 * // Test connection
 * const connected = await client.testConnection();
 *
 * // List prefixes
 * const prefixes = await client.prefixes.list({ status: 'active' });
 *
 * // Create a tenant
 * const tenant = await client.tenants.create({
 *   name: 'Production',
 *   slug: 'production',
 * });
 * ```
 *
 * @see {@link NetBoxConfig} for configuration options
 * @see {@link NetBoxApiError} for error handling
 */
export class NetBoxClient {
  /**
   * Axios instance configured for NetBox API requests.
   * @internal
   */
  private readonly http: AxiosInstance;

  /**
   * Validated client configuration.
   * @internal
   */
  private readonly config: NetBoxConfig;

  /**
   * Creates a new NetBox API client.
   *
   * @param config - Client configuration including URL and API token
   * @throws Error if configuration validation fails (invalid URL, missing token)
   *
   * @example
   * ```typescript
   * const client = new NetBoxClient({
   *   url: 'https://netbox.example.com',
   *   token: process.env.NETBOX_TOKEN!,
   *   timeout: 60000, // 60 seconds
   * });
   * ```
   */
  constructor(config: NetBoxConfig) {
    // Validate configuration using Zod schema
    const validated = NetBoxConfigSchema.parse(config);
    this.config = validated;

    // Create axios instance with default headers
    this.http = axios.create({
      baseURL: `${validated.url.replace(/\/$/, '')}/api`,
      timeout: validated.timeout,
      headers: {
        Authorization: `Token ${validated.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Add response interceptor for consistent error handling
    this.http.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response) {
          throw new NetBoxApiError(
            error.response.data?.detail || `HTTP ${error.response.status}`,
            error.response.status,
            error.response.data,
          );
        }
        throw error;
      },
    );
  }

  /**
   * The base URL of the NetBox instance (without `/api` suffix).
   *
   * @example
   * ```typescript
   * console.log(client.baseUrl); // 'https://netbox.example.com'
   * ```
   */
  get baseUrl(): string {
    return this.config.url;
  }

  // ==========================================================================
  // IPAM: Prefixes
  // ==========================================================================

  /**
   * Prefix operations for IP address allocations.
   *
   * @remarks
   * Prefixes are the core IPAM object representing IP network allocations.
   * In NetBox 4.x, prefixes use `scope_type` and `scope_id` to associate
   * with sites, locations, or other objects.
   *
   * @see {@link Prefix} for the prefix data structure
   * @see {@link PrefixWritable} for create/update fields
   */
  readonly prefixes = {
    /**
     * Lists prefixes with optional filtering.
     *
     * @param params - Query parameters for filtering
     * @returns Paginated response with prefixes
     */
    list: async (params?: PrefixListParams): Promise<PaginatedResponse<Prefix>> => {
      const response = await this.http.get<PaginatedResponse<Prefix>>('/ipam/prefixes/', {
        params,
      });
      return response.data;
    },

    /**
     * Lists all prefixes, handling pagination automatically.
     *
     * @remarks
     * Use this method when you need all prefixes regardless of count.
     * For large datasets, consider using `list` with pagination.
     *
     * @param params - Query parameters for filtering (limit/offset ignored)
     * @returns Array of all matching prefixes
     */
    listAll: async (params?: Omit<PrefixListParams, 'limit' | 'offset'>): Promise<Prefix[]> => {
      const results: Prefix[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.prefixes.list({ ...params, limit, offset });
        results.push(...response.results);

        if (!response.next) break;
        offset += limit;
      }

      return results;
    },

    /**
     * Gets a single prefix by ID.
     *
     * @param id - Prefix ID
     * @returns The prefix object
     * @throws {@link NetBoxApiError} if prefix not found (404)
     */
    get: async (id: number): Promise<Prefix> => {
      const response = await this.http.get<Prefix>(`/ipam/prefixes/${id}/`);
      return response.data;
    },

    /**
     * Creates a new prefix.
     *
     * @param data - Prefix data
     * @returns The created prefix
     * @throws {@link NetBoxApiError} if validation fails (400)
     */
    create: async (data: PrefixWritable): Promise<Prefix> => {
      const response = await this.http.post<Prefix>('/ipam/prefixes/', data);
      return response.data;
    },

    /**
     * Updates an existing prefix.
     *
     * @param id - Prefix ID
     * @param data - Fields to update
     * @returns The updated prefix
     * @throws {@link NetBoxApiError} if prefix not found or validation fails
     */
    update: async (id: number, data: Partial<PrefixWritable>): Promise<Prefix> => {
      const response = await this.http.patch<Prefix>(`/ipam/prefixes/${id}/`, data);
      return response.data;
    },

    /**
     * Deletes a prefix.
     *
     * @param id - Prefix ID
     * @throws {@link NetBoxApiError} if prefix not found
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/ipam/prefixes/${id}/`);
    },

    /**
     * Finds a prefix by its CIDR notation.
     *
     * @param prefix - CIDR notation (e.g., '10.1.0.0/16')
     * @returns The prefix if found, null otherwise
     */
    findByPrefix: async (prefix: string): Promise<Prefix | null> => {
      const response = await this.prefixes.list({ prefix });
      return response.results.length > 0 ? response.results[0] : null;
    },
  };

  // ==========================================================================
  // IPAM: Roles
  // ==========================================================================

  /**
   * Role operations for prefix/VLAN classification.
   *
   * @remarks
   * Roles categorize prefixes and VLANs by their function (e.g., 'public',
   * 'private', 'management'). Each subnet type in Subnetter maps to a role.
   *
   * @see {@link Role} for the role data structure
   */
  readonly roles = {
    /**
     * Lists roles with optional filtering.
     *
     * @param params - Query parameters
     * @returns Paginated response with roles
     */
    list: async (params?: RoleListParams): Promise<PaginatedResponse<Role>> => {
      const response = await this.http.get<PaginatedResponse<Role>>('/ipam/roles/', { params });
      return response.data;
    },

    /**
     * Lists all roles, handling pagination automatically.
     *
     * @returns Array of all roles
     */
    listAll: async (): Promise<Role[]> => {
      const results: Role[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.roles.list({ limit, offset });
        results.push(...response.results);

        if (!response.next) break;
        offset += limit;
      }

      return results;
    },

    /**
     * Creates a new role.
     *
     * @param data - Role data
     * @returns The created role
     */
    create: async (data: RoleWritable): Promise<Role> => {
      const response = await this.http.post<Role>('/ipam/roles/', data);
      return response.data;
    },

    /**
     * Finds a role by its slug.
     *
     * @param slug - Role slug (e.g., 'public')
     * @returns The role if found, null otherwise
     */
    findBySlug: async (slug: string): Promise<Role | null> => {
      const response = await this.roles.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Deletes a role.
     *
     * @param id - Role ID
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/ipam/roles/${id}/`);
    },
  };

  // ==========================================================================
  // IPAM: Aggregates
  // ==========================================================================

  /**
   * Aggregate operations for top-level IP blocks.
   *
   * @remarks
   * Aggregates represent the top of the IP addressing hierarchy, typically
   * RFC 1918 private ranges or public allocations from an RIR. Subnetter
   * creates an aggregate for the base CIDR.
   *
   * @see {@link Aggregate} for the aggregate data structure
   */
  readonly aggregates = {
    /**
     * Lists aggregates with optional filtering.
     *
     * @param params - Query parameters
     * @returns Paginated response with aggregates
     */
    list: async (params?: AggregateListParams): Promise<PaginatedResponse<Aggregate>> => {
      const response = await this.http.get<PaginatedResponse<Aggregate>>('/ipam/aggregates/', { params });
      return response.data;
    },

    /**
     * Lists all aggregates, handling pagination automatically.
     *
     * @returns Array of all aggregates
     */
    listAll: async (): Promise<Aggregate[]> => {
      const results: Aggregate[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.aggregates.list({ limit, offset });
        results.push(...response.results);

        if (!response.next) break;
        offset += limit;
      }

      return results;
    },

    /**
     * Creates a new aggregate.
     *
     * @param data - Aggregate data
     * @returns The created aggregate
     */
    create: async (data: AggregateWritable): Promise<Aggregate> => {
      const response = await this.http.post<Aggregate>('/ipam/aggregates/', data);
      return response.data;
    },

    /**
     * Finds an aggregate by its prefix.
     *
     * @param prefix - CIDR notation (e.g., '10.0.0.0/8')
     * @returns The aggregate if found, null otherwise
     */
    findByPrefix: async (prefix: string): Promise<Aggregate | null> => {
      const response = await this.aggregates.list({ prefix });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Deletes an aggregate.
     *
     * @param id - Aggregate ID
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/ipam/aggregates/${id}/`);
    },
  };

  // ==========================================================================
  // IPAM: RIRs
  // ==========================================================================

  /**
   * RIR operations for Regional Internet Registries.
   *
   * @remarks
   * RIRs are required for creating aggregates. Subnetter creates an 'RFC 1918'
   * RIR for private address space allocations.
   *
   * @see {@link Rir} for the RIR data structure
   */
  readonly rirs = {
    /**
     * Lists RIRs with optional filtering.
     *
     * @param params - Query parameters
     * @returns Paginated response with RIRs
     */
    list: async (params?: RirListParams): Promise<PaginatedResponse<Rir>> => {
      const response = await this.http.get<PaginatedResponse<Rir>>('/ipam/rirs/', { params });
      return response.data;
    },

    /**
     * Finds an RIR by its slug.
     *
     * @param slug - RIR slug (e.g., 'rfc-1918')
     * @returns The RIR if found, null otherwise
     */
    findBySlug: async (slug: string): Promise<Rir | null> => {
      const response = await this.rirs.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Creates a new RIR.
     *
     * @param data - RIR data
     * @returns The created RIR
     */
    create: async (data: { name: string; slug: string; is_private?: boolean; description?: string }): Promise<Rir> => {
      const response = await this.http.post<Rir>('/ipam/rirs/', data);
      return response.data;
    },
  };

  // ==========================================================================
  // DCIM: Sites
  // ==========================================================================

  /**
   * Site operations for physical/logical locations.
   *
   * @remarks
   * Sites represent physical or logical locations. Subnetter maps cloud
   * regions to sites (e.g., 'us-east-1' becomes a site).
   *
   * @see {@link Site} for the site data structure
   */
  readonly sites = {
    /**
     * Lists sites with optional filtering.
     *
     * @param params - Query parameters
     * @returns Paginated response with sites
     */
    list: async (params?: SiteListParams): Promise<PaginatedResponse<Site>> => {
      const response = await this.http.get<PaginatedResponse<Site>>('/dcim/sites/', { params });
      return response.data;
    },

    /**
     * Lists all sites, handling pagination automatically.
     *
     * @returns Array of all sites
     */
    listAll: async (): Promise<Site[]> => {
      const results: Site[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.sites.list({ limit, offset });
        results.push(...response.results);

        if (!response.next) break;
        offset += limit;
      }

      return results;
    },

    /**
     * Creates a new site.
     *
     * @param data - Site data
     * @returns The created site
     */
    create: async (data: SiteWritable): Promise<Site> => {
      const response = await this.http.post<Site>('/dcim/sites/', data);
      return response.data;
    },

    /**
     * Finds a site by its slug.
     *
     * @param slug - Site slug
     * @returns The site if found, null otherwise
     */
    findBySlug: async (slug: string): Promise<Site | null> => {
      const response = await this.sites.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Deletes a site.
     *
     * @param id - Site ID
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/dcim/sites/${id}/`);
    },
  };

  // ==========================================================================
  // DCIM: Site Groups
  // ==========================================================================

  /**
   * Site Group operations for functional/logical grouping.
   *
   * @remarks
   * Site groups provide functional organization of sites. Subnetter maps
   * cloud providers to site groups (e.g., 'AWS', 'Azure', 'GCP').
   *
   * @see {@link SiteGroup} for the site group data structure
   */
  readonly siteGroups = {
    /**
     * Lists site groups with optional filtering.
     *
     * @param params - Query parameters
     * @returns Paginated response with site groups
     */
    list: async (params?: SiteGroupListParams): Promise<PaginatedResponse<SiteGroup>> => {
      const response = await this.http.get<PaginatedResponse<SiteGroup>>('/dcim/site-groups/', { params });
      return response.data;
    },

    /**
     * Lists all site groups, handling pagination automatically.
     *
     * @returns Array of all site groups
     */
    listAll: async (): Promise<SiteGroup[]> => {
      const results: SiteGroup[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.siteGroups.list({ limit, offset });
        results.push(...response.results);

        if (!response.next) break;
        offset += limit;
      }

      return results;
    },

    /**
     * Creates a new site group.
     *
     * @param data - Site group data
     * @returns The created site group
     */
    create: async (data: SiteGroupWritable): Promise<SiteGroup> => {
      const response = await this.http.post<SiteGroup>('/dcim/site-groups/', data);
      return response.data;
    },

    /**
     * Finds a site group by its slug.
     *
     * @param slug - Site group slug
     * @returns The site group if found, null otherwise
     */
    findBySlug: async (slug: string): Promise<SiteGroup | null> => {
      const response = await this.siteGroups.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Deletes a site group.
     *
     * @param id - Site group ID
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/dcim/site-groups/${id}/`);
    },
  };

  // ==========================================================================
  // DCIM: Regions
  // ==========================================================================

  /**
   * Region operations for geographic hierarchy.
   *
   * @remarks
   * Regions provide geographic organization. Note: Subnetter uses Sites
   * for cloud regions to allow Site Groups for provider organization.
   *
   * @see {@link Region} for the region data structure
   */
  readonly regions = {
    /**
     * Lists regions with optional filtering.
     *
     * @param params - Query parameters
     * @returns Paginated response with regions
     */
    list: async (params?: RegionListParams): Promise<PaginatedResponse<Region>> => {
      const response = await this.http.get<PaginatedResponse<Region>>('/dcim/regions/', { params });
      return response.data;
    },

    /**
     * Lists all regions, handling pagination automatically.
     *
     * @returns Array of all regions
     */
    listAll: async (): Promise<Region[]> => {
      const results: Region[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.regions.list({ limit, offset });
        results.push(...response.results);

        if (!response.next) break;
        offset += limit;
      }

      return results;
    },

    /**
     * Creates a new region.
     *
     * @param data - Region data
     * @returns The created region
     */
    create: async (data: RegionWritable): Promise<Region> => {
      const response = await this.http.post<Region>('/dcim/regions/', data);
      return response.data;
    },

    /**
     * Finds a region by its slug.
     *
     * @param slug - Region slug
     * @returns The region if found, null otherwise
     */
    findBySlug: async (slug: string): Promise<Region | null> => {
      const response = await this.regions.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Deletes a region.
     *
     * @param id - Region ID
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/dcim/regions/${id}/`);
    },
  };

  // ==========================================================================
  // DCIM: Locations
  // ==========================================================================

  /**
   * Location operations for availability zones within sites.
   *
   * @remarks
   * Locations represent sub-divisions within sites. Subnetter maps cloud
   * availability zones to locations (e.g., 'us-east-1a' becomes a location).
   *
   * @see {@link Location} for the location data structure
   */
  readonly locations = {
    /**
     * Lists locations with optional filtering.
     *
     * @param params - Query parameters
     * @returns Paginated response with locations
     */
    list: async (params?: LocationListParams): Promise<PaginatedResponse<Location>> => {
      const response = await this.http.get<PaginatedResponse<Location>>('/dcim/locations/', { params });
      return response.data;
    },

    /**
     * Lists all locations, handling pagination automatically.
     *
     * @returns Array of all locations
     */
    listAll: async (): Promise<Location[]> => {
      const results: Location[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.locations.list({ limit, offset });
        results.push(...response.results);

        if (!response.next) break;
        offset += limit;
      }

      return results;
    },

    /**
     * Creates a new location.
     *
     * @param data - Location data
     * @returns The created location
     */
    create: async (data: LocationWritable): Promise<Location> => {
      const response = await this.http.post<Location>('/dcim/locations/', data);
      return response.data;
    },

    /**
     * Finds a location by its slug.
     *
     * @param slug - Location slug
     * @returns The location if found, null otherwise
     */
    findBySlug: async (slug: string): Promise<Location | null> => {
      const response = await this.locations.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Finds a location by site ID and slug.
     *
     * @param siteId - Parent site ID
     * @param slug - Location slug
     * @returns The location if found, null otherwise
     */
    findBySiteAndSlug: async (siteId: number, slug: string): Promise<Location | null> => {
      const response = await this.locations.list({ site_id: siteId, slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Deletes a location.
     *
     * @param id - Location ID
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/dcim/locations/${id}/`);
    },
  };

  // ==========================================================================
  // Tenancy: Tenants
  // ==========================================================================

  /**
   * Tenant operations for organizational ownership.
   *
   * @remarks
   * Tenants represent organizational ownership boundaries. Subnetter maps
   * cloud accounts to tenants.
   *
   * @see {@link Tenant} for the tenant data structure
   */
  readonly tenants = {
    /**
     * Lists tenants with optional filtering.
     *
     * @param params - Query parameters
     * @returns Paginated response with tenants
     */
    list: async (params?: TenantListParams): Promise<PaginatedResponse<Tenant>> => {
      const response = await this.http.get<PaginatedResponse<Tenant>>('/tenancy/tenants/', {
        params,
      });
      return response.data;
    },

    /**
     * Lists all tenants, handling pagination automatically.
     *
     * @returns Array of all tenants
     */
    listAll: async (): Promise<Tenant[]> => {
      const results: Tenant[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.tenants.list({ limit, offset });
        results.push(...response.results);

        if (!response.next) break;
        offset += limit;
      }

      return results;
    },

    /**
     * Creates a new tenant.
     *
     * @param data - Tenant data
     * @returns The created tenant
     */
    create: async (data: TenantWritable): Promise<Tenant> => {
      const response = await this.http.post<Tenant>('/tenancy/tenants/', data);
      return response.data;
    },

    /**
     * Finds a tenant by its slug.
     *
     * @param slug - Tenant slug
     * @returns The tenant if found, null otherwise
     */
    findBySlug: async (slug: string): Promise<Tenant | null> => {
      const response = await this.tenants.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Deletes a tenant.
     *
     * @param id - Tenant ID
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/tenancy/tenants/${id}/`);
    },
  };

  // ==========================================================================
  // Extras: Tags
  // ==========================================================================

  /**
   * Tag operations for object labeling.
   *
   * @remarks
   * Tags provide flexible labeling for any NetBox object. Subnetter uses
   * a 'subnetter-managed' tag to identify objects it created.
   *
   * @see {@link Tag} for the tag data structure
   */
  readonly tags = {
    /**
     * Lists tags with optional filtering.
     *
     * @param params - Query parameters
     * @returns Paginated response with tags
     */
    list: async (params?: TagListParams): Promise<PaginatedResponse<Tag>> => {
      const response = await this.http.get<PaginatedResponse<Tag>>('/extras/tags/', { params });
      return response.data;
    },

    /**
     * Lists all tags, handling pagination automatically.
     *
     * @returns Array of all tags
     */
    listAll: async (): Promise<Tag[]> => {
      const results: Tag[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.tags.list({ limit, offset });
        results.push(...response.results);

        if (!response.next) break;
        offset += limit;
      }

      return results;
    },

    /**
     * Creates a new tag.
     *
     * @param data - Tag data
     * @returns The created tag
     */
    create: async (data: TagWritable): Promise<Tag> => {
      const response = await this.http.post<Tag>('/extras/tags/', data);
      return response.data;
    },

    /**
     * Finds a tag by its slug.
     *
     * @param slug - Tag slug
     * @returns The tag if found, null otherwise
     */
    findBySlug: async (slug: string): Promise<Tag | null> => {
      const response = await this.tags.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Deletes a tag.
     *
     * @param id - Tag ID
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/extras/tags/${id}/`);
    },
  };

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Tests API connectivity by fetching the status endpoint.
   *
   * @returns True if connection succeeded, false otherwise
   *
   * @example
   * ```typescript
   * const connected = await client.testConnection();
   * if (!connected) {
   *   console.error('Failed to connect to NetBox');
   * }
   * ```
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.http.get('/status/');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the API status including version and plugins.
   *
   * @returns Status information from NetBox
   *
   * @example
   * ```typescript
   * const status = await client.getStatus();
   * console.log('NetBox version:', status['netbox-version']);
   * ```
   */
  async getStatus(): Promise<Record<string, unknown>> {
    const response = await this.http.get<Record<string, unknown>>('/status/');
    return response.data;
  }
}
