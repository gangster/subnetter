import { SubnetAllocator } from '../../../src/allocator/core/subnet';
import { AllocationError } from '../../../src/utils/errors';
import { CidrTracker } from '../../../src/index';

describe('SubnetAllocator', () => {
  describe('calculateEffectivePrefixLength', () => {
    test('should return subnet prefix length when it is greater than AZ prefix length', () => {
      // Arrange
      const subnetType = 'Public';
      const prefixLength = 24;
      const azPrefixLength = 20;
      
      // Act
      const result = SubnetAllocator.calculateEffectivePrefixLength(
        subnetType, prefixLength, azPrefixLength
      );
      
      // Assert
      expect(result).toBe(prefixLength);
    });
    
    test('should return AZ prefix length when subnet prefix length is less than AZ prefix length', () => {
      // Arrange
      const subnetType = 'Public';
      const prefixLength = 18;
      const azPrefixLength = 20;
      
      // Act
      const result = SubnetAllocator.calculateEffectivePrefixLength(
        subnetType, prefixLength, azPrefixLength
      );
      
      // Assert
      expect(result).toBe(azPrefixLength);
    });
    
    test('should return the same value when subnet prefix length equals AZ prefix length', () => {
      // Arrange
      const subnetType = 'Public';
      const prefixLength = 20;
      const azPrefixLength = 20;
      
      // Act
      const result = SubnetAllocator.calculateEffectivePrefixLength(
        subnetType, prefixLength, azPrefixLength
      );
      
      // Assert
      expect(result).toBe(prefixLength);
    });
  });
  
  describe('subdivideForSubnet', () => {
    test('should return the original CIDR when prefix lengths match', () => {
      // Arrange
      const subnetCidr = '10.0.0.0/24';
      const effectivePrefixLength = 24;
      const subnetType = 'Public';
      const azName = 'us-east-1a';
      
      // Act
      const result = SubnetAllocator.subdivideForSubnet(
        subnetCidr, effectivePrefixLength, subnetType, azName
      );
      
      // Assert
      expect(result.allocatedCidr).toBe(subnetCidr);
      expect(result.updatedSpace).toEqual([]);
    });
    
    test('should subdivide CIDR when prefix lengths differ', () => {
      // Arrange
      const subnetCidr = '10.0.0.0/24';
      const effectivePrefixLength = 26;
      const subnetType = 'Private';
      const azName = 'us-east-1a';
      
      // Act
      const result = SubnetAllocator.subdivideForSubnet(
        subnetCidr, effectivePrefixLength, subnetType, azName
      );
      
      // Assert
      expect(result.allocatedCidr).toBe('10.0.0.0/26');
      expect(result.updatedSpace).toEqual(['10.0.0.64/26', '10.0.0.128/26', '10.0.0.192/26']);
    });
    
    test('should throw when subdivision fails', () => {
      // Arrange
      const subnetCidr = '10.0.0.0/24';
      const effectivePrefixLength = 16; // Invalid - smaller than current prefix
      const subnetType = 'Public';
      const azName = 'us-east-1a';
      
      // Act & Assert
      expect(() => {
        SubnetAllocator.subdivideForSubnet(
          subnetCidr, effectivePrefixLength, subnetType, azName
        );
      }).toThrow(AllocationError);
    });
  });
  
  describe('allocateSubnet', () => {
    test('should allocate a subnet and return updated remaining space', () => {
      // Arrange
      const accountName = 'test-account';
      const vpcName = 'test-vpc';
      const provider = 'aws';
      const regionName = 'us-east-1';
      const azName = 'us-east-1a';
      const regionCidr = '10.0.0.0/16';
      const vpcCidr = '10.0.0.0/20';
      const azCidr = '10.0.0.0/24';
      const azPrefixLength = 24;
      const subnetType = { name: 'Public', prefixLength: 26 };
      const remainingSpace = ['10.0.0.0/24'];
      const cidrTracker = new CidrTracker();
      const allocations: any[] = [];
      
      // Act
      const result = SubnetAllocator.allocateSubnet(
        accountName, vpcName, provider, regionName, azName,
        regionCidr, vpcCidr, azCidr, azPrefixLength, subnetType,
        remainingSpace, cidrTracker, allocations
      );
      
      // Assert
      expect(result).toEqual(['10.0.0.64/26', '10.0.0.128/26', '10.0.0.192/26']);
      expect(allocations.length).toBe(1);
      expect(allocations[0].cidr).toBe('10.0.0.0/26');
      expect(cidrTracker.isAllocated('10.0.0.0/26')).toBe(true);
    });
    
    test('should throw when there is no remaining space', () => {
      // Arrange
      const accountName = 'test-account';
      const vpcName = 'test-vpc';
      const provider = 'aws';
      const regionName = 'us-east-1';
      const azName = 'us-east-1a';
      const regionCidr = '10.0.0.0/16';
      const vpcCidr = '10.0.0.0/20';
      const azCidr = '10.0.0.0/24';
      const azPrefixLength = 24;
      const subnetType = { name: 'Public', prefixLength: 26 };
      const remainingSpace: string[] = []; // Empty remaining space
      const cidrTracker = new CidrTracker();
      
      // Act & Assert
      expect(() => {
        SubnetAllocator.allocateSubnet(
          accountName, vpcName, provider, regionName, azName,
          regionCidr, vpcCidr, azCidr, azPrefixLength, subnetType,
          remainingSpace, cidrTracker
        );
      }).toThrow(AllocationError);
    });
  });
  
  describe('handleCidrError', () => {
    test('should wrap CidrError in AllocationError', () => {
      // Arrange
      const error = new Error('Invalid CIDR');
      const context = 'Test context';
      
      // Act & Assert
      expect(() => {
        // We need to call the private method via the prototype
        (SubnetAllocator as any).handleCidrError(error, context);
      }).toThrow(AllocationError);
      
      try {
        (SubnetAllocator as any).handleCidrError(error, context);
      } catch (e) {
        const err = e as Error;
        expect(err).toBeInstanceOf(AllocationError);
        expect(err.message).toContain(`${context}: ${error.message}`);
      }
    });
    
    test('should wrap other errors in AllocationError', () => {
      // Arrange
      const error = new Error('Random error');
      const context = 'Test context';
      
      // Act & Assert
      expect(() => {
        (SubnetAllocator as any).handleCidrError(error, context);
      }).toThrow(AllocationError);
      
      try {
        (SubnetAllocator as any).handleCidrError(error, context);
      } catch (e) {
        const err = e as Error;
        expect(err).toBeInstanceOf(AllocationError);
        expect(err.message).toContain('Test context');
        expect(err.message).toContain('Random error');
      }
    });
    
    test('should handle non-Error objects', () => {
      // Arrange
      const error = 'Not an error object';
      const context = 'Test context';
      
      // Act & Assert
      expect(() => {
        (SubnetAllocator as any).handleCidrError(error, context);
      }).toThrow(AllocationError);
      
      try {
        (SubnetAllocator as any).handleCidrError(error, context);
      } catch (e) {
        const err = e as Error;
        expect(err).toBeInstanceOf(AllocationError);
        expect(err.message).toContain('Test context');
        expect(err.message).toContain('Unknown error');
      }
    });
  });
}); 