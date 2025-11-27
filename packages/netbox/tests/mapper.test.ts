/**
 * Mapper tests
 */

import type { Allocation } from '@subnetter/core';
import {
  slugify,
  extractAccounts,
  extractCloudProviders,
  extractCloudRegions,
  extractAvailabilityZones,
  extractRoles,
  mapAccountToTenant,
  mapCloudProviderToSiteGroup,
  mapBaseCidrToAggregate,
  mapRegionToSite,
  mapAzToLocation,
  mapSubnetTypeToRole,
  mapAllocationToPrefix,
} from '../src/export/mapper';

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

describe('extractCloudProviders', () => {
  const allocations: Allocation[] = [
    createAllocation({ cloudProvider: 'aws' }),
    createAllocation({ cloudProvider: 'aws' }),
    createAllocation({ cloudProvider: 'azure' }),
  ];

  it('should extract unique cloud providers', () => {
    const providers = extractCloudProviders(allocations);
    expect(providers).toHaveLength(2);
    expect(providers).toContain('aws');
    expect(providers).toContain('azure');
  });
});

describe('extractCloudRegions', () => {
  const allocations: Allocation[] = [
    createAllocation({ regionName: 'us-east-1', cloudProvider: 'aws' }),
    createAllocation({ regionName: 'us-east-1', cloudProvider: 'aws' }),
    createAllocation({ regionName: 'eastus', cloudProvider: 'azure' }),
  ];

  it('should extract unique regions with providers', () => {
    const regions = extractCloudRegions(allocations);
    expect(regions).toHaveLength(2);
    expect(regions).toContainEqual({ region: 'us-east-1', provider: 'aws' });
    expect(regions).toContainEqual({ region: 'eastus', provider: 'azure' });
  });
});

describe('extractAvailabilityZones', () => {
  const allocations: Allocation[] = [
    createAllocation({ availabilityZone: 'us-east-1a', regionName: 'us-east-1', cloudProvider: 'aws' }),
    createAllocation({ availabilityZone: 'us-east-1a', regionName: 'us-east-1', cloudProvider: 'aws' }),
    createAllocation({ availabilityZone: 'us-east-1b', regionName: 'us-east-1', cloudProvider: 'aws' }),
  ];

  it('should extract unique availability zones with region and provider', () => {
    const azs = extractAvailabilityZones(allocations);
    expect(azs).toHaveLength(2);
    expect(azs).toContainEqual({ az: 'us-east-1a', region: 'us-east-1', provider: 'aws' });
    expect(azs).toContainEqual({ az: 'us-east-1b', region: 'us-east-1', provider: 'aws' });
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

  it('should include description', () => {
    const tenant = mapAccountToTenant('prod');
    expect(tenant.description).toBe('Cloud account managed by Subnetter');
  });
});

describe('mapCloudProviderToSiteGroup', () => {
  it('should create site group with full provider name', () => {
    const siteGroup = mapCloudProviderToSiteGroup('aws');
    expect(siteGroup.name).toBe('Amazon Web Services');
    expect(siteGroup.slug).toBe('aws');
  });

  it('should handle Azure', () => {
    const siteGroup = mapCloudProviderToSiteGroup('azure');
    expect(siteGroup.name).toBe('Microsoft Azure');
    expect(siteGroup.slug).toBe('azure');
  });

  it('should handle GCP', () => {
    const siteGroup = mapCloudProviderToSiteGroup('gcp');
    expect(siteGroup.name).toBe('Google Cloud Platform');
    expect(siteGroup.slug).toBe('gcp');
  });

  it('should include descriptive description', () => {
    const siteGroup = mapCloudProviderToSiteGroup('aws');
    expect(siteGroup.description).toBe('Cloud infrastructure provider - Amazon Web Services');
  });

  it('should handle unknown providers', () => {
    const siteGroup = mapCloudProviderToSiteGroup('unknown');
    expect(siteGroup.name).toBe('UNKNOWN');
    expect(siteGroup.slug).toBe('unknown');
  });
});

describe('mapBaseCidrToAggregate', () => {
  it('should create aggregate with correct prefix and RIR', () => {
    const aggregate = mapBaseCidrToAggregate('10.0.0.0/8', 1);
    expect(aggregate.prefix).toBe('10.0.0.0/8');
    expect(aggregate.rir).toBe(1);
  });

  it('should include descriptive description', () => {
    const aggregate = mapBaseCidrToAggregate('10.0.0.0/8', 1);
    expect(aggregate.description).toBe('Root IP allocation for cloud infrastructure');
  });
});

describe('mapRegionToSite', () => {
  it('should create site with correct name and slug', () => {
    const site = mapRegionToSite('us-east-1', 'aws');
    expect(site.name).toBe('us-east-1');
    expect(site.slug).toBe('us-east-1');
  });

  it('should include cloud provider and region in description', () => {
    const site = mapRegionToSite('us-east-1', 'aws');
    expect(site.description).toBe('Amazon Web Services region in us-east-1');
  });

  it('should set status to active', () => {
    const site = mapRegionToSite('us-east-1', 'aws');
    expect(site.status).toBe('active');
  });

  it('should set group if siteGroupId is provided', () => {
    const site = mapRegionToSite('us-east-1', 'aws', 5);
    expect(site.group).toBe(5);
  });
});

describe('mapAzToLocation', () => {
  it('should create location with correct name and slug', () => {
    const location = mapAzToLocation('us-east-1a', 'us-east-1', 'aws', 5);
    expect(location.name).toBe('us-east-1a');
    expect(location.slug).toBe('us-east-1a');
  });

  it('should set site ID', () => {
    const location = mapAzToLocation('us-east-1a', 'us-east-1', 'aws', 5);
    expect(location.site).toBe(5);
  });

  it('should set status to active', () => {
    const location = mapAzToLocation('us-east-1a', 'us-east-1', 'aws', 5);
    expect(location.status).toBe('active');
  });

  it('should include provider, AZ, and region in description', () => {
    const location = mapAzToLocation('us-east-1a', 'us-east-1', 'aws', 5);
    expect(location.description).toBe('Amazon Web Services availability zone us-east-1a in us-east-1');
  });
});

describe('mapSubnetTypeToRole', () => {
  it('should create role with correct name and slug', () => {
    const role = mapSubnetTypeToRole('Public');
    expect(role.name).toBe('Public');
    expect(role.slug).toBe('public');
  });

  it('should include descriptive description', () => {
    const role = mapSubnetTypeToRole('Public');
    expect(role.description).toBe('Subnet role for public workloads');
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

  it('should set tenant if provided', () => {
    const prefix = mapAllocationToPrefix(allocation, { tenantId: 5 });
    expect(prefix.tenant).toBe(5);
  });

  it('should set scope_type and scope_id if siteId is provided (NetBox 4.x)', () => {
    const prefix = mapAllocationToPrefix(allocation, { siteId: 3 });
    expect(prefix.scope_type).toBe('dcim.site');
    expect(prefix.scope_id).toBe(3);
  });

  it('should set role if provided', () => {
    const prefix = mapAllocationToPrefix(allocation, { roleId: 7 });
    expect(prefix.role).toBe(7);
  });

  it('should build descriptive description from allocation', () => {
    const prefix = mapAllocationToPrefix(allocation);
    expect(prefix.description).toBe('Public subnet in us-east-1a (Amazon Web Services us-east-1)');
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

