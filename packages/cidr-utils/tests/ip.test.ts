import {
  ipv4ToNumber,
  numberToIpv4,
  createIpAddress,
  calculateSubnetMask,
  getNetworkAddress,
  getBroadcastAddress
} from '../src/ip';
import { CidrError } from '../src/validator';

describe('IP Address Utilities', () => {
  describe('ipv4ToNumber', () => {
    test('converts valid IPv4 addresses to numeric representation', () => {
      expect(ipv4ToNumber('0.0.0.0')).toBe(0);
      expect(ipv4ToNumber('255.255.255.255')).toBe(4294967295);
      expect(ipv4ToNumber('192.168.1.1')).toBe(3232235777);
      expect(ipv4ToNumber('10.0.0.1')).toBe(167772161);
    });

    test('throws error for invalid IP format', () => {
      expect(() => ipv4ToNumber('not.an.ip.address')).toThrow(CidrError);
      expect(() => ipv4ToNumber('192.168.1')).toThrow(CidrError);
      expect(() => ipv4ToNumber('192.168.1.1.1')).toThrow(CidrError);
    });

    test('throws error for IP octets out of range', () => {
      expect(() => ipv4ToNumber('192.168.1.256')).toThrow(CidrError);
      expect(() => ipv4ToNumber('192.168.300.1')).toThrow(CidrError);
      expect(() => ipv4ToNumber('-1.168.1.1')).toThrow(CidrError);
    });
  });

  describe('numberToIpv4', () => {
    test('converts numeric values to IPv4 address strings', () => {
      expect(numberToIpv4(0)).toBe('0.0.0.0');
      expect(numberToIpv4(4294967295)).toBe('255.255.255.255');
      expect(numberToIpv4(3232235777)).toBe('192.168.1.1');
      expect(numberToIpv4(167772161)).toBe('10.0.0.1');
    });

    test('throws error for invalid numeric values', () => {
      expect(() => numberToIpv4(-1)).toThrow(CidrError);
      expect(() => numberToIpv4(4294967296)).toThrow(CidrError);
    });
  });

  describe('createIpAddress', () => {
    test('creates valid IpAddress objects', () => {
      const ip = createIpAddress('192.168.1.1');
      expect(ip.asNumber).toBe(3232235777);
      expect(ip.octets).toEqual([192, 168, 1, 1]);
      expect(ip.asString).toBe('192.168.1.1');
    });

    test('throws error for invalid IP addresses', () => {
      expect(() => createIpAddress('not.valid.ip')).toThrow(CidrError);
    });
  });

  describe('calculateSubnetMask', () => {
    test('calculates correct subnet masks for various prefix lengths', () => {
      expect(calculateSubnetMask(0)).toBe(0);
      expect(calculateSubnetMask(8)).toBe(0xFF000000);
      expect(calculateSubnetMask(16)).toBe(0xFFFF0000);
      expect(calculateSubnetMask(24)).toBe(0xFFFFFF00);
      expect(calculateSubnetMask(32)).toBe(0xFFFFFFFF);
    });

    test('handles edge cases', () => {
      expect(calculateSubnetMask(1)).toBe(0x80000000);
      expect(calculateSubnetMask(31)).toBe(0xFFFFFFFE);
    });

    test('throws error for invalid prefix lengths', () => {
      expect(() => calculateSubnetMask(-1)).toThrow(CidrError);
      expect(() => calculateSubnetMask(33)).toThrow(CidrError);
    });
  });

  describe('getNetworkAddress', () => {
    test('returns the correct network address for various CIDRs', () => {
      const network1 = getNetworkAddress('192.168.1.0/24');
      expect(network1.asString).toBe('192.168.1.0');
      
      const network2 = getNetworkAddress('10.10.10.10/8');
      expect(network2.asString).toBe('10.0.0.0');
      
      const network3 = getNetworkAddress('172.16.100.50/16');
      expect(network3.asString).toBe('172.16.0.0');
    });

    test('handles special cases', () => {
      const network1 = getNetworkAddress('0.0.0.0/0');
      expect(network1.asString).toBe('0.0.0.0');
      
      const network2 = getNetworkAddress('255.255.255.255/32');
      expect(network2.asString).toBe('255.255.255.255');
    });

    test('throws error for invalid CIDRs', () => {
      expect(() => getNetworkAddress('not-a-cidr')).toThrow(CidrError);
      expect(() => getNetworkAddress('192.168.1.0/33')).toThrow(CidrError);
    });
  });

  describe('getBroadcastAddress', () => {
    test('returns the correct broadcast address for various CIDRs', () => {
      const broadcast1 = getBroadcastAddress('192.168.1.0/24');
      expect(broadcast1.asString).toBe('192.168.1.255');
      
      const broadcast2 = getBroadcastAddress('10.0.0.0/8');
      expect(broadcast2.asString).toBe('10.255.255.255');
      
      const broadcast3 = getBroadcastAddress('172.16.0.0/16');
      expect(broadcast3.asString).toBe('172.16.255.255');
    });

    test('handles special cases', () => {
      const broadcast1 = getBroadcastAddress('0.0.0.0/0');
      expect(broadcast1.asString).toBe('255.255.255.255');
      
      const broadcast2 = getBroadcastAddress('255.255.255.255/32');
      expect(broadcast2.asString).toBe('255.255.255.255');
    });

    test('throws error for invalid CIDRs', () => {
      expect(() => getBroadcastAddress('invalid-cidr')).toThrow(CidrError);
      expect(() => getBroadcastAddress('192.168.1.0/34')).toThrow(CidrError);
    });
  });
}); 