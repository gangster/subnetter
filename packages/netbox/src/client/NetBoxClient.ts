/**
 * NetBox REST API client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  NetBoxConfig,
  PaginatedResponse,
  ApiError,
  Prefix,
  PrefixWritable,
  PrefixListParams,
  Site,
  SiteWritable,
  SiteListParams,
  SiteGroup,
  SiteGroupWritable,
  SiteGroupListParams,
  Region,
  RegionWritable,
  RegionListParams,
  Location,
  LocationWritable,
  LocationListParams,
  Tenant,
  TenantWritable,
  TenantListParams,
  Role,
  RoleWritable,
  RoleListParams,
  Tag,
  TagWritable,
  TagListParams,
  Aggregate,
  AggregateWritable,
  AggregateListParams,
  Rir,
  RirListParams,
} from './types';
import { NetBoxConfigSchema } from './types';

/**
 * Custom error class for NetBox API errors
 */
export class NetBoxApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: ApiError,
  ) {
    super(message);
    this.name = 'NetBoxApiError';
  }
}

/**
 * NetBox REST API client
 *
 * Provides typed methods for interacting with NetBox's REST API.
 *
 * @example
 * ```typescript
 * const client = new NetBoxClient({
 *   url: 'https://netbox.example.com',
 *   token: 'your-api-token',
 * });
 *
 * const prefixes = await client.prefixes.list({ status: 'active' });
 * ```
 */
export class NetBoxClient {
  private readonly http: AxiosInstance;
  private readonly config: NetBoxConfig;

  constructor(config: NetBoxConfig) {
    // Validate configuration
    const validated = NetBoxConfigSchema.parse(config);
    this.config = validated;

    // Create axios instance
    this.http = axios.create({
      baseURL: `${validated.url.replace(/\/$/, '')}/api`,
      timeout: validated.timeout,
      headers: {
        Authorization: `Token ${validated.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Add response interceptor for error handling
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
   * Get the base URL of the NetBox instance
   */
  get baseUrl(): string {
    return this.config.url;
  }

  // ==========================================================================
  // IPAM: Prefixes
  // ==========================================================================

  /**
   * Prefix operations
   */
  readonly prefixes = {
    /**
     * List prefixes with optional filtering
     */
    list: async (params?: PrefixListParams): Promise<PaginatedResponse<Prefix>> => {
      const response = await this.http.get<PaginatedResponse<Prefix>>('/ipam/prefixes/', {
        params,
      });
      return response.data;
    },

    /**
     * Get all prefixes (handles pagination automatically)
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
     * Get a single prefix by ID
     */
    get: async (id: number): Promise<Prefix> => {
      const response = await this.http.get<Prefix>(`/ipam/prefixes/${id}/`);
      return response.data;
    },

    /**
     * Create a new prefix
     */
    create: async (data: PrefixWritable): Promise<Prefix> => {
      const response = await this.http.post<Prefix>('/ipam/prefixes/', data);
      return response.data;
    },

    /**
     * Update an existing prefix
     */
    update: async (id: number, data: Partial<PrefixWritable>): Promise<Prefix> => {
      const response = await this.http.patch<Prefix>(`/ipam/prefixes/${id}/`, data);
      return response.data;
    },

    /**
     * Delete a prefix
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/ipam/prefixes/${id}/`);
    },

    /**
     * Find prefix by CIDR notation
     */
    findByPrefix: async (prefix: string): Promise<Prefix | null> => {
      const response = await this.prefixes.list({ prefix });
      return response.results.length > 0 ? response.results[0] : null;
    },
  };

  // ==========================================================================
  // IPAM: Aggregates
  // ==========================================================================

  // ==========================================================================
  // IPAM: Roles
  // ==========================================================================

  /**
   * Role operations
   */
  readonly roles = {
    /**
     * List roles
     */
    list: async (params?: RoleListParams): Promise<PaginatedResponse<Role>> => {
      const response = await this.http.get<PaginatedResponse<Role>>('/ipam/roles/', { params });
      return response.data;
    },

    /**
     * Get all roles
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
     * Create a new role
     */
    create: async (data: RoleWritable): Promise<Role> => {
      const response = await this.http.post<Role>('/ipam/roles/', data);
      return response.data;
    },

    /**
     * Find role by slug
     */
    findBySlug: async (slug: string): Promise<Role | null> => {
      const response = await this.roles.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Delete a role
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/ipam/roles/${id}/`);
    },
  };

  // ==========================================================================
  // IPAM: Aggregates
  // ==========================================================================

  /**
   * Aggregate operations (top-level IP blocks)
   */
  readonly aggregates = {
    /**
     * List aggregates
     */
    list: async (params?: AggregateListParams): Promise<PaginatedResponse<Aggregate>> => {
      const response = await this.http.get<PaginatedResponse<Aggregate>>('/ipam/aggregates/', { params });
      return response.data;
    },

    /**
     * Get all aggregates
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
     * Create a new aggregate
     */
    create: async (data: AggregateWritable): Promise<Aggregate> => {
      const response = await this.http.post<Aggregate>('/ipam/aggregates/', data);
      return response.data;
    },

    /**
     * Find aggregate by prefix
     */
    findByPrefix: async (prefix: string): Promise<Aggregate | null> => {
      const response = await this.aggregates.list({ prefix });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Delete an aggregate
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/ipam/aggregates/${id}/`);
    },
  };

  // ==========================================================================
  // IPAM: RIRs
  // ==========================================================================

  /**
   * RIR operations
   */
  readonly rirs = {
    /**
     * List RIRs
     */
    list: async (params?: RirListParams): Promise<PaginatedResponse<Rir>> => {
      const response = await this.http.get<PaginatedResponse<Rir>>('/ipam/rirs/', { params });
      return response.data;
    },

    /**
     * Find RIR by slug
     */
    findBySlug: async (slug: string): Promise<Rir | null> => {
      const response = await this.rirs.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Create a new RIR
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
   * Site operations
   */
  readonly sites = {
    /**
     * List sites
     */
    list: async (params?: SiteListParams): Promise<PaginatedResponse<Site>> => {
      const response = await this.http.get<PaginatedResponse<Site>>('/dcim/sites/', { params });
      return response.data;
    },

    /**
     * Get all sites
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
     * Create a new site
     */
    create: async (data: SiteWritable): Promise<Site> => {
      const response = await this.http.post<Site>('/dcim/sites/', data);
      return response.data;
    },

    /**
     * Find site by slug
     */
    findBySlug: async (slug: string): Promise<Site | null> => {
      const response = await this.sites.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Delete a site
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/dcim/sites/${id}/`);
    },
  };

  // ==========================================================================
  // DCIM: Site Groups
  // ==========================================================================

  /**
   * Site Group operations (for functional grouping like cloud providers)
   */
  readonly siteGroups = {
    /**
     * List site groups
     */
    list: async (params?: SiteGroupListParams): Promise<PaginatedResponse<SiteGroup>> => {
      const response = await this.http.get<PaginatedResponse<SiteGroup>>('/dcim/site-groups/', { params });
      return response.data;
    },

    /**
     * Get all site groups
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
     * Create a new site group
     */
    create: async (data: SiteGroupWritable): Promise<SiteGroup> => {
      const response = await this.http.post<SiteGroup>('/dcim/site-groups/', data);
      return response.data;
    },

    /**
     * Find site group by slug
     */
    findBySlug: async (slug: string): Promise<SiteGroup | null> => {
      const response = await this.siteGroups.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Delete a site group
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/dcim/site-groups/${id}/`);
    },
  };

  // ==========================================================================
  // DCIM: Regions
  // ==========================================================================

  /**
   * Region operations (for geographic hierarchy)
   */
  readonly regions = {
    /**
     * List regions
     */
    list: async (params?: RegionListParams): Promise<PaginatedResponse<Region>> => {
      const response = await this.http.get<PaginatedResponse<Region>>('/dcim/regions/', { params });
      return response.data;
    },

    /**
     * Get all regions
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
     * Create a new region
     */
    create: async (data: RegionWritable): Promise<Region> => {
      const response = await this.http.post<Region>('/dcim/regions/', data);
      return response.data;
    },

    /**
     * Find region by slug
     */
    findBySlug: async (slug: string): Promise<Region | null> => {
      const response = await this.regions.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Delete a region
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/dcim/regions/${id}/`);
    },
  };

  // ==========================================================================
  // DCIM: Locations
  // ==========================================================================

  /**
   * Location operations (for availability zones within sites)
   */
  readonly locations = {
    /**
     * List locations
     */
    list: async (params?: LocationListParams): Promise<PaginatedResponse<Location>> => {
      const response = await this.http.get<PaginatedResponse<Location>>('/dcim/locations/', { params });
      return response.data;
    },

    /**
     * Get all locations
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
     * Create a new location
     */
    create: async (data: LocationWritable): Promise<Location> => {
      const response = await this.http.post<Location>('/dcim/locations/', data);
      return response.data;
    },

    /**
     * Find location by slug
     */
    findBySlug: async (slug: string): Promise<Location | null> => {
      const response = await this.locations.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Find location by site and slug
     */
    findBySiteAndSlug: async (siteId: number, slug: string): Promise<Location | null> => {
      const response = await this.locations.list({ site_id: siteId, slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Delete a location
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/dcim/locations/${id}/`);
    },
  };

  // ==========================================================================
  // Tenancy: Tenants
  // ==========================================================================

  /**
   * Tenant operations
   */
  readonly tenants = {
    /**
     * List tenants
     */
    list: async (params?: TenantListParams): Promise<PaginatedResponse<Tenant>> => {
      const response = await this.http.get<PaginatedResponse<Tenant>>('/tenancy/tenants/', {
        params,
      });
      return response.data;
    },

    /**
     * Get all tenants
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
     * Create a new tenant
     */
    create: async (data: TenantWritable): Promise<Tenant> => {
      const response = await this.http.post<Tenant>('/tenancy/tenants/', data);
      return response.data;
    },

    /**
     * Find tenant by slug
     */
    findBySlug: async (slug: string): Promise<Tenant | null> => {
      const response = await this.tenants.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Delete a tenant
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/tenancy/tenants/${id}/`);
    },
  };

  // ==========================================================================
  // Extras: Tags
  // ==========================================================================

  /**
   * Tag operations
   */
  readonly tags = {
    /**
     * List tags
     */
    list: async (params?: TagListParams): Promise<PaginatedResponse<Tag>> => {
      const response = await this.http.get<PaginatedResponse<Tag>>('/extras/tags/', { params });
      return response.data;
    },

    /**
     * Get all tags
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
     * Create a new tag
     */
    create: async (data: TagWritable): Promise<Tag> => {
      const response = await this.http.post<Tag>('/extras/tags/', data);
      return response.data;
    },

    /**
     * Find tag by slug
     */
    findBySlug: async (slug: string): Promise<Tag | null> => {
      const response = await this.tags.list({ slug });
      return response.results.length > 0 ? response.results[0] : null;
    },

    /**
     * Delete a tag
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/extras/tags/${id}/`);
    },
  };

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Test API connectivity
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
   * Get API status
   */
  async getStatus(): Promise<Record<string, unknown>> {
    const response = await this.http.get<Record<string, unknown>>('/status/');
    return response.data;
  }
}

