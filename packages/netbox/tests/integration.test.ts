/**
 * Integration tests against a real NetBox instance
 * 
 * These tests require a running NetBox instance.
 * Set NETBOX_URL and NETBOX_TOKEN environment variables to run.
 * 
 * Run with: NETBOX_URL=http://localhost:8000 NETBOX_TOKEN=<token> yarn test tests/integration.test.ts
 */

import { NetBoxClient } from '../src/client/NetBoxClient';
import { NetBoxExporter } from '../src/export/exporter';
import type { Allocation } from '@subnetter/core';

// Skip tests if NetBox credentials are not provided
const NETBOX_URL = process.env.NETBOX_URL || 'http://localhost:8000';
const NETBOX_TOKEN = process.env.NETBOX_TOKEN;

const describeIfNetBox = NETBOX_TOKEN ? describe : describe.skip;

// Test data identifiers - all prefixed with 'inttest-' to easily identify test data
const TEST_PREFIX = 'inttest';
const TEST_TENANT_SLUG = `${TEST_PREFIX}-tenant`;
const TEST_SITE_SLUG = `${TEST_PREFIX}-site`;
const TEST_ROLE_SLUG = `${TEST_PREFIX}-role`;
const TEST_TAG_SLUG = `${TEST_PREFIX}-tag`;

// Test CIDR ranges - use unique ranges unlikely to conflict
const TEST_CIDR_PREFIX = '192.168.200';
const TEST_CIDR_1 = `${TEST_CIDR_PREFIX}.0/24`;
const TEST_CIDR_2 = `${TEST_CIDR_PREFIX}.0/25`;
const TEST_CIDR_3 = `${TEST_CIDR_PREFIX}.128/25`;

/**
 * Helper to safely delete a resource, ignoring errors
 */
async function safeDelete(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // Ignore deletion errors (resource may not exist or have dependencies)
  }
}

describeIfNetBox('NetBox Integration Tests', () => {
  let client: NetBoxClient;

  beforeAll(() => {
    client = new NetBoxClient({
      url: NETBOX_URL,
      token: NETBOX_TOKEN!,
    });
  });

  // Global cleanup after all tests
  afterAll(async () => {
    // Clean up any test data that might have been left behind
    // Order matters: prefixes first (they may reference sites/tenants/roles)
    
    // Delete test prefixes
    for (const cidr of [TEST_CIDR_1, TEST_CIDR_2, TEST_CIDR_3]) {
      const prefix = await client.prefixes.findByPrefix(cidr);
      if (prefix) {
        await safeDelete(() => client.prefixes.delete(prefix.id));
      }
    }

    // Delete test roles
    const role = await client.roles.findBySlug(TEST_ROLE_SLUG);
    if (role) {
      await safeDelete(() => client.roles.delete(role.id));
    }

    // Delete test sites
    const site = await client.sites.findBySlug(TEST_SITE_SLUG);
    if (site) {
      await safeDelete(() => client.sites.delete(site.id));
    }

    // Delete test tenants
    const tenant = await client.tenants.findBySlug(TEST_TENANT_SLUG);
    if (tenant) {
      await safeDelete(() => client.tenants.delete(tenant.id));
    }

    // Delete test tags
    const tag = await client.tags.findBySlug(TEST_TAG_SLUG);
    if (tag) {
      await safeDelete(() => client.tags.delete(tag.id));
    }
  });

  describe('NetBoxClient', () => {
    it('should connect to NetBox', async () => {
      const connected = await client.testConnection();
      expect(connected).toBe(true);
    });

    it('should get API status', async () => {
      const status = await client.getStatus();
      expect(status).toBeDefined();
      expect(status['netbox-version']).toBeDefined();
    });

    describe('Tenants', () => {
      beforeAll(async () => {
        // Clean up any leftover test data
        const tenant = await client.tenants.findBySlug(TEST_TENANT_SLUG);
        if (tenant) {
          await safeDelete(() => client.tenants.delete(tenant.id));
        }
      });

      afterAll(async () => {
        const tenant = await client.tenants.findBySlug(TEST_TENANT_SLUG);
        if (tenant) {
          await safeDelete(() => client.tenants.delete(tenant.id));
        }
      });

      it('should list tenants', async () => {
        const result = await client.tenants.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create and delete a tenant', async () => {
        // Create
        const tenant = await client.tenants.create({
          name: 'Integration Test Tenant',
          slug: TEST_TENANT_SLUG,
          description: 'Created by integration test',
        });

        expect(tenant.id).toBeGreaterThan(0);
        expect(tenant.name).toBe('Integration Test Tenant');
        expect(tenant.slug).toBe(TEST_TENANT_SLUG);

        // Find
        const found = await client.tenants.findBySlug(TEST_TENANT_SLUG);
        expect(found).not.toBeNull();
        expect(found?.id).toBe(tenant.id);

        // Delete
        await client.tenants.delete(tenant.id);

        // Verify deleted
        const deleted = await client.tenants.findBySlug(TEST_TENANT_SLUG);
        expect(deleted).toBeNull();
      });
    });

    describe('Sites', () => {
      beforeAll(async () => {
        const site = await client.sites.findBySlug(TEST_SITE_SLUG);
        if (site) {
          await safeDelete(() => client.sites.delete(site.id));
        }
      });

      afterAll(async () => {
        const site = await client.sites.findBySlug(TEST_SITE_SLUG);
        if (site) {
          await safeDelete(() => client.sites.delete(site.id));
        }
      });

      it('should list sites', async () => {
        const result = await client.sites.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create and delete a site', async () => {
        // Create
        const site = await client.sites.create({
          name: 'inttest-region-1',
          slug: TEST_SITE_SLUG,
          status: 'active',
          description: 'Created by integration test',
        });

        expect(site.id).toBeGreaterThan(0);
        expect(site.slug).toBe(TEST_SITE_SLUG);

        // Find
        const found = await client.sites.findBySlug(TEST_SITE_SLUG);
        expect(found).not.toBeNull();

        // Delete
        await client.sites.delete(site.id);

        // Verify deleted
        const deleted = await client.sites.findBySlug(TEST_SITE_SLUG);
        expect(deleted).toBeNull();
      });
    });

    describe('Roles', () => {
      beforeAll(async () => {
        const role = await client.roles.findBySlug(TEST_ROLE_SLUG);
        if (role) {
          await safeDelete(() => client.roles.delete(role.id));
        }
      });

      afterAll(async () => {
        const role = await client.roles.findBySlug(TEST_ROLE_SLUG);
        if (role) {
          await safeDelete(() => client.roles.delete(role.id));
        }
      });

      it('should list roles', async () => {
        const result = await client.roles.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create and delete a role', async () => {
        // Create
        const role = await client.roles.create({
          name: 'Integration Test Role',
          slug: TEST_ROLE_SLUG,
          description: 'Created by integration test',
        });

        expect(role.id).toBeGreaterThan(0);
        expect(role.slug).toBe(TEST_ROLE_SLUG);

        // Find
        const found = await client.roles.findBySlug(TEST_ROLE_SLUG);
        expect(found).not.toBeNull();

        // Delete
        await client.roles.delete(role.id);

        // Verify deleted
        const deleted = await client.roles.findBySlug(TEST_ROLE_SLUG);
        expect(deleted).toBeNull();
      });
    });

    describe('Prefixes', () => {
      beforeAll(async () => {
        const prefix = await client.prefixes.findByPrefix(TEST_CIDR_1);
        if (prefix) {
          await safeDelete(() => client.prefixes.delete(prefix.id));
        }
      });

      afterAll(async () => {
        const prefix = await client.prefixes.findByPrefix(TEST_CIDR_1);
        if (prefix) {
          await safeDelete(() => client.prefixes.delete(prefix.id));
        }
      });

      it('should list prefixes', async () => {
        const result = await client.prefixes.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create and delete a prefix', async () => {
        // Create
        const prefix = await client.prefixes.create({
          prefix: TEST_CIDR_1,
          status: 'reserved',
          description: 'Integration test prefix',
        });

        expect(prefix.id).toBeGreaterThan(0);
        expect(prefix.prefix).toBe(TEST_CIDR_1);

        // Find
        const found = await client.prefixes.findByPrefix(TEST_CIDR_1);
        expect(found).not.toBeNull();

        // Delete
        await client.prefixes.delete(prefix.id);

        // Verify deleted
        const deleted = await client.prefixes.findByPrefix(TEST_CIDR_1);
        expect(deleted).toBeNull();
      });
    });

    describe('Tags', () => {
      beforeAll(async () => {
        const tag = await client.tags.findBySlug(TEST_TAG_SLUG);
        if (tag) {
          await safeDelete(() => client.tags.delete(tag.id));
        }
      });

      afterAll(async () => {
        const tag = await client.tags.findBySlug(TEST_TAG_SLUG);
        if (tag) {
          await safeDelete(() => client.tags.delete(tag.id));
        }
      });

      it('should list tags', async () => {
        const result = await client.tags.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create and delete a tag', async () => {
        // Create
        const tag = await client.tags.create({
          name: 'inttest-tag',
          slug: TEST_TAG_SLUG,
          color: 'ff5722',
          description: 'Created by integration test',
        });

        expect(tag.id).toBeGreaterThan(0);
        expect(tag.slug).toBe(TEST_TAG_SLUG);

        // Find
        const found = await client.tags.findBySlug(TEST_TAG_SLUG);
        expect(found).not.toBeNull();

        // Delete
        await client.tags.delete(tag.id);

        // Verify deleted
        const deleted = await client.tags.findBySlug(TEST_TAG_SLUG);
        expect(deleted).toBeNull();
      });
    });
  });

  describe('NetBoxExporter', () => {
    let exporter: NetBoxExporter;

    // Exporter test identifiers
    const EXPORT_TENANT_SLUG = `${TEST_PREFIX}-export-tenant`;
    const EXPORT_SITE_SLUG = `${TEST_PREFIX}-export-site`;
    const EXPORT_ROLE_SLUG = `${TEST_PREFIX}-export-role`;
    const EXPORT_CIDR_1 = '192.168.201.0/24';
    const EXPORT_CIDR_2 = '192.168.201.128/25';

    beforeAll(() => {
      exporter = new NetBoxExporter(client);
    });

    afterAll(async () => {
      // Clean up exporter test data
      // Delete prefixes first
      for (const cidr of [EXPORT_CIDR_1, EXPORT_CIDR_2]) {
        const prefix = await client.prefixes.findByPrefix(cidr);
        if (prefix) {
          await safeDelete(() => client.prefixes.delete(prefix.id));
        }
      }

      // Delete roles created by exporter
      for (const slug of [EXPORT_ROLE_SLUG, 'public', 'private', 'application', 'database', 'compute']) {
        const role = await client.roles.findBySlug(slug);
        if (role) {
          await safeDelete(() => client.roles.delete(role.id));
        }
      }

      // Delete sites created by exporter
      for (const slug of [EXPORT_SITE_SLUG, `${TEST_PREFIX}-region`]) {
        const site = await client.sites.findBySlug(slug);
        if (site) {
          await safeDelete(() => client.sites.delete(site.id));
        }
      }

      // Delete tenants created by exporter
      for (const slug of [EXPORT_TENANT_SLUG, `${TEST_PREFIX}-account`, 'export-test-account', 'idempotent-test']) {
        const tenant = await client.tenants.findBySlug(slug);
        if (tenant) {
          await safeDelete(() => client.tenants.delete(tenant.id));
        }
      }
    });

    it('should perform dry-run export', async () => {
      const allocations: Allocation[] = [
        {
          accountName: `${TEST_PREFIX}-account`,
          vpcName: `${TEST_PREFIX}-vpc`,
          cloudProvider: 'aws',
          regionName: `${TEST_PREFIX}-region`,
          availabilityZone: `${TEST_PREFIX}-region-a`,
          regionCidr: '192.168.202.0/24',
          vpcCidr: '192.168.202.0/24',
          azCidr: '192.168.202.0/25',
          subnetCidr: '192.168.202.0/26',
          subnetRole: 'Public',
          usableIps: 62,
        },
      ];

      const result = await exporter.export(allocations, {
        dryRun: true,
        createMissing: true,
      });

      expect(result).toBeDefined();
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
      expect(result.summary).toBeDefined();

      // In dry-run mode, we should see planned creates
      const creates = result.changes.filter((c) => c.operation === 'create');
      expect(creates.length).toBeGreaterThan(0);

      // Verify no errors
      expect(result.errors).toHaveLength(0);
    });

    it('should export allocations to NetBox and clean up', async () => {
      // Cleanup any existing test prefixes
      for (const cidr of [EXPORT_CIDR_1, EXPORT_CIDR_2]) {
        const existing = await client.prefixes.findByPrefix(cidr);
        if (existing) {
          await client.prefixes.delete(existing.id);
        }
      }

      const allocations: Allocation[] = [
        {
          accountName: 'export-test-account',
          vpcName: 'export-test-vpc',
          cloudProvider: 'aws',
          regionName: `${TEST_PREFIX}-region`,
          availabilityZone: `${TEST_PREFIX}-region-a`,
          regionCidr: '192.168.201.0/24',
          vpcCidr: '192.168.201.0/24',
          azCidr: '192.168.201.0/25',
          subnetCidr: EXPORT_CIDR_1,
          subnetRole: 'Application',
          usableIps: 251,
        },
        {
          accountName: 'export-test-account',
          vpcName: 'export-test-vpc',
          cloudProvider: 'aws',
          regionName: `${TEST_PREFIX}-region`,
          availabilityZone: `${TEST_PREFIX}-region-a`,
          regionCidr: '192.168.201.0/24',
          vpcCidr: '192.168.201.0/24',
          azCidr: '192.168.201.0/25',
          subnetCidr: EXPORT_CIDR_2,
          subnetRole: 'Database',
          usableIps: 126,
        },
      ];

      // Export (not dry-run)
      const result = await exporter.export(allocations, {
        dryRun: false,
        createMissing: true,
        status: 'reserved',
      });

      if (!result.success) {
        console.error('Export failed. Errors:', result.errors);
      }

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify prefixes were created
      const prefix1 = await client.prefixes.findByPrefix(EXPORT_CIDR_1);
      expect(prefix1).not.toBeNull();
      expect(prefix1?.status.value).toBe('reserved');

      const prefix2 = await client.prefixes.findByPrefix(EXPORT_CIDR_2);
      expect(prefix2).not.toBeNull();

      // Cleanup is handled by afterAll
    });

    it('should be idempotent (running twice produces same result)', async () => {
      const testCidr = '192.168.203.0/24';

      // Cleanup
      const existing = await client.prefixes.findByPrefix(testCidr);
      if (existing) {
        await client.prefixes.delete(existing.id);
      }

      const allocations: Allocation[] = [
        {
          accountName: 'idempotent-test',
          vpcName: 'idempotent-vpc',
          cloudProvider: 'gcp',
          regionName: `${TEST_PREFIX}-region`,
          availabilityZone: `${TEST_PREFIX}-region-a`,
          regionCidr: '192.168.203.0/24',
          vpcCidr: '192.168.203.0/24',
          azCidr: '192.168.203.0/25',
          subnetCidr: testCidr,
          subnetRole: 'Compute',
          usableIps: 251,
        },
      ];

      // First export
      const result1 = await exporter.export(allocations, {
        dryRun: false,
        createMissing: true,
      });

      expect(result1.success).toBe(true);
      expect(result1.summary.created).toBeGreaterThan(0);

      // Second export (should skip or update existing)
      const result2 = await exporter.export(allocations, {
        dryRun: false,
        createMissing: true,
      });

      if (!result2.success) {
        console.error('Second export failed. Errors:', result2.errors);
      }

      expect(result2.success).toBe(true);
      expect(result2.summary.created).toBe(0);
      // Second run should either skip or update (both are valid idempotent outcomes)
      expect(result2.summary.skipped + result2.summary.updated).toBeGreaterThan(0);

      // Cleanup
      const prefix = await client.prefixes.findByPrefix(testCidr);
      if (prefix) {
        await client.prefixes.delete(prefix.id);
      }
    });
  });
});
