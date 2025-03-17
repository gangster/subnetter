import { AwsCloudProvider, AzureCloudProvider, GcpCloudProvider } from '../../../../src/allocator/utils/cloud/providers';
import { CloudProviderType } from '../../../../src/allocator/utils/cloud/types';

describe('Cloud Provider Implementations', () => {
  describe('AWS Provider', () => {
    const awsProvider = new AwsCloudProvider();
    
    it('should have the correct type and name', () => {
      expect(awsProvider.getType()).toBe(CloudProviderType.AWS);
      expect(awsProvider.getName()).toBe('Amazon Web Services');
    });
    
    it('should match AWS region patterns', () => {
      expect(awsProvider.matchesRegion('us-east-1')).toBe(true);
      expect(awsProvider.matchesRegion('eu-west-2')).toBe(true);
      expect(awsProvider.matchesRegion('ap-southeast-1')).toBe(true);
      expect(awsProvider.matchesRegion('us-gov-east-1')).toBe(true);
      
      // Should not match other providers' regions
      expect(awsProvider.matchesRegion('eastus')).toBe(false);
      expect(awsProvider.matchesRegion('us-central1')).toBe(false);
    });
    
    it('should generate correct AZ names', () => {
      const azNames = awsProvider.generateAzNames('us-east-1', 3);
      expect(azNames).toEqual(['us-east-1a', 'us-east-1b', 'us-east-1c']);
      
      // Should respect max AZ count for the region
      const usWest1Azs = awsProvider.generateAzNames('us-west-1', 5);
      expect(usWest1Azs.length).toBeLessThanOrEqual(4); // us-west-1 has max 4 AZs
    });
    
    it('should normalize region names', () => {
      expect(awsProvider.normalizeRegionName('US-EAST-1')).toBe('us-east-1');
      expect(awsProvider.normalizeRegionName('us-east-1')).toBe('us-east-1');
    });
    
    it('should provide region information', () => {
      const regionInfo = awsProvider.getRegionInfo('us-east-1');
      expect(regionInfo).toBeDefined();
      expect(regionInfo?.name).toBe('us-east-1');
      expect(regionInfo?.displayName).toContain('N. Virginia');
      expect(regionInfo?.defaultAzCount).toBeGreaterThanOrEqual(3);
    });
    
    it('should validate regions correctly', () => {
      expect(awsProvider.isValidRegion('us-east-1')).toBe(true);
      expect(awsProvider.isValidRegion('invalid-region')).toBe(false);
    });
  });
  
  describe('Azure Provider', () => {
    const azureProvider = new AzureCloudProvider();
    
    it('should have the correct type and name', () => {
      expect(azureProvider.getType()).toBe(CloudProviderType.AZURE);
      expect(azureProvider.getName()).toBe('Microsoft Azure');
    });
    
    it('should match Azure region patterns', () => {
      expect(azureProvider.matchesRegion('eastus')).toBe(true);
      expect(azureProvider.matchesRegion('westeurope')).toBe(true);
      expect(azureProvider.matchesRegion('japaneast')).toBe(true);
      expect(azureProvider.matchesRegion('usgovvirginia')).toBe(true);
      
      // Should not match other providers' regions
      expect(azureProvider.matchesRegion('us-east-1')).toBe(false);
      expect(azureProvider.matchesRegion('us-central1')).toBe(false);
    });
    
    it('should generate correct AZ names', () => {
      const azNames = azureProvider.generateAzNames('eastus', 3);
      expect(azNames).toEqual(['eastus-1', 'eastus-2', 'eastus-3']);
      
      // Should respect max AZ count for the region
      const westusAzs = azureProvider.generateAzNames('westus', 5);
      expect(westusAzs.length).toBeLessThanOrEqual(3); // Most Azure regions have 3 AZs
    });
    
    it('should normalize region names', () => {
      expect(azureProvider.normalizeRegionName('EastUS')).toBe('eastus');
      expect(azureProvider.normalizeRegionName('eastus')).toBe('eastus');
    });
    
    it('should provide region information', () => {
      const regionInfo = azureProvider.getRegionInfo('eastus');
      expect(regionInfo).toBeDefined();
      expect(regionInfo?.name).toBe('eastus');
      expect(regionInfo?.displayName).toContain('East US');
      expect(regionInfo?.defaultAzCount).toBeGreaterThanOrEqual(3);
    });
    
    it('should validate regions correctly', () => {
      expect(azureProvider.isValidRegion('eastus')).toBe(true);
      expect(azureProvider.isValidRegion('invalid-region')).toBe(false);
    });
  });
  
  describe('GCP Provider', () => {
    const gcpProvider = new GcpCloudProvider();
    
    it('should have the correct type and name', () => {
      expect(gcpProvider.getType()).toBe(CloudProviderType.GCP);
      expect(gcpProvider.getName()).toBe('Google Cloud Platform');
    });
    
    it('should match GCP region patterns', () => {
      expect(gcpProvider.matchesRegion('us-central1')).toBe(true);
      expect(gcpProvider.matchesRegion('europe-west4')).toBe(true);
      expect(gcpProvider.matchesRegion('asia-east1')).toBe(true);
      
      // Should not match other providers' regions
      expect(gcpProvider.matchesRegion('us-east-1')).toBe(false);
      expect(gcpProvider.matchesRegion('eastus')).toBe(false);
    });
    
    it('should generate correct AZ names', () => {
      const azNames = gcpProvider.generateAzNames('us-central1', 3);
      expect(azNames).toEqual(['us-central1a', 'us-central1b', 'us-central1c']);
      
      // Should respect max AZ count for the region
      const usEast1Azs = gcpProvider.generateAzNames('us-east1', 5);
      expect(usEast1Azs.length).toBeLessThanOrEqual(3); // Most GCP regions have 3 AZs
    });
    
    it('should normalize region names', () => {
      expect(gcpProvider.normalizeRegionName('US-CENTRAL1')).toBe('us-central1');
      expect(gcpProvider.normalizeRegionName('us-central1')).toBe('us-central1');
    });
    
    it('should provide region information', () => {
      const regionInfo = gcpProvider.getRegionInfo('us-central1');
      expect(regionInfo).toBeDefined();
      expect(regionInfo?.name).toBe('us-central1');
      expect(regionInfo?.displayName).toContain('Iowa');
      expect(regionInfo?.defaultAzCount).toBeGreaterThanOrEqual(3);
    });
    
    it('should validate regions correctly', () => {
      expect(gcpProvider.isValidRegion('us-central1')).toBe(true);
      expect(gcpProvider.isValidRegion('invalid-region')).toBe(false);
    });
  });
}); 