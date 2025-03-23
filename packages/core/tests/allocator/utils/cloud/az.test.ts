import { AzHelper } from '../../../../src/index';

describe('AzHelper', () => {
  test('should generate correct AZ names for AWS regions', () => {
    const azNames = AzHelper.generateNames('us-east-1', 3);
    expect(azNames).toHaveLength(3);
    expect(azNames).toContain('us-east-1a');
    expect(azNames).toContain('us-east-1b');
    expect(azNames).toContain('us-east-1c');
  });

  test('should generate correct AZ names for Azure regions', () => {
    const azNames = AzHelper.generateNames('eastus', 3);
    expect(azNames).toHaveLength(3);
    // Legacy behavior for AzHelper is preserved for backward compatibility
    expect(azNames).toContain('eastusa');
    expect(azNames).toContain('eastusb');
    expect(azNames).toContain('eastusc');
    
    // For non-legacy Azure regions, should use newer format
    const newAzNames = AzHelper.generateNames('swedencentral', 3);
    expect(newAzNames).toHaveLength(3);
    expect(newAzNames).toContain('swedencentral-1');
    expect(newAzNames).toContain('swedencentral-2');
    expect(newAzNames).toContain('swedencentral-3');
  });

  test('should generate correct AZ names for GCP regions', () => {
    const azNames = AzHelper.generateNames('us-central1', 3);
    expect(azNames).toHaveLength(3);
    // GCP format is different - has a dash between region and letter
    expect(azNames).toContain('us-central1-a');
    expect(azNames).toContain('us-central1-b');
    expect(azNames).toContain('us-central1-c');
    
    // Special case for us-east1 which should have b, c, d
    const usEast1Names = AzHelper.generateNames('us-east1', 3);
    expect(usEast1Names).toHaveLength(3);
    expect(usEast1Names).toContain('us-east1-b');
    expect(usEast1Names).toContain('us-east1-c');
    expect(usEast1Names).toContain('us-east1-d');
  });

  test('should handle custom number of AZs', () => {
    const azNames = AzHelper.generateNames('us-east-1', 5);
    expect(azNames).toHaveLength(5);
    expect(azNames).toContain('us-east-1a');
    expect(azNames).toContain('us-east-1b');
    expect(azNames).toContain('us-east-1c');
    expect(azNames).toContain('us-east-1d');
    expect(azNames).toContain('us-east-1e');
  });
}); 