import { AzHelper } from '../../../../src/allocator/utils/cloud/az';

describe('AzHelper', () => {
  it('should generate correct AZ names for AWS regions', () => {
    const azNames = AzHelper.generateNames('us-east-1', 3);
    expect(azNames).toHaveLength(3);
    expect(azNames).toContain('us-east-1a');
    expect(azNames).toContain('us-east-1b');
    expect(azNames).toContain('us-east-1c');
  });
  
  it('should handle custom numbers of AZs', () => {
    const azNames = AzHelper.generateNames('us-east-1', 2);
    expect(azNames).toHaveLength(2);
    expect(azNames).toContain('us-east-1a');
    expect(azNames).toContain('us-east-1b');
  });
  
  it('should generate correct AZ names for Azure regions', () => {
    const newAzNames = AzHelper.generateNames('swedencentral', 3);
    expect(newAzNames).toHaveLength(3);
    expect(newAzNames).toContain('swedencentrala');
    expect(newAzNames).toContain('swedencentralb');
    expect(newAzNames).toContain('swedencentralc');
  });
  
  it('should generate correct AZ names for GCP regions', () => {
    const azNames = AzHelper.generateNames('us-central1', 3);
    expect(azNames).toHaveLength(3);
    // GCP format doesn't use a dash between region and letter
    expect(azNames).toContain('us-central1a');
    expect(azNames).toContain('us-central1b');
    expect(azNames).toContain('us-central1c');
  });
}); 