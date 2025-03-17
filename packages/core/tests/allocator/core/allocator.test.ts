import { 
  CidrAllocator, 
  AllocationError,
  Config
} from '../../../src/index';

describe('CidrAllocator', () => {
  let validConfig: Config;
  
  beforeEach(() => {
    // Set up a valid configuration for testing
    validConfig = {
      baseCidr: '10.0.0.0/8',
      prefixLengths: {
        account: 16,
        region: 20,
        az: 24
      },
      cloudProviders: ['aws'],
      accounts: [
        {
          name: 'test-account',
          clouds: {
            aws: {
              regions: ['us-east-1', 'us-west-2']
            }
          }
        }
      ],
      subnetTypes: {
        'Public': 26,
        'Private': 27
      }
    };
  });

  describe('generateAllocations', () => {
    test('should generate correct number of allocations', () => {
      const allocator = new CidrAllocator(validConfig);
      const allocations = allocator.generateAllocations();
      
      // 1 account * 2 regions * 3 AZs * 2 subnet types = 12 allocations
      expect(allocations).toHaveLength(12);
      
      // Check structure of the first allocation
      const allocation = allocations[0];
      expect(allocation).toHaveProperty('accountName');
      expect(allocation).toHaveProperty('regionName');
      expect(allocation).toHaveProperty('availabilityZone');
      expect(allocation).toHaveProperty('subnetRole');
      expect(allocation).toHaveProperty('subnetCidr');
      expect(allocation).toHaveProperty('usableIps');
    });

    test('should use account-specific CIDR when provided', () => {
      const configWithAccountCidr = {
        ...validConfig,
        accounts: [
          {
            name: 'test-account',
            clouds: {
              aws: {
                regions: ['us-east-1'],
                baseCidr: '172.16.0.0/12'
              }
            }
          }
        ]
      };
      
      const allocator = new CidrAllocator(configWithAccountCidr);
      const allocations = allocator.generateAllocations();
      
      // The baseCidr should be used for the account
      expect(allocations.some(a => a.subnetCidr.startsWith('172.16'))).toBe(true);
    });

    test('should correctly use prefix lengths from config', () => {
      const allocator = new CidrAllocator(validConfig);
      const allocations = allocator.generateAllocations();
      
      // Public subnets should have prefix length 26
      const publicSubnets = allocations.filter(a => a.subnetRole === 'Public');
      expect(publicSubnets.every(s => s.subnetCidr.endsWith('/26'))).toBe(true);
      
      // Private subnets should have prefix length 27
      const privateSubnets = allocations.filter(a => a.subnetRole === 'Private');
      expect(privateSubnets.every(s => s.subnetCidr.endsWith('/27'))).toBe(true);
    });

    test('should throw AllocationError when not enough space for regions', () => {
      // Setting a very small CIDR that cannot accommodate the regions
      const insufficientConfig = {
        ...validConfig,
        baseCidr: '10.0.0.0/30'
      };
      
      const allocator = new CidrAllocator(insufficientConfig);
      expect(() => allocator.generateAllocations()).toThrow(AllocationError);
    });
  });

  describe('regeneration', () => {
    test('should generate consistent allocations', () => {
      const allocator = new CidrAllocator(validConfig);
      
      // Generate allocations
      const allocations1 = allocator.generateAllocations();
      expect(allocations1.length).toBeGreaterThan(0);
      
      // Generate again
      const allocations2 = allocator.generateAllocations();
      
      // Should have the same number of allocations
      expect(allocations2.length).toBe(allocations1.length);
      
      // But they should be different objects
      expect(allocations2).not.toBe(allocations1);
    });
  });
}); 