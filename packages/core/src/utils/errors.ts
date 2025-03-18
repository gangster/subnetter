/**
 * Comprehensive error handling system for Subnetter.
 * 
 * This module defines a hierarchy of error types with associated error codes,
 * meaningful context, and helpful messages for users.
 */

/**
 * Error codes for Subnetter errors.
 * 
 * Codes are grouped by category:
 * - General errors: 1000-1999
 * - Configuration errors: 2000-2999
 * - CIDR allocation errors: 3000-3999
 * - Input/output errors: 4000-4999
 * - Network-related errors: 5000-5999
 */
export enum ErrorCode {
  // General errors (1000-1999)
  UNKNOWN_ERROR = 1000,
  NOT_IMPLEMENTED = 1001,
  INVALID_OPERATION = 1002,
  
  // Configuration errors (2000-2999)
  CONFIG_VALIDATION_FAILED = 2000,
  MISSING_REQUIRED_FIELD = 2001,
  INVALID_CONFIG_FORMAT = 2002,
  INVALID_JSON_FORMAT = 2003,
  INVALID_YAML_FORMAT = 2004,
  CONFIG_FILE_NOT_FOUND = 2005,
  INSUFFICIENT_PERMISSIONS = 2006,
  
  // CIDR allocation errors (3000-3999)
  INVALID_CIDR_FORMAT = 3000,
  CIDR_OVERLAP = 3001,
  INSUFFICIENT_ADDRESS_SPACE = 3002,
  INSUFFICIENT_SPACE = 3003,
  INVALID_PREFIX_LENGTH = 3004,
  EXCEEDED_MAX_PREFIX_LENGTH = 3005,
  CIDR_ALREADY_ALLOCATED = 3006,
  
  // Input/output errors (4000-4999)
  OUTPUT_WRITE_FAILED = 4000,
  INPUT_READ_FAILED = 4001,
  
  // Cloud provider errors (5000-5999)
  INVALID_CLOUD_PROVIDER = 5000,
  INVALID_REGION = 5001,
  INVALID_AZ = 5002
}

/**
 * Base class for all Subnetter errors.
 * 
 * This provides common functionality for all error types including:
 * - Standardized error codes
 * - Contextual information about the error
 * - Helpful user messages
 */
export class SubnetterError extends Error {
  /**
   * Creates a new SubnetterError.
   * 
   * @param message Description of the error
   * @param code Error code from ErrorCode enum
   * @param context Additional context about the error
   */
  constructor(
    message: string, 
    public readonly code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    public readonly context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'SubnetterError';
    
    // Capture stack trace properly
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Gets a formatted error message with code.
   */
  getFormattedMessage(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }

  /**
   * Gets context information as a formatted string.
   */
  getContextString(): string {
    if (Object.keys(this.context).length === 0) {
      return 'No additional context available.';
    }
    
    return Object.entries(this.context)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');
  }
  
  /**
   * Gets help text for resolving this error.
   */
  getHelpText(): string {
    return 'No specific help available for this error.';
  }
}

/**
 * Error thrown for configuration-related issues.
 */
export class ConfigurationError extends SubnetterError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.CONFIG_VALIDATION_FAILED,
    context: Record<string, unknown> = {}
  ) {
    super(message, code, context);
    this.name = 'ConfigurationError';
  }
  
  /**
   * Gets help text specific to configuration errors.
   */
  getHelpText(): string {
    switch (this.code) {
      case ErrorCode.CONFIG_FILE_NOT_FOUND:
        return 'Make sure the specified configuration file exists and is accessible.';
      
      case ErrorCode.INVALID_CONFIG_FORMAT:
        return 'Please check the format of your configuration file against the documentation.';
      
      case ErrorCode.INVALID_JSON_FORMAT:
        return 'Your JSON configuration file appears to be malformed. Please check for syntax errors.';
      
      case ErrorCode.INVALID_YAML_FORMAT:
        return 'Your YAML configuration file appears to be malformed. Please check for syntax errors.';
      
      case ErrorCode.MISSING_REQUIRED_FIELD:
        const field = this.context.field || 'unknown';
        return `The required field "${field}" is missing from your configuration. Please add it.`;
      
      default:
        return 'Check your configuration file against the documentation to ensure it meets all requirements.';
    }
  }
}

/**
 * Error thrown during CIDR allocation operations.
 */
export class AllocationError extends SubnetterError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INVALID_CIDR_FORMAT,
    context: Record<string, unknown> = {}
  ) {
    super(message, code, context);
    this.name = 'AllocationError';
  }
  
  /**
   * Gets help text specific to allocation errors.
   */
  getHelpText(): string {
    switch (this.code) {
      case ErrorCode.INVALID_CIDR_FORMAT:
        return 'Ensure your CIDR blocks follow the correct format (e.g., 10.0.0.0/8).';
      
      case ErrorCode.CIDR_OVERLAP:
        return 'Two or more CIDR blocks are overlapping. Adjust your configuration to use non-overlapping ranges.';
      
      case ErrorCode.INSUFFICIENT_ADDRESS_SPACE:
        const required = this.context.requiredSpace;
        const available = this.context.availableSpace;
        
        if (required && available) {
          return `Not enough IP address space. Needed: ${required}, Available: ${available}. Use a larger CIDR block or reduce the number of subnets.`;
        }
        return 'Your CIDR block is too small for the requested allocation. Use a larger CIDR block or reduce the number of subnets.';
      
      case ErrorCode.INVALID_PREFIX_LENGTH:
        return 'The prefix length must be between 0 and 32 for IPv4 addresses.';
      
      case ErrorCode.EXCEEDED_MAX_PREFIX_LENGTH:
        return 'The prefix length is too large for the requested allocation. Use a smaller prefix length.';
      
      default:
        return 'Check your CIDR allocation configuration and ensure it has sufficient space.';
    }
  }
}

/**
 * Error thrown for input/output operations.
 */
export class IOError extends SubnetterError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.OUTPUT_WRITE_FAILED,
    context: Record<string, unknown> = {}
  ) {
    super(message, code, context);
    this.name = 'IOError';
  }
  
  /**
   * Gets help text specific to I/O errors.
   */
  getHelpText(): string {
    switch (this.code) {
      case ErrorCode.OUTPUT_WRITE_FAILED:
        return 'Check that you have write permissions to the output location and that the disk is not full.';
      
      case ErrorCode.INPUT_READ_FAILED:
        return 'Make sure the input file exists and you have permission to read it.';
      
      default:
        return 'Check file permissions and available disk space.';
    }
  }
}

/**
 * Error thrown for validation failures.
 */
export class ValidationError extends SubnetterError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INVALID_OPERATION,
    context: Record<string, unknown> = {}
  ) {
    super(message, code, context);
    this.name = 'ValidationError';
  }
  
  /**
   * Gets help text specific to validation errors.
   */
  getHelpText(): string {
    return 'Validation failed. Please check your input values against the expected format.';
  }
}

/**
 * Error related to cloud provider operations.
 */
export class CloudProviderError extends SubnetterError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INVALID_CLOUD_PROVIDER,
    context: Record<string, unknown> = {}
  ) {
    super(message, code, context);
    this.name = 'CloudProviderError';
  }
  
  /**
   * Gets help text specific to cloud provider errors.
   */
  getHelpText(): string {
    switch (this.code) {
      case ErrorCode.INVALID_CLOUD_PROVIDER:
        const provider = this.context.provider;
        const supportedProviders = this.context.supportedProviders;
        
        if (provider && supportedProviders) {
          return `"${provider}" is not a supported cloud provider. Supported providers are: ${supportedProviders}.`;
        }
        return 'The specified cloud provider is not supported.';
      
      case ErrorCode.INVALID_REGION:
        return 'The specified region is not valid for this cloud provider.';
      
      case ErrorCode.INVALID_AZ:
        return 'The specified availability zone is not valid for this region.';
      
      default:
        return 'Check your cloud provider configuration.';
    }
  }
} 