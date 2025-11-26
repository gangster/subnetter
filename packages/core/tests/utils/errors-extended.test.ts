import {
  SubnetterError,
  ConfigurationError,
  AllocationError,
  IOError,
  ValidationError,
  CloudProviderError,
  ErrorCode
} from '../../src/utils/errors';

describe('Error Classes - Extended Coverage', () => {
  describe('SubnetterError', () => {
    it('should create error with message only (uses default code)', () => {
      const error = new SubnetterError('Test error');
      
      expect(error.message).toBe('Test error');
      // Default code is UNKNOWN_ERROR
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      // Default context is empty object
      expect(error.context).toEqual({});
      expect(error.name).toBe('SubnetterError');
    });

    it('should create error with message and code', () => {
      const error = new SubnetterError('Test error', ErrorCode.UNKNOWN_ERROR);
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });

    it('should create error with full context', () => {
      const context = { key: 'value', nested: { prop: 123 } };
      const error = new SubnetterError('Test error', ErrorCode.UNKNOWN_ERROR, context);
      
      expect(error.context).toEqual(context);
    });

    it('should generate context string from context object', () => {
      const error = new SubnetterError('Test error', ErrorCode.UNKNOWN_ERROR, {
        path: '/some/path',
        value: 42
      });
      
      const contextStr = error.getContextString();
      expect(contextStr).toContain('path');
      expect(contextStr).toContain('/some/path');
    });

    it('should return default message for getContextString when no context', () => {
      const error = new SubnetterError('Test error');
      
      expect(error.getContextString()).toBe('No additional context available.');
    });

    it('should generate appropriate help text', () => {
      const error = new SubnetterError('Test error', ErrorCode.UNKNOWN_ERROR);
      
      const helpText = error.getHelpText();
      expect(typeof helpText).toBe('string');
    });

    it('should be instanceof Error', () => {
      const error = new SubnetterError('Test error');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof SubnetterError).toBe(true);
    });

    it('should have stack trace', () => {
      const error = new SubnetterError('Test error');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('SubnetterError');
    });
  });

  describe('ConfigurationError', () => {
    it('should create with default code', () => {
      const error = new ConfigurationError('Config error');
      
      expect(error.name).toBe('ConfigurationError');
      expect(error instanceof SubnetterError).toBe(true);
    });

    it('should create with CONFIG_FILE_NOT_FOUND code', () => {
      const error = new ConfigurationError(
        'File not found',
        ErrorCode.CONFIG_FILE_NOT_FOUND,
        { path: '/missing/file.json' }
      );
      
      expect(error.code).toBe(ErrorCode.CONFIG_FILE_NOT_FOUND);
      expect(error.getHelpText()).toContain('file');
    });

    it('should create with CONFIG_VALIDATION_FAILED code', () => {
      const error = new ConfigurationError(
        'Validation failed',
        ErrorCode.CONFIG_VALIDATION_FAILED,
        { errors: ['error1', 'error2'] }
      );
      
      expect(error.code).toBe(ErrorCode.CONFIG_VALIDATION_FAILED);
    });

    it('should create with INVALID_JSON_FORMAT code', () => {
      const error = new ConfigurationError(
        'Invalid JSON',
        ErrorCode.INVALID_JSON_FORMAT
      );
      
      expect(error.code).toBe(ErrorCode.INVALID_JSON_FORMAT);
      expect(error.getHelpText()).toContain('JSON');
    });

    it('should create with INVALID_YAML_FORMAT code', () => {
      const error = new ConfigurationError(
        'Invalid YAML',
        ErrorCode.INVALID_YAML_FORMAT
      );
      
      expect(error.code).toBe(ErrorCode.INVALID_YAML_FORMAT);
      expect(error.getHelpText()).toContain('YAML');
    });

    it('should create with INVALID_CONFIG_FORMAT code', () => {
      const error = new ConfigurationError(
        'Invalid format',
        ErrorCode.INVALID_CONFIG_FORMAT
      );
      
      expect(error.code).toBe(ErrorCode.INVALID_CONFIG_FORMAT);
    });
  });

  describe('AllocationError', () => {
    it('should create with default values', () => {
      const error = new AllocationError('Allocation error');
      
      expect(error.name).toBe('AllocationError');
      expect(error instanceof SubnetterError).toBe(true);
    });

    it('should create with INSUFFICIENT_ADDRESS_SPACE code', () => {
      const error = new AllocationError(
        'Not enough space',
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
        { requiredSpace: 256, availableSpace: 64 }
      );
      
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_ADDRESS_SPACE);
      // Help text mentions the space values when provided with correct context keys
      expect(error.getHelpText()).toContain('256');
      expect(error.getHelpText()).toContain('64');
    });

    it('should create with CIDR_ALREADY_ALLOCATED code', () => {
      const error = new AllocationError(
        'CIDR in use',
        ErrorCode.CIDR_ALREADY_ALLOCATED,
        { cidr: '10.0.0.0/24' }
      );
      
      expect(error.code).toBe(ErrorCode.CIDR_ALREADY_ALLOCATED);
    });

    it('should create with INVALID_CIDR_FORMAT code', () => {
      const error = new AllocationError(
        'Bad CIDR',
        ErrorCode.INVALID_CIDR_FORMAT,
        { cidr: 'not-a-cidr' }
      );
      
      expect(error.code).toBe(ErrorCode.INVALID_CIDR_FORMAT);
      expect(error.getHelpText()).toContain('CIDR');
    });

    it('should create with INVALID_PREFIX_LENGTH code', () => {
      const error = new AllocationError(
        'Bad prefix',
        ErrorCode.INVALID_PREFIX_LENGTH,
        { prefix: 33 }
      );
      
      expect(error.code).toBe(ErrorCode.INVALID_PREFIX_LENGTH);
    });

    it('should create with CIDR_OVERLAP code', () => {
      const error = new AllocationError(
        'CIDRs overlap',
        ErrorCode.CIDR_OVERLAP,
        { cidr1: '10.0.0.0/24', cidr2: '10.0.0.128/25' }
      );
      
      expect(error.code).toBe(ErrorCode.CIDR_OVERLAP);
    });

    it('should create with INVALID_OPERATION code', () => {
      const error = new AllocationError(
        'Invalid operation',
        ErrorCode.INVALID_OPERATION
      );
      
      expect(error.code).toBe(ErrorCode.INVALID_OPERATION);
    });
  });

  describe('IOError', () => {
    it('should create with default values', () => {
      const error = new IOError('IO error');
      
      expect(error.name).toBe('IOError');
      expect(error instanceof SubnetterError).toBe(true);
    });

    it('should create with INPUT_READ_FAILED code', () => {
      const error = new IOError(
        'Read failed',
        ErrorCode.INPUT_READ_FAILED,
        { path: '/some/file' }
      );
      
      expect(error.code).toBe(ErrorCode.INPUT_READ_FAILED);
    });

    it('should create with OUTPUT_WRITE_FAILED code', () => {
      const error = new IOError(
        'Write failed',
        ErrorCode.OUTPUT_WRITE_FAILED,
        { path: '/some/file' }
      );
      
      expect(error.code).toBe(ErrorCode.OUTPUT_WRITE_FAILED);
    });

    it('should create with INSUFFICIENT_PERMISSIONS code', () => {
      const error = new IOError(
        'Permission denied',
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        { path: '/protected/file' }
      );
      
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_PERMISSIONS);
      expect(error.getHelpText()).toContain('permission');
    });
  });

  describe('ValidationError', () => {
    it('should create with default values', () => {
      const error = new ValidationError('Validation error');
      
      expect(error.name).toBe('ValidationError');
      expect(error instanceof SubnetterError).toBe(true);
    });

    it('should create with validation context', () => {
      const error = new ValidationError(
        'Invalid value',
        ErrorCode.CONFIG_VALIDATION_FAILED,
        { field: 'baseCidr', value: 'invalid' }
      );
      
      expect(error.context).toEqual({ field: 'baseCidr', value: 'invalid' });
    });
  });

  describe('CloudProviderError', () => {
    it('should create with default values', () => {
      const error = new CloudProviderError('Provider error');
      
      expect(error.name).toBe('CloudProviderError');
      expect(error instanceof SubnetterError).toBe(true);
    });

    it('should create with INVALID_CLOUD_PROVIDER code', () => {
      const error = new CloudProviderError(
        'Unknown provider',
        ErrorCode.INVALID_CLOUD_PROVIDER,
        { provider: 'unknown-cloud' }
      );
      
      expect(error.code).toBe(ErrorCode.INVALID_CLOUD_PROVIDER);
      expect(error.getHelpText()).toContain('provider');
    });

    it('should create with INVALID_REGION code', () => {
      const error = new CloudProviderError(
        'Invalid region',
        ErrorCode.INVALID_REGION,
        { region: 'invalid-region', provider: 'aws' }
      );
      
      expect(error.code).toBe(ErrorCode.INVALID_REGION);
    });
  });

  describe('ErrorCode enum', () => {
    it('should have all expected error codes', () => {
      // General errors
      expect(ErrorCode.UNKNOWN_ERROR).toBeDefined();
      expect(ErrorCode.NOT_IMPLEMENTED).toBeDefined();
      expect(ErrorCode.INVALID_OPERATION).toBeDefined();
      
      // Configuration errors
      expect(ErrorCode.CONFIG_FILE_NOT_FOUND).toBeDefined();
      expect(ErrorCode.CONFIG_VALIDATION_FAILED).toBeDefined();
      expect(ErrorCode.INVALID_JSON_FORMAT).toBeDefined();
      expect(ErrorCode.INVALID_YAML_FORMAT).toBeDefined();
      expect(ErrorCode.INVALID_CONFIG_FORMAT).toBeDefined();
      expect(ErrorCode.MISSING_REQUIRED_FIELD).toBeDefined();
      expect(ErrorCode.INSUFFICIENT_PERMISSIONS).toBeDefined();
      
      // CIDR allocation errors
      expect(ErrorCode.INSUFFICIENT_ADDRESS_SPACE).toBeDefined();
      expect(ErrorCode.CIDR_ALREADY_ALLOCATED).toBeDefined();
      expect(ErrorCode.INVALID_CIDR_FORMAT).toBeDefined();
      expect(ErrorCode.INVALID_PREFIX_LENGTH).toBeDefined();
      expect(ErrorCode.CIDR_OVERLAP).toBeDefined();
      expect(ErrorCode.INSUFFICIENT_SPACE).toBeDefined();
      expect(ErrorCode.EXCEEDED_MAX_PREFIX_LENGTH).toBeDefined();
      
      // I/O errors
      expect(ErrorCode.INPUT_READ_FAILED).toBeDefined();
      expect(ErrorCode.OUTPUT_WRITE_FAILED).toBeDefined();
      
      // Cloud provider errors
      expect(ErrorCode.INVALID_CLOUD_PROVIDER).toBeDefined();
      expect(ErrorCode.INVALID_REGION).toBeDefined();
      expect(ErrorCode.INVALID_AZ).toBeDefined();
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper prototype chain for ConfigurationError', () => {
      const error = new ConfigurationError('test');
      
      expect(error instanceof ConfigurationError).toBe(true);
      expect(error instanceof SubnetterError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should maintain proper prototype chain for AllocationError', () => {
      const error = new AllocationError('test');
      
      expect(error instanceof AllocationError).toBe(true);
      expect(error instanceof SubnetterError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should maintain proper prototype chain for IOError', () => {
      const error = new IOError('test');
      
      expect(error instanceof IOError).toBe(true);
      expect(error instanceof SubnetterError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should maintain proper prototype chain for ValidationError', () => {
      const error = new ValidationError('test');
      
      expect(error instanceof ValidationError).toBe(true);
      expect(error instanceof SubnetterError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should maintain proper prototype chain for CloudProviderError', () => {
      const error = new CloudProviderError('test');
      
      expect(error instanceof CloudProviderError).toBe(true);
      expect(error instanceof SubnetterError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Context serialization', () => {
    it('should handle complex nested context objects', () => {
      const complexContext = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        },
        array: [1, 2, 3],
        mixed: {
          str: 'string',
          num: 42,
          bool: true,
          nil: null
        }
      };

      const error = new SubnetterError('Test', ErrorCode.UNKNOWN_ERROR, complexContext);
      const contextStr = error.getContextString();
      
      expect(contextStr).toBeDefined();
      expect(typeof contextStr).toBe('string');
    });

    it('should handle circular references gracefully', () => {
      const circularContext: Record<string, unknown> = { name: 'test' };
      circularContext.self = circularContext;

      // Should not throw
      expect(() => {
        new SubnetterError('Test', ErrorCode.UNKNOWN_ERROR, circularContext);
      }).not.toThrow();
    });

    it('should handle undefined values in context', () => {
      const context = {
        defined: 'value',
        undefinedValue: undefined
      };

      const error = new SubnetterError('Test', ErrorCode.UNKNOWN_ERROR, context);
      expect(error.context).toEqual(context);
    });
  });
});

