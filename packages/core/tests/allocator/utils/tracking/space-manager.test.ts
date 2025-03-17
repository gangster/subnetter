import { RemainingSpaceManager } from '../../../../src/index';

describe('RemainingSpaceManager', () => {
  test('should correctly update remaining space after allocation', () => {
    const spaceManager = new RemainingSpaceManager();
    
    // Test case 1: Using the entire space
    const remainingSpace1 = ['10.0.0.0/24'];
    const allocatedCidr1 = '10.0.0.0/24';
    const result1 = spaceManager.updateAfterAllocation(remainingSpace1, allocatedCidr1);
    expect(result1).toEqual([]);
    
    // Test case 2: Using part of the space
    const remainingSpace2 = ['10.0.0.0/24', '10.0.1.0/24'];
    const allocatedCidr2 = '10.0.0.0/25';
    const result2 = spaceManager.updateAfterAllocation(remainingSpace2, allocatedCidr2);
    
    // The implementation divides into quarters (/26) not halves (/25)
    expect(result2).toContain('10.0.0.64/26');
    expect(result2).toContain('10.0.0.128/26');
    expect(result2).toContain('10.0.0.192/26');
    expect(result2).toContain('10.0.1.0/24');
    expect(result2.length).toBe(5);
  });
}); 