import { normalizeSubnetTypes } from '../../../src/allocator/common/helpers';
import { SubnetTypesMap } from '../../../src/models/types';

describe('Helpers', () => {
  describe('normalizeSubnetTypes', () => {
    test('should convert object format to array format', () => {
      // Arrange
      const subnetTypes: SubnetTypesMap = {
        'Public': 24,
        'Private': 26,
        'Data': 28
      };
      
      // Act
      const result = normalizeSubnetTypes(subnetTypes);
      
      // Assert
      expect(result).toEqual([
        { name: 'Public', prefixLength: 24 },
        { name: 'Private', prefixLength: 26 },
        { name: 'Data', prefixLength: 28 }
      ]);
    });
    
    test('should handle empty object', () => {
      // Arrange
      const subnetTypes: SubnetTypesMap = {};
      
      // Act
      const result = normalizeSubnetTypes(subnetTypes);
      
      // Assert
      expect(result).toEqual([]);
    });
  });
}); 