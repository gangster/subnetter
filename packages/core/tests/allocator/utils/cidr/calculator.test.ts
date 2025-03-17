import {
  isValidIpv4Cidr,
  calculateUsableIps,
  doCidrsOverlap,
  subdivideIpv4Cidr,
  calculateRequiredPrefixLength,
  calculateOptimalPrefixLength
} from '../../../../src/allocator/utils/cidr';
import { AllocationError } from '../../../../src/utils/errors';

describe('CIDR Calculator', () => {
  describe('isValidIpv4Cidr', () => {
    test('should return true for valid IPv4 CIDR', () => {
      expect(isValidIpv4Cidr('10.0.0.0/8')).toBe(true);
      expect(isValidIpv4Cidr('192.168.1.0/24')).toBe(true);
      expect(isValidIpv4Cidr('172.16.0.0/16')).toBe(true);
    });

    test('should return false for invalid IPv4 CIDR', () => {
      expect(isValidIpv4Cidr('invalid')).toBe(false);
      expect(isValidIpv4Cidr('256.0.0.0/8')).toBe(false);
      expect(isValidIpv4Cidr('10.0.0.0/33')).toBe(false);
      expect(isValidIpv4Cidr('10.0.0/8')).toBe(false);
    });
  });

  describe('calculateUsableIps', () => {
    test('should calculate correct number of usable IPs for standard prefixes', () => {
      expect(calculateUsableIps('10.0.0.0/24')).toBe(254); // 256 - 2 (network + broadcast)
      expect(calculateUsableIps('10.0.0.0/28')).toBe(14); // 16 - 2 (network + broadcast)
      expect(calculateUsableIps('10.0.0.0/16')).toBe(65534); // 65536 - 2 (network + broadcast)
    });

    test('should handle /31 and /32 special cases', () => {
      expect(calculateUsableIps('10.0.0.0/31')).toBe(2); // Point-to-point link (RFC 3021)
      expect(calculateUsableIps('10.0.0.0/32')).toBe(1); // Single host
    });

    test('should throw AllocationError for invalid CIDR', () => {
      expect(() => calculateUsableIps('invalid')).toThrow(AllocationError);
      expect(() => calculateUsableIps('256.0.0.0/8')).toThrow(AllocationError);
      expect(() => calculateUsableIps('10.0.0.0/33')).toThrow(AllocationError);
    });
  });

  describe('doCidrsOverlap', () => {
    test('should detect overlapping CIDRs', () => {
      expect(doCidrsOverlap('10.0.0.0/8', '10.0.0.0/16')).toBe(true);
      expect(doCidrsOverlap('10.0.0.0/24', '10.0.0.128/25')).toBe(true);
      expect(doCidrsOverlap('192.168.1.0/24', '192.168.1.128/25')).toBe(true);
    });

    test('should detect non-overlapping CIDRs', () => {
      expect(doCidrsOverlap('10.0.0.0/8', '11.0.0.0/8')).toBe(false);
      expect(doCidrsOverlap('192.168.1.0/24', '192.168.2.0/24')).toBe(false);
      expect(doCidrsOverlap('10.0.0.0/25', '10.0.0.128/25')).toBe(false);
    });

    test('should throw AllocationError for invalid CIDR', () => {
      expect(() => doCidrsOverlap('invalid', '10.0.0.0/8')).toThrow(AllocationError);
      expect(() => doCidrsOverlap('10.0.0.0/8', 'invalid')).toThrow(AllocationError);
    });
  });

  describe('subdivideIpv4Cidr', () => {
    test('should subdivide a CIDR into the correct number of subnets', () => {
      // Subdivide /24 into /26 (4 subnets)
      const subnets = subdivideIpv4Cidr('192.168.1.0/24', 26);
      expect(subnets).toHaveLength(4);
      expect(subnets).toEqual([
        '192.168.1.0/26',
        '192.168.1.64/26',
        '192.168.1.128/26',
        '192.168.1.192/26'
      ]);
    });

    test('should return original CIDR if new prefix equals current prefix', () => {
      const subnets = subdivideIpv4Cidr('192.168.1.0/24', 24);
      expect(subnets).toHaveLength(1);
      expect(subnets[0]).toBe('192.168.1.0/24');
    });

    test('should throw AllocationError if new prefix is less than current prefix', () => {
      expect(() => subdivideIpv4Cidr('192.168.1.0/24', 16)).toThrow(AllocationError);
    });

    test('should throw AllocationError if new prefix exceeds 32', () => {
      expect(() => subdivideIpv4Cidr('192.168.1.0/24', 33)).toThrow(AllocationError);
    });

    test('should throw AllocationError for invalid CIDR', () => {
      expect(() => subdivideIpv4Cidr('invalid', 26)).toThrow(AllocationError);
    });
  });

  describe('calculateRequiredPrefixLength', () => {
    test('should calculate correct prefix length for given number of subnets', () => {
      expect(calculateRequiredPrefixLength(1)).toBe(0); // 2^0 = 1 subnet
      expect(calculateRequiredPrefixLength(2)).toBe(1); // 2^1 = 2 subnets
      expect(calculateRequiredPrefixLength(3)).toBe(2); // 2^2 = 4 subnets (next power of 2)
      expect(calculateRequiredPrefixLength(4)).toBe(2); // 2^2 = 4 subnets
      expect(calculateRequiredPrefixLength(5)).toBe(3); // 2^3 = 8 subnets (next power of 2)
      expect(calculateRequiredPrefixLength(8)).toBe(3); // 2^3 = 8 subnets
    });

    test('should throw AllocationError for invalid count', () => {
      expect(() => calculateRequiredPrefixLength(0)).toThrow(AllocationError);
      expect(() => calculateRequiredPrefixLength(-1)).toThrow(AllocationError);
    });
  });

  describe('calculateOptimalPrefixLength', () => {
    test('should calculate optimal prefix length for given CIDR and count', () => {
      // For a /16 base CIDR, need 4 subnets = +2 bits = /18
      expect(calculateOptimalPrefixLength('10.0.0.0/16', 4)).toBe(18);
      
      // For a /24 base CIDR, need 3 AZs = +2 bits = /26
      expect(calculateOptimalPrefixLength('192.168.1.0/24', 3)).toBe(26);
      
      // For a /8 base CIDR, need 16 subnets = +4 bits = /12
      expect(calculateOptimalPrefixLength('10.0.0.0/8', 16)).toBe(12);
    });

    test('should throw AllocationError if required prefix exceeds 32', () => {
      // For a /30 base CIDR, can't fit 8 subnets (would need /33 which is invalid)
      expect(() => calculateOptimalPrefixLength('192.168.1.0/30', 8)).toThrow(AllocationError);
    });

    test('should throw AllocationError for invalid CIDR', () => {
      expect(() => calculateOptimalPrefixLength('invalid', 4)).toThrow(AllocationError);
    });
  });
}); 