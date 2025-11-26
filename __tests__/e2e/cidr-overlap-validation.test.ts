import path from 'path';
import fs from 'fs';
import { loadConfig, ConfigurationError } from '@subnetter/core';

describe('CIDR Overlap Validation E2E Tests', () => {
  const invalidOverlappingConfigPath = path.resolve(
    __dirname, 
    '../../examples/test-configs/invalid-overlapping-cidr.json'
  );
  
  const validConfigPath = path.resolve(
    __dirname,
    '../../examples/config.json'
  );
  
  beforeAll(() => {
    // Verify the test fixture exists
    if (!fs.existsSync(invalidOverlappingConfigPath)) {
      throw new Error(`Test fixture does not exist: ${invalidOverlappingConfigPath}`);
    }
  });
  
  it('should reject configurations with overlapping baseCidrs', () => {
    // The invalid-overlapping-cidr.json has two accounts:
    // - account-1 with baseCidr 10.0.0.0/16
    // - account-2 with baseCidr 10.0.0.0/20 (overlaps with account-1)
    
    expect(() => loadConfig(invalidOverlappingConfigPath)).toThrow(ConfigurationError);
    
    try {
      loadConfig(invalidOverlappingConfigPath);
      fail('Expected ConfigurationError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).message).toContain('Overlapping CIDRs detected');
      expect((error as ConfigurationError).code).toBe(3001); // CIDR_OVERLAP error code
    }
  });
  
  it('should accept configurations with non-overlapping baseCidrs', () => {
    // The main config.json should have non-overlapping CIDRs
    expect(() => loadConfig(validConfigPath)).not.toThrow();
    
    const config = loadConfig(validConfigPath);
    expect(config).toBeDefined();
    expect(config.accounts.length).toBeGreaterThan(0);
  });
  
  it('should provide helpful error context for overlapping CIDRs', () => {
    try {
      loadConfig(invalidOverlappingConfigPath);
      fail('Expected ConfigurationError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      
      const configError = error as ConfigurationError;
      
      // Verify error context includes the overlapping CIDRs
      expect(configError.context).toBeDefined();
      expect(configError.context.cidr1).toBeDefined();
      expect(configError.context.cidr2).toBeDefined();
      expect(configError.context.cidr1Path).toBeDefined();
      expect(configError.context.cidr2Path).toBeDefined();
    }
  });
});

