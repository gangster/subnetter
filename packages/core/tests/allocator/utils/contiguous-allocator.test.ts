import { ContiguousAllocator } from '../../../src/allocator/utils/cidr/contiguous-allocator';
import { doCidrsOverlap } from '../../../src/allocator/utils/cidr';
import { AllocationError } from '../../../src/utils/errors';

describe('ContiguousAllocator', () => {
  let allocator: ContiguousAllocator;
  
  beforeEach(() => {
    // Start with a fresh allocator for each test with a base CIDR of 10.0.0.0/8
    allocator = new ContiguousAllocator('10.0.0.0/8');
  });
  
  describe('initialization', () => {
    test('should initialize with a base CIDR', () => {
      expect(allocator).toBeDefined();
      expect(allocator.getAvailableSpace()).toBe('10.0.0.0/8');
    });
    
    test('should throw an error with an invalid CIDR', () => {
      expect(() => new ContiguousAllocator('invalid')).toThrow(AllocationError);
      expect(() => new ContiguousAllocator('10.0.0.0/33')).toThrow(AllocationError);
    });
  });
  
  describe('allocation', () => {
    test('should allocate a block with the requested prefix length', () => {
      const cidr = allocator.allocate('/16');
      expect(cidr).toBe('10.0.0.0/16');
      expect(allocator.getAvailableSpace()).toBe('10.1.0.0/8');
    });
    
    test('should allocate blocks contiguously', () => {
      const cidr1 = allocator.allocate('/16');
      const cidr2 = allocator.allocate('/16');
      
      expect(cidr1).toBe('10.0.0.0/16');
      expect(cidr2).toBe('10.1.0.0/16');
    });
    
    test('should allocate blocks of different sizes contiguously', () => {
      const cidr1 = allocator.allocate('/16');
      const cidr2 = allocator.allocate('/17');
      const cidr3 = allocator.allocate('/18');
      
      expect(cidr1).toBe('10.0.0.0/16');
      expect(cidr2).toBe('10.1.0.0/17');
      expect(cidr3).toBe('10.1.128.0/18');
    });
    
    test('should throw when trying to allocate a block larger than available space', () => {
      allocator = new ContiguousAllocator('10.0.0.0/24');
      
      expect(() => allocator.allocate('/16')).toThrow(AllocationError);
    });
    
    test('should throw when trying to allocate a block smaller than the base CIDR prefix', () => {
      allocator = new ContiguousAllocator('10.0.0.0/16');
      
      expect(() => allocator.allocate('/8')).toThrow(AllocationError);
    });
  });
  
  describe('multiple allocations', () => {
    test('should allocate multiple blocks until space is exhausted', () => {
      // Base CIDR is 10.0.0.0/8 which has 16,777,216 IPs (2^24)
      // A /16 has 65,536 IPs (2^16)
      // So we should be able to allocate 256 /16 blocks
      
      const cidrs: string[] = [];
      
      // Allocate 10 blocks to verify contiguity
      for (let i = 0; i < 10; i++) {
        cidrs.push(allocator.allocate('/16'));
      }
      
      // Check first few allocations
      expect(cidrs[0]).toBe('10.0.0.0/16');
      expect(cidrs[1]).toBe('10.1.0.0/16');
      expect(cidrs[9]).toBe('10.9.0.0/16');
      
      // Verify no overlaps
      for (let i = 0; i < cidrs.length; i++) {
        for (let j = i + 1; j < cidrs.length; j++) {
          expect(doCidrsOverlap(cidrs[i], cidrs[j])).toBe(false);
        }
      }
    });
  });
  
  describe('reset', () => {
    test('should reset allocation state', () => {
      const cidr1 = allocator.allocate('/16');
      expect(cidr1).toBe('10.0.0.0/16');
      
      allocator.reset();
      
      const cidr2 = allocator.allocate('/16');
      expect(cidr2).toBe('10.0.0.0/16');
    });
  });
  
  describe('getAllocatedCidrs', () => {
    test('should return all allocated CIDRs', () => {
      allocator.allocate('/16');
      allocator.allocate('/16');
      
      const allocated = allocator.getAllocatedCidrs();
      expect(allocated).toHaveLength(2);
      expect(allocated).toContain('10.0.0.0/16');
      expect(allocated).toContain('10.1.0.0/16');
    });
  });
}); 