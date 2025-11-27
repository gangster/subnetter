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
  Rir,
} from './types.js';
import { NetBoxConfigSchema } from './types.js';

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

  /**
   * Aggregate operations
   */
  readonly aggregates = {
    /**
     * List aggregates
     */
    list: async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Aggregate>> => {
      const response = await this.http.get<PaginatedResponse<Aggregate>>('/ipam/aggregates/', {
        params,
      });
      return response.data;
    },

    /**
     * Create a new aggregate
     */
    create: async (data: AggregateWritable): Promise<Aggregate> => {
      const response = await this.http.post<Aggregate>('/ipam/aggregates/', data);
      return response.data;
    },

    /**
     * Delete an aggregate
     */
    delete: async (id: number): Promise<void> => {
      await this.http.delete(`/ipam/aggregates/${id}/`);
    },
  };

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
    list: async (): Promise<PaginatedResponse<Rir>> => {
      const response = await this.http.get<PaginatedResponse<Rir>>('/ipam/rirs/');
      return response.data;
    },

    /**
     * Find RIR by slug
     */
    findBySlug: async (slug: string): Promise<Rir | null> => {
      const response = await this.http.get<PaginatedResponse<Rir>>('/ipam/rirs/', {
        params: { slug },
      });
      return response.data.results.length > 0 ? response.data.results[0] : null;
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

