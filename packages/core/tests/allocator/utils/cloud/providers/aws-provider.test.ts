import { AwsCloudProvider } from '../../../../../src/allocator/utils/cloud/providers';
import { CloudProviderType } from '../../../../../src/allocator/utils/cloud/types';

describe('AwsCloudProvider', () => {
  let provider: AwsCloudProvider;
  
  beforeEach(() => {
    provider = new AwsCloudProvider();
  });
  
  describe('basic properties', () => {
    it('should have the correct provider type', () => {
      expect(provider.getType()).toBe(CloudProviderType.AWS);
    });
    
    it('should have the correct display name', () => {
      expect(provider.getName()).toBe('Amazon Web Services');
    });
  });
  
  describe('region patterns', () => {
    it('should match valid AWS region patterns', () => {
      expect(provider.matchesRegion('us-east-1')).toBe(true);
      expect(provider.matchesRegion('eu-west-2')).toBe(true);
      expect(provider.matchesRegion('ap-southeast-1')).toBe(true);
      expect(provider.matchesRegion('us-gov-east-1')).toBe(true);
    });
    
    it('should not match non-AWS region patterns', () => {
      expect(provider.matchesRegion('eastus')).toBe(false);
      expect(provider.matchesRegion('us-central1')).toBe(false);
      expect(provider.matchesRegion('invalid-region')).toBe(false);
    });
  });
  
  describe('region info', () => {
    it('should return region info for valid regions', () => {
      const regionInfo = provider.getRegionInfo('us-east-1');
      expect(regionInfo).toBeDefined();
      expect(regionInfo?.name).toBe('us-east-1');
      expect(regionInfo?.displayName).toBe('US East (N. Virginia)');
      expect(regionInfo?.defaultAzCount).toBe(6);
    });
    
    it('should return undefined for invalid regions', () => {
      expect(provider.getRegionInfo('invalid-region')).toBeUndefined();
    });
  });
  
  describe('generateAzNames', () => {
    it('should generate correct AWS AZ names', () => {
      const azNames = provider.generateAzNames('us-east-1', 3);
      expect(azNames).toEqual(['us-east-1a', 'us-east-1b', 'us-east-1c']);
    });
    
    it('should limit AZ count to the maximum for the region', () => {
      // Request more than the maximum allowed for the region
      const azNames = provider.generateAzNames('us-east-1', 10);
      // us-east-1 has a maxAzCount of 6
      expect(azNames).toHaveLength(6);
      expect(azNames).toEqual(['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f']);
    });
    
    it('should handle regions with non-sequential AZs', () => {
      const azNames = provider.generateAzNames('us-west-1', 3);
      // us-west-1 has AZs 'a' and 'c' (no 'b')
      expect(azNames).toHaveLength(2);
      expect(azNames).toEqual(['us-west-1a', 'us-west-1c']);
    });
    
    it('should correctly handle ap-northeast-1', () => {
      const azNames = provider.generateAzNames('ap-northeast-1', 3);
      // ap-northeast-1 has AZs 'a', 'c', and 'd' (no 'b')
      expect(azNames).toHaveLength(3);
      expect(azNames).toEqual(['ap-northeast-1a', 'ap-northeast-1c', 'ap-northeast-1d']);
    });
    
    it('should generate AZ names even for unknown regions', () => {
      const azNames = provider.generateAzNames('unknown-region', 2);
      expect(azNames).toEqual(['unknown-regiona', 'unknown-regionb']);
    });
  });
  
  describe('normalizeRegionName', () => {
    it('should convert region names to lowercase', () => {
      expect(provider.normalizeRegionName('US-EAST-1')).toBe('us-east-1');
      expect(provider.normalizeRegionName('Eu-West-2')).toBe('eu-west-2');
    });
  });
  
  describe('isValidRegion', () => {
    it('should validate known AWS regions', () => {
      expect(provider.isValidRegion('us-east-1')).toBe(true);
      expect(provider.isValidRegion('eu-west-2')).toBe(true);
      expect(provider.isValidRegion('ap-southeast-1')).toBe(true);
    });
    
    it('should reject unknown regions', () => {
      expect(provider.isValidRegion('invalid-region')).toBe(false);
      expect(provider.isValidRegion('eastus')).toBe(false);
    });
  });
}); 