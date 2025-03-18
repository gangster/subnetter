import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validateNoOverlappingCidrs } from '@subnetter/core';

const execAsync = promisify(exec);

// Define test timeout (15 seconds)
jest.setTimeout(15000);

describe('Output Validator Integration', () => {
  // Use the example that was already working in our manual tests
  const exampleConfigPath = path.join(process.cwd(), 'examples', 'overlap-test-config.json');
  const outputFile = path.join(process.cwd(), 'overlap-output.csv');
  const cliPath = path.join(process.cwd(), 'packages', 'cli', 'dist', 'index.js');
  
  // Clean up after tests
  afterAll(() => {
    // Clean up output file if it exists
    if (fs.existsSync(outputFile)) {
      try {
        fs.unlinkSync(outputFile);
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    }
  });
  
  test('CLI should warn about overlapping CIDRs but still generate allocations', async () => {
    // Verify the example config file exists
    expect(fs.existsSync(exampleConfigPath)).toBe(true);
    
    // Run the CLI to generate allocations with overlapping CIDRs
    const { stdout, stderr } = await execAsync(
      `node ${cliPath} generate -c ${exampleConfigPath} -o ${outputFile}`
    );
    
    // Output should contain a warning about overlaps
    expect(stdout + stderr).toContain('Warning');
    expect(stdout + stderr).toContain('overlaps');
    
    // The file should be written despite overlaps
    expect(fs.existsSync(outputFile)).toBe(true);
    
    // Verify the file contents with our validator directly
    const fileContent = fs.readFileSync(outputFile, 'utf8');
    const lines = fileContent.split('\n');
    const dataLines = lines.slice(1).filter(line => line.trim().length > 0);
    
    // Parse the CSV data into allocation objects
    const allocations = dataLines.map(line => {
      const fields = line.split(',');
      return {
        accountName: fields[0] || '',
        vpcName: fields[1] || '',
        cloudProvider: fields[2] || '',
        regionName: fields[3] || '',
        availabilityZone: fields[4] || '',
        regionCidr: fields[5] || '',
        vpcCidr: fields[6] || '',
        azCidr: fields[7] || '',
        subnetCidr: fields[8] || '',
        subnetRole: fields[9] || '',
        usableIps: parseInt(fields[10] || '0', 10)
      };
    });
    
    // Validate with our function directly
    const validationResult = validateNoOverlappingCidrs(allocations);
    
    // Confirm it detects overlaps
    expect(validationResult.valid).toBe(false);
    expect(validationResult.overlaps.length).toBeGreaterThan(0);
  });
  
  test('validate-allocations command should detect overlaps in existing file', async () => {
    // First ensure the file exists
    expect(fs.existsSync(outputFile)).toBe(true);
    
    // Run the validate-allocations command
    try {
      await execAsync(
        `node ${cliPath} validate-allocations -f ${outputFile}`
      );
      // Should not reach here as the command should exit with an error
      expect(true).toBe(false); 
    } catch (error: any) { // Type the error as any to access properties
      // Command should exit with non-zero status due to overlaps
      expect(error.code).not.toBe(0);
      
      // Error message should contain info about overlaps
      expect(error.stdout + error.stderr).toContain('overlaps');
    }
  });
}); 