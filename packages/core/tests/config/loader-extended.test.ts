import {
  loadConfig,
  validateConfig,
  ConfigurationError,
  IOError
} from '../../src/index';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Mock dependencies
jest.mock('fs');
jest.mock('path');

describe('Configuration Loader - Extended Branch Coverage', () => {
  const validConfig = {
    baseCidr: '10.0.0.0/8',
    cloudProviders: ['aws'],
    accounts: [
      {
        name: 'test-account',
        clouds: {
          aws: {
            regions: ['us-east-1']
          }
        }
      }
    ],
    subnetTypes: {
      'Public': 24,
      'Private': 26
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(validConfig));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.extname as jest.Mock).mockReturnValue('.json');
    (path.resolve as jest.Mock).mockImplementation((_, filePath) => filePath || _);
    (path.isAbsolute as jest.Mock).mockReturnValue(false);
  });

  describe('File path handling', () => {
    it('should handle absolute paths correctly', () => {
      (path.isAbsolute as jest.Mock).mockReturnValue(true);
      
      const config = loadConfig('/absolute/path/config.json');
      
      expect(config).toBeDefined();
      expect(path.resolve).not.toHaveBeenCalled();
    });

    it('should resolve relative paths correctly', () => {
      (path.isAbsolute as jest.Mock).mockReturnValue(false);
      (path.resolve as jest.Mock).mockReturnValue('/resolved/path/config.json');
      
      const config = loadConfig('relative/config.json');
      
      expect(config).toBeDefined();
    });
  });

  describe('YAML file handling', () => {
    it('should load .yml extension files', () => {
      const yamlConfig = {
        baseCidr: '10.0.0.0/16',
        cloudProviders: ['azure'],
        accounts: [
          {
            name: 'azure-test',
            clouds: {
              azure: {
                regions: ['eastus']
              }
            }
          }
        ],
        subnetTypes: {
          'Public': 24
        }
      };

      (path.extname as jest.Mock).mockReturnValue('.yml');
      (fs.readFileSync as jest.Mock).mockReturnValue(yaml.dump(yamlConfig));

      const config = loadConfig('config.yml');

      expect(config).toBeDefined();
      expect(config.baseCidr).toBe('10.0.0.0/16');
    });

    it('should throw ConfigurationError for invalid YAML content', () => {
      (path.extname as jest.Mock).mockReturnValue('.yaml');
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid: yaml: content: [');

      expect(() => loadConfig('config.yaml')).toThrow(ConfigurationError);
    });
  });

  describe('Error handling branches', () => {
    it('should throw ConfigurationError for file not found (ENOENT)', () => {
      const enoentError = new Error('ENOENT: no such file or directory');
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw enoentError;
      });

      expect(() => loadConfig('missing.json')).toThrow(ConfigurationError);
    });

    it('should throw IOError for permission denied (EACCES)', () => {
      const permissionError = new Error('EACCES: permission denied');
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      expect(() => loadConfig('protected.json')).toThrow(IOError);
    });

    it('should throw IOError for generic read errors', () => {
      const genericError = new Error('Some other read error');
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw genericError;
      });

      expect(() => loadConfig('problematic.json')).toThrow(IOError);
    });

    it('should handle non-Error objects thrown during file read', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw 'string error'; // Non-Error object
      });

      expect(() => loadConfig('config.json')).toThrow(IOError);
    });

    it('should handle unexpected errors during config loading', () => {
      // Simulate an unexpected error in path resolution
      (path.isAbsolute as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected path error');
      });

      expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
    });
  });

  describe('Validation error handling', () => {
    it('should throw ConfigurationError with validation details for missing baseCidr', () => {
      const invalidConfig = {
        cloudProviders: ['aws'],
        accounts: [
          {
            name: 'test',
            clouds: {
              aws: { regions: ['us-east-1'] }
            }
          }
        ],
        subnetTypes: { 'Public': 24 }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid CIDR format', () => {
      const invalidConfig = {
        ...validConfig,
        baseCidr: 'not-a-cidr'
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid prefix length (> 32)', () => {
      const invalidConfig = {
        ...validConfig,
        baseCidr: '10.0.0.0/33'
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
    });

    it('should accept empty accounts array (schema allows it)', () => {
      const configWithEmptyAccounts = {
        ...validConfig,
        accounts: []
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configWithEmptyAccounts));

      // Schema allows empty accounts array
      const config = loadConfig('config.json');
      expect(config.accounts).toEqual([]);
    });

    it('should accept empty subnetTypes (schema allows it)', () => {
      const configWithEmptySubnets = {
        ...validConfig,
        subnetTypes: {}
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configWithEmptySubnets));

      // Schema allows empty subnetTypes
      const config = loadConfig('config.json');
      expect(config.subnetTypes).toEqual({});
    });

    it('should throw ConfigurationError for invalid subnet prefix length', () => {
      const invalidConfig = {
        ...validConfig,
        subnetTypes: {
          'Public': 33 // Invalid
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
    });
  });

  describe('validateConfig function', () => {
    it('should validate a correct configuration object', () => {
      const config = validateConfig(validConfig);

      expect(config).toBeDefined();
      expect(config.baseCidr).toBe('10.0.0.0/8');
    });

    it('should throw ConfigurationError for null input', () => {
      expect(() => validateConfig(null)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for undefined input', () => {
      expect(() => validateConfig(undefined)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for non-object input', () => {
      expect(() => validateConfig('not an object')).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for array input', () => {
      expect(() => validateConfig([validConfig])).toThrow(ConfigurationError);
    });

    it('should normalize cloudProviders to empty array when not provided', () => {
      const configWithoutProviders = {
        baseCidr: '10.0.0.0/8',
        accounts: [
          {
            name: 'test',
            clouds: {
              aws: { regions: ['us-east-1'] }
            }
          }
        ],
        subnetTypes: { 'Public': 24 }
      };

      const config = validateConfig(configWithoutProviders);
      expect(config.cloudProviders).toEqual([]);
    });

    it('should preserve prefixLengths when provided', () => {
      const configWithPrefixes = {
        ...validConfig,
        prefixLengths: {
          account: 16,
          region: 20,
          az: 24
        }
      };

      const config = validateConfig(configWithPrefixes);
      expect(config.prefixLengths).toEqual({
        account: 16,
        region: 20,
        az: 24
      });
    });

    it('should handle partial prefixLengths', () => {
      const configWithPartialPrefixes = {
        ...validConfig,
        prefixLengths: {
          account: 16
        }
      };

      const config = validateConfig(configWithPartialPrefixes);
      expect(config.prefixLengths?.account).toBe(16);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty JSON file', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('{}');

      expect(() => loadConfig('empty.json')).toThrow(ConfigurationError);
    });

    it('should handle JSON with extra properties (should be allowed)', () => {
      const configWithExtra = {
        ...validConfig,
        extraProperty: 'should be ignored'
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configWithExtra));

      const config = loadConfig('config.json');
      expect(config).toBeDefined();
    });

    it('should handle very large configuration files', () => {
      const largeConfig = {
        ...validConfig,
        accounts: Array(100).fill(null).map((_, i) => ({
          name: `account-${i}`,
          clouds: {
            aws: { regions: ['us-east-1', 'us-west-2'] }
          }
        }))
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(largeConfig));

      const config = loadConfig('large.json');
      expect(config.accounts.length).toBe(100);
    });

    it('should handle account with multiple cloud providers', () => {
      const multiCloudConfig = {
        ...validConfig,
        accounts: [
          {
            name: 'multi-cloud-account',
            clouds: {
              aws: { regions: ['us-east-1'] },
              azure: { regions: ['eastus'] },
              gcp: { regions: ['us-central1'] }
            }
          }
        ]
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(multiCloudConfig));

      const config = loadConfig('multi-cloud.json');
      expect(Object.keys(config.accounts[0].clouds).length).toBe(3);
    });

    it('should handle account with baseCidr override', () => {
      const configWithOverride = {
        ...validConfig,
        accounts: [
          {
            name: 'override-account',
            clouds: {
              aws: {
                baseCidr: '172.16.0.0/12',
                regions: ['us-east-1']
              }
            }
          }
        ]
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configWithOverride));

      const config = loadConfig('override.json');
      expect(config.accounts[0].clouds.aws.baseCidr).toBe('172.16.0.0/12');
    });
  });
});

describe('Configuration Loader - Negative Test Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (path.extname as jest.Mock).mockReturnValue('.json');
    (path.resolve as jest.Mock).mockImplementation((_, filePath) => filePath || _);
    (path.isAbsolute as jest.Mock).mockReturnValue(false);
  });

  it('should reject configuration with negative prefix length', () => {
    const invalidConfig = {
      baseCidr: '10.0.0.0/8',
      cloudProviders: ['aws'],
      accounts: [
        {
          name: 'test',
          clouds: { aws: { regions: ['us-east-1'] } }
        }
      ],
      subnetTypes: { 'Public': -1 }
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

    expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
  });

  it('should reject configuration with non-numeric prefix length', () => {
    const invalidConfig = {
      baseCidr: '10.0.0.0/8',
      cloudProviders: ['aws'],
      accounts: [
        {
          name: 'test',
          clouds: { aws: { regions: ['us-east-1'] } }
        }
      ],
      subnetTypes: { 'Public': 'not-a-number' }
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

    expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
  });

  it('should reject configuration with empty account name', () => {
    const invalidConfig = {
      baseCidr: '10.0.0.0/8',
      cloudProviders: ['aws'],
      accounts: [
        {
          name: '',
          clouds: { aws: { regions: ['us-east-1'] } }
        }
      ],
      subnetTypes: { 'Public': 24 }
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

    expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
  });

  it('should accept configuration with empty regions array (schema allows it)', () => {
    const configWithEmptyRegions = {
      baseCidr: '10.0.0.0/8',
      cloudProviders: ['aws'],
      accounts: [
        {
          name: 'test',
          clouds: { aws: { regions: [] } }
        }
      ],
      subnetTypes: { 'Public': 24 }
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configWithEmptyRegions));

    // Schema allows empty regions array
    const config = loadConfig('config.json');
    expect(config.accounts[0].clouds.aws.regions).toEqual([]);
  });

  it('should reject configuration with invalid IP address in CIDR', () => {
    const invalidConfig = {
      baseCidr: '999.999.999.999/8',
      cloudProviders: ['aws'],
      accounts: [
        {
          name: 'test',
          clouds: { aws: { regions: ['us-east-1'] } }
        }
      ],
      subnetTypes: { 'Public': 24 }
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

    expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
  });

  it('should reject configuration with missing clouds property', () => {
    const invalidConfig = {
      baseCidr: '10.0.0.0/8',
      cloudProviders: ['aws'],
      accounts: [
        {
          name: 'test'
          // Missing clouds property
        }
      ],
      subnetTypes: { 'Public': 24 }
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

    expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
  });
});

