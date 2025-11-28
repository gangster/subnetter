/**
 * @module utils/errors
 * @description Comprehensive error handling system for Subnetter.
 *
 * Provides a hierarchy of error types with standardized error codes,
 * contextual information, and user-friendly help messages. All errors
 * extend the base {@link SubnetterError} class.
 *
 * @remarks
 * Error codes are organized by category:
 * - **1000-1999**: General errors
 * - **2000-2999**: Configuration errors
 * - **3000-3999**: CIDR allocation errors
 * - **4000-4999**: I/O errors
 * - **5000-5999**: Cloud provider errors
 *
 * @example
 * ```typescript
 * import {
 *   AllocationError,
 *   ConfigurationError,
 *   ErrorCode
 * } from '@subnetter/core';
 *
 * try {
 *   // Some operation that might fail
 * } catch (error) {
 *   if (error instanceof AllocationError) {
 *     console.error(`Allocation failed: ${error.message}`);
 *     console.error(`Error code: ${error.code}`);
 *     console.error(`Help: ${error.getHelpText()}`);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Error codes for all Subnetter errors.
 *
 * @remarks
 * Codes are grouped by category for easy identification:
 * - General errors: 1000-1999
 * - Configuration errors: 2000-2999
 * - CIDR allocation errors: 3000-3999
 * - I/O errors: 4000-4999
 * - Cloud provider errors: 5000-5999
 *
 * Use these codes for programmatic error handling and logging.
 *
 * @example
 * ```typescript
 * import { ErrorCode, AllocationError } from '@subnetter/core';
 *
 * if (error.code === ErrorCode.INSUFFICIENT_SPACE) {
 *   console.log('Need a larger CIDR block');
 * }
 * ```
 */
export enum ErrorCode {
  // ─────────────────────────────────────────────────────────────────
  // General errors (1000-1999)
  // ─────────────────────────────────────────────────────────────────

  /**
   * An unexpected error occurred that doesn't fit other categories.
   */
  UNKNOWN_ERROR = 1000,

  /**
   * The requested feature or operation is not yet implemented.
   */
  NOT_IMPLEMENTED = 1001,

  /**
   * The operation is invalid in the current context.
   */
  INVALID_OPERATION = 1002,

  // ─────────────────────────────────────────────────────────────────
  // Configuration errors (2000-2999)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Configuration validation failed against the schema.
   */
  CONFIG_VALIDATION_FAILED = 2000,

  /**
   * A required field is missing from the configuration.
   */
  MISSING_REQUIRED_FIELD = 2001,

  /**
   * The configuration format is invalid or unsupported.
   */
  INVALID_CONFIG_FORMAT = 2002,

  /**
   * JSON parsing failed due to syntax errors.
   */
  INVALID_JSON_FORMAT = 2003,

  /**
   * YAML parsing failed due to syntax errors.
   */
  INVALID_YAML_FORMAT = 2004,

  /**
   * The specified configuration file was not found.
   */
  CONFIG_FILE_NOT_FOUND = 2005,

  /**
   * Insufficient permissions to read the configuration file.
   */
  INSUFFICIENT_PERMISSIONS = 2006,

  // ─────────────────────────────────────────────────────────────────
  // CIDR allocation errors (3000-3999)
  // ─────────────────────────────────────────────────────────────────

  /**
   * The CIDR block format is invalid.
   * Expected format: 'a.b.c.d/n' where a-d are 0-255 and n is 0-32.
   */
  INVALID_CIDR_FORMAT = 3000,

  /**
   * Two or more CIDR blocks overlap.
   */
  CIDR_OVERLAP = 3001,

  /**
   * Not enough address space to complete the allocation.
   */
  INSUFFICIENT_ADDRESS_SPACE = 3002,

  /**
   * Insufficient space in the current CIDR block for the requested allocation.
   */
  INSUFFICIENT_SPACE = 3003,

  /**
   * The prefix length is invalid (must be 0-32 for IPv4).
   */
  INVALID_PREFIX_LENGTH = 3004,

  /**
   * The requested prefix length exceeds the maximum allowed (32).
   */
  EXCEEDED_MAX_PREFIX_LENGTH = 3005,

  /**
   * The CIDR block has already been allocated.
   */
  CIDR_ALREADY_ALLOCATED = 3006,

  // ─────────────────────────────────────────────────────────────────
  // I/O errors (4000-4999)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Failed to write output to the specified location.
   */
  OUTPUT_WRITE_FAILED = 4000,

  /**
   * Failed to read input from the specified location.
   */
  INPUT_READ_FAILED = 4001,

  // ─────────────────────────────────────────────────────────────────
  // Cloud provider errors (5000-5999)
  // ─────────────────────────────────────────────────────────────────

  /**
   * The specified cloud provider is not supported.
   */
  INVALID_CLOUD_PROVIDER = 5000,

  /**
   * The specified region is not valid for the cloud provider.
   */
  INVALID_REGION = 5001,

  /**
   * The specified availability zone is not valid for the region.
   */
  INVALID_AZ = 5002
}

/**
 * Base class for all Subnetter errors.
 *
 * @remarks
 * Provides common functionality for all error types:
 * - Standardized error codes from {@link ErrorCode}
 * - Contextual information as a key-value record
 * - User-friendly help messages
 * - Proper stack trace capture
 *
 * Extend this class to create domain-specific error types.
 *
 * @example
 * ```typescript
 * import { SubnetterError, ErrorCode } from '@subnetter/core';
 *
 * try {
 *   throw new SubnetterError(
 *     'Something went wrong',
 *     ErrorCode.UNKNOWN_ERROR,
 *     { operation: 'test', timestamp: Date.now() }
 *   );
 * } catch (error) {
 *   if (error instanceof SubnetterError) {
 *     console.log(error.getFormattedMessage());
 *     console.log(error.getContextString());
 *   }
 * }
 * ```
 */
export class SubnetterError extends Error {
  /**
   * Creates a new SubnetterError.
   *
   * @param message - Human-readable description of the error
   * @param code - Error code from {@link ErrorCode} enum
   * @param context - Additional context as key-value pairs
   */
  constructor(
    message: string,
    public readonly code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    public readonly context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'SubnetterError';

    // Capture stack trace properly in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Gets a formatted error message including the error code.
   *
   * @returns Formatted string: "ErrorName [CODE]: message"
   *
   * @example
   * ```typescript
   * const error = new SubnetterError('Test', ErrorCode.UNKNOWN_ERROR);
   * console.log(error.getFormattedMessage());
   * // Output: "SubnetterError [1000]: Test"
   * ```
   */
  getFormattedMessage(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }

  /**
   * Gets context information as a formatted string.
   *
   * @returns Multi-line string with context key-value pairs,
   *          or a message indicating no context is available
   *
   * @example
   * ```typescript
   * const error = new SubnetterError('Test', ErrorCode.UNKNOWN_ERROR, {
   *   cidr: '10.0.0.0/8',
   *   account: 'production'
   * });
   * console.log(error.getContextString());
   * // Output:
   * // cidr: "10.0.0.0/8"
   * // account: "production"
   * ```
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
   *
   * @remarks
   * Override in subclasses to provide error-specific guidance.
   *
   * @returns Help text string with resolution suggestions
   */
  getHelpText(): string {
    return 'No specific help available for this error.';
  }
}

/**
 * Error thrown for configuration-related issues.
 *
 * @remarks
 * Use this error for problems with configuration files, validation
 * failures, or missing required fields.
 *
 * @example
 * ```typescript
 * import { ConfigurationError, ErrorCode } from '@subnetter/core';
 *
 * throw new ConfigurationError(
 *   'baseCidr is required',
 *   ErrorCode.MISSING_REQUIRED_FIELD,
 *   { field: 'baseCidr' }
 * );
 * ```
 *
 * @see {@link loadConfig} which throws this error on validation failure
 */
export class ConfigurationError extends SubnetterError {
  /**
   * Creates a new ConfigurationError.
   *
   * @param message - Description of the configuration problem
   * @param code - Error code (defaults to CONFIG_VALIDATION_FAILED)
   * @param context - Additional context (e.g., field name, config path)
   */
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
   *
   * @returns Context-aware help message based on error code
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
 *
 * @remarks
 * Use this error for problems with IP address allocation, including
 * invalid CIDR formats, overlapping blocks, or insufficient address space.
 *
 * @example
 * ```typescript
 * import { AllocationError, ErrorCode } from '@subnetter/core';
 *
 * throw new AllocationError(
 *   'Cannot allocate /16 from /24 block',
 *   ErrorCode.INSUFFICIENT_SPACE,
 *   { baseCidr: '10.0.0.0/24', requestedPrefix: 16 }
 * );
 * ```
 *
 * @see {@link CidrAllocator} which throws this error on allocation failure
 */
export class AllocationError extends SubnetterError {
  /**
   * Creates a new AllocationError.
   *
   * @param message - Description of the allocation problem
   * @param code - Error code (defaults to INVALID_CIDR_FORMAT)
   * @param context - Additional context (e.g., CIDR values, prefix lengths)
   */
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
   *
   * @returns Context-aware help message based on error code
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
 *
 * @remarks
 * Use this error for file system operations, including reading config
 * files and writing output files.
 *
 * @example
 * ```typescript
 * import { IOError, ErrorCode } from '@subnetter/core';
 *
 * throw new IOError(
 *   'Cannot write to output.csv',
 *   ErrorCode.OUTPUT_WRITE_FAILED,
 *   { path: './output.csv', reason: 'Permission denied' }
 * );
 * ```
 *
 * @see {@link writeAllocationsToCsv} which throws this on write failure
 */
export class IOError extends SubnetterError {
  /**
   * Creates a new IOError.
   *
   * @param message - Description of the I/O problem
   * @param code - Error code (defaults to OUTPUT_WRITE_FAILED)
   * @param context - Additional context (e.g., file path, operation)
   */
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
   *
   * @returns Context-aware help message based on error code
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
 *
 * @remarks
 * Use this error for general validation issues that don't fit into
 * the configuration or allocation categories.
 *
 * @example
 * ```typescript
 * import { ValidationError, ErrorCode } from '@subnetter/core';
 *
 * throw new ValidationError(
 *   'CIDR overlap detected in allocations',
 *   ErrorCode.CIDR_OVERLAP,
 *   { overlaps: [{ cidr1: '10.0.0.0/24', cidr2: '10.0.0.128/25' }] }
 * );
 * ```
 *
 * @see {@link validateNoOverlappingCidrs} which throws this on overlap detection
 */
export class ValidationError extends SubnetterError {
  /**
   * Creates a new ValidationError.
   *
   * @param message - Description of the validation failure
   * @param code - Error code (defaults to INVALID_OPERATION)
   * @param context - Additional context about the validation failure
   */
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
   *
   * @returns Help message for resolving validation issues
   */
  getHelpText(): string {
    return 'Validation failed. Please check your input values against the expected format.';
  }
}

/**
 * Error related to cloud provider operations.
 *
 * @remarks
 * Use this error for issues with cloud provider detection, invalid
 * regions, or unsupported availability zones.
 *
 * @example
 * ```typescript
 * import { CloudProviderError, ErrorCode } from '@subnetter/core';
 *
 * throw new CloudProviderError(
 *   'Unknown region: us-midwest-1',
 *   ErrorCode.INVALID_REGION,
 *   { region: 'us-midwest-1', provider: 'aws' }
 * );
 * ```
 *
 * @see {@link detectCloudProviderFromRegion} which may throw this error
 */
export class CloudProviderError extends SubnetterError {
  /**
   * Creates a new CloudProviderError.
   *
   * @param message - Description of the cloud provider problem
   * @param code - Error code (defaults to INVALID_CLOUD_PROVIDER)
   * @param context - Additional context (e.g., provider name, region)
   */
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
   *
   * @returns Context-aware help message based on error code
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
