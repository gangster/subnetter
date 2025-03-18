import { HierarchicalAllocator, doCidrsOverlap } from '../../../src/allocator/utils/cidr';
import { AllocationError } from '../../../src/utils/errors';
import { Config } from '../../../src/models/types';

describe('HierarchicalAllocator', () => {
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
  
  test('should initialize with a valid configuration', () => {
    const allocator = new HierarchicalAllocator(validConfig);
    expect(allocator).toBeDefined();
  });
  
  test('should throw an error with an invalid base CIDR', () => {
    const invalidConfig = {
      ...validConfig,
      baseCidr: 'invalid'
    };
    
    expect(() => new HierarchicalAllocator(invalidConfig)).toThrow(AllocationError);
  });
  
  test('should generate allocations for a simple configuration', () => {
    const allocator = new HierarchicalAllocator(validConfig);
    const allocations = allocator.generateAllocations();
    
    // 1 account * 2 regions * 3 AZs * 2 subnet types = 12 allocations
    expect(allocations).toHaveLength(12);
    
    // Check structure of allocations
    const allocation = allocations[0];
    expect(allocation).toHaveProperty('accountName');
    expect(allocation).toHaveProperty('regionName');
    expect(allocation).toHaveProperty('availabilityZone');
    expect(allocation).toHaveProperty('subnetRole');
    expect(allocation).toHaveProperty('subnetCidr');
    expect(allocation).toHaveProperty('usableIps');
  });
  
  test('should generate allocations with correct account names', () => {
    const allocator = new HierarchicalAllocator(validConfig);
    const allocations = allocator.generateAllocations();
    
    // All allocations should have the correct account name
    expect(allocations.every(a => a.accountName === 'test-account')).toBe(true);
  });
  
  test('should generate allocations with correct region names', () => {
    const allocator = new HierarchicalAllocator(validConfig);
    const allocations = allocator.generateAllocations();
    
    // Allocations should be for us-east-1 and us-west-2
    const regions = allocations.map(a => a.regionName);
    expect(regions).toContain('us-east-1');
    expect(regions).toContain('us-west-2');
  });
  
  test('should generate allocations with correct subnet types', () => {
    const allocator = new HierarchicalAllocator(validConfig);
    const allocations = allocator.generateAllocations();
    
    // Should have Public and Private subnets
    const types = allocations.map(a => a.subnetRole);
    expect(types).toContain('Public');
    expect(types).toContain('Private');
  });
  
  test('should generate non-overlapping CIDRs', () => {
    const allocator = new HierarchicalAllocator(validConfig);
    const allocations = allocator.generateAllocations();
    
    // Check all pairs of allocations for overlaps
    for (let i = 0; i < allocations.length; i++) {
      for (let j = i + 1; j < allocations.length; j++) {
        const cidr1 = allocations[i].subnetCidr;
        const cidr2 = allocations[j].subnetCidr;
        
        expect(doCidrsOverlap(cidr1, cidr2)).toBe(false);
      }
    }
  });
  
  test('should generate contiguous allocations within each level', () => {
    // Use a smaller configuration for easier testing
    const simpleConfig: Config = {
      baseCidr: '10.0.0.0/16',
      cloudProviders: ['aws'],
      accounts: [
        {
          name: 'test-account',
          clouds: {
            aws: {
              regions: ['us-east-1']
            }
          }
        }
      ],
      subnetTypes: {
        'Public': 24,
        'Private': 24
      }
    };
    
    const allocator = new HierarchicalAllocator(simpleConfig);
    const allocations = allocator.generateAllocations();
    
    // Only verify the AZs for a simple test
    const azs = allocations.filter(a => a.availabilityZone.startsWith('us-east-1'));
    
    // Group allocations by AZ
    const azGroups: Record<string, string[]> = {};
    azs.forEach(a => {
      if (!azGroups[a.availabilityZone]) {
        azGroups[a.availabilityZone] = [];
      }
      azGroups[a.availabilityZone].push(a.subnetCidr);
    });
    
    // Check contiguity within each AZ
    Object.values(azGroups).forEach(subnets => {
      // Convert to numeric form for comparison
      const numericCidrs = subnets.map(cidr => {
        const [ip, prefix] = cidr.split('/');
        const octets = ip.split('.').map(o => parseInt(o, 10));
        return {
          cidr,
          value: (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3],
          prefix: parseInt(prefix, 10)
        };
      });
      
      // Sort by IP value
      numericCidrs.sort((a, b) => a.value - b.value);
      
      // Check each pair
      for (let i = 1; i < numericCidrs.length; i++) {
        const prev = numericCidrs[i - 1];
        const curr = numericCidrs[i];
        
        // Calculate the size of the previous block
        const prevSize = Math.pow(2, 32 - prev.prefix);
        
        // The current block should start immediately after the previous one
        expect(curr.value).toBe(prev.value + prevSize);
      }
    });
  });
  
  test('should respect prefix lengths', () => {
    const allocator = new HierarchicalAllocator(validConfig);
    const allocations = allocator.generateAllocations();
    
    // Check that subnet CIDRs have the correct prefix lengths
    const publicSubnets = allocations.filter(a => a.subnetRole === 'Public');
    const privateSubnets = allocations.filter(a => a.subnetRole === 'Private');
    
    expect(publicSubnets.every(s => s.subnetCidr.endsWith('/26'))).toBe(true);
    expect(privateSubnets.every(s => s.subnetCidr.endsWith('/27'))).toBe(true);
  });
}); 