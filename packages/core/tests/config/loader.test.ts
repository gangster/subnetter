import {
  loadConfig,
  validateConfig,
  ConfigurationError
} from '../../src/index';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Mock dependencies
jest.mock('fs');
jest.mock('path');

describe('Configuration Loader', () => {
  // Mock implementations
  const mockJsonConfig = {
    baseCidr: '10.0.0.0/8',
    cloudProviders: ['aws'],
    accounts: [
      {
        name: 'innovation-test',
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
  
  const mockYamlConfig = {
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
      'Public': 24,
      'Private': 26
    }
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mocks
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('.json')) {
        return JSON.stringify(mockJsonConfig);
      } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        return yaml.dump(mockYamlConfig);
      }
      throw new Error('Unsupported file extension');
    });
    
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.extname as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('.json')) return '.json';
      if (filePath.endsWith('.yaml')) return '.yaml';
      if (filePath.endsWith('.yml')) return '.yml';
      return '.unknown';
    });
    
    (path.resolve as jest.Mock).mockImplementation((_, filePath) => filePath);
    (path.isAbsolute as jest.Mock).mockReturnValue(false);
  });
  
  // Tests
  it('should load and validate JSON configuration file', async () => {
    // Act
    const config = loadConfig('config.json');
    
    // Assert
    expect(config).toBeDefined();
    expect(config.baseCidr).toBe('10.0.0.0/8');
    expect(config.accounts).toHaveLength(1);
    expect(config.accounts[0].name).toBe('innovation-test');
    expect(Object.keys(config.subnetTypes)).toHaveLength(2);
    expect(config.subnetTypes['Public']).toBe(24);
  });
  
  it('should load and validate YAML configuration file', async () => {
    // Act
    const config = loadConfig('config.yaml');
    
    // Assert
    expect(config).toBeDefined();
    expect(config.baseCidr).toBe('10.0.0.0/16');
    expect(config.accounts).toHaveLength(1);
    expect(config.accounts[0].name).toBe('azure-test');
    expect(Object.keys(config.subnetTypes)).toHaveLength(2);
    expect(config.subnetTypes['Public']).toBe(24);
  });
  
  it('should throw ConfigurationError when file not found', () => {
    // Arrange
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Mock fs.readFileSync to throw ENOENT error
    const enoentError = new Error('ENOENT: file not found');
    enoentError.message = 'ENOENT: file not found';
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw enoentError;
    });
    
    // Act & Assert
    expect(() => loadConfig('nonexistent.json')).toThrow(ConfigurationError);
  });
  
  it('should throw ConfigurationError for unsupported file extension', () => {
    // Act & Assert
    expect(() => loadConfig('config.txt')).toThrow(ConfigurationError);
  });
  
  it('should throw ConfigurationError for invalid JSON content', () => {
    // Arrange
    (fs.readFileSync as jest.Mock).mockReturnValue('{ invalid json }');
    
    // Act & Assert
    expect(() => loadConfig('config.json')).toThrow(ConfigurationError);
  });
  
  it('should throw ConfigurationError when validation fails', () => {
    const invalidConfig = {
      baseCidr: '10.0.0.0/33', // Invalid prefix
      cloudProviders: ['aws'],
      accounts: [
        { 
          name: 'innovation-test', 
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
    
    expect(() => validateConfig(invalidConfig)).toThrow(ConfigurationError);
  });
}); 