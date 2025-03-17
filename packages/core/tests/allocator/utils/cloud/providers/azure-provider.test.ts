import { AzureCloudProvider } from '../../../../../src/allocator/utils/cloud/providers';
import { CloudProviderType } from '../../../../../src/allocator/utils/cloud/types';

describe('AzureCloudProvider', () => {
  let provider: AzureCloudProvider;
  
  beforeEach(() => {
    provider = new AzureCloudProvider();
  });
  
  describe('basic properties', () => {
    it('should have the correct provider type', () => {
      expect(provider.getType()).toBe(CloudProviderType.AZURE);
    });
    
    it('should have the correct display name', () => {
      expect(provider.getName()).toBe('Microsoft Azure');
    });
  });
  
  describe('region patterns', () => {
    it('should match valid Azure region patterns', () => {
      expect(provider.matchesRegion('eastus')).toBe(true);
      expect(provider.matchesRegion('westeurope')).toBe(true);
      expect(provider.matchesRegion('japaneast')).toBe(true);
      expect(provider.matchesRegion('usgovvirginia')).toBe(true);
    });
    
    it('should not match non-Azure region patterns', () => {
      expect(provider.matchesRegion('us-east-1')).toBe(false);
      expect(provider.matchesRegion('us-central1')).toBe(false);
      expect(provider.matchesRegion('invalid-region')).toBe(false);
    });
  });
  
  describe('region info', () => {
    it('should return region info for valid regions', () => {
      const regionInfo = provider.getRegionInfo('eastus');
      expect(regionInfo).toBeDefined();
      expect(regionInfo?.name).toBe('eastus');
      expect(regionInfo?.displayName).toBe('East US');
      expect(regionInfo?.defaultAzCount).toBe(3);
    });
    
    it('should return undefined for invalid regions', () => {
      expect(provider.getRegionInfo('invalid-region')).toBeUndefined();
    });
  });
  
  describe('generateAzNames', () => {
    it('should generate correct Azure AZ names', () => {
      const azNames = provider.generateAzNames('eastus', 3);
      expect(azNames).toEqual(['eastus-1', 'eastus-2', 'eastus-3']);
    });
    
    it('should limit AZ count to the maximum for the region', () => {
      // Request more than the maximum allowed for the region
      const azNames = provider.generateAzNames('eastus', 10);
      // eastus has a maxAzCount of 3
      expect(azNames).toEqual(['eastus-1', 'eastus-2', 'eastus-3']);
    });
    
    it('should generate AZ names even for unknown regions', () => {
      const azNames = provider.generateAzNames('unknown-region', 2);
      expect(azNames).toEqual(['unknown-region-1', 'unknown-region-2']);
    });
  });
  
  describe('normalizeRegionName', () => {
    it('should convert region names to lowercase', () => {
      expect(provider.normalizeRegionName('EastUS')).toBe('eastus');
      expect(provider.normalizeRegionName('WESTEUROPE')).toBe('westeurope');
    });
    
    it('should remove spaces from region names', () => {
      expect(provider.normalizeRegionName('East US')).toBe('eastus');
      expect(provider.normalizeRegionName('West Europe')).toBe('westeurope');
    });
    
    it('should handle region names with spaces and mixed case', () => {
      expect(provider.normalizeRegionName('East US 2')).toBe('eastus2');
      expect(provider.normalizeRegionName('West Us 2')).toBe('westus2');
    });
  });
}); 