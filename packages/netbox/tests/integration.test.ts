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

describeIfNetBox('NetBox Integration Tests', () => {
  let client: NetBoxClient;

  beforeAll(() => {
    client = new NetBoxClient({
      url: NETBOX_URL,
      token: NETBOX_TOKEN!,
    });
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
      const testTenantSlug = 'integration-test-tenant';

      afterAll(async () => {
        // Cleanup: delete test tenant if it exists
        const existing = await client.tenants.findBySlug(testTenantSlug);
        if (existing) {
          // Note: NetBox doesn't allow deleting tenants with prefixes
          // We'll leave cleanup for manual intervention if needed
        }
      });

      it('should list tenants', async () => {
        const result = await client.tenants.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create a tenant', async () => {
        // Check if tenant already exists
        const existing = await client.tenants.findBySlug(testTenantSlug);
        if (existing) {
          expect(existing.name).toBe('Integration Test Tenant');
          return;
        }

        const tenant = await client.tenants.create({
          name: 'Integration Test Tenant',
          slug: testTenantSlug,
          description: 'Created by integration test',
        });

        expect(tenant.id).toBeGreaterThan(0);
        expect(tenant.name).toBe('Integration Test Tenant');
        expect(tenant.slug).toBe(testTenantSlug);
      });

      it('should find tenant by slug', async () => {
        const tenant = await client.tenants.findBySlug(testTenantSlug);
        expect(tenant).not.toBeNull();
        expect(tenant?.slug).toBe(testTenantSlug);
      });
    });

    describe('Sites', () => {
      const testSiteSlug = 'integration-test-site';

      afterAll(async () => {
        // Cleanup handled manually if needed
      });

      it('should list sites', async () => {
        const result = await client.sites.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create a site', async () => {
        const existing = await client.sites.findBySlug(testSiteSlug);
        if (existing) {
          expect(existing.name).toBe('us-east-1');
          return;
        }

        const site = await client.sites.create({
          name: 'us-east-1',
          slug: testSiteSlug,
          status: 'active',
          description: 'Created by integration test',
        });

        expect(site.id).toBeGreaterThan(0);
        expect(site.name).toBe('us-east-1');
      });
    });

    describe('Roles', () => {
      const testRoleSlug = 'integration-test-role';

      it('should list roles', async () => {
        const result = await client.roles.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create a role', async () => {
        const existing = await client.roles.findBySlug(testRoleSlug);
        if (existing) {
          expect(existing.name).toBe('Integration Test Role');
          return;
        }

        const role = await client.roles.create({
          name: 'Integration Test Role',
          slug: testRoleSlug,
          description: 'Created by integration test',
        });

        expect(role.id).toBeGreaterThan(0);
        expect(role.name).toBe('Integration Test Role');
      });
    });

    describe('Prefixes', () => {
      it('should list prefixes', async () => {
        const result = await client.prefixes.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create and delete a prefix', async () => {
        const testPrefix = '192.168.99.0/24';

        // Check if prefix exists and delete it first
        const existing = await client.prefixes.findByPrefix(testPrefix);
        if (existing) {
          await client.prefixes.delete(existing.id);
        }

        // Create prefix
        const prefix = await client.prefixes.create({
          prefix: testPrefix,
          status: 'reserved',
          description: 'Integration test prefix',
        });

        expect(prefix.id).toBeGreaterThan(0);
        expect(prefix.prefix).toBe(testPrefix);

        // Delete prefix
        await client.prefixes.delete(prefix.id);

        // Verify deletion
        const deleted = await client.prefixes.findByPrefix(testPrefix);
        expect(deleted).toBeNull();
      });
    });

    describe('Tags', () => {
      const testTagSlug = 'integration-test-tag';

      it('should list tags', async () => {
        const result = await client.tags.list();
        expect(result).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      });

      it('should create a tag', async () => {
        const existing = await client.tags.findBySlug(testTagSlug);
        if (existing) {
          expect(existing.name).toBe('integration-test-tag');
          return;
        }

        const tag = await client.tags.create({
          name: 'integration-test-tag',
          slug: testTagSlug,
          color: 'ff5722',
          description: 'Created by integration test',
        });

        expect(tag.id).toBeGreaterThan(0);
        expect(tag.slug).toBe(testTagSlug);
      });
    });
  });

  describe('NetBoxExporter', () => {
    let exporter: NetBoxExporter;

    beforeAll(() => {
      exporter = new NetBoxExporter(client);
    });

    it('should perform dry-run export', async () => {
      const allocations: Allocation[] = [
        {
          accountName: 'test-account',
          vpcName: 'test-vpc',
          cloudProvider: 'aws',
          regionName: 'us-east-1',
          availabilityZone: 'us-east-1a',
          regionCidr: '10.100.0.0/16',
          vpcCidr: '10.100.0.0/16',
          azCidr: '10.100.0.0/20',
          subnetCidr: '10.100.0.0/24',
          subnetRole: 'Public',
          usableIps: 251,
        },
        {
          accountName: 'test-account',
          vpcName: 'test-vpc',
          cloudProvider: 'aws',
          regionName: 'us-east-1',
          availabilityZone: 'us-east-1a',
          regionCidr: '10.100.0.0/16',
          vpcCidr: '10.100.0.0/16',
          azCidr: '10.100.0.0/20',
          subnetCidr: '10.100.1.0/24',
          subnetRole: 'Private',
          usableIps: 251,
        },
      ];

      try {
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
      } catch (error) {
        // Log the error details for debugging
        console.error('Export error:', error);
        if (error && typeof error === 'object' && 'response' in error) {
          console.error('Response:', (error as { response: unknown }).response);
        }
        throw error;
      }
    });

    it('should export allocations to NetBox', async () => {
      const testPrefix1 = '10.200.0.0/24';
      const testPrefix2 = '10.200.1.0/24';

      // Cleanup any existing test prefixes
      for (const prefix of [testPrefix1, testPrefix2]) {
        const existing = await client.prefixes.findByPrefix(prefix);
        if (existing) {
          await client.prefixes.delete(existing.id);
        }
      }

      const allocations: Allocation[] = [
        {
          accountName: 'export-test-account',
          vpcName: 'export-test-vpc',
          cloudProvider: 'aws',
          regionName: 'us-west-2',
          availabilityZone: 'us-west-2a',
          regionCidr: '10.200.0.0/16',
          vpcCidr: '10.200.0.0/16',
          azCidr: '10.200.0.0/20',
          subnetCidr: testPrefix1,
          subnetRole: 'Application',
          usableIps: 251,
        },
        {
          accountName: 'export-test-account',
          vpcName: 'export-test-vpc',
          cloudProvider: 'aws',
          regionName: 'us-west-2',
          availabilityZone: 'us-west-2a',
          regionCidr: '10.200.0.0/16',
          vpcCidr: '10.200.0.0/16',
          azCidr: '10.200.0.0/20',
          subnetCidr: testPrefix2,
          subnetRole: 'Database',
          usableIps: 251,
        },
      ];

      // Export (not dry-run)
      const result = await exporter.export(allocations, {
        dryRun: false,
        createMissing: true,
        status: 'reserved',
      });

      // Debug output
      if (!result.success) {
        console.error('Export failed. Errors:', result.errors);
        console.error('Changes:', result.changes.filter(c => c.operation !== 'skip'));
      }

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify prefixes were created
      const prefix1 = await client.prefixes.findByPrefix(testPrefix1);
      expect(prefix1).not.toBeNull();
      expect(prefix1?.status.value).toBe('reserved');

      const prefix2 = await client.prefixes.findByPrefix(testPrefix2);
      expect(prefix2).not.toBeNull();

      // Cleanup
      if (prefix1) await client.prefixes.delete(prefix1.id);
      if (prefix2) await client.prefixes.delete(prefix2.id);
    });

    it('should be idempotent (running twice produces same result)', async () => {
      const testPrefix = '10.201.0.0/24';

      // Cleanup
      const existing = await client.prefixes.findByPrefix(testPrefix);
      if (existing) {
        await client.prefixes.delete(existing.id);
      }

      const allocations: Allocation[] = [
        {
          accountName: 'idempotent-test',
          vpcName: 'idempotent-vpc',
          cloudProvider: 'gcp',
          regionName: 'us-central1',
          availabilityZone: 'us-central1-a',
          regionCidr: '10.201.0.0/16',
          vpcCidr: '10.201.0.0/16',
          azCidr: '10.201.0.0/20',
          subnetCidr: testPrefix,
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

      // Second export (should skip existing)
      const result2 = await exporter.export(allocations, {
        dryRun: false,
        createMissing: true,
      });

      // Debug output
      if (!result2.success) {
        console.error('Second export failed. Errors:', result2.errors);
      }

      expect(result2.success).toBe(true);
      expect(result2.summary.created).toBe(0);
      // Second run should either skip or update (both are valid idempotent outcomes)
      expect(result2.summary.skipped + result2.summary.updated).toBeGreaterThan(0);

      // Cleanup
      const prefix = await client.prefixes.findByPrefix(testPrefix);
      if (prefix) await client.prefixes.delete(prefix.id);
    });
  });
});

