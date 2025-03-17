import {
  ErrorCode,
  SubnetterError,
  ConfigurationError, 
  AllocationError,
  IOError,
  ValidationError,
  CloudProviderError
} from '../../src/utils/errors';

describe('Error Utilities', () => {
  describe('SubnetterError', () => {
    it('should create a base error with default values', () => {
      const error = new SubnetterError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('SubnetterError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(error.context).toEqual({});
    });

    it('should create an error with custom code and context', () => {
      const context = { test: 'value', count: 42 };
      const error = new SubnetterError('Custom error', ErrorCode.NOT_IMPLEMENTED, context);
      
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
      expect(error.context).toEqual(context);
    });

    it('should generate a formatted message', () => {
      const error = new SubnetterError('Test message', ErrorCode.INVALID_OPERATION);
      
      expect(error.getFormattedMessage()).toBe('SubnetterError [1002]: Test message');
    });

    it('should generate a context string', () => {
      const context = { test: 'value', count: 42 };
      const error = new SubnetterError('Test', ErrorCode.UNKNOWN_ERROR, context);
      
      expect(error.getContextString()).toContain('test: "value"');
      expect(error.getContextString()).toContain('count: 42');
    });

    it('should handle empty context', () => {
      const error = new SubnetterError('Test');
      
      expect(error.getContextString()).toBe('No additional context available.');
    });

    it('should provide a default help text', () => {
      const error = new SubnetterError('Test');
      
      expect(error.getHelpText()).toBe('No specific help available for this error.');
    });
  });

  describe('ConfigurationError', () => {
    it('should create a config error with default values', () => {
      const error = new ConfigurationError('Config error');
      
      expect(error).toBeInstanceOf(SubnetterError);
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Config error');
      expect(error.code).toBe(ErrorCode.CONFIG_VALIDATION_FAILED);
    });

    it('should provide help text for file not found errors', () => {
      const error = new ConfigurationError(
        'Config file not found',
        ErrorCode.CONFIG_FILE_NOT_FOUND
      );
      
      expect(error.getHelpText()).toContain('Make sure the specified configuration file exists');
    });

    it('should provide help text for invalid format errors', () => {
      const error = new ConfigurationError(
        'Invalid config format',
        ErrorCode.INVALID_CONFIG_FORMAT
      );
      
      expect(error.getHelpText()).toContain('check the format of your configuration file');
    });

    it('should provide help text for invalid JSON format', () => {
      const error = new ConfigurationError(
        'Invalid JSON',
        ErrorCode.INVALID_JSON_FORMAT
      );
      
      expect(error.getHelpText()).toContain('JSON configuration file appears to be malformed');
    });

    it('should provide help text for invalid YAML format', () => {
      const error = new ConfigurationError(
        'Invalid YAML',
        ErrorCode.INVALID_YAML_FORMAT
      );
      
      expect(error.getHelpText()).toContain('YAML configuration file appears to be malformed');
    });

    it('should provide help text for missing fields', () => {
      const error = new ConfigurationError(
        'Missing required field',
        ErrorCode.MISSING_REQUIRED_FIELD,
        { field: 'baseCidr' }
      );
      
      expect(error.getHelpText()).toContain('required field "baseCidr" is missing');
    });
  });

  describe('AllocationError', () => {
    it('should create an allocation error with default values', () => {
      const error = new AllocationError('Allocation error');
      
      expect(error).toBeInstanceOf(SubnetterError);
      expect(error.name).toBe('AllocationError');
      expect(error.message).toBe('Allocation error');
      expect(error.code).toBe(ErrorCode.INVALID_CIDR_FORMAT);
    });

    it('should provide help text for invalid CIDR format', () => {
      const error = new AllocationError(
        'Invalid CIDR format',
        ErrorCode.INVALID_CIDR_FORMAT
      );
      
      expect(error.getHelpText()).toContain('Ensure your CIDR blocks follow the correct format');
    });

    it('should provide help text for CIDR overlap', () => {
      const error = new AllocationError(
        'CIDR overlap detected',
        ErrorCode.CIDR_OVERLAP
      );
      
      expect(error.getHelpText()).toContain('Two or more CIDR blocks are overlapping');
    });

    it('should provide help text for insufficient address space', () => {
      const error = new AllocationError(
        'Not enough space',
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE,
        { requiredSpace: 256, availableSpace: 128 }
      );
      
      expect(error.getHelpText()).toContain('Needed: 256, Available: 128');
    });

    it('should provide generic help for insufficient space when context is missing', () => {
      const error = new AllocationError(
        'Not enough space',
        ErrorCode.INSUFFICIENT_ADDRESS_SPACE
      );
      
      expect(error.getHelpText()).toContain('Your CIDR block is too small');
    });

    it('should provide help text for invalid prefix length', () => {
      const error = new AllocationError(
        'Invalid prefix length',
        ErrorCode.INVALID_PREFIX_LENGTH
      );
      
      expect(error.getHelpText()).toContain('prefix length must be between 0 and 32');
    });

    it('should provide help text for exceeded max prefix length', () => {
      const error = new AllocationError(
        'Prefix too large',
        ErrorCode.EXCEEDED_MAX_PREFIX_LENGTH
      );
      
      expect(error.getHelpText()).toContain('prefix length is too large');
    });
  });

  describe('IOError', () => {
    it('should create an IO error with default values', () => {
      const error = new IOError('IO error');
      
      expect(error).toBeInstanceOf(SubnetterError);
      expect(error.name).toBe('IOError');
      expect(error.message).toBe('IO error');
      expect(error.code).toBe(ErrorCode.OUTPUT_WRITE_FAILED);
    });

    it('should provide help text for output write failures', () => {
      const error = new IOError(
        'Failed to write output',
        ErrorCode.OUTPUT_WRITE_FAILED
      );
      
      expect(error.getHelpText()).toContain('write permissions');
    });

    it('should provide help text for input read failures', () => {
      const error = new IOError(
        'Failed to read input',
        ErrorCode.INPUT_READ_FAILED
      );
      
      expect(error.getHelpText()).toContain('input file exists');
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with default values', () => {
      const error = new ValidationError('Validation error');
      
      expect(error).toBeInstanceOf(SubnetterError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation error');
      expect(error.code).toBe(ErrorCode.INVALID_OPERATION);
    });

    it('should provide a generic help text', () => {
      const error = new ValidationError('Validation error');
      
      expect(error.getHelpText()).toContain('check your input values');
    });
  });

  describe('CloudProviderError', () => {
    it('should create a cloud provider error with default values', () => {
      const error = new CloudProviderError('Provider error');
      
      expect(error).toBeInstanceOf(SubnetterError);
      expect(error.name).toBe('CloudProviderError');
      expect(error.message).toBe('Provider error');
      expect(error.code).toBe(ErrorCode.INVALID_CLOUD_PROVIDER);
    });

    it('should provide help text for invalid cloud provider', () => {
      const error = new CloudProviderError(
        'Invalid cloud provider',
        ErrorCode.INVALID_CLOUD_PROVIDER,
        { 
          provider: 'foo',
          supportedProviders: ['aws', 'azure', 'gcp']
        }
      );
      
      expect(error.getHelpText()).toContain('"foo" is not a supported cloud provider');
      expect(error.getHelpText()).toContain('aws,azure,gcp');
    });

    it('should provide generic help text for invalid provider without context', () => {
      const error = new CloudProviderError(
        'Invalid provider',
        ErrorCode.INVALID_CLOUD_PROVIDER
      );
      
      expect(error.getHelpText()).toContain('cloud provider is not supported');
    });

    it('should provide help text for invalid region', () => {
      const error = new CloudProviderError(
        'Invalid region',
        ErrorCode.INVALID_REGION
      );
      
      expect(error.getHelpText()).toContain('region is not valid');
    });

    it('should provide help text for invalid AZ', () => {
      const error = new CloudProviderError(
        'Invalid AZ',
        ErrorCode.INVALID_AZ
      );
      
      expect(error.getHelpText()).toContain('availability zone is not valid');
    });
  });
  
  describe('ErrorCode', () => {
    it('should have unique error codes', () => {
      const codes = Object.values(ErrorCode).filter(v => typeof v === 'number');
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });
}); 