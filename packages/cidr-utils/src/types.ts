/**
 * Type definitions for CIDR utilities
 */

/**
 * Represents a parsed IPv4 CIDR block
 */
export interface ParsedCidr {
  /**
   * The original CIDR string
   */
  cidr: string;
  
  /**
   * The IP address part (e.g., "192.168.1.0")
   */
  ip: string;
  
  /**
   * The prefix length (e.g., 24 from "192.168.1.0/24")
   */
  prefix: number;
  
  /**
   * The IP version (always 4 for IPv4)
   */
  version: 4;
}

/**
 * Represents an IP address in numeric and octet forms
 */
export interface IpAddress {
  /**
   * The IP address as a 32-bit number
   */
  asNumber: number;
  
  /**
   * The IP address as an array of octets
   */
  octets: [number, number, number, number];
  
  /**
   * The IP address as a string (e.g., "192.168.1.0")
   */
  asString: string;
  
  /**
   * The IP address as a string (e.g., "192.168.1.0")
   */
  toString: () => string;
}

/**
 * Subnet size calculation result
 */
export interface SubnetInfo {
  /**
   * Number of total IPs in the subnet
   */
  totalIps: number;
  
  /**
   * Number of usable IPs in the subnet (excludes network and broadcast addresses)
   */
  usableIps: number;
}

/**
 * Result of CIDR subdivision operation
 */
export interface SubdivisionResult {
  /**
   * Array of subdivided CIDRs
   */
  subnets: string[];
  
  /**
   * Number of bits added to the prefix
   */
  bitsAdded: number;
}

/**
 * IP Address Range
 */
export interface IpRange {
  /**
   * Start IP address (inclusive)
   */
  start: IpAddress;
  
  /**
   * End IP address (inclusive)
   */
  end: IpAddress;
}

/**
 * Error codes for CIDR operations
 */
export enum CidrErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_IP = 'INVALID_IP',
  INVALID_PREFIX = 'INVALID_PREFIX',
  INVALID_OPERATION = 'INVALID_OPERATION',
  CIDR_OVERLAP = 'CIDR_OVERLAP',
  INSUFFICIENT_SPACE = 'INSUFFICIENT_SPACE',
  GENERAL_ERROR = 'GENERAL_ERROR'
} 