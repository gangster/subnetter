/**
 * Error thrown during CIDR allocation when there's an issue with the allocation process.
 * This could be due to insufficient space, overlapping CIDRs, or invalid inputs.
 */
export class AllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AllocationError';
  }
} 