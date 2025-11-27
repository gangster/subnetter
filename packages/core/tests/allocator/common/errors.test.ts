import { AllocationError } from '../../../src/allocator/common/errors';
import { AllocationError as NewAllocationError, ErrorCode } from '../../../src/utils/errors';

describe('Deprecated AllocationError', () => {
  it('should create an AllocationError with message and context', () => {
    const error = new AllocationError('Test error message', { key: 'value' });
    
    expect(error).toBeInstanceOf(AllocationError);
    expect(error).toBeInstanceOf(NewAllocationError);
    expect(error.message).toBe('Test error message');
    expect(error.code).toBe(ErrorCode.INSUFFICIENT_ADDRESS_SPACE);
  });

  it('should create an AllocationError with empty context by default', () => {
    const error = new AllocationError('Test error message');
    
    expect(error).toBeInstanceOf(AllocationError);
    expect(error.message).toBe('Test error message');
  });

  it('should inherit from the new AllocationError', () => {
    const error = new AllocationError('Test error', { cidr: '10.0.0.0/8' });
    
    // Should have all properties from parent class
    expect(error.name).toBe('AllocationError');
    expect(typeof error.getContextString).toBe('function');
  });
});

