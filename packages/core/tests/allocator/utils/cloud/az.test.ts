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
    expect(azNames).toContain('eastusa');
    expect(azNames).toContain('eastusb');
    expect(azNames).toContain('eastusc');
  });

  test('should generate correct AZ names for GCP regions', () => {
    const azNames = AzHelper.generateNames('us-central1', 3);
    expect(azNames).toHaveLength(3);
    expect(azNames).toContain('us-central1a');
    expect(azNames).toContain('us-central1b');
    expect(azNames).toContain('us-central1c');
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