import { parseCidr, normalizeCidr } from '../src/parser';
import { CidrError } from '../src/validator';

describe('CIDR Parser Utilities', () => {
  describe('parseCidr', () => {
    test('parses valid IPv4 CIDR notations correctly', () => {
      const result = parseCidr('192.168.1.0/24');
      expect(result.cidr).toBe('192.168.1.0/24');
      expect(result.ip).toBe('192.168.1.0');
      expect(result.prefix).toBe(24);
      expect(result.version).toBe(4);
    });

    test('parses edge case CIDR notations', () => {
      const result1 = parseCidr('0.0.0.0/0');
      expect(result1.cidr).toBe('0.0.0.0/0');
      expect(result1.ip).toBe('0.0.0.0');
      expect(result1.prefix).toBe(0);
      expect(result1.version).toBe(4);

      const result2 = parseCidr('255.255.255.255/32');
      expect(result2.cidr).toBe('255.255.255.255/32');
      expect(result2.ip).toBe('255.255.255.255');
      expect(result2.prefix).toBe(32);
      expect(result2.version).toBe(4);
    });

    test('throws error for invalid CIDR notations', () => {
      expect(() => parseCidr('not-a-cidr')).toThrow(CidrError);
      expect(() => parseCidr('192.168.1.0')).toThrow(CidrError);
      expect(() => parseCidr('192.168.1.0/33')).toThrow(CidrError);
      expect(() => parseCidr('192.168.1.256/24')).toThrow(CidrError);
    });
  });

  describe('normalizeCidr', () => {
    test('normalizes CIDR to network address', () => {
      expect(normalizeCidr('192.168.1.15/24')).toBe('192.168.1.0/24');
      expect(normalizeCidr('10.10.10.10/8')).toBe('10.0.0.0/8');
      expect(normalizeCidr('172.16.100.200/16')).toBe('172.16.0.0/16');
    });

    test('leaves already normalized CIDRs unchanged', () => {
      expect(normalizeCidr('192.168.1.0/24')).toBe('192.168.1.0/24');
      expect(normalizeCidr('10.0.0.0/8')).toBe('10.0.0.0/8');
      expect(normalizeCidr('172.16.0.0/16')).toBe('172.16.0.0/16');
    });

    test('handles edge cases', () => {
      expect(normalizeCidr('0.0.0.0/0')).toBe('0.0.0.0/0');
      expect(normalizeCidr('255.255.255.255/32')).toBe('255.255.255.255/32');
      expect(normalizeCidr('192.168.1.1/32')).toBe('192.168.1.1/32');
    });

    test('throws error for invalid CIDR notations', () => {
      expect(() => normalizeCidr('invalid-cidr')).toThrow(CidrError);
      expect(() => normalizeCidr('192.168.1.0/33')).toThrow(CidrError);
      expect(() => normalizeCidr('192.168.1.256/24')).toThrow(CidrError);
    });
  });
}); 