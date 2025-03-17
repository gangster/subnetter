import { isValidIpv4Cidr, validateIpv4Cidr, CidrError } from '../src/validator';
import { CidrErrorType } from '../src/types';

describe('CIDR Validation Utilities', () => {
  describe('isValidIpv4Cidr', () => {
    test('returns true for valid CIDR notations', () => {
      expect(isValidIpv4Cidr('192.168.1.0/24')).toBe(true);
      expect(isValidIpv4Cidr('10.0.0.0/8')).toBe(true);
      expect(isValidIpv4Cidr('172.16.0.0/16')).toBe(true);
      expect(isValidIpv4Cidr('0.0.0.0/0')).toBe(true);
      expect(isValidIpv4Cidr('255.255.255.255/32')).toBe(true);
    });

    test('returns false for invalid CIDR notations', () => {
      expect(isValidIpv4Cidr('not-a-cidr')).toBe(false);
      expect(isValidIpv4Cidr('192.168.1.0')).toBe(false);
      expect(isValidIpv4Cidr('192.168.1.0/')).toBe(false);
      expect(isValidIpv4Cidr('/24')).toBe(false);
      expect(isValidIpv4Cidr('192.168.1.0/33')).toBe(false);
      expect(isValidIpv4Cidr('192.168.1.256/24')).toBe(false);
      expect(isValidIpv4Cidr('192.168.1/24')).toBe(false);
    });

    test('returns false for non-string inputs', () => {
      // @ts-expect-error - we're testing runtime behavior with invalid types
      expect(isValidIpv4Cidr(null)).toBe(false);
      // @ts-expect-error - we're testing runtime behavior with invalid types
      expect(isValidIpv4Cidr(undefined)).toBe(false);
      // @ts-expect-error - we're testing runtime behavior with invalid types
      expect(isValidIpv4Cidr(123)).toBe(false);
      // @ts-expect-error - we're testing runtime behavior with invalid types
      expect(isValidIpv4Cidr({})).toBe(false);
    });
  });

  describe('validateIpv4Cidr', () => {
    test('does not throw for valid CIDR notations', () => {
      expect(() => validateIpv4Cidr('192.168.1.0/24')).not.toThrow();
      expect(() => validateIpv4Cidr('10.0.0.0/8')).not.toThrow();
      expect(() => validateIpv4Cidr('172.16.0.0/16')).not.toThrow();
      expect(() => validateIpv4Cidr('0.0.0.0/0')).not.toThrow();
      expect(() => validateIpv4Cidr('255.255.255.255/32')).not.toThrow();
    });

    test('throws for invalid CIDR format', () => {
      expect(() => validateIpv4Cidr('not-a-cidr')).toThrow(CidrError);
      expect(() => validateIpv4Cidr('192.168.1.0')).toThrow(CidrError);
      expect(() => validateIpv4Cidr('192.168.1.0/')).toThrow(CidrError);
      expect(() => validateIpv4Cidr('/24')).toThrow(CidrError);
      
      try {
        validateIpv4Cidr('not-a-cidr');
      } catch (e) {
        expect(e).toBeInstanceOf(CidrError);
        expect((e as CidrError).type).toBe(CidrErrorType.INVALID_FORMAT);
      }
    });

    test('throws for invalid IP address', () => {
      expect(() => validateIpv4Cidr('192.168.1.256/24')).toThrow(CidrError);
      expect(() => validateIpv4Cidr('192.168.300.1/24')).toThrow(CidrError);
      expect(() => validateIpv4Cidr('192.168.1/24')).toThrow(CidrError);
      
      try {
        validateIpv4Cidr('192.168.1.256/24');
      } catch (e) {
        expect(e).toBeInstanceOf(CidrError);
        expect((e as CidrError).type).toBe(CidrErrorType.INVALID_IP);
      }
    });

    test('throws for invalid prefix', () => {
      expect(() => validateIpv4Cidr('192.168.1.0/33')).toThrow(CidrError);
      expect(() => validateIpv4Cidr('192.168.1.0/-1')).toThrow(CidrError);
      expect(() => validateIpv4Cidr('192.168.1.0/abc')).toThrow(CidrError);
      
      try {
        validateIpv4Cidr('192.168.1.0/33');
      } catch (e) {
        expect(e).toBeInstanceOf(CidrError);
        expect((e as CidrError).type).toBe(CidrErrorType.INVALID_PREFIX);
      }
    });

    test('throws for non-string inputs', () => {
      // @ts-expect-error - we're testing runtime behavior with invalid types
      expect(() => validateIpv4Cidr(null)).toThrow(CidrError);
      // @ts-expect-error - we're testing runtime behavior with invalid types
      expect(() => validateIpv4Cidr(undefined)).toThrow(CidrError);
      // @ts-expect-error - we're testing runtime behavior with invalid types
      expect(() => validateIpv4Cidr(123)).toThrow(CidrError);
      // @ts-expect-error - we're testing runtime behavior with invalid types
      expect(() => validateIpv4Cidr({})).toThrow(CidrError);
      
      try {
        // @ts-expect-error - we're testing runtime behavior with invalid types
        validateIpv4Cidr(null);
      } catch (e) {
        expect(e).toBeInstanceOf(CidrError);
        expect((e as CidrError).type).toBe(CidrErrorType.INVALID_FORMAT);
      }
    });
  });
}); 