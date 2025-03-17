import { loadConfig, validateConfig, ConfigValidationError } from '../../src/index.js';
import * as fs from 'fs';
import path from 'path';
// Mock fs module
jest.mock('fs');
// Define variables at module scope
const mockConfigPath = '/path/to/config.json';
const mockYamlConfigPath = '/path/to/config.yaml';
const mockResolvedPath = '/resolved/path/to/config.json';
const mockYamlResolvedPath = '/resolved/path/to/config.yaml';
// Mock path module
jest.mock('path', () => ({
    isAbsolute: jest.fn((p) => p.startsWith('/')),
    resolve: jest.fn((cwd, p) => {
        if (p === mockConfigPath || p === mockYamlConfigPath) {
            return p.startsWith('/') ? p : `/${p}`;
        }
        return `/resolved/path/to/${p}`;
    }),
    extname: jest.fn((p) => {
        if (p === mockConfigPath || p === mockResolvedPath)
            return '.json';
        if (p === mockYamlConfigPath || p === mockYamlResolvedPath)
            return '.yaml';
        return '.unknown';
    })
}));
describe('Configuration Loader', () => {
    // Mock implementations
    beforeEach(() => {
        path.isAbsolute.mockImplementation((p) => {
            if (p === mockConfigPath || p === mockYamlConfigPath) {
                return true;
            }
            return false;
        });
        path.resolve.mockImplementation((_, p) => {
            if (p === mockConfigPath)
                return mockResolvedPath;
            if (p === mockYamlConfigPath)
                return mockYamlResolvedPath;
            return p;
        });
        path.extname.mockImplementation((p) => {
            if (p === mockConfigPath || p === mockResolvedPath)
                return '.json';
            if (p === mockYamlConfigPath || p === mockYamlResolvedPath)
                return '.yaml';
            return path.extname(p);
        });
    });
    afterEach(() => {
        jest.resetAllMocks();
    });
    // Sample valid configuration object (used in multiple tests)
    const validConfig = {
        baseCidr: '10.0.0.0/8',
        cloudProviders: ['aws'],
        accounts: [
            {
                name: 'innovation-test',
                cloudConfigs: {
                    aws: {
                        provider: 'aws',
                        regions: ['us-east-1']
                    }
                }
            }
        ],
        subnetTypes: [{ name: 'Public', prefixLength: 24 }]
    };
    it('should load and validate a valid JSON configuration file', () => {
        fs.readFileSync.mockReturnValue(JSON.stringify(validConfig));
        const result = loadConfig(mockConfigPath);
        expect(fs.readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf-8');
        expect(result).toEqual(validConfig);
    });
    it('should load and validate a valid YAML configuration file', () => {
        const yamlContent = `
baseCidr: 10.0.0.0/8
cloudProviders:
  - aws
accounts:
  - name: innovation-test
    cloudConfigs:
      aws:
        provider: aws
        regions:
          - us-east-1
subnetTypes:
  - name: Public
    prefixLength: 24
`;
        fs.readFileSync.mockReturnValue(yamlContent);
        const result = loadConfig(mockYamlConfigPath);
        expect(fs.readFileSync).toHaveBeenCalledWith(mockYamlConfigPath, 'utf-8');
        expect(result).toEqual(validConfig);
    });
    it('should throw error for invalid JSON syntax', () => {
        fs.readFileSync.mockReturnValue('{ invalid json }');
        expect(() => loadConfig(mockConfigPath)).toThrow();
    });
    it('should throw error for invalid YAML syntax', () => {
        fs.readFileSync.mockReturnValue(`
baseCidr: 10.0.0.0/8
  cloudProviders: - invalid yaml
`);
        expect(() => loadConfig(mockYamlConfigPath)).toThrow('Invalid YAML in configuration file');
    });
    it('should throw error when file is not found', () => {
        fs.readFileSync.mockImplementation(() => {
            throw new Error('File not found');
        });
        expect(() => loadConfig(mockConfigPath)).toThrow('File not found');
    });
    it('should throw error for unsupported file extension', () => {
        const mockUnsupportedPath = '/path/to/config.txt';
        path.extname.mockReturnValue('.txt');
        path.isAbsolute.mockReturnValue(true);
        expect(() => loadConfig(mockUnsupportedPath)).toThrow('Unsupported file extension: .txt');
    });
    it('should validate a config object without loading from file', () => {
        const result = validateConfig(validConfig);
        expect(result).toEqual(validConfig);
    });
    it('should throw ConfigValidationError when validation fails', () => {
        const invalidConfig = {
            baseCidr: '10.0.0.0/33', // Invalid prefix
            cloudProviders: ['aws'],
            accounts: [
                {
                    name: 'innovation-test',
                    cloudConfigs: {
                        aws: {
                            provider: 'aws',
                            regions: ['us-east-1']
                        }
                    }
                }
            ],
            subnetTypes: [{ name: 'Public', prefixLength: 24 }]
        };
        expect(() => validateConfig(invalidConfig)).toThrow(ConfigValidationError);
    });
});
