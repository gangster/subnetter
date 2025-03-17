import { BaseCloudProvider } from '../../../../src/allocator/utils/cloud/base-provider';
import { CloudProviderType, RegionInfo } from '../../../../src/allocator/utils/cloud/types';

// Mock implementation of BaseCloudProvider for testing
class MockCloudProvider extends BaseCloudProvider {
  protected readonly type = CloudProviderType.AWS;
  protected readonly displayName = 'Mock Provider';
  protected readonly regionPatterns = [/^test-region-\d+$/];
  protected readonly regionsInfo = new Map<string, RegionInfo>([
    ['test-region-1', {
      name: 'test-region-1',
      displayName: 'Test Region 1',
      defaultAzCount: 3,
      maxAzCount: 3,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Test Continent',
        country: 'Test Country',
        region: 'Test Region'
      }
    }],
    ['test-region-2', {
      name: 'test-region-2',
      displayName: 'Test Region 2',
      defaultAzCount: 4,
      maxAzCount: 5,
      isGenerallyAvailable: true,
      geography: {
        continent: 'Test Continent',
        country: 'Test Country',
        region: 'Test Region'
      }
    }]
  ]);
}

describe('BaseCloudProvider', () => {
  let provider: MockCloudProvider;
  
  beforeEach(() => {
    provider = new MockCloudProvider();
  });
  
  describe('getType', () => {
    it('should return the provider type', () => {
      expect(provider.getType()).toBe(CloudProviderType.AWS);
    });
  });
  
  describe('getName', () => {
    it('should return the provider display name', () => {
      expect(provider.getName()).toBe('Mock Provider');
    });
  });
  
  describe('matchesRegion', () => {
    it('should return true for matching region patterns', () => {
      expect(provider.matchesRegion('test-region-1')).toBe(true);
      expect(provider.matchesRegion('test-region-2')).toBe(true);
      expect(provider.matchesRegion('test-region-3')).toBe(true);
    });
    
    it('should return false for non-matching region patterns', () => {
      expect(provider.matchesRegion('other-region-1')).toBe(false);
      expect(provider.matchesRegion('invalid-region')).toBe(false);
    });
    
    it('should return false for null or empty region names', () => {
      // @ts-expect-error Testing null value
      expect(provider.matchesRegion(null)).toBe(false);
      expect(provider.matchesRegion('')).toBe(false);
      expect(provider.matchesRegion(undefined as any)).toBe(false);
    });
  });
  
  describe('getDefaultAzCount', () => {
    it('should return the default AZ count for a known region', () => {
      expect(provider.getDefaultAzCount('test-region-1')).toBe(3);
      expect(provider.getDefaultAzCount('test-region-2')).toBe(4);
    });
    
    it('should return the base default count for an unknown region', () => {
      expect(provider.getDefaultAzCount('unknown-region')).toBe(3); // Base default
    });
  });
  
  describe('normalizeRegionName', () => {
    it('should normalize region names correctly', () => {
      expect(provider.normalizeRegionName('TEST-REGION-1')).toBe('test-region-1');
      expect(provider.normalizeRegionName('Test-Region-2')).toBe('test-region-2');
    });
  });
  
  describe('getRegionInfo', () => {
    it('should return region info for known regions', () => {
      const regionInfo1 = provider.getRegionInfo('test-region-1');
      expect(regionInfo1).toBeDefined();
      expect(regionInfo1?.name).toBe('test-region-1');
      expect(regionInfo1?.displayName).toBe('Test Region 1');
      
      const regionInfo2 = provider.getRegionInfo('test-region-2');
      expect(regionInfo2).toBeDefined();
      expect(regionInfo2?.name).toBe('test-region-2');
      expect(regionInfo2?.displayName).toBe('Test Region 2');
    });
    
    it('should return undefined for unknown regions', () => {
      expect(provider.getRegionInfo('unknown-region')).toBeUndefined();
    });
  });
  
  describe('isValidRegion', () => {
    it('should return true for valid regions', () => {
      expect(provider.isValidRegion('test-region-1')).toBe(true);
      expect(provider.isValidRegion('test-region-2')).toBe(true);
    });
    
    it('should return false for invalid regions', () => {
      expect(provider.isValidRegion('unknown-region')).toBe(false);
    });
  });
  
  describe('generateAzNames', () => {
    it('should generate the correct number of AZ names for a region', () => {
      const azNames1 = provider.generateAzNames('test-region-1', 3);
      expect(azNames1).toHaveLength(3);
      expect(azNames1).toEqual(['test-region-1a', 'test-region-1b', 'test-region-1c']);
      
      const azNames2 = provider.generateAzNames('test-region-2', 4);
      expect(azNames2).toHaveLength(4);
      expect(azNames2).toEqual(['test-region-2a', 'test-region-2b', 'test-region-2c', 'test-region-2d']);
    });
    
    it('should limit the number of AZs to the region maximum', () => {
      // test-region-2 has a max of 5 AZs
      const azNames = provider.generateAzNames('test-region-2', 7);
      expect(azNames).toHaveLength(5);
      expect(azNames).toEqual(['test-region-2a', 'test-region-2b', 'test-region-2c', 'test-region-2d', 'test-region-2e']);
    });
    
    it('should still generate AZ names for unknown regions', () => {
      const azNames = provider.generateAzNames('unknown-region', 3);
      expect(azNames).toHaveLength(3);
      expect(azNames).toEqual(['unknown-regiona', 'unknown-regionb', 'unknown-regionc']);
    });
  });
}); 