import { isValidIpv4Cidr, calculateUsableIps, doCidrsOverlap, subdivideIpv4Cidr, calculateRequiredPrefixLength, calculateOptimalPrefixLength, CidrError } from '../../src/allocator/cidr-calculator.js';
describe('CIDR Calculator', () => {
    describe('isValidIpv4Cidr', () => {
        test('should validate correct IPv4 CIDR notation', () => {
            expect(isValidIpv4Cidr('10.0.0.0/8')).toBe(true);
            expect(isValidIpv4Cidr('192.168.1.0/24')).toBe(true);
            expect(isValidIpv4Cidr('172.16.0.0/16')).toBe(true);
            expect(isValidIpv4Cidr('0.0.0.0/0')).toBe(true);
            expect(isValidIpv4Cidr('255.255.255.255/32')).toBe(true);
        });
        test('should reject invalid IPv4 CIDR notation', () => {
            // Invalid IP addresses
            expect(isValidIpv4Cidr('256.0.0.0/8')).toBe(false);
            expect(isValidIpv4Cidr('10.256.0.0/8')).toBe(false);
            expect(isValidIpv4Cidr('10.0.256.0/8')).toBe(false);
            expect(isValidIpv4Cidr('10.0.0.256/8')).toBe(false);
            expect(isValidIpv4Cidr('10.0.0/8')).toBe(false);
            expect(isValidIpv4Cidr('10.0/8')).toBe(false);
            expect(isValidIpv4Cidr('10/8')).toBe(false);
            // Invalid prefix lengths
            expect(isValidIpv4Cidr('10.0.0.0/33')).toBe(false);
            expect(isValidIpv4Cidr('10.0.0.0/-1')).toBe(false);
            expect(isValidIpv4Cidr('10.0.0.0/a')).toBe(false);
            // Invalid formats
            expect(isValidIpv4Cidr('10.0.0.0')).toBe(false);
            expect(isValidIpv4Cidr('10.0.0.0/')).toBe(false);
            expect(isValidIpv4Cidr('/8')).toBe(false);
            expect(isValidIpv4Cidr('10.0.0.0-8')).toBe(false);
            expect(isValidIpv4Cidr('10.0.0.0/8/8')).toBe(false);
        });
    });
    describe('calculateUsableIps', () => {
        test('should calculate usable IPs correctly', () => {
            expect(calculateUsableIps('10.0.0.0/24')).toBe(254); // 256 - 2 (network and broadcast)
            expect(calculateUsableIps('10.0.0.0/30')).toBe(2); // 4 - 2 (network and broadcast)
            expect(calculateUsableIps('10.0.0.0/31')).toBe(2); // Point-to-point link
            expect(calculateUsableIps('10.0.0.0/32')).toBe(1); // Single host
        });
        test('should throw for invalid CIDR', () => {
            expect(() => calculateUsableIps('10.0.0.0/33')).toThrow(CidrError);
            expect(() => calculateUsableIps('invalid')).toThrow(CidrError);
        });
    });
    describe('doCidrsOverlap', () => {
        test('should detect overlapping CIDRs', () => {
            expect(doCidrsOverlap('10.0.0.0/8', '10.0.0.0/16')).toBe(true);
            expect(doCidrsOverlap('10.0.0.0/16', '10.0.0.0/8')).toBe(true);
            expect(doCidrsOverlap('10.0.0.0/24', '10.0.0.128/25')).toBe(true);
        });
        test('should detect non-overlapping CIDRs', () => {
            expect(doCidrsOverlap('10.0.0.0/24', '10.0.1.0/24')).toBe(false);
            expect(doCidrsOverlap('192.168.0.0/16', '10.0.0.0/8')).toBe(false);
        });
        test('should throw for invalid CIDRs', () => {
            expect(() => doCidrsOverlap('10.0.0.0/33', '10.0.0.0/24')).toThrow(CidrError);
            expect(() => doCidrsOverlap('10.0.0.0/24', '10.0.0.0/33')).toThrow(CidrError);
        });
    });
    describe('subdivideIpv4Cidr', () => {
        test('should subdivide CIDR blocks correctly', () => {
            const result = subdivideIpv4Cidr('10.0.0.0/24', 26);
            expect(result).toEqual([
                '10.0.0.0/26',
                '10.0.0.64/26',
                '10.0.0.128/26',
                '10.0.0.192/26'
            ]);
        });
        test('should return original CIDR when new prefix equals current prefix', () => {
            const result = subdivideIpv4Cidr('10.0.0.0/24', 24);
            expect(result).toEqual(['10.0.0.0/24']);
        });
        test('should throw when new prefix is smaller than current prefix', () => {
            expect(() => subdivideIpv4Cidr('10.0.0.0/24', 16)).toThrow(CidrError);
        });
        test('should throw when new prefix is greater than 32', () => {
            expect(() => subdivideIpv4Cidr('10.0.0.0/24', 33)).toThrow(CidrError);
        });
        test('should throw for invalid CIDR', () => {
            expect(() => subdivideIpv4Cidr('invalid', 26)).toThrow(CidrError);
        });
    });
    describe('calculateRequiredPrefixLength', () => {
        test('should calculate required prefix length correctly', () => {
            expect(calculateRequiredPrefixLength(1)).toBe(0);
            expect(calculateRequiredPrefixLength(2)).toBe(1);
            expect(calculateRequiredPrefixLength(3)).toBe(2);
            expect(calculateRequiredPrefixLength(4)).toBe(2);
            expect(calculateRequiredPrefixLength(8)).toBe(3);
            expect(calculateRequiredPrefixLength(16)).toBe(4);
        });
        test('should throw for invalid count', () => {
            expect(() => calculateRequiredPrefixLength(0)).toThrow(CidrError);
            expect(() => calculateRequiredPrefixLength(-1)).toThrow(CidrError);
        });
    });
    describe('calculateOptimalPrefixLength', () => {
        test('should calculate optimal prefix length correctly', () => {
            expect(calculateOptimalPrefixLength('10.0.0.0/24', 4)).toBe(26);
            expect(calculateOptimalPrefixLength('10.0.0.0/16', 16)).toBe(20);
        });
        test('should throw when resulting prefix would exceed 32', () => {
            expect(() => calculateOptimalPrefixLength('10.0.0.0/30', 8)).toThrow(CidrError);
        });
        test('should throw for invalid CIDR', () => {
            expect(() => calculateOptimalPrefixLength('invalid', 4)).toThrow(CidrError);
        });
    });
});
