import { CloudProviderFactory } from '../../../../src/allocator/utils/cloud/provider-factory';
import { CloudProviderType } from '../../../../src/allocator/utils/cloud/types';
import { 
  AwsCloudProvider, 
  AzureCloudProvider, 
  GcpCloudProvider 
} from '../../../../src/allocator/utils/cloud/providers';

describe('CloudProviderFactory', () => {
  let factory: CloudProviderFactory;
  
  beforeEach(() => {
    // Reset the singleton instance for each test
    // @ts-expect-error: Accessing private static field for testing
    CloudProviderFactory.instance = undefined;
    factory = CloudProviderFactory.getInstance();
  });
  
  it('should be a singleton', () => {
    const instance1 = CloudProviderFactory.getInstance();
    const instance2 = CloudProviderFactory.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  describe('getProvider', () => {
    it('should return AWS provider for AWS type', () => {
      const provider = factory.getProvider(CloudProviderType.AWS);
      
      expect(provider).toBeInstanceOf(AwsCloudProvider);
      expect(provider.getType()).toBe(CloudProviderType.AWS);
    });
    
    it('should return Azure provider for Azure type', () => {
      const provider = factory.getProvider(CloudProviderType.AZURE);
      
      expect(provider).toBeInstanceOf(AzureCloudProvider);
      expect(provider.getType()).toBe(CloudProviderType.AZURE);
    });
    
    it('should return GCP provider for GCP type', () => {
      const provider = factory.getProvider(CloudProviderType.GCP);
      
      expect(provider).toBeInstanceOf(GcpCloudProvider);
      expect(provider.getType()).toBe(CloudProviderType.GCP);
    });
    
    it('should fall back to AWS provider for unknown type', () => {
      // @ts-expect-error Testing with invalid type
      const provider = factory.getProvider('invalid');
      
      expect(provider).toBeInstanceOf(AwsCloudProvider);
      expect(provider.getType()).toBe(CloudProviderType.AWS);
    });
    
    it('should handle the case when a provider is not found in the map', () => {
      // Create a scenario where a provider is not found in the map
      const mockFactory = factory as any;
      const originalMap = mockFactory.providers;
      
      // Create a new map without the AWS provider
      const newMap = new Map();
      for (const [key, value] of originalMap.entries()) {
        if (key !== CloudProviderType.AWS) {
          newMap.set(key, value);
        }
      }
      
      // Replace the map
      mockFactory.providers = newMap;
      
      // This should throw an error because AWS provider is not found and it's the fallback
      expect(() => {
        // @ts-expect-error Testing with invalid type
        factory.getProvider('invalid');
      }).toThrow('AWS provider not found, this should never happen');
      
      // Restore the original map for other tests
      mockFactory.providers = originalMap;
    });
  });
  
  describe('detectProviderType', () => {
    it('should detect AWS regions', () => {
      expect(factory.detectProviderType('us-east-1')).toBe(CloudProviderType.AWS);
      expect(factory.detectProviderType('eu-west-2')).toBe(CloudProviderType.AWS);
      expect(factory.detectProviderType('ap-southeast-1')).toBe(CloudProviderType.AWS);
      expect(factory.detectProviderType('us-gov-east-1')).toBe(CloudProviderType.AWS);
    });
    
    it('should detect Azure regions', () => {
      expect(factory.detectProviderType('eastus')).toBe(CloudProviderType.AZURE);
      expect(factory.detectProviderType('westeurope')).toBe(CloudProviderType.AZURE);
      expect(factory.detectProviderType('japaneast')).toBe(CloudProviderType.AZURE);
      expect(factory.detectProviderType('usgovvirginia')).toBe(CloudProviderType.AZURE);
    });
    
    it('should detect GCP regions', () => {
      expect(factory.detectProviderType('us-central1')).toBe(CloudProviderType.GCP);
      expect(factory.detectProviderType('europe-west4')).toBe(CloudProviderType.GCP);
      expect(factory.detectProviderType('asia-east1')).toBe(CloudProviderType.GCP);
    });
    
    it('should default to AWS for unknown regions', () => {
      expect(factory.detectProviderType('invalid-region')).toBe(CloudProviderType.AWS);
    });
    
    it('should be case-insensitive', () => {
      expect(factory.detectProviderType('US-EAST-1')).toBe(CloudProviderType.AWS);
      expect(factory.detectProviderType('EastUS')).toBe(CloudProviderType.AZURE);
      expect(factory.detectProviderType('US-CENTRAL1')).toBe(CloudProviderType.GCP);
    });
    
    it('should handle null or empty region names', () => {
      // @ts-expect-error Testing with invalid input
      expect(factory.detectProviderType(null)).toBe(CloudProviderType.AWS);
      expect(factory.detectProviderType('')).toBe(CloudProviderType.AWS);
    });
  });
}); 