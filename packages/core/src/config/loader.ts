import { readFileSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { configSchema } from './schema';
import { Config, RawConfig } from '../models/types';
import { ZodError } from 'zod';
import { Logger } from '../utils/logger';
import { ConfigurationError, ErrorCode, IOError } from '../utils/errors';

// Create logger instance for config operations
const logger = new Logger('ConfigLoader');

/**
 * Parses configuration data based on file extension.
 * 
 * @param data Raw file content
 * @param extension File extension (e.g., '.json', '.yaml')
 * @returns Parsed configuration object
 * @throws {ConfigurationError} If the file format is unsupported or if parsing fails
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
 * Normalizes the configuration object to ensure all required properties are in the expected format.
 * 
 * @param config Validated configuration object
 * @returns Normalized configuration object
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
 * Loads and validates a configuration file.
 * Supports JSON and YAML formats.
 * 
 * @param configPath Path to the configuration file
 * @returns The validated configuration object
 * @throws {ConfigurationError} If the configuration is invalid
 * @throws {IOError} If the file can't be read
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
 * @param config Configuration object to validate
 * @returns The validated configuration object
 * @throws {ConfigurationError} If the configuration is invalid
 */
export function validateConfig(config: unknown): Config {
  logger.debug('Validating configuration object');
  
  try {
    const validatedConfig = configSchema.parse(config) as RawConfig;
    logger.info('Configuration validation successful');
    
    // Normalize the configuration
    const normalizedConfig = normalizeConfig(validatedConfig);
    
    return normalizedConfig;
  } catch (error) {
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