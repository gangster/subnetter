import { RawConfig } from '../../src/models/types';
import { validateConfig } from '../../src/config/loader';

describe('Streamlined Configuration Formats', () => {
  it('should validate and normalize object format for subnet types', () => {
    // Map format for subnet types
    const config: RawConfig = {
      baseCidr: '10.0.0.0/8',
      accounts: [
        {
          name: 'test-account',
          clouds: {
            aws: {
              regions: ['us-east-1', 'us-west-2']
            }
          }
        }
      ],
      subnetTypes: {
        'Public': 24,
        'Private': 26,
        'Data': 28
      }
    };

    // Validate the config
    const validatedConfig = validateConfig(config);

    // Check the normalized config
    expect(validatedConfig).toBeDefined();
    expect(validatedConfig.subnetTypes).toBeDefined();
    
    // Verify the subnet types are in the expected format
    expect(validatedConfig.subnetTypes).toEqual({
      'Public': 24,
      'Private': 26,
      'Data': 28
    });
    
    // Verify specific subnet types by their keys
    expect(validatedConfig.subnetTypes['Public']).toBe(24);
    expect(validatedConfig.subnetTypes['Private']).toBe(26);
    expect(validatedConfig.subnetTypes['Data']).toBe(28);
  });

  it('should throw validation error for invalid subnet types format', () => {
    // Invalid format - string value instead of number
    const invalidConfig = {
      baseCidr: '10.0.0.0/8',
      accounts: [
        {
          name: 'test-account',
          clouds: {
            aws: {
              regions: ['us-east-1', 'us-west-2']
            }
          }
        }
      ],
      subnetTypes: {
        'Public': 'not-a-number'
      }
    };

    // Should throw validation error
    expect(() => validateConfig(invalidConfig)).toThrow();
  });

  it('should throw validation error for invalid prefix length', () => {
    // Invalid prefix length (33 > 32)
    const invalidConfig: RawConfig = {
      baseCidr: '10.0.0.0/8',
      accounts: [
        {
          name: 'test-account',
          clouds: {
            aws: {
              regions: ['us-east-1', 'us-west-2']
            }
          }
        }
      ],
      subnetTypes: {
        'Public': 33, // Invalid - must be <= 32
        'Private': 26
      }
    };

    // Should throw validation error
    expect(() => validateConfig(invalidConfig)).toThrow();
  });

  it('should work with minimal subnet types', () => {
    // Minimal number of subnet types
    const config: RawConfig = {
      baseCidr: '10.0.0.0/8',
      accounts: [
        {
          name: 'test-account',
          clouds: {
            aws: {
              regions: ['us-east-1', 'us-west-2']
            }
          }
        }
      ],
      subnetTypes: {
        'Public': 24,
        'Private': 26
      }
    };

    // Validate the config
    const validatedConfig = validateConfig(config);

    // Check the normalized config
    expect(validatedConfig).toBeDefined();
    expect(validatedConfig.subnetTypes).toBeDefined();
    
    // Verify the subnet types are in the expected format
    expect(validatedConfig.subnetTypes).toEqual({
      'Public': 24,
      'Private': 26
    });
  });
}); 