/**
 * Mapper tests
 */

import type { Allocation } from '@subnetter/core';
import {
  slugify,
  extractAccounts,
  extractRegions,
  extractRoles,
  mapAccountToTenant,
  mapRegionToSite,
  mapSubnetTypeToRole,
  mapAllocationToPrefix,
  SUBNETTER_MANAGED_TAG,
} from '../src/export/mapper.js';

describe('slugify', () => {
  it('should convert to lowercase', () => {
    expect(slugify('HelloWorld')).toBe('helloworld');
  });

  it('should replace spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('should remove special characters', () => {
    expect(slugify('hello@world!')).toBe('hello-world');
  });

  it('should collapse multiple hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('should trim leading/trailing hyphens', () => {
    expect(slugify('-hello-world-')).toBe('hello-world');
  });

  it('should handle AWS region names', () => {
    expect(slugify('us-east-1')).toBe('us-east-1');
  });

  it('should handle Azure region names', () => {
    expect(slugify('eastus')).toBe('eastus');
  });
});

describe('extractAccounts', () => {
  const allocations: Allocation[] = [
    createAllocation({ accountName: 'prod' }),
    createAllocation({ accountName: 'prod' }),
    createAllocation({ accountName: 'dev' }),
  ];

  it('should extract unique accounts', () => {
    const accounts = extractAccounts(allocations);
    expect(accounts).toHaveLength(2);
    expect(accounts).toContain('prod');
    expect(accounts).toContain('dev');
  });
});

describe('extractRegions', () => {
  const allocations: Allocation[] = [
    createAllocation({ regionName: 'us-east-1', cloudProvider: 'aws' }),
    createAllocation({ regionName: 'us-east-1', cloudProvider: 'aws' }),
    createAllocation({ regionName: 'eastus', cloudProvider: 'azure' }),
  ];

  it('should extract unique regions with providers', () => {
    const regions = extractRegions(allocations);
    expect(regions).toHaveLength(2);
    expect(regions).toContainEqual({ region: 'us-east-1', provider: 'aws' });
    expect(regions).toContainEqual({ region: 'eastus', provider: 'azure' });
  });
});

describe('extractRoles', () => {
  const allocations: Allocation[] = [
    createAllocation({ subnetRole: 'Public' }),
    createAllocation({ subnetRole: 'Public' }),
    createAllocation({ subnetRole: 'Private' }),
  ];

  it('should extract unique roles', () => {
    const roles = extractRoles(allocations);
    expect(roles).toHaveLength(2);
    expect(roles).toContain('Public');
    expect(roles).toContain('Private');
  });
});

describe('mapAccountToTenant', () => {
  it('should create tenant with correct name and slug', () => {
    const tenant = mapAccountToTenant('Production Account');
    expect(tenant.name).toBe('Production Account');
    expect(tenant.slug).toBe('production-account');
  });

  it('should include subnetter-managed tag', () => {
    const tenant = mapAccountToTenant('prod');
    expect(tenant.tags).toBeDefined();
    expect(tenant.tags![0].name).toBe(SUBNETTER_MANAGED_TAG);
  });
});

describe('mapRegionToSite', () => {
  it('should create site with correct name and slug', () => {
    const site = mapRegionToSite('us-east-1', 'aws');
    expect(site.name).toBe('us-east-1');
    expect(site.slug).toBe('us-east-1');
  });

  it('should include cloud provider tag', () => {
    const site = mapRegionToSite('us-east-1', 'aws');
    expect(site.tags).toBeDefined();
    expect(site.tags!.some((t) => t.name === 'aws')).toBe(true);
  });

  it('should include subnetter-managed tag', () => {
    const site = mapRegionToSite('us-east-1', 'aws');
    expect(site.tags!.some((t) => t.name === SUBNETTER_MANAGED_TAG)).toBe(true);
  });
});

describe('mapSubnetTypeToRole', () => {
  it('should create role with correct name and slug', () => {
    const role = mapSubnetTypeToRole('Public');
    expect(role.name).toBe('Public');
    expect(role.slug).toBe('public');
  });
});

describe('mapAllocationToPrefix', () => {
  const allocation = createAllocation({
    accountName: 'production',
    cloudProvider: 'aws',
    regionName: 'us-east-1',
    availabilityZone: 'us-east-1a',
    subnetRole: 'Public',
    subnetCidr: '10.0.1.0/24',
    usableIps: 251,
  });

  it('should set prefix correctly', () => {
    const prefix = mapAllocationToPrefix(allocation);
    expect(prefix.prefix).toBe('10.0.1.0/24');
  });

  it('should set default status to reserved', () => {
    const prefix = mapAllocationToPrefix(allocation);
    expect(prefix.status).toBe('reserved');
  });

  it('should allow custom status', () => {
    const prefix = mapAllocationToPrefix(allocation, { status: 'active' });
    expect(prefix.status).toBe('active');
  });

  it('should include cloud provider tag', () => {
    const prefix = mapAllocationToPrefix(allocation);
    expect(prefix.tags!.some((t) => t.name === 'aws')).toBe(true);
  });

  it('should include AZ tag', () => {
    const prefix = mapAllocationToPrefix(allocation);
    expect(prefix.tags!.some((t) => t.name === 'az:us-east-1a')).toBe(true);
  });

  it('should include custom fields', () => {
    const prefix = mapAllocationToPrefix(allocation);
    expect(prefix.custom_fields).toEqual({
      subnetter_account: 'production',
      subnetter_region: 'us-east-1',
      subnetter_az: 'us-east-1a',
      subnetter_role: 'Public',
      subnetter_usable_ips: 251,
    });
  });

  it('should build description from allocation parts', () => {
    const prefix = mapAllocationToPrefix(allocation);
    expect(prefix.description).toBe('production / us-east-1 / us-east-1a / Public');
  });
});

// Helper to create test allocations
function createAllocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    accountName: 'test-account',
    vpcName: 'test-vpc',
    cloudProvider: 'aws',
    regionName: 'us-east-1',
    availabilityZone: 'us-east-1a',
    regionCidr: '10.0.0.0/16',
    vpcCidr: '10.0.0.0/16',
    azCidr: '10.0.0.0/20',
    subnetCidr: '10.0.0.0/24',
    subnetRole: 'Public',
    usableIps: 254,
    ...overrides,
  };
}

