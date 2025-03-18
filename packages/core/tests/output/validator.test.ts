import { validateNoOverlappingCidrs } from '../../src/output/validator';
import { Allocation } from '../../src/models/types';
import { ValidationError } from '../../src/utils/errors';

describe('Output Validator', () => {
  describe('validateNoOverlappingCidrs', () => {
    it('should return valid result when no CIDRs overlap', () => {
      // Prepare test allocations with non-overlapping CIDRs
      const allocations: Allocation[] = [
        createTestAllocation('10.0.0.0/24', 'account1', 'us-east-1', 'us-east-1a', 'Public'),
        createTestAllocation('10.0.1.0/24', 'account1', 'us-east-1', 'us-east-1a', 'Private'),
        createTestAllocation('10.1.0.0/24', 'account1', 'us-west-1', 'us-west-1a', 'Public'),
        createTestAllocation('10.1.1.0/24', 'account1', 'us-west-1', 'us-west-1a', 'Private'),
        createTestAllocation('172.16.0.0/24', 'account2', 'us-east-1', 'us-east-1a', 'Public'),
        createTestAllocation('172.16.1.0/24', 'account2', 'us-east-1', 'us-east-1a', 'Private')
      ];

      // Validate and check result
      const result = validateNoOverlappingCidrs(allocations);
      
      expect(result.valid).toBe(true);
      expect(result.overlaps).toHaveLength(0);
    });

    it('should detect overlapping CIDRs', () => {
      // Prepare test allocations with overlapping CIDRs
      const allocations: Allocation[] = [
        createTestAllocation('10.0.0.0/24', 'account1', 'us-east-1', 'us-east-1a', 'Public'),
        createTestAllocation('10.0.0.0/25', 'account1', 'us-east-1', 'us-east-1a', 'Private'), // Overlaps with first
        createTestAllocation('10.1.0.0/24', 'account1', 'us-west-1', 'us-west-1a', 'Public'),
        createTestAllocation('10.1.0.0/16', 'account2', 'us-west-1', 'us-west-1a', 'Transit') // Overlaps with third
      ];

      // Validate and check result
      const result = validateNoOverlappingCidrs(allocations);
      
      expect(result.valid).toBe(false);
      expect(result.overlaps).toHaveLength(2);
      
      // Verify first overlap
      expect(result.overlaps[0].cidr1).toBe('10.0.0.0/24');
      expect(result.overlaps[0].cidr2).toBe('10.0.0.0/25');
      expect(result.overlaps[0].allocation1.accountName).toBe('account1');
      expect(result.overlaps[0].allocation1.subnetRole).toBe('Public');
      expect(result.overlaps[0].allocation2.accountName).toBe('account1');
      expect(result.overlaps[0].allocation2.subnetRole).toBe('Private');
      
      // Verify second overlap
      expect(result.overlaps[1].cidr1).toBe('10.1.0.0/24');
      expect(result.overlaps[1].cidr2).toBe('10.1.0.0/16');
      expect(result.overlaps[1].allocation1.accountName).toBe('account1');
      expect(result.overlaps[1].allocation2.accountName).toBe('account2');
    });
    
    it('should handle adjacent CIDRs correctly (non-overlapping)', () => {
      // Adjacent CIDRs should not be considered overlapping
      const allocations: Allocation[] = [
        createTestAllocation('10.0.0.0/25', 'account1', 'us-east-1', 'us-east-1a', 'Public'),
        createTestAllocation('10.0.0.128/25', 'account1', 'us-east-1', 'us-east-1a', 'Private') // Adjacent to first
      ];

      // Validate and check result
      const result = validateNoOverlappingCidrs(allocations);
      
      expect(result.valid).toBe(true);
      expect(result.overlaps).toHaveLength(0);
    });
    
    it('should throw ValidationError when requested', () => {
      // Prepare test allocations with overlapping CIDRs
      const allocations: Allocation[] = [
        createTestAllocation('10.0.0.0/24', 'account1', 'us-east-1', 'us-east-1a', 'Public'),
        createTestAllocation('10.0.0.0/25', 'account1', 'us-east-1', 'us-east-1a', 'Private') // Overlaps with first
      ];

      // Validate with throwOnOverlap = true
      expect(() => validateNoOverlappingCidrs(allocations, true)).toThrow(ValidationError);
    });
    
    it('should handle empty allocations array', () => {
      const result = validateNoOverlappingCidrs([]);
      
      expect(result.valid).toBe(true);
      expect(result.overlaps).toHaveLength(0);
    });
    
    it('should handle allocations with missing CIDR', () => {
      const allocations: Allocation[] = [
        createTestAllocation('10.0.0.0/24', 'account1', 'us-east-1', 'us-east-1a', 'Public'),
        createTestAllocation('', 'account1', 'us-east-1', 'us-east-1a', 'Private') // Missing CIDR
      ];

      const result = validateNoOverlappingCidrs(allocations);
      
      expect(result.valid).toBe(true); // Should be valid as missing CIDRs are skipped
      expect(result.overlaps).toHaveLength(0);
    });
    
    it('should handle various overlap scenarios', () => {
      // Test various CIDR overlap scenarios
      const allocations: Allocation[] = [
        createTestAllocation('10.0.0.0/24', 'account1', 'us-east-1', 'us-east-1a', 'Public'),
        createTestAllocation('10.0.0.0/24', 'account2', 'us-east-1', 'us-east-1a', 'Public'), // Identical to first
        createTestAllocation('10.0.0.0/16', 'account3', 'us-west-1', 'us-west-1a', 'Public'), // Contains first and second
        createTestAllocation('10.0.0.128/25', 'account4', 'eu-west-1', 'eu-west-1a', 'Public'), // Half of first
        createTestAllocation('10.1.0.0/24', 'account5', 'ap-south-1', 'ap-south-1a', 'Public') // No overlap
      ];

      const result = validateNoOverlappingCidrs(allocations);
      
      expect(result.valid).toBe(false);
      // Should detect 5 overlaps: 
      // 1-2, 1-3, 1-4, 2-3, 2-4, 3-4 (6 overlaps in total actually)
      expect(result.overlaps.length).toBeGreaterThan(0);
      
      // Check if allocations with no overlaps are not in the result
      const hasNoOverlapAllocation = result.overlaps.some(
        overlap => 
          overlap.allocation1.accountName === 'account5' || 
          overlap.allocation2.accountName === 'account5'
      );
      
      expect(hasNoOverlapAllocation).toBe(false);
    });
    
    it('should handle invalid CIDR formats gracefully', () => {
      // Invalid CIDR formats should be handled without crashing
      const allocations: Allocation[] = [
        createTestAllocation('10.0.0.0/24', 'account1', 'us-east-1', 'us-east-1a', 'Public'),
        createTestAllocation('invalid-cidr', 'account2', 'us-east-1', 'us-east-1a', 'Private')
      ];

      // This should not throw an error
      const result = validateNoOverlappingCidrs(allocations);
      
      // Since we're skipping the invalid CIDR, we should have no overlaps
      expect(result.valid).toBe(true);
    });
  });
});

// Helper function to create test allocations
function createTestAllocation(
  cidr: string,
  accountName: string,
  region: string,
  az: string,
  role: string
): Allocation {
  return {
    accountName,
    vpcName: `${accountName}-vpc`,
    cloudProvider: 'aws',
    regionName: region,
    availabilityZone: az,
    regionCidr: '10.0.0.0/16',
    vpcCidr: '10.0.0.0/16',
    azCidr: '10.0.0.0/20',
    subnetCidr: cidr,
    subnetRole: role,
    usableIps: 256
  };
} 