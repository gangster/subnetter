import { CidrAllocator, ProviderDetector, Config } from '../../../../src/index';

describe('CidrAllocator with Region Detection', () => {
  describe('getProviderForRegion', () => {
    it('should correctly identify AWS regions', () => {
      // Test standard AWS regions
      expect(ProviderDetector.detect('us-east-1')).toBe('aws');
      expect(ProviderDetector.detect('eu-west-2')).toBe('aws');
      expect(ProviderDetector.detect('ap-southeast-1')).toBe('aws');
      
      // Test AWS GovCloud
      expect(ProviderDetector.detect('us-gov-east-1')).toBe('aws');
      
      // Test AWS China
      expect(ProviderDetector.detect('cn-north-1')).toBe('aws');
    });
    
    it('should correctly identify Azure regions', () => {
      // Test standard Azure regions
      expect(ProviderDetector.detect('eastus')).toBe('azure');
      expect(ProviderDetector.detect('westeurope')).toBe('azure');
      expect(ProviderDetector.detect('japaneast')).toBe('azure');
      expect(ProviderDetector.detect('southeastasia')).toBe('azure');
      
      // Test Azure Government
      expect(ProviderDetector.detect('usgovvirginia')).toBe('azure');
      
      // Test Azure China
      expect(ProviderDetector.detect('chinaeast')).toBe('azure');
    });
    
    it('should correctly identify GCP regions', () => {
      // Test standard GCP regions
      expect(ProviderDetector.detect('us-central1')).toBe('gcp');
      expect(ProviderDetector.detect('europe-west4')).toBe('gcp');
      expect(ProviderDetector.detect('asia-east1')).toBe('gcp');
      expect(ProviderDetector.detect('australia-southeast1')).toBe('gcp');
    });
    
    it('should default to AWS for unknown regions', () => {
      // Test unknown regions
      expect(ProviderDetector.detect('unknown-region')).toBe('aws');
      expect(ProviderDetector.detect('custom-region-name')).toBe('aws');
      expect(ProviderDetector.detect('')).toBe('aws');
    });
  });
  
  describe('allocation with region detection', () => {
    it('should correctly determine provider during allocation', () => {
      // Create a config with a region but no explicit provider
      const configWithImplicitProvider: Config = {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws', 'azure', 'gcp'],
        accounts: [
          {
            name: 'test-account',
            // @ts-expect-error - using legacy format intentionally for testing
            regions: ['us-east-1'] // AWS region
          }
        ],
        subnetTypes: {
          'Public': 26
        }
      };
      
      const allocator = new CidrAllocator(configWithImplicitProvider);
      const allocations = allocator.generateAllocations();
      
      // All allocations should have 'aws' as provider (inferred from us-east-1)
      allocations.forEach(allocation => {
        expect(allocation.cloudProvider).toBe('aws');
      });
    });
    
    it('should correctly identify providers for different region types', () => {
      // Create a config with multiple regions across providers but no explicit provider
      const configWithMultipleRegions: Config = {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws', 'azure', 'gcp'],
        accounts: [
          {
            name: 'aws-account',
            // @ts-expect-error - using legacy format intentionally for testing
            regions: ['us-east-1'] // AWS region
          },
          {
            name: 'azure-account',
            // @ts-expect-error - using legacy format intentionally for testing
            regions: ['eastus'] // Azure region
          },
          {
            name: 'gcp-account',
            // @ts-expect-error - using legacy format intentionally for testing
            regions: ['us-central1'] // GCP region
          }
        ],
        subnetTypes: {
          'Public': 26
        }
      };
      
      const allocator = new CidrAllocator(configWithMultipleRegions);
      const allocations = allocator.generateAllocations();
      
      // Find allocations for each account
      const awsAllocations = allocations.filter(a => a.accountName === 'aws-account');
      const azureAllocations = allocations.filter(a => a.accountName === 'azure-account');
      const gcpAllocations = allocations.filter(a => a.accountName === 'gcp-account');
      
      // Verify correct provider detection
      awsAllocations.forEach(allocation => {
        expect(allocation.cloudProvider).toBe('aws');
      });
      
      azureAllocations.forEach(allocation => {
        expect(allocation.cloudProvider).toBe('azure');
      });
      
      gcpAllocations.forEach(allocation => {
        expect(allocation.cloudProvider).toBe('gcp');
      });
    });

    it('should handle mixed account formats', () => {
      const configMixed: Config = {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws', 'azure', 'gcp'],
        accounts: [
          {
            name: 'aws-account',
            clouds: {
              aws: {
                regions: ['us-east-1', 'us-west-2']
              }
            }
          },
          {
            name: 'azure-account',
            clouds: {
              azure: {
                regions: ['eastus', 'westeurope']
              }
            }
          }
        ],
        subnetTypes: {
          'Public': 26
        }
      };

      const allocator = new CidrAllocator(configMixed);
      const allocations = allocator.generateAllocations();
      
      // Verify AWS allocations
      const awsAllocations = allocations.filter(a => a.accountName === 'aws-account');
      awsAllocations.forEach(allocation => {
        expect(allocation.cloudProvider).toBe('aws');
      });
      
      // Verify Azure allocations
      const azureAllocations = allocations.filter(a => a.accountName === 'azure-account');
      azureAllocations.forEach(allocation => {
        expect(allocation.cloudProvider).toBe('azure');
      });
    });

    it('should handle empty configs gracefully', () => {
      const emptyConfig: Config = {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [
          {
            name: 'empty-account',
            clouds: {}
          }
        ],
        subnetTypes: {
          'Public': 26
        }
      };

      const allocator = new CidrAllocator(emptyConfig);
      const allocations = allocator.generateAllocations();
      
      // All allocations should be empty
      expect(allocations.length).toBe(0);
    });
  });
}); 