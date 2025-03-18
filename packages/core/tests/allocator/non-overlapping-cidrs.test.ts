import { CidrAllocator } from '../../src/allocator/core/allocator';
import { doCidrsOverlap } from '../../src/allocator/utils/cidr';
import { Config } from '../../src/models/types';

describe('Non-Overlapping CIDR Tests', () => {
  test('should not create overlapping subnets within the same AZ', () => {
    // Simple test configuration with multiple subnet types
    const config: Config = {
      baseCidr: '10.0.0.0/16',
      prefixLengths: {
        account: 18,
        region: 22,
        az: 24
      },
      cloudProviders: ['aws'],
      accounts: [
        {
          name: 'test-account',
          clouds: {
            aws: {
              regions: ['us-east-1'],
              baseCidr: '10.0.0.0/16'
            }
          }
        }
      ],
      subnetTypes: {
        'Public': 26,
        'Private': 27,
        'Database': 28,
        'Management': 29
      }
    };
    
    // Create allocator and generate allocations
    const allocator = new CidrAllocator(config);
    const allocations = allocator.generateAllocations();
    
    // Group allocations by AZ
    const azGroups: Record<string, string[]> = {};
    allocations.forEach(a => {
      if (!azGroups[a.availabilityZone]) {
        azGroups[a.availabilityZone] = [];
      }
      azGroups[a.availabilityZone].push(a.subnetCidr);
    });
    
    // Verify that within each AZ, no subnets overlap
    Object.entries(azGroups).forEach(([az, cidrs]) => {
      for (let i = 0; i < cidrs.length; i++) {
        for (let j = i + 1; j < cidrs.length; j++) {
          const overlaps = doCidrsOverlap(cidrs[i], cidrs[j]);
          if (overlaps) {
            fail(`Overlapping CIDRs detected in AZ ${az}: ${cidrs[i]} and ${cidrs[j]} overlap`);
          }
        }
      }
    });
    
    // Ensure we have allocations for all subnet types in each AZ
    const azCount = Object.keys(azGroups).length;
    const subnetTypeCount = Object.keys(config.subnetTypes).length;
    expect(allocations.length).toBe(azCount * subnetTypeCount);
  });
  
  test('should allocate distinct subnets even with tight address space', () => {
    // Configuration with a tight address space
    const config: Config = {
      baseCidr: '10.0.0.0/24',
      prefixLengths: {
        account: 25,
        region: 26,
        az: 28
      },
      cloudProviders: ['aws'],
      accounts: [
        {
          name: 'small-account',
          clouds: {
            aws: {
              regions: ['us-east-1']
            }
          }
        }
      ],
      subnetTypes: {
        'Public': 29,
        'Private': 30
      }
    };
    
    // Create allocator and generate allocations
    const allocator = new CidrAllocator(config);
    const allocations = allocator.generateAllocations();
    
    // Check each pair of subnets for overlaps
    for (let i = 0; i < allocations.length; i++) {
      for (let j = i + 1; j < allocations.length; j++) {
        // Only compare subnets within the same AZ
        if (allocations[i].availabilityZone === allocations[j].availabilityZone) {
          const overlaps = doCidrsOverlap(
            allocations[i].subnetCidr, 
            allocations[j].subnetCidr
          );
          expect(overlaps).toBe(false);
        }
      }
    }
  });
  
  test('should subdivide AZ CIDR blocks properly for different subnet types', () => {
    // Simple configuration with multiple subnet types
    const config: Config = {
      baseCidr: '192.168.0.0/16',
      prefixLengths: {
        account: 20,
        region: 24,
        az: 26
      },
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
        'Public': 28,
        'Private': 28,
        'Database': 28,
        'Management': 28
      }
    };
    
    // Create allocator and generate allocations
    const allocator = new CidrAllocator(config);
    const allocations = allocator.generateAllocations();
    
    // Group allocations by AZ
    const azAllocations: Record<string, any[]> = {};
    allocations.forEach(a => {
      if (!azAllocations[a.availabilityZone]) {
        azAllocations[a.availabilityZone] = [];
      }
      azAllocations[a.availabilityZone].push(a);
    });
    
    // Check each AZ's allocations
    Object.entries(azAllocations).forEach(([az, allocsInAZ]) => {
      // Ensure the subnets are properly subdivided (non-overlapping)
      for (let i = 0; i < allocsInAZ.length; i++) {
        for (let j = i + 1; j < allocsInAZ.length; j++) {
          const cidr1 = allocsInAZ[i].subnetCidr;
          const cidr2 = allocsInAZ[j].subnetCidr;
          
          expect(doCidrsOverlap(cidr1, cidr2)).toBe(false);
          
          // If they would overlap, fail with a descriptive message using the AZ name
          if (doCidrsOverlap(cidr1, cidr2)) {
            fail(`Subnets in AZ ${az} overlap: ${cidr1} and ${cidr2}`);
          }
        }
      }
      
      // Ensure each subnet type has a unique CIDR
      const uniqueCidrs = new Set(allocsInAZ.map(a => a.subnetCidr));
      expect(uniqueCidrs.size).toBe(allocsInAZ.length);
    });
  });
}); 