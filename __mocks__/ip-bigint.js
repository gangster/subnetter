// Mock implementation for ip-bigint
export const ipVersion = jest.fn((ip) => 4); // Always assume IPv4

export const parseIp = jest.fn((ip) => BigInt(0)); // Mock BigInt representation

export const stringifyIp = jest.fn(() => '0.0.0.0'); // Default IP string

export const normalizeIp = jest.fn((ip) => ip); // Return input unchanged

export const hasIpPrefix = jest.fn(() => true);

export const isIpLt = jest.fn(() => false);

export const isIpGt = jest.fn(() => false);

export const isIpEq = jest.fn((ip1, ip2) => ip1 === ip2);

export const ipNext = jest.fn((ip) => ip);

export const ipPrev = jest.fn((ip) => ip);

export const ipAdd = jest.fn((ip) => ip);

export const ipSub = jest.fn((ip) => ip);

export const ipToInteger = jest.fn(() => 0);

export const integerToIp = jest.fn(() => '0.0.0.0'); 