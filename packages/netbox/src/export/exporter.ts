/**
 * NetBox Exporter - exports Subnetter allocations to NetBox
 */

import type { Allocation } from '@subnetter/core';
import { NetBoxClient, NetBoxApiError } from '../client/NetBoxClient.js';
import type {
  Prefix,
  Site,
  Tenant,
  Role,
  Tag,
  PrefixStatus,
} from '../client/types.js';
import {
  SUBNETTER_MANAGED_TAG,
  slugify,
  extractAccounts,
  extractRegions,
  extractRoles,
  mapAccountToTenant,
  mapRegionToSite,
  mapSubnetTypeToRole,
  mapAllocationToPrefix,
} from './mapper.js';

/**
 * Export operation types
 */
export type OperationType = 'create' | 'update' | 'delete' | 'skip';

/**
 * Represents a planned change
 */
export interface PlannedChange<T = unknown> {
  operation: OperationType;
  objectType: 'prefix' | 'site' | 'tenant' | 'role' | 'tag';
  identifier: string;
  current?: T;
  planned?: T;
  reason?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  changes: PlannedChange[];
  errors: Array<{ identifier: string; error: string }>;
  summary: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: number;
  };
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Create missing tenants, sites, and roles (default: true) */
  createMissing?: boolean;
  /** Delete prefixes in NetBox that are not in allocations (default: false) */
  prune?: boolean;
  /** Status to assign to new prefixes (default: 'reserved') */
  status?: PrefixStatus;
  /** Only show what would be done, don't make changes */
  dryRun?: boolean;
}

/**
 * NetBox Exporter
 *
 * Exports Subnetter allocations to NetBox, creating necessary
 * supporting objects (tenants, sites, roles) as needed.
 */
export class NetBoxExporter {
  private readonly client: NetBoxClient;

  // Cache of existing objects (populated during export)
  private tenantCache: Map<string, Tenant> = new Map();
  private siteCache: Map<string, Site> = new Map();
  private roleCache: Map<string, Role> = new Map();
  private tagCache: Map<string, Tag> = new Map();

  constructor(client: NetBoxClient) {
    this.client = client;
  }

  /**
   * Export allocations to NetBox
   */
  async export(
    allocations: Allocation[],
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    const {
      createMissing = true,
      prune = false,
      status = 'reserved',
      dryRun = false,
    } = options;

    const changes: PlannedChange[] = [];
    const errors: Array<{ identifier: string; error: string }> = [];

    // Phase 1: Load existing data from NetBox
    await this.loadExistingData();

    // Phase 2: Ensure the subnetter-managed tag exists
    await this.ensureTag(SUBNETTER_MANAGED_TAG, changes, dryRun);

    // Phase 3: Ensure tenants exist
    if (createMissing) {
      const accounts = extractAccounts(allocations);
      for (const account of accounts) {
        await this.ensureTenant(account, changes, dryRun);
      }
    }

    // Phase 4: Ensure sites exist
    if (createMissing) {
      const regions = extractRegions(allocations);
      for (const { region, provider } of regions) {
        await this.ensureSite(region, provider, changes, dryRun);
      }
    }

    // Phase 5: Ensure roles exist
    if (createMissing) {
      const roles = extractRoles(allocations);
      for (const role of roles) {
        await this.ensureRole(role, changes, dryRun);
      }
    }

    // Phase 6: Get existing prefixes with subnetter-managed tag
    const existingPrefixes = await this.getSubnetterManagedPrefixes();
    const existingPrefixMap = new Map(
      existingPrefixes.map((p) => [p.prefix, p]),
    );

    // Phase 7: Process allocations
    const processedPrefixes = new Set<string>();

    for (const allocation of allocations) {
      const prefixCidr = allocation.subnetCidr;
      processedPrefixes.add(prefixCidr);

      const existing = existingPrefixMap.get(prefixCidr);
      const tenantId = this.tenantCache.get(slugify(allocation.accountName))?.id;
      const siteId = this.siteCache.get(slugify(allocation.regionName))?.id;
      const roleId = this.roleCache.get(slugify(allocation.subnetRole))?.id;

      const prefixData = mapAllocationToPrefix(allocation, {
        status,
        tenantId,
        siteId,
        roleId,
      });

      if (existing) {
        // Check if update is needed
        const needsUpdate = this.prefixNeedsUpdate(existing, prefixData);
        if (needsUpdate) {
          changes.push({
            operation: 'update',
            objectType: 'prefix',
            identifier: prefixCidr,
            current: existing,
            planned: prefixData,
            reason: 'Prefix attributes changed',
          });

          if (!dryRun) {
            try {
              await this.client.prefixes.update(existing.id, prefixData);
            } catch (err) {
              errors.push({
                identifier: prefixCidr,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        } else {
          changes.push({
            operation: 'skip',
            objectType: 'prefix',
            identifier: prefixCidr,
            reason: 'No changes needed',
          });
        }
      } else {
        // Create new prefix
        changes.push({
          operation: 'create',
          objectType: 'prefix',
          identifier: prefixCidr,
          planned: prefixData,
        });

        if (!dryRun) {
          try {
            await this.client.prefixes.create(prefixData);
          } catch (err) {
            errors.push({
              identifier: prefixCidr,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    // Phase 8: Handle pruning (delete prefixes not in allocations)
    if (prune) {
      for (const [prefixCidr, existing] of existingPrefixMap) {
        if (!processedPrefixes.has(prefixCidr)) {
          changes.push({
            operation: 'delete',
            objectType: 'prefix',
            identifier: prefixCidr,
            current: existing,
            reason: 'Prefix not in Subnetter allocations',
          });

          if (!dryRun) {
            try {
              await this.client.prefixes.delete(existing.id);
            } catch (err) {
              errors.push({
                identifier: prefixCidr,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }
      }
    }

    // Build summary
    const summary = {
      created: changes.filter((c) => c.operation === 'create').length,
      updated: changes.filter((c) => c.operation === 'update').length,
      deleted: changes.filter((c) => c.operation === 'delete').length,
      skipped: changes.filter((c) => c.operation === 'skip').length,
      errors: errors.length,
    };

    return {
      success: errors.length === 0,
      changes,
      errors,
      summary,
    };
  }

  /**
   * Load existing data from NetBox into caches
   */
  private async loadExistingData(): Promise<void> {
    // Load tenants
    const tenants = await this.client.tenants.listAll();
    this.tenantCache = new Map(tenants.map((t) => [t.slug, t]));

    // Load sites
    const sites = await this.client.sites.listAll();
    this.siteCache = new Map(sites.map((s) => [s.slug, s]));

    // Load roles
    const roles = await this.client.roles.listAll();
    this.roleCache = new Map(roles.map((r) => [r.slug, r]));

    // Load tags
    const tags = await this.client.tags.listAll();
    this.tagCache = new Map(tags.map((t) => [t.slug, t]));
  }

  /**
   * Get all prefixes with the subnetter-managed tag
   */
  private async getSubnetterManagedPrefixes(): Promise<Prefix[]> {
    return this.client.prefixes.listAll({ tag: SUBNETTER_MANAGED_TAG });
  }

  /**
   * Ensure a tag exists
   */
  private async ensureTag(
    tagName: string,
    changes: PlannedChange[],
    dryRun: boolean,
  ): Promise<void> {
    const slug = slugify(tagName);
    if (this.tagCache.has(slug)) return;

    changes.push({
      operation: 'create',
      objectType: 'tag',
      identifier: tagName,
      planned: { name: tagName, slug },
    });

    if (!dryRun) {
      try {
        const tag = await this.client.tags.create({
          name: tagName,
          slug,
          color: '9e9e9e', // Gray
          description: 'Managed by Subnetter',
        });
        this.tagCache.set(slug, tag);
      } catch (err) {
        // Tag might already exist (race condition)
        if (err instanceof NetBoxApiError && err.statusCode === 400) {
          const existing = await this.client.tags.findBySlug(slug);
          if (existing) {
            this.tagCache.set(slug, existing);
          }
        } else {
          throw err;
        }
      }
    }
  }

  /**
   * Ensure a tenant exists
   */
  private async ensureTenant(
    accountName: string,
    changes: PlannedChange[],
    dryRun: boolean,
  ): Promise<void> {
    const slug = slugify(accountName);
    if (this.tenantCache.has(slug)) return;

    const tenantData = mapAccountToTenant(accountName);

    changes.push({
      operation: 'create',
      objectType: 'tenant',
      identifier: accountName,
      planned: tenantData,
    });

    if (!dryRun) {
      try {
        const tenant = await this.client.tenants.create(tenantData);
        this.tenantCache.set(slug, tenant);
      } catch (err) {
        if (err instanceof NetBoxApiError && err.statusCode === 400) {
          const existing = await this.client.tenants.findBySlug(slug);
          if (existing) {
            this.tenantCache.set(slug, existing);
          }
        } else {
          throw err;
        }
      }
    }
  }

  /**
   * Ensure a site exists
   */
  private async ensureSite(
    regionName: string,
    cloudProvider: string,
    changes: PlannedChange[],
    dryRun: boolean,
  ): Promise<void> {
    const slug = slugify(regionName);
    if (this.siteCache.has(slug)) return;

    const siteData = mapRegionToSite(regionName, cloudProvider);

    changes.push({
      operation: 'create',
      objectType: 'site',
      identifier: regionName,
      planned: siteData,
    });

    if (!dryRun) {
      try {
        const site = await this.client.sites.create(siteData);
        this.siteCache.set(slug, site);
      } catch (err) {
        if (err instanceof NetBoxApiError && err.statusCode === 400) {
          const existing = await this.client.sites.findBySlug(slug);
          if (existing) {
            this.siteCache.set(slug, existing);
          }
        } else {
          throw err;
        }
      }
    }
  }

  /**
   * Ensure a role exists
   */
  private async ensureRole(
    roleName: string,
    changes: PlannedChange[],
    dryRun: boolean,
  ): Promise<void> {
    const slug = slugify(roleName);
    if (this.roleCache.has(slug)) return;

    const roleData = mapSubnetTypeToRole(roleName);

    changes.push({
      operation: 'create',
      objectType: 'role',
      identifier: roleName,
      planned: roleData,
    });

    if (!dryRun) {
      try {
        const role = await this.client.roles.create(roleData);
        this.roleCache.set(slug, role);
      } catch (err) {
        if (err instanceof NetBoxApiError && err.statusCode === 400) {
          const existing = await this.client.roles.findBySlug(slug);
          if (existing) {
            this.roleCache.set(slug, existing);
          }
        } else {
          throw err;
        }
      }
    }
  }

  /**
   * Check if a prefix needs to be updated
   */
  private prefixNeedsUpdate(
    existing: Prefix,
    planned: ReturnType<typeof mapAllocationToPrefix>,
  ): boolean {
    // Check key fields
    if (existing.status.value !== planned.status) return true;
    if (existing.description !== planned.description) return true;
    if (existing.tenant?.id !== planned.tenant) return true;
    if (existing.site?.id !== planned.site) return true;
    if (existing.role?.id !== planned.role) return true;

    return false;
  }
}

