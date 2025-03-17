import { AllocationError as NewAllocationError, ErrorCode } from '../../utils/errors';

/**
 * Error thrown during CIDR allocation when there's an issue with the allocation process.
 * This could be due to insufficient space, overlapping CIDRs, or invalid inputs.
 * 
 * @deprecated Use the AllocationError from the utils/errors module instead
 */
export class AllocationError extends NewAllocationError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, ErrorCode.INSUFFICIENT_ADDRESS_SPACE, context);
  }
} 