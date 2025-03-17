import {
  findNextAvailableCidr,
  allocateMultipleCidrs,
  isCidrAvailable,
  mergeCidrs
} from '../src/subnet';
import { CidrError } from '../src/validator';

describe('Subnet Allocation Utilities', () => {
  describe('findNextAvailableCidr', () => {
    test('finds next available CIDR within parent', () => {
      // No allocated CIDRs yet, should return first subnet
      expect(findNextAvailableCidr('192.168.1.0/24', 25, [])).toBe('192.168.1.0/25');
      
      // With one allocated, should return second subnet
      expect(findNextAvailableCidr('192.168.1.0/24', 25, ['192.168.1.0/25'])).toBe('192.168.1.128/25');
      
      // Multiple allocated, should find next available
      expect(findNextAvailableCidr('10.0.0.0/16', 18, [
        '10.0.0.0/18',
        '10.0.64.0/18'
      ])).toBe('10.0.128.0/18');
    });

    test('returns same CIDR if prefix matches and not allocated', () => {
      expect(findNextAvailableCidr('192.168.1.0/24', 24, [])).toBe('192.168.1.0/24');
    });

    test('returns null when no space is available', () => {
      // All subnets already allocated
      expect(findNextAvailableCidr('192.168.1.0/24', 25, [
        '192.168.1.0/25',
        '192.168.1.128/25'
      ])).toBeNull();
      
      // Parent CIDR already allocated
      expect(findNextAvailableCidr('192.168.1.0/24', 24, ['192.168.1.0/24'])).toBeNull();
    });

    test('handles non-normalized CIDRs correctly', () => {
      expect(findNextAvailableCidr('192.168.1.15/24', 25, [])).toBe('192.168.1.0/25');
    });

    test('throws error for invalid operations', () => {
      // Invalid CIDR
      expect(() => findNextAvailableCidr('invalid-cidr', 24, [])).toThrow(CidrError);
      
      // Subnet prefix smaller than parent prefix
      expect(() => findNextAvailableCidr('192.168.1.0/24', 16, [])).toThrow(CidrError);
      
      // Prefix too large
      expect(() => findNextAvailableCidr('192.168.1.0/24', 33, [])).toThrow(CidrError);
    });
  });

  describe('allocateMultipleCidrs', () => {
    test('allocates multiple CIDRs correctly', () => {
      // Allocate 4 /26 subnets from a /24
      const cidrs = allocateMultipleCidrs('192.168.1.0/24', 26, 4);
      expect(cidrs).toHaveLength(4);
      expect(cidrs).toContain('192.168.1.0/26');
      expect(cidrs).toContain('192.168.1.64/26');
      expect(cidrs).toContain('192.168.1.128/26');
      expect(cidrs).toContain('192.168.1.192/26');
      
      // Allocate with some already allocated
      const moreCidrs = allocateMultipleCidrs('192.168.2.0/24', 26, 2, ['192.168.2.0/26']);
      expect(moreCidrs).toHaveLength(2);
      expect(moreCidrs).toContain('192.168.2.64/26');
      expect(moreCidrs).toContain('192.168.2.128/26');
    });

    test('returns fewer CIDRs when not enough space', () => {
      // Try to allocate 4 subnets but already have 3, should only get 1
      const cidrs = allocateMultipleCidrs('192.168.1.0/24', 26, 4, [
        '192.168.1.0/26',
        '192.168.1.64/26',
        '192.168.1.128/26'
      ]);
      expect(cidrs).toHaveLength(1);
      expect(cidrs).toContain('192.168.1.192/26');
    });

    test('returns empty array when no space is available', () => {
      // Try to allocate when all space is already allocated
      const cidrs = allocateMultipleCidrs('192.168.1.0/24', 24, 1, ['192.168.1.0/24']);
      expect(cidrs).toHaveLength(0);
    });

    test('returns empty array for count <= 0', () => {
      expect(allocateMultipleCidrs('192.168.1.0/24', 26, 0)).toHaveLength(0);
      expect(allocateMultipleCidrs('192.168.1.0/24', 26, -1)).toHaveLength(0);
    });

    test('throws error for invalid operations', () => {
      expect(() => allocateMultipleCidrs('invalid-cidr', 24, 1)).toThrow(CidrError);
      expect(() => allocateMultipleCidrs('192.168.1.0/24', 16, 1)).toThrow(CidrError);
    });
  });

  describe('isCidrAvailable', () => {
    test('correctly identifies available CIDRs', () => {
      // CIDR doesn't overlap with any allocated
      expect(isCidrAvailable('192.168.2.0/24', ['192.168.1.0/24'])).toBe(true);
      expect(isCidrAvailable('10.0.0.0/8', ['172.16.0.0/12', '192.168.0.0/16'])).toBe(true);
    });

    test('correctly identifies unavailable CIDRs', () => {
      // Exact match
      expect(isCidrAvailable('192.168.1.0/24', ['192.168.1.0/24'])).toBe(false);
      
      // CIDR overlaps with allocated
      expect(isCidrAvailable('192.168.1.0/24', ['192.168.0.0/16'])).toBe(false);
      expect(isCidrAvailable('192.168.1.128/25', ['192.168.1.0/24'])).toBe(false);
    });

    test('handles non-normalized CIDRs correctly', () => {
      expect(isCidrAvailable('192.168.1.15/24', ['192.168.2.0/24'])).toBe(true);
      expect(isCidrAvailable('192.168.1.15/24', ['192.168.1.0/24'])).toBe(false);
    });

    test('throws error for invalid CIDRs', () => {
      expect(() => isCidrAvailable('invalid-cidr', [])).toThrow(CidrError);
    });
  });

  describe('mergeCidrs', () => {
    test('returns original array for now (placeholder implementation)', () => {
      const cidrs = ['192.168.1.0/24', '192.168.2.0/24'];
      expect(mergeCidrs(cidrs)).toEqual(cidrs);
    });
  });
}); 