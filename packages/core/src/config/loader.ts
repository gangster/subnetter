/**
 * @module config/loader
 * @description Configuration loading and validation for Subnetter.
 *
 * Provides functions to load configuration from JSON or YAML files,
 * validate configuration objects, and normalize them for use with
 * the CIDR allocator.
 *
 * @remarks
 * The loader performs several validation steps:
 * 1. File format detection (JSON/YAML based on extension)
 * 2. Schema validation using Zod
 * 3. CIDR overlap detection for cloud-specific overrides
 * 4. Normalization to consistent internal format
 *
 * @example
 * ```typescript
 * import { loadConfig, validateConfig } from '@subnetter/core';
 *
 * // Load from file
 * const config = loadConfig('./network-config.json');
 *
 * // Or validate an object directly
 * const config = validateConfig({
 *   baseCidr: '10.0.0.0/8',
 *   accounts: [...],
 *   subnetTypes: { public: 24 }
 * });
 * ```
 *
 * @see {@link configSchema} for the validation schema
 * @see {@link Config} for the output type
 *
 * @packageDocumentation
 */

import { readFileSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { configSchema } from './schema';
import type { Config, RawConfig } from '../models/types';
import { ZodError } from 'zod';
import { Logger } from '../utils/logger';
import { ConfigurationError, ErrorCode, IOError } from '../utils/errors';
import { doCidrsOverlap } from '../allocator/utils/cidr/calculator';

/**
 * Logger instance for configuration operations.
 * @internal
 */
const logger = new Logger('ConfigLoader');

/**
 * Parses configuration data based on file extension.
 *
 * @param data - Raw file content as a string
 * @param extension - File extension including the dot (e.g., '.json', '.yaml')
 * @returns Parsed configuration object (unvalidated)
 *
 * @throws {@link ConfigurationError}
 * Thrown with `INVALID_JSON_FORMAT` if JSON parsing fails.
 *
 * @throws {@link ConfigurationError}
 * Thrown with `INVALID_YAML_FORMAT` if YAML parsing fails.
 *
 * @throws {@link ConfigurationError}
 * Thrown with `INVALID_CONFIG_FORMAT` if the extension is unsupported.
 *
 * @internal
 */
function parseConfigData(data: string, extension: string): unknown {
  logger.debug(`Parsing config data with extension: ${extension}`);

  switch (extension.toLowerCase()) {
    case '.json':
      logger.debug('Parsing as JSON');
      try {
        return JSON.parse(data);
      } catch (error) {
        logger.error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new ConfigurationError(
          `Invalid JSON in configuration file: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INVALID_JSON_FORMAT,
          { rawError: error instanceof Error ? error.message : String(error) }
        );
      }
    case '.yaml':
    case '.yml':
      logger.debug('Parsing as YAML');
      try {
        return yaml.load(data);
      } catch (error) {
        logger.error(`Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new ConfigurationError(
          `Invalid YAML in configuration file: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INVALID_YAML_FORMAT,
          { rawError: error instanceof Error ? error.message : String(error) }
        );
      }
    default:
      logger.error(`Unsupported file extension: ${extension}`);
      throw new ConfigurationError(
        `Unsupported file extension: ${extension}. Only JSON and YAML formats are supported.`,
        ErrorCode.INVALID_CONFIG_FORMAT,
        { extension }
      );
  }
}

/**
 * Normalizes a validated configuration to the internal format.
 *
 * @remarks
 * Ensures `cloudProviders` is always an array, even if not specified
 * in the original configuration.
 *
 * @param rawConfig - Validated raw configuration
 * @returns Normalized configuration object
 *
 * @internal
 */
function normalizeConfig(rawConfig: RawConfig): Config {
  return {
    baseCidr: rawConfig.baseCidr,
    prefixLengths: rawConfig.prefixLengths,
    accounts: rawConfig.accounts,
    subnetTypes: rawConfig.subnetTypes,
    cloudProviders: rawConfig.cloudProviders || []
  };
}

/**
 * Validates that no baseCidr values in the configuration overlap.
 *
 * @remarks
 * This validation prevents configurations that would generate
 * duplicate or overlapping subnet allocations. Only cloud-specific
 * CIDR overrides are checked against each other; the top-level
 * `baseCidr` is expected to be the parent of all allocations.
 *
 * @param config - The raw configuration to validate
 *
 * @throws {@link ConfigurationError}
 * Thrown with `CIDR_OVERLAP` if overlapping CIDRs are detected.
 *
 * @internal
 */
function validateNoCidrOverlaps(config: RawConfig): void {
  logger.debug('Validating configuration for CIDR overlaps');

  const allCidrs: Array<{ cidr: string; path: string }> = [];

  // Collect all baseCidrs from cloud configurations
  config.accounts.forEach((account, accountIndex) => {
    if (account.clouds) {
      Object.entries(account.clouds).forEach(([provider, cloud]) => {
        if (cloud.baseCidr) {
          allCidrs.push({
            cidr: cloud.baseCidr,
            path: `accounts[${accountIndex}].clouds.${provider}.baseCidr (${account.name})`
          });
        }
      });
    }
  });

  // Skip validation if fewer than 2 CIDR overrides exist
  if (allCidrs.length < 2) {
    logger.debug('Less than 2 CIDR overrides found, skipping overlap check');
    return;
  }

  logger.debug(`Checking ${allCidrs.length} CIDR overrides for overlaps`);

  // Check each pair for overlaps
  for (let i = 0; i < allCidrs.length; i++) {
    for (let j = i + 1; j < allCidrs.length; j++) {
      try {
        if (doCidrsOverlap(allCidrs[i].cidr, allCidrs[j].cidr)) {
          const message = `Overlapping CIDRs detected in configuration: ${allCidrs[i].path} (${allCidrs[i].cidr}) overlaps with ${allCidrs[j].path} (${allCidrs[j].cidr})`;
          logger.error(message);
          throw new ConfigurationError(
            message,
            ErrorCode.CIDR_OVERLAP,
            {
              cidr1: allCidrs[i].cidr,
              cidr1Path: allCidrs[i].path,
              cidr2: allCidrs[j].cidr,
              cidr2Path: allCidrs[j].path
            }
          );
        }
      } catch (error) {
        // Re-throw ConfigurationError, wrap other errors
        if (error instanceof ConfigurationError) {
          throw error;
        }
        logger.warn(`Error checking CIDR overlap between ${allCidrs[i].cidr} and ${allCidrs[j].cidr}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  logger.debug('No CIDR overlaps detected in configuration');
}

/**
 * Loads and validates a configuration file.
 *
 * @remarks
 * Supports JSON (`.json`) and YAML (`.yaml`, `.yml`) file formats.
 * The file path can be absolute or relative to the current working directory.
 *
 * The loading process:
 * 1. Resolves the file path
 * 2. Validates the file extension
 * 3. Reads and parses the file content
 * 4. Validates against the configuration schema
 * 5. Checks for CIDR overlaps in cloud configurations
 * 6. Normalizes to the internal format
 *
 * @param configPath - Path to the configuration file (absolute or relative)
 * @returns The validated and normalized configuration
 *
 * @throws {@link ConfigurationError}
 * Thrown with `CONFIG_FILE_NOT_FOUND` if the file doesn't exist.
 *
 * @throws {@link ConfigurationError}
 * Thrown with `INVALID_CONFIG_FORMAT` if the file extension is unsupported.
 *
 * @throws {@link ConfigurationError}
 * Thrown with `INVALID_JSON_FORMAT` or `INVALID_YAML_FORMAT` if parsing fails.
 *
 * @throws {@link ConfigurationError}
 * Thrown with `CONFIG_VALIDATION_FAILED` if schema validation fails.
 *
 * @throws {@link ConfigurationError}
 * Thrown with `CIDR_OVERLAP` if cloud CIDRs overlap.
 *
 * @throws {@link IOError}
 * Thrown with `INSUFFICIENT_PERMISSIONS` if the file cannot be read.
 *
 * @example
 * ```typescript
 * import { loadConfig } from '@subnetter/core';
 *
 * // Load from JSON
 * const config = loadConfig('./config.json');
 *
 * // Load from YAML
 * const config = loadConfig('./config.yaml');
 *
 * // Use absolute path
 * const config = loadConfig('/etc/subnetter/config.json');
 * ```
 *
 * @see {@link validateConfig} for validating objects without file I/O
 * @see {@link Config} for the return type structure
 */
export function loadConfig(configPath: string): Config {
  logger.info(`Loading configuration from: ${configPath}`);

  try {
    // Resolve the path if it's relative
    const resolvedPath = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);
    logger.debug(`Resolved config path: ${resolvedPath}`);

    // Get the file extension
    const extension = path.extname(resolvedPath);
    logger.debug(`File extension: ${extension}`);

    // Check if the file extension is supported before reading the file
    if (!['.json', '.yaml', '.yml'].includes(extension.toLowerCase())) {
      logger.error(`Unsupported file extension: ${extension}`);
      throw new ConfigurationError(
        `Unsupported file extension: ${extension}. Only JSON and YAML formats are supported.`,
        ErrorCode.INVALID_CONFIG_FORMAT,
        { extension, supportedExtensions: ['.json', '.yaml', '.yml'] }
      );
    }

    // Read the file
    logger.debug(`Reading file: ${resolvedPath}`);
    try {
      const fileContent = readFileSync(resolvedPath, 'utf-8');
      logger.trace(`File content length: ${fileContent.length} bytes`);

      // Parse the file content based on its extension
      logger.debug('Parsing configuration data');
      const configData = parseConfigData(fileContent, extension);

      try {
        // Validate the configuration against the schema
        logger.debug('Validating configuration against schema');
        const validatedConfig = configSchema.parse(configData) as RawConfig;
        logger.info('Configuration validation successful');
        logger.debug(`Config has ${validatedConfig.accounts.length} accounts`);

        // Validate that no CIDRs overlap
        validateNoCidrOverlaps(validatedConfig);

        // Normalize the configuration
        const normalizedConfig = normalizeConfig(validatedConfig);

        return normalizedConfig;
      } catch (error) {
        if (error instanceof ZodError) {
          logger.warn(`Configuration validation failed for ${configPath}`);

          throw new ConfigurationError(
            `Configuration validation failed: ${configPath}`,
            ErrorCode.CONFIG_VALIDATION_FAILED,
            {
              configPath,
              validationErrors: error.errors.map(e => ({
                path: e.path,
                message: e.message
              }))
            }
          );
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('ENOENT')) {
        logger.error(`Configuration file not found: ${configPath}`);
        throw new ConfigurationError(
          `Configuration file not found: ${configPath}`,
          ErrorCode.CONFIG_FILE_NOT_FOUND,
          { configPath }
        );
      }

      if (error instanceof Error && (error.message.includes('permission') || error.message.includes('EACCES'))) {
        logger.error(`Insufficient permissions to read file: ${configPath}`);
        throw new IOError(
          `Insufficient permissions to read file: ${configPath}`,
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          { configPath }
        );
      }

      logger.error(`Error reading configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new IOError(
        `Error reading configuration file: ${configPath}`,
        ErrorCode.INPUT_READ_FAILED,
        { configPath, rawError: error instanceof Error ? error.message : String(error) }
      );
    }
  } catch (error) {
    // Let ConfigurationError and IOError pass through
    if (error instanceof ConfigurationError || error instanceof IOError) {
      throw error;
    }

    // Handle any other unexpected errors
    logger.error(`Unexpected error loading configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new ConfigurationError(
      `Unexpected error loading configuration: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.UNKNOWN_ERROR,
      { rawError: error }
    );
  }
}

/**
 * Validates a configuration object without loading from a file.
 *
 * @remarks
 * Use this function when you have a configuration object in memory
 * (e.g., from an API request or programmatic construction) rather
 * than loading from a file.
 *
 * Performs the same validation steps as {@link loadConfig}:
 * 1. Schema validation using Zod
 * 2. CIDR overlap detection
 * 3. Normalization
 *
 * @param config - Configuration object to validate (unknown type for flexibility)
 * @returns The validated and normalized configuration
 *
 * @throws {@link ConfigurationError}
 * Thrown with `CONFIG_VALIDATION_FAILED` if schema validation fails.
 *
 * @throws {@link ConfigurationError}
 * Thrown with `CIDR_OVERLAP` if cloud CIDRs overlap.
 *
 * @example
 * ```typescript
 * import { validateConfig } from '@subnetter/core';
 *
 * const config = validateConfig({
 *   baseCidr: '10.0.0.0/8',
 *   accounts: [
 *     {
 *       name: 'production',
 *       clouds: { aws: { regions: ['us-east-1'] } }
 *     }
 *   ],
 *   subnetTypes: { public: 24, private: 24 }
 * });
 *
 * console.log(`Validated ${config.accounts.length} accounts`);
 * ```
 *
 * @see {@link loadConfig} for loading from files
 * @see {@link configSchema} for the underlying validation schema
 */
export function validateConfig(config: unknown): Config {
  logger.debug('Validating configuration object');

  try {
    const validatedConfig = configSchema.parse(config) as RawConfig;
    logger.info('Configuration validation successful');

    // Validate that no CIDRs overlap
    validateNoCidrOverlaps(validatedConfig);

    // Normalize the configuration
    const normalizedConfig = normalizeConfig(validatedConfig);

    return normalizedConfig;
  } catch (error) {
    // Let ConfigurationError pass through (includes CIDR overlap errors)
    if (error instanceof ConfigurationError) {
      throw error;
    }
    if (error instanceof ZodError) {
      logger.warn('Configuration validation failed for object');
      throw new ConfigurationError(
        'Configuration validation failed',
        ErrorCode.CONFIG_VALIDATION_FAILED,
        {
          validationErrors: error.errors.map(e => ({
            path: e.path,
            message: e.message
          }))
        }
      );
    }
    logger.error(`Unexpected error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new ConfigurationError(
      `Unexpected error during validation: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.UNKNOWN_ERROR,
      { rawError: error }
    );
  }
}
