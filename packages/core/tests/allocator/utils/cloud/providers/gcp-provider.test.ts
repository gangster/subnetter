import { GcpCloudProvider } from '../../../../../src/allocator/utils/cloud/providers';
import { CloudProviderType } from '../../../../../src/allocator/utils/cloud/types';

describe('GcpCloudProvider', () => {
  let provider: GcpCloudProvider;
  
  beforeEach(() => {
    provider = new GcpCloudProvider();
  });
  
  describe('getType', () => {
    it('should return the GCP provider type', () => {
      expect(provider.getType()).toBe(CloudProviderType.GCP);
    });
  });
  
  describe('getName', () => {
    it('should return the correct display name', () => {
      expect(provider.getName()).toBe('Google Cloud Platform');
    });
  });
  
  describe('matchesRegion', () => {
    it('should match standard GCP regions', () => {
      expect(provider.matchesRegion('us-central1')).toBe(true);
      expect(provider.matchesRegion('europe-west4')).toBe(true);
      expect(provider.matchesRegion('asia-east1')).toBe(true);
    });
    
    it('should match special GCP regions', () => {
      expect(provider.matchesRegion('northamerica-northeast1')).toBe(true);
      expect(provider.matchesRegion('southamerica-east1')).toBe(true);
      expect(provider.matchesRegion('australia-southeast1')).toBe(true);
    });
    
    it('should not match AWS or Azure regions', () => {
      expect(provider.matchesRegion('us-east-1')).toBe(false); // AWS
      expect(provider.matchesRegion('eastus')).toBe(false); // Azure
      expect(provider.matchesRegion('ap-southeast-1')).toBe(false); // AWS
    });
  });
  
  describe('getDefaultAzCount', () => {
    it('should return the default AZ count for GCP regions', () => {
      expect(provider.getDefaultAzCount('us-central1')).toBe(3);
      expect(provider.getDefaultAzCount('europe-west4')).toBe(3);
    });
    
    it('should return the base default count for unknown regions', () => {
      expect(provider.getDefaultAzCount('unknown-region')).toBe(3);
    });
  });
  
  describe('normalizeRegionName', () => {
    it('should normalize region names correctly', () => {
      expect(provider.normalizeRegionName('US-CENTRAL1')).toBe('us-central1');
      expect(provider.normalizeRegionName('Europe-West4')).toBe('europe-west4');
    });
  });
  
  describe('getRegionInfo', () => {
    it('should return region info for known GCP regions', () => {
      const regionInfo = provider.getRegionInfo('us-central1');
      expect(regionInfo).toBeDefined();
      expect(regionInfo?.name).toBe('us-central1');
      expect(regionInfo?.displayName).toBe('Council Bluffs, Iowa, North America');
      expect(regionInfo?.defaultAzCount).toBe(3);
      expect(regionInfo?.maxAzCount).toBe(3);
      expect(regionInfo?.isGenerallyAvailable).toBe(true);
      expect(regionInfo?.geography?.continent).toBe('North America');
      expect(regionInfo?.geography?.country).toBe('United States');
    });
    
    it('should return undefined for unknown regions', () => {
      expect(provider.getRegionInfo('unknown-region')).toBeUndefined();
    });
  });
  
  describe('isValidRegion', () => {
    it('should return true for valid GCP regions', () => {
      expect(provider.isValidRegion('us-central1')).toBe(true);
      expect(provider.isValidRegion('europe-west4')).toBe(true);
    });
    
    it('should return false for invalid regions', () => {
      expect(provider.isValidRegion('unknown-region')).toBe(false);
    });
  });
  
  describe('generateAzNames', () => {
    it('should generate correct GCP zone names', () => {
      const zoneNames = provider.generateAzNames('us-central1', 3);
      expect(zoneNames).toHaveLength(3);
      expect(zoneNames).toEqual(['us-central1a', 'us-central1b', 'us-central1c']);
    });
    
    it('should handle regions with non-standard zone patterns', () => {
      // us-central1 actually has zones a, b, c, f
      const zoneNames = provider.generateAzNames('us-central1', 4);
      expect(zoneNames).toHaveLength(4);
      expect(zoneNames).toEqual(['us-central1a', 'us-central1b', 'us-central1c', 'us-central1f']);
    });
    
    it('should correctly handle us-east1', () => {
      // us-east1 has zones b, c, d (no a)
      const zoneNames = provider.generateAzNames('us-east1', 3);
      expect(zoneNames).toHaveLength(3);
      expect(zoneNames).toEqual(['us-east1b', 'us-east1c', 'us-east1d']);
    });
    
    it('should correctly handle europe-west1', () => {
      // europe-west1 has zones b, c, d (no a)
      const zoneNames = provider.generateAzNames('europe-west1', 3);
      expect(zoneNames).toHaveLength(3);
      expect(zoneNames).toEqual(['europe-west1b', 'europe-west1c', 'europe-west1d']);
    });
    
    it('should limit the number of zones to the region maximum', () => {
      // All GCP regions in our test have a max of 3 zones
      const zoneNames = provider.generateAzNames('us-central1', 5);
      expect(zoneNames).toHaveLength(3);
      expect(zoneNames).toEqual(['us-central1a', 'us-central1b', 'us-central1c']);
    });
    
    it('should handle unknown regions', () => {
      const zoneNames = provider.generateAzNames('unknown-region', 2);
      expect(zoneNames).toHaveLength(2);
      expect(zoneNames).toEqual(['unknown-regiona', 'unknown-regionb']);
    });
  });
}); 