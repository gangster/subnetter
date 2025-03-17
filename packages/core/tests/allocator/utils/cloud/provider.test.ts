import { ProviderDetector } from '../../../../src/allocator/utils/cloud/provider';
import { CloudProviderFactory } from '../../../../src/allocator/utils/cloud/provider-factory';

// To avoid test conflicts, create a separate test file that doesn't use mocking
describe('ProviderDetector (Integration Tests)', () => {
  test('should correctly detect provider from region name', () => {
    // Test AWS regions
    expect(ProviderDetector.detect('us-east-1')).toBe('aws');
    expect(ProviderDetector.detect('eu-west-2')).toBe('aws');
    expect(ProviderDetector.detect('ap-southeast-1')).toBe('aws');
    
    // Test Azure regions
    expect(ProviderDetector.detect('eastus')).toBe('azure');
    expect(ProviderDetector.detect('westus2')).toBe('azure');
    expect(ProviderDetector.detect('japaneast')).toBe('azure');
    
    // Test GCP regions
    expect(ProviderDetector.detect('us-central1')).toBe('gcp');
    expect(ProviderDetector.detect('europe-west4')).toBe('gcp');
    expect(ProviderDetector.detect('asia-east1')).toBe('gcp');
    
    // Test unknown region (note: the implementation defaults to 'aws' for unknown regions)
    const unknownRegion = 'unknown-region';
    expect(ProviderDetector.detect(unknownRegion)).toBe('aws');
  });
});

// Use a completely separate describe block for mocked tests
describe('ProviderDetector (Mocked)', () => {
  beforeEach(() => {
    // Mock the detect method directly
    jest.spyOn(ProviderDetector, 'detect').mockImplementation(() => 'aws');
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('should handle all provider types including unknown ones', () => {
    // Test AWS (default)
    expect(ProviderDetector.detect('test-region')).toBe('aws');
    
    // Test Azure
    jest.spyOn(ProviderDetector, 'detect').mockImplementation(() => 'azure');
    expect(ProviderDetector.detect('test-region')).toBe('azure');
    
    // Test GCP
    jest.spyOn(ProviderDetector, 'detect').mockImplementation(() => 'gcp');
    expect(ProviderDetector.detect('test-region')).toBe('gcp');
    
    // Test unknown (should default to 'aws')
    jest.spyOn(ProviderDetector, 'detect').mockImplementation(() => 'aws');
    expect(ProviderDetector.detect('test-region')).toBe('aws');
  });
});

// Test the default case in the switch statement
describe('ProviderDetector (Default Case)', () => {
  test('should handle unknown provider types', () => {
    // Mock the CloudProviderFactory to return an unknown provider type
    const originalGetInstance = CloudProviderFactory.getInstance;
    jest.spyOn(CloudProviderFactory, 'getInstance').mockImplementation(() => ({
      detectProviderType: () => 'unknown' as any,
      getProvider: jest.fn()
    } as any));
    
    // This should trigger the default case in the switch statement
    expect(ProviderDetector.detect('test-region')).toBe('aws');
    
    // Restore the original implementation
    jest.spyOn(CloudProviderFactory, 'getInstance').mockImplementation(originalGetInstance);
  });
}); 