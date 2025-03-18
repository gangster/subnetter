import { isValidIpv4Cidr } from './calculator';
import { AllocationError, ErrorCode } from '../../../utils/errors';
import { createLogger } from '../../../utils/logger';
import * as ipaddr from 'ipaddr.js';

// Create logger instance for the contiguous allocator
const logger = createLogger('ContiguousAllocator');

/**
 * Allocates CIDR blocks contiguously from a base CIDR.
 * This ensures that all allocations are sequential and non-overlapping.
 */
export class ContiguousAllocator {
  private baseCidr: string;
  private baseIp: ipaddr.IPv4;
  private basePrefix: number;
  private currentIp: ipaddr.IPv4;
  private allocatedCidrs: string[] = [];

  /**
   * Creates a new ContiguousAllocator with the specified base CIDR.
   * 
   * @param baseCidr The base CIDR to allocate from
   * @throws {AllocationError} If the CIDR is invalid
   */
  constructor(baseCidr: string) {
    if (!isValidIpv4Cidr(baseCidr)) {
      throw new AllocationError(
        `Invalid CIDR format: ${baseCidr}`,
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr: baseCidr }
      );
    }

    this.baseCidr = baseCidr;
    const [ipString, prefixString] = baseCidr.split('/');
    this.basePrefix = parseInt(prefixString, 10);
    this.baseIp = ipaddr.IPv4.parse(ipString);
    this.currentIp = this.baseIp;

    logger.debug(`Initialized contiguous allocator with base CIDR ${baseCidr}`);
  }

  /**
   * Allocates a CIDR block with the specified prefix length.
   * The allocation is made contiguously from the current position.
   * 
   * @param prefixLength The prefix length for the new block (format: '/16')
   * @returns The allocated CIDR block
   * @throws {AllocationError} If there's not enough space or invalid prefix
   */
  public allocate(prefixLength: string): string {
    // Parse the prefix length (strip the / if present)
    const prefix = parseInt(prefixLength.startsWith('/') ? prefixLength.slice(1) : prefixLength, 10);
    
    // Verify the prefix is valid
    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      throw new AllocationError(
        `Invalid prefix length: ${prefixLength}`,
        ErrorCode.INVALID_PREFIX_LENGTH,
        { prefixLength }
      );
    }

    // Verify the requested block is not larger than the base CIDR
    if (prefix < this.basePrefix) {
      throw new AllocationError(
        `Requested prefix length ${prefix} is smaller than base CIDR prefix ${this.basePrefix}`,
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
        { 
          requestedPrefix: prefix,
          basePrefix: this.basePrefix,
          baseCidr: this.baseCidr
        }
      );
    }

    // Calculate the size of the block in IP addresses
    const blockSize = Math.pow(2, 32 - prefix);

    // Verify we have enough space left
    const maxIp = this.baseIp.toByteArray().reduce((acc, byte, i) => acc + byte * Math.pow(256, 3 - i), 0);
    const currentIpValue = this.currentIp.toByteArray().reduce((acc, byte, i) => acc + byte * Math.pow(256, 3 - i), 0);
    const baseBlockSize = Math.pow(2, 32 - this.basePrefix);
    
    if (currentIpValue + blockSize > maxIp + baseBlockSize) {
      throw new AllocationError(
        `Not enough space left for allocation with prefix /${prefix}`,
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
        {
          baseCidr: this.baseCidr,
          requestedPrefix: prefix,
          currentPosition: this.currentIp.toString()
        }
      );
    }

    // Create the CIDR block
    const allocatedCidr = `${this.currentIp.toString()}/${prefix}`;
    logger.debug(`Allocated CIDR block ${allocatedCidr}`);

    // Advance the current position
    const newIpValue = currentIpValue + blockSize;
    const octet1 = (newIpValue >> 24) & 0xFF;
    const octet2 = (newIpValue >> 16) & 0xFF;
    const octet3 = (newIpValue >> 8) & 0xFF;
    const octet4 = newIpValue & 0xFF;
    
    this.currentIp = ipaddr.IPv4.parse(`${octet1}.${octet2}.${octet3}.${octet4}`);

    // Add to allocated CIDRs
    this.allocatedCidrs.push(allocatedCidr);

    return allocatedCidr;
  }

  /**
   * Gets the current available space (where the next allocation will be made).
   * 
   * @returns The CIDR representing the current available space
   */
  public getAvailableSpace(): string {
    return `${this.currentIp.toString()}/${this.basePrefix}`;
  }

  /**
   * Resets the allocator to its initial state.
   */
  public reset(): void {
    this.currentIp = this.baseIp;
    this.allocatedCidrs = [];
    logger.debug('Reset allocator to initial state');
  }

  /**
   * Gets all allocated CIDR blocks.
   * 
   * @returns Array of allocated CIDR blocks
   */
  public getAllocatedCidrs(): string[] {
    return [...this.allocatedCidrs];
  }
} 