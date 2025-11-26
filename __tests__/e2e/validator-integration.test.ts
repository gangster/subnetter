import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validateNoOverlappingCidrs, loadConfig, CidrAllocator } from '@subnetter/core';

const execAsync = promisify(exec);

// Define test timeout (15 seconds)
jest.setTimeout(15000);

describe('Output Validator Integration', () => {
  const validConfigPath = path.join(process.cwd(), 'examples', 'test-configs', 'multi-cloud-config.json');
  const invalidConfigPath = path.join(process.cwd(), 'examples', 'test-configs', 'invalid-overlapping-cidr.json');
  const outputFile = path.join(process.cwd(), 'validator-test-output.csv');
  const cliPath = path.join(process.cwd(), 'packages', 'cli', 'dist', 'index.js');
  
  // Clean up after tests
  afterAll(() => {
    if (fs.existsSync(outputFile)) {
      try {
        fs.unlinkSync(outputFile);
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    }
  });
  
  test('CLI should reject configurations with overlapping CIDRs', async () => {
    // Verify the invalid config file exists
    expect(fs.existsSync(invalidConfigPath)).toBe(true);
    
    // Run the CLI - should fail due to overlapping CIDRs
    try {
      await execAsync(
        `node ${cliPath} generate -c ${invalidConfigPath} -o ${outputFile}`
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // Command should exit with non-zero status
      expect(error.code).not.toBe(0);
      
      // Error message should contain info about overlapping CIDRs
      expect(error.stdout + error.stderr).toContain('Overlapping CIDRs');
      expect(error.stdout + error.stderr).toContain('3001');
    }
  });
  
  test('validateNoOverlappingCidrs should detect overlaps in allocations', () => {
    // Load a valid config and generate allocations
    const config = loadConfig(validConfigPath);
    const allocator = new CidrAllocator(config);
    const allocations = allocator.generateAllocations();
    
    // Valid config should produce non-overlapping allocations
    const validationResult = validateNoOverlappingCidrs(allocations);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.overlaps).toHaveLength(0);
  });
  
  test('validateNoOverlappingCidrs should detect manually created overlapping allocations', () => {
    // Create fake allocations with overlapping CIDRs
    const overlappingAllocations = [
      {
        accountName: 'test',
        vpcName: 'test-vpc',
        cloudProvider: 'aws',
        regionName: 'us-east-1',
        availabilityZone: 'us-east-1a',
        regionCidr: '10.0.0.0/16',
        vpcCidr: '10.0.0.0/16',
        azCidr: '10.0.0.0/24',
        subnetCidr: '10.0.0.0/26',
        subnetRole: 'Public',
        usableIps: 62
      },
      {
        accountName: 'test',
        vpcName: 'test-vpc',
        cloudProvider: 'aws',
        regionName: 'us-east-1',
        availabilityZone: 'us-east-1a',
        regionCidr: '10.0.0.0/16',
        vpcCidr: '10.0.0.0/16',
        azCidr: '10.0.0.0/24',
        subnetCidr: '10.0.0.0/26', // Same CIDR - overlapping!
        subnetRole: 'Private',
        usableIps: 62
      }
    ];
    
    const validationResult = validateNoOverlappingCidrs(overlappingAllocations);
    expect(validationResult.valid).toBe(false);
    expect(validationResult.overlaps.length).toBeGreaterThan(0);
  });
});
