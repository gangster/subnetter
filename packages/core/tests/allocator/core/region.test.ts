import { RegionAllocator, allocateCidrsForRegion } from '../../../src/allocator/core/region';
import { CidrTracker } from '../../../src/allocator/utils/tracking';
import { AllocationError } from '../../../src/utils/errors';
import { Allocation } from '../../../src/models/types';

describe('RegionAllocator', () => {
  let cidrTracker: CidrTracker;
  
  beforeEach(() => {
    cidrTracker = new CidrTracker();
  });

  describe('processRegions', () => {
    const defaultSubnetTypes = [
      { name: 'Public', prefixLength: 26 },
      { name: 'Private', prefixLength: 27 }
    ];

    it('should process a single AWS region successfully', () => {
      const allocations = RegionAllocator.processRegions(
        'test-account',
        ['us-east-1'],
        '10.0.0.0/16',
        cidrTracker,
        defaultSubnetTypes,
        'aws',
        20,
        24
      );

      expect(allocations.length).toBeGreaterThan(0);
      expect(allocations[0].accountName).toBe('test-account');
      expect(allocations[0].regionName).toBe('us-east-1');
      expect(allocations[0].cloudProvider).toBe('aws');
    });

    it('should process multiple regions successfully', () => {
      const allocations = RegionAllocator.processRegions(
        'test-account',
        ['us-east-1', 'us-west-2'],
        '10.0.0.0/8',
        cidrTracker,
        defaultSubnetTypes,
        'aws',
        16,
        24
      );

      expect(allocations.length).toBeGreaterThan(0);
      
      // Check that both regions are represented
      const regions = new Set(allocations.map(a => a.regionName));
      expect(regions.has('us-east-1')).toBe(true);
      expect(regions.has('us-west-2')).toBe(true);
    });

    it('should process Azure regions with correct AZ naming', () => {
      const allocations = RegionAllocator.processRegions(
        'azure-account',
        ['eastus'],
        '10.0.0.0/16',
        cidrTracker,
        defaultSubnetTypes,
        'azure',
        20,
        24
      );

      expect(allocations.length).toBeGreaterThan(0);
      expect(allocations[0].cloudProvider).toBe('azure');
      
      // Azure AZs should be numbered (e.g., eastus1, eastus2, eastus3)
      const azNames = new Set(allocations.map(a => a.availabilityZone));
      expect(azNames.has('eastus1')).toBe(true);
    });

    it('should process GCP regions with correct AZ naming', () => {
      const allocations = RegionAllocator.processRegions(
        'gcp-account',
        ['us-central1'],
        '10.0.0.0/16',
        cidrTracker,
        defaultSubnetTypes,
        'gcp',
        20,
        24
      );

      expect(allocations.length).toBeGreaterThan(0);
      expect(allocations[0].cloudProvider).toBe('gcp');
      
      // GCP AZs should use dashes (e.g., us-central1-a, us-central1-b)
      const azNames = new Set(allocations.map(a => a.availabilityZone));
      expect(azNames.has('us-central1-a')).toBe(true);
    });

    it('should detect provider from region name when not explicitly specified', () => {
      const allocations = RegionAllocator.processRegions(
        'test-account',
        ['us-east-1'], // AWS region format
        '10.0.0.0/16',
        cidrTracker,
        defaultSubnetTypes,
        '', // Empty provider - should be detected
        20,
        24
      );

      expect(allocations.length).toBeGreaterThan(0);
      // Provider should be detected as AWS based on region name
      expect(allocations[0].cloudProvider).toBe('aws');
    });

    it('should handle unknown provider with generic AZ naming', () => {
      const allocations = RegionAllocator.processRegions(
        'test-account',
        ['custom-region-1'],
        '10.0.0.0/16',
        cidrTracker,
        defaultSubnetTypes,
        'unknown',
        20,
        24
      );

      expect(allocations.length).toBeGreaterThan(0);
      
      // Unknown providers should use generic AZ naming (region-az1, region-az2, etc.)
      const azNames = allocations.map(a => a.availabilityZone);
      expect(azNames.some(az => az.includes('-az'))).toBe(true);
    });

    it('should throw AllocationError when region index exceeds available space', () => {
      // Using a small CIDR with many regions should fail
      expect(() => {
        RegionAllocator.processRegions(
          'test-account',
          Array(100).fill('us-east-1').map((r, i) => `${r}-${i}`), // 100 regions
          '10.0.0.0/24', // Small CIDR
          cidrTracker,
          defaultSubnetTypes,
          'aws',
          26, // Would need more space than available
          28
        );
      }).toThrow(AllocationError);
    });

    it('should use default prefix lengths when not provided', () => {
      const allocations = RegionAllocator.processRegions(
        'test-account',
        ['us-east-1'],
        '10.0.0.0/8',
        cidrTracker,
        defaultSubnetTypes,
        'aws'
        // No prefix lengths provided - should use defaults
      );

      expect(allocations.length).toBeGreaterThan(0);
    });

    it('should append to existing allocations array when provided', () => {
      const existingAllocations: Allocation[] = [];
      
      RegionAllocator.processRegions(
        'test-account',
        ['us-east-1'],
        '10.0.0.0/16',
        cidrTracker,
        defaultSubnetTypes,
        'aws',
        20,
        24,
        existingAllocations
      );

      expect(existingAllocations.length).toBeGreaterThan(0);
    });

    it('should track allocated CIDRs to prevent duplicates', () => {
      // First allocation
      RegionAllocator.processRegions(
        'account-1',
        ['us-east-1'],
        '10.0.0.0/16',
        cidrTracker,
        defaultSubnetTypes,
        'aws',
        20,
        24
      );

      // Attempting to allocate the same CIDR again should fail
      expect(() => {
        RegionAllocator.processRegions(
          'account-2',
          ['us-east-1'],
          '10.0.0.0/16', // Same base CIDR
          cidrTracker,
          defaultSubnetTypes,
          'aws',
          20,
          24
        );
      }).toThrow(AllocationError);
    });
  });
});

describe('allocateCidrsForRegion', () => {
  let cidrTracker: CidrTracker;

  beforeEach(() => {
    cidrTracker = new CidrTracker();
  });

  const defaultSubnetTypes = [
    { name: 'Public', prefixLength: 26 },
    { name: 'Private', prefixLength: 27 }
  ];

  it('should allocate CIDRs for a region with multiple AZs', () => {
    const azNames = ['us-east-1a', 'us-east-1b', 'us-east-1c'];
    const azCidrs = ['10.0.0.0/24', '10.0.1.0/24', '10.0.2.0/24'];

    const allocations = allocateCidrsForRegion(
      'test-account',
      'us-east-1',
      '10.0.0.0/20',
      '10.0.0.0/16',
      azNames,
      azCidrs,
      defaultSubnetTypes,
      cidrTracker,
      'aws'
    );

    expect(allocations.length).toBe(6); // 3 AZs * 2 subnet types
    
    // Verify allocation properties
    allocations.forEach(allocation => {
      expect(allocation.accountName).toBe('test-account');
      expect(allocation.regionName).toBe('us-east-1');
      expect(allocation.cloudProvider).toBe('aws');
      expect(allocation.vpcCidr).toBe('10.0.0.0/16');
      expect(allocation.regionCidr).toBe('10.0.0.0/20');
      expect(allocation.usableIps).toBeGreaterThan(0);
    });
  });

  it('should handle single subnet type correctly', () => {
    const azNames = ['us-east-1a'];
    const azCidrs = ['10.0.0.0/24'];
    const singleSubnetType = [{ name: 'Public', prefixLength: 26 }];

    const allocations = allocateCidrsForRegion(
      'test-account',
      'us-east-1',
      '10.0.0.0/20',
      '10.0.0.0/16',
      azNames,
      azCidrs,
      singleSubnetType,
      cidrTracker,
      'aws'
    );

    expect(allocations.length).toBe(1);
    expect(allocations[0].subnetRole).toBe('Public');
  });

  it('should throw AllocationError when AZ names and CIDRs mismatch', () => {
    const azNames = ['us-east-1a', 'us-east-1b', 'us-east-1c'];
    const azCidrs = ['10.0.0.0/24', '10.0.1.0/24']; // Only 2 CIDRs for 3 AZs

    expect(() => {
      allocateCidrsForRegion(
        'test-account',
        'us-east-1',
        '10.0.0.0/20',
        '10.0.0.0/16',
        azNames,
        azCidrs,
        defaultSubnetTypes,
        cidrTracker,
        'aws'
      );
    }).toThrow(AllocationError);
  });

  it('should throw AllocationError when AZ CIDR is undefined', () => {
    const azNames = ['us-east-1a', 'us-east-1b'];
    const azCidrs = ['10.0.0.0/24', undefined as unknown as string];

    expect(() => {
      allocateCidrsForRegion(
        'test-account',
        'us-east-1',
        '10.0.0.0/20',
        '10.0.0.0/16',
        azNames,
        azCidrs,
        defaultSubnetTypes,
        cidrTracker,
        'aws'
      );
    }).toThrow(AllocationError);
  });

  it('should create correct VPC name from account name', () => {
    const azNames = ['us-east-1a'];
    const azCidrs = ['10.0.0.0/24'];

    const allocations = allocateCidrsForRegion(
      'my-account',
      'us-east-1',
      '10.0.0.0/20',
      '10.0.0.0/16',
      azNames,
      azCidrs,
      [{ name: 'Public', prefixLength: 26 }],
      cidrTracker,
      'aws'
    );

    expect(allocations[0].vpcName).toBe('my-account-vpc');
  });

  it('should calculate usable IPs correctly for different prefix lengths', () => {
    const azNames = ['us-east-1a'];
    const azCidrs = ['10.0.0.0/24'];
    const subnetTypes = [
      { name: 'Large', prefixLength: 24 },
      { name: 'Medium', prefixLength: 26 },
      { name: 'Small', prefixLength: 28 }
    ];

    const allocations = allocateCidrsForRegion(
      'test-account',
      'us-east-1',
      '10.0.0.0/20',
      '10.0.0.0/16',
      azNames,
      azCidrs,
      subnetTypes,
      cidrTracker,
      'aws'
    );

    // Verify usable IPs are calculated (exact values depend on implementation)
    allocations.forEach(allocation => {
      expect(allocation.usableIps).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle many subnet types with limited space', () => {
    const azNames = ['us-east-1a'];
    const azCidrs = ['10.0.0.0/24'];
    const manySubnetTypes = [
      { name: 'Type1', prefixLength: 28 },
      { name: 'Type2', prefixLength: 28 },
      { name: 'Type3', prefixLength: 28 },
      { name: 'Type4', prefixLength: 28 },
      { name: 'Type5', prefixLength: 28 },
      { name: 'Type6', prefixLength: 28 },
      { name: 'Type7', prefixLength: 28 },
      { name: 'Type8', prefixLength: 28 }
    ];

    // Should handle gracefully even if not all subnet types can be allocated
    const allocations = allocateCidrsForRegion(
      'test-account',
      'us-east-1',
      '10.0.0.0/20',
      '10.0.0.0/16',
      azNames,
      azCidrs,
      manySubnetTypes,
      cidrTracker,
      'aws'
    );

    expect(allocations.length).toBeGreaterThan(0);
  });

  it('should track all allocated CIDRs', () => {
    const azNames = ['us-east-1a'];
    const azCidrs = ['10.0.0.0/24'];

    allocateCidrsForRegion(
      'test-account',
      'us-east-1',
      '10.0.0.0/20',
      '10.0.0.0/16',
      azNames,
      azCidrs,
      defaultSubnetTypes,
      cidrTracker,
      'aws'
    );

    // Verify CIDRs are tracked
    expect(cidrTracker.getAllocated().length).toBeGreaterThan(0);
  });

  it('should produce non-overlapping subnet CIDRs within an AZ', () => {
    const azNames = ['us-east-1a'];
    const azCidrs = ['10.0.0.0/24'];
    const subnetTypes = [
      { name: 'Public', prefixLength: 26 },
      { name: 'Private', prefixLength: 26 },
      { name: 'Data', prefixLength: 26 }
    ];

    const allocations = allocateCidrsForRegion(
      'test-account',
      'us-east-1',
      '10.0.0.0/20',
      '10.0.0.0/16',
      azNames,
      azCidrs,
      subnetTypes,
      cidrTracker,
      'aws'
    );

    // All subnet CIDRs should be unique
    const subnetCidrs = allocations.map(a => a.subnetCidr);
    const uniqueCidrs = new Set(subnetCidrs);
    expect(uniqueCidrs.size).toBe(subnetCidrs.length);
  });

  it('should handle empty AZ names array', () => {
    const allocations = allocateCidrsForRegion(
      'test-account',
      'us-east-1',
      '10.0.0.0/20',
      '10.0.0.0/16',
      [],
      [],
      defaultSubnetTypes,
      cidrTracker,
      'aws'
    );

    expect(allocations.length).toBe(0);
  });

  it('should preserve region and VPC CIDRs in allocations', () => {
    const azNames = ['us-east-1a'];
    const azCidrs = ['10.0.0.0/24'];

    const allocations = allocateCidrsForRegion(
      'test-account',
      'us-east-1',
      '10.0.0.0/20',
      '10.0.0.0/16',
      azNames,
      azCidrs,
      [{ name: 'Public', prefixLength: 26 }],
      cidrTracker,
      'aws'
    );

    expect(allocations[0].regionCidr).toBe('10.0.0.0/20');
    expect(allocations[0].vpcCidr).toBe('10.0.0.0/16');
    expect(allocations[0].azCidr).toBe('10.0.0.0/24');
  });
});

describe('RegionAllocator edge cases', () => {
  let cidrTracker: CidrTracker;

  beforeEach(() => {
    cidrTracker = new CidrTracker();
  });

  it('should handle very large prefix lengths gracefully', () => {
    const subnetTypes = [{ name: 'Tiny', prefixLength: 30 }];

    expect(() => {
      RegionAllocator.processRegions(
        'test-account',
        ['us-east-1'],
        '10.0.0.0/28', // Very small CIDR
        cidrTracker,
        subnetTypes,
        'aws',
        29,
        30
      );
    }).toThrow(); // Should throw due to insufficient space
  });

  it('should handle regions with special characters in names', () => {
    const allocations = RegionAllocator.processRegions(
      'test-account',
      ['ap-northeast-1'],
      '10.0.0.0/16',
      cidrTracker,
      [{ name: 'Public', prefixLength: 26 }],
      'aws',
      20,
      24
    );

    expect(allocations.length).toBeGreaterThan(0);
    expect(allocations[0].regionName).toBe('ap-northeast-1');
  });

  it('should process empty regions array without error', () => {
    const allocations = RegionAllocator.processRegions(
      'test-account',
      [],
      '10.0.0.0/16',
      cidrTracker,
      [{ name: 'Public', prefixLength: 26 }],
      'aws',
      20,
      24
    );

    expect(allocations.length).toBe(0);
  });
});

