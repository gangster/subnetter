import {
  calculateSubnetInfo,
  checkCidrOverlap,
  getCidrRange,
  subdivideCidr,
  calculateSupernet
} from '../src/calculator';
import { CidrError } from '../src/validator';

describe('CIDR Calculator Utilities', () => {
  describe('calculateSubnetInfo', () => {
    test('calculates subnet information correctly for various CIDRs', () => {
      const info1 = calculateSubnetInfo('192.168.1.0/24');
      expect(info1.totalIps).toBe(256);
      expect(info1.usableIps).toBe(254);

      const info2 = calculateSubnetInfo('10.0.0.0/8');
      expect(info2.totalIps).toBe(16777216); // 2^24
      expect(info2.usableIps).toBe(16777214);

      const info3 = calculateSubnetInfo('172.16.0.0/16');
      expect(info3.totalIps).toBe(65536); // 2^16
      expect(info3.usableIps).toBe(65534);
    });

    test('handles edge cases correctly', () => {
      const info1 = calculateSubnetInfo('0.0.0.0/0');
      expect(info1.totalIps).toBe(4294967296); // 2^32
      expect(info1.usableIps).toBe(4294967294);

      const info2 = calculateSubnetInfo('192.168.1.1/32');
      expect(info2.totalIps).toBe(1);
      expect(info2.usableIps).toBe(1); // /32 has 1 usable IP

      const info3 = calculateSubnetInfo('192.168.1.1/31');
      expect(info3.totalIps).toBe(2);
      expect(info3.usableIps).toBe(2); // /31 has 2 usable IPs per RFC 3021
    });

    test('throws error for invalid CIDR notations', () => {
      expect(() => calculateSubnetInfo('invalid-cidr')).toThrow(CidrError);
      expect(() => calculateSubnetInfo('192.168.1.0/33')).toThrow(CidrError);
    });
  });

  describe('checkCidrOverlap', () => {
    test('correctly identifies overlapping CIDRs', () => {
      // Exact match
      expect(checkCidrOverlap('192.168.1.0/24', '192.168.1.0/24')).toBe(true);
      
      // One is a subset of the other
      expect(checkCidrOverlap('192.168.0.0/16', '192.168.1.0/24')).toBe(true);
      expect(checkCidrOverlap('192.168.1.0/24', '192.168.0.0/16')).toBe(true);
      
      // Partial overlap
      expect(checkCidrOverlap('192.168.1.128/25', '192.168.1.0/24')).toBe(true);
    });

    test('correctly identifies non-overlapping CIDRs', () => {
      expect(checkCidrOverlap('192.168.1.0/24', '192.168.2.0/24')).toBe(false);
      expect(checkCidrOverlap('192.168.0.0/24', '192.168.1.0/24')).toBe(false);
      expect(checkCidrOverlap('10.0.0.0/8', '172.16.0.0/12')).toBe(false);
    });

    test('handles non-normalized CIDRs correctly', () => {
      expect(checkCidrOverlap('192.168.1.100/24', '192.168.1.200/24')).toBe(true);
    });

    test('throws error for invalid CIDR notations', () => {
      expect(() => checkCidrOverlap('invalid-cidr', '192.168.1.0/24')).toThrow(CidrError);
      expect(() => checkCidrOverlap('192.168.1.0/24', 'invalid-cidr')).toThrow(CidrError);
    });
  });

  describe('getCidrRange', () => {
    test('returns correct IP range for a CIDR block', () => {
      const range1 = getCidrRange('192.168.1.0/24');
      expect(range1.start.asString).toBe('192.168.1.0');
      expect(range1.end.asString).toBe('192.168.1.255');

      const range2 = getCidrRange('10.0.0.0/8');
      expect(range2.start.asString).toBe('10.0.0.0');
      expect(range2.end.asString).toBe('10.255.255.255');
    });

    test('handles edge cases correctly', () => {
      const range1 = getCidrRange('0.0.0.0/0');
      expect(range1.start.asString).toBe('0.0.0.0');
      expect(range1.end.asString).toBe('255.255.255.255');

      const range2 = getCidrRange('192.168.1.1/32');
      expect(range2.start.asString).toBe('192.168.1.1');
      expect(range2.end.asString).toBe('192.168.1.1');
    });

    test('throws error for invalid CIDR notations', () => {
      expect(() => getCidrRange('invalid-cidr')).toThrow(CidrError);
      expect(() => getCidrRange('192.168.1.0/33')).toThrow(CidrError);
    });
  });

  describe('subdivideCidr', () => {
    test('subdivides a CIDR block correctly', () => {
      const result1 = subdivideCidr('192.168.1.0/24', 1);
      expect(result1.subnets).toHaveLength(2);
      expect(result1.subnets).toContain('192.168.1.0/25');
      expect(result1.subnets).toContain('192.168.1.128/25');
      expect(result1.bitsAdded).toBe(1);

      const result2 = subdivideCidr('192.168.0.0/24', 2);
      expect(result2.subnets).toHaveLength(4);
      expect(result2.subnets).toContain('192.168.0.0/26');
      expect(result2.subnets).toContain('192.168.0.64/26');
      expect(result2.subnets).toContain('192.168.0.128/26');
      expect(result2.subnets).toContain('192.168.0.192/26');
      expect(result2.bitsAdded).toBe(2);
    });

    test('handles edge cases correctly', () => {
      // No subdivision
      const result1 = subdivideCidr('192.168.1.0/24', 0);
      expect(result1.subnets).toHaveLength(1);
      expect(result1.subnets[0]).toBe('192.168.1.0/24');
      expect(result1.bitsAdded).toBe(0);

      // Maximum subdivision
      const result2 = subdivideCidr('192.168.1.0/30', 2);
      expect(result2.subnets).toHaveLength(4);
      expect(result2.subnets).toContain('192.168.1.0/32');
      expect(result2.subnets).toContain('192.168.1.1/32');
      expect(result2.subnets).toContain('192.168.1.2/32');
      expect(result2.subnets).toContain('192.168.1.3/32');
      expect(result2.bitsAdded).toBe(2);
    });

    test('throws error for invalid operations', () => {
      expect(() => subdivideCidr('192.168.1.0/24', -1)).toThrow(CidrError);
      expect(() => subdivideCidr('192.168.1.0/30', 3)).toThrow(CidrError);
      expect(() => subdivideCidr('invalid-cidr', 1)).toThrow(CidrError);
    });
  });

  describe('calculateSupernet', () => {
    test('calculates supernet correctly', () => {
      expect(calculateSupernet('192.168.1.0/24', 1)).toBe('192.168.0.0/23');
      expect(calculateSupernet('192.168.0.0/24', 8)).toBe('192.0.0.0/16');
      expect(calculateSupernet('10.10.0.0/16', 8)).toBe('10.0.0.0/8');
    });

    test('handles edge cases correctly', () => {
      // No change
      expect(calculateSupernet('192.168.1.0/24', 0)).toBe('192.168.1.0/24');
      
      // Maximum supernetting
      expect(calculateSupernet('192.168.1.0/24', 24)).toBe('0.0.0.0/0');
    });

    test('throws error for invalid operations', () => {
      expect(() => calculateSupernet('192.168.1.0/24', 25)).toThrow(CidrError);
      expect(() => calculateSupernet('192.168.1.0/0', 1)).toThrow(CidrError);
      expect(() => calculateSupernet('invalid-cidr', 1)).toThrow(CidrError);
    });

    test('throws error for negative prefixLengthDelta', () => {
      expect(() => calculateSupernet('192.168.1.0/24', -1)).toThrow(CidrError);
    });

    test('handles supernet at different octet boundaries', () => {
      // Going from /25 to /24 (within fourth octet)
      expect(calculateSupernet('192.168.1.128/25', 1)).toBe('192.168.1.0/24');
      
      // Going from /17 to /16 (crossing third octet boundary)
      expect(calculateSupernet('192.168.128.0/17', 1)).toBe('192.168.0.0/16');
      
      // Going from /9 to /8 (crossing second octet boundary)
      expect(calculateSupernet('10.128.0.0/9', 1)).toBe('10.0.0.0/8');
      
      // Going from /4 to /1 (crossing first octet boundary)
      // 192 in binary is 11000000, mask with /1 keeps only first bit = 10000000 = 128
      expect(calculateSupernet('192.0.0.0/4', 3)).toBe('128.0.0.0/1');
      
      // Going to /8 from higher prefix
      expect(calculateSupernet('10.20.30.0/24', 16)).toBe('10.0.0.0/8');
      
      // Mask within first octet
      expect(calculateSupernet('128.0.0.0/2', 1)).toBe('128.0.0.0/1');
      
      // Mask within second octet
      // 168 in binary is 10101000, mask with bits 9-10 gives 10000000 = 128
      expect(calculateSupernet('192.168.0.0/12', 2)).toBe('192.128.0.0/10');
      
      // Mask within third octet
      expect(calculateSupernet('192.168.32.0/20', 2)).toBe('192.168.0.0/18');
      
      // Mask within fourth octet
      expect(calculateSupernet('192.168.1.64/26', 2)).toBe('192.168.1.0/24');
    });
  });
}); 