import { ProviderDetector } from '../../../../src/index';

describe('ProviderDetector', () => {
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