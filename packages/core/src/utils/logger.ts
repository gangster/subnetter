/**
 * @module utils/logger
 * @description Configurable logging system for Subnetter.
 *
 * Provides a flexible logging interface with multiple verbosity levels,
 * optional colors, timestamps, and source identification. The logger
 * is automatically silent in test environments to keep test output clean.
 *
 * @remarks
 * Log levels in order of verbosity (least to most):
 * - SILENT (0): No output
 * - ERROR (1): Critical errors only
 * - WARN (2): Warnings and errors
 * - INFO (3): General information (default)
 * - DEBUG (4): Debugging information
 * - TRACE (5): Detailed trace logging
 *
 * @example
 * ```typescript
 * import { createLogger, configureLogger, LogLevel } from '@subnetter/core';
 *
 * // Configure global settings
 * configureLogger({ level: LogLevel.DEBUG, timestamps: true });
 *
 * // Create a logger for a specific module
 * const logger = createLogger('MyModule');
 * logger.info('Application started');
 * logger.debug('Configuration loaded', { accounts: 5 });
 * ```
 *
 * @packageDocumentation
 */

const chalk = require("chalk");

/**
 * Available log levels in order of verbosity.
 *
 * @remarks
 * Higher numeric values mean more verbose logging.
 * Use {@link configureLogger} to set the global log level.
 *
 * @example
 * ```typescript
 * import { LogLevel, configureLogger } from '@subnetter/core';
 *
 * // Only show errors and warnings
 * configureLogger({ level: LogLevel.WARN });
 *
 * // Show all logs including trace
 * configureLogger({ level: LogLevel.TRACE });
 * ```
 */
export enum LogLevel {
  /** No logging output. */
  SILENT = 0,
  /** Critical errors that prevent operation. */
  ERROR = 1,
  /** Warning conditions that should be addressed. */
  WARN = 2,
  /** General informational messages. */
  INFO = 3,
  /** Debugging information for troubleshooting. */
  DEBUG = 4,
  /** Detailed trace logging for deep debugging. */
  TRACE = 5
}

/**
 * Configuration options for the logger.
 *
 * @example
 * ```typescript
 * const options: LoggerOptions = {
 *   level: LogLevel.DEBUG,
 *   useColor: true,
 *   timestamps: true,
 *   showSource: true
 * };
 * configureLogger(options);
 * ```
 */
export interface LoggerOptions {
  /**
   * Minimum log level to output.
   * Messages below this level are suppressed.
   * @defaultValue LogLevel.INFO (or SILENT in test environment)
   */
  level: LogLevel;

  /**
   * Whether to use ANSI colors in output.
   * Disable for non-TTY environments or log files.
   * @defaultValue true
   */
  useColor: boolean;

  /**
   * Whether to include ISO timestamps in log messages.
   * @defaultValue false
   */
  timestamps: boolean;

  /**
   * Whether to show the source module name in log messages.
   * @defaultValue true
   */
  showSource: boolean;
}

/**
 * Default logger configuration.
 *
 * @remarks
 * Uses SILENT level in test environments to prevent noisy test output.
 *
 * @internal
 */
const DEFAULT_OPTIONS: LoggerOptions = {
  level: process.env.NODE_ENV === 'test' ? LogLevel.SILENT : LogLevel.INFO,
  useColor: true,
  timestamps: false,
  showSource: true
};

/**
 * Global logger configuration state.
 * @internal
 */
let globalOptions: LoggerOptions = { ...DEFAULT_OPTIONS };

/**
 * Configures global logger settings.
 *
 * @remarks
 * Changes apply to all loggers created with {@link createLogger}.
 * Settings are merged with existing configuration, so you only need
 * to specify the options you want to change.
 *
 * @param options - Partial configuration to merge with current settings
 *
 * @example
 * ```typescript
 * import { configureLogger, LogLevel } from '@subnetter/core';
 *
 * // Enable debug logging with timestamps
 * configureLogger({
 *   level: LogLevel.DEBUG,
 *   timestamps: true
 * });
 *
 * // Disable colors for file output
 * configureLogger({ useColor: false });
 * ```
 */
export function configureLogger(options: Partial<LoggerOptions>): void {
  globalOptions = {
    ...globalOptions,
    ...options
  };
}

/**
 * Parses a string log level to its enum value.
 *
 * @remarks
 * Case-insensitive parsing. Returns INFO for unrecognized values.
 *
 * @param level - String representation of the log level
 * @returns Corresponding {@link LogLevel} enum value
 *
 * @example
 * ```typescript
 * import { parseLogLevel, LogLevel } from '@subnetter/core';
 *
 * parseLogLevel('debug');  // Returns LogLevel.DEBUG
 * parseLogLevel('DEBUG');  // Returns LogLevel.DEBUG
 * parseLogLevel('invalid'); // Returns LogLevel.INFO (default)
 * ```
 */
export function parseLogLevel(level: string): LogLevel {
  const normalizedLevel = level.toUpperCase();
  switch (normalizedLevel) {
    case 'SILENT': return LogLevel.SILENT;
    case 'ERROR': return LogLevel.ERROR;
    case 'WARN': return LogLevel.WARN;
    case 'INFO': return LogLevel.INFO;
    case 'DEBUG': return LogLevel.DEBUG;
    case 'TRACE': return LogLevel.TRACE;
    default: return LogLevel.INFO;
  }
}

/**
 * Formats a log message with prefixes and styling.
 *
 * @param level - Log level for the message
 * @param source - Source module name
 * @param message - Log message content
 * @returns Formatted message string
 *
 * @internal
 */
function formatLogMessage(level: LogLevel, source: string, message: string): string {
  const { useColor, timestamps, showSource } = globalOptions;

  // Prepare timestamp if enabled
  const timestamp = timestamps ? `${new Date().toISOString()} ` : '';

  // Prepare source if enabled
  const sourcePrefix = showSource && source ? `[${source}] ` : '';

  // Prepare level prefix with optional color
  let levelPrefix = '';

  if (useColor) {
    switch (level) {
      case LogLevel.ERROR:
        levelPrefix = chalk.red ? chalk.red('ERROR') : 'ERROR';
        break;
      case LogLevel.WARN:
        levelPrefix = chalk.yellow ? chalk.yellow('WARN') : 'WARN';
        break;
      case LogLevel.INFO:
        levelPrefix = chalk.blue ? chalk.blue('INFO') : 'INFO';
        break;
      case LogLevel.DEBUG:
        levelPrefix = chalk.cyan ? chalk.cyan('DEBUG') : 'DEBUG';
        break;
      case LogLevel.TRACE:
        levelPrefix = chalk.gray ? chalk.gray('TRACE') : 'TRACE';
        break;
    }
  } else {
    switch (level) {
      case LogLevel.ERROR:
        levelPrefix = 'ERROR';
        break;
      case LogLevel.WARN:
        levelPrefix = 'WARN';
        break;
      case LogLevel.INFO:
        levelPrefix = 'INFO';
        break;
      case LogLevel.DEBUG:
        levelPrefix = 'DEBUG';
        break;
      case LogLevel.TRACE:
        levelPrefix = 'TRACE';
        break;
    }
  }

  return `${timestamp}${levelPrefix ? `[${levelPrefix}] ` : ''}${sourcePrefix}${message}`;
}

/**
 * Formats additional data for log output.
 *
 * @param data - Data to format (any type)
 * @returns String representation of the data
 *
 * @internal
 */
function formatLogData(data: unknown): string {
  try {
    if (data === undefined) return 'undefined';
    if (data === null) return 'null';

    if (typeof data === 'string') return data;
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);

    // Handle objects and arrays with pretty printing
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return `[Unformattable data: ${String(error)}]`;
  }
}

/**
 * Logger class for logging messages at different levels.
 *
 * @remarks
 * Create instances using {@link createLogger} for consistent source naming.
 * All loggers share the global configuration set by {@link configureLogger}.
 *
 * @example
 * ```typescript
 * import { Logger, LogLevel, configureLogger } from '@subnetter/core';
 *
 * configureLogger({ level: LogLevel.DEBUG });
 *
 * const logger = new Logger('MyService');
 * logger.info('Service starting');
 * logger.debug('Loading configuration', { path: './config.json' });
 * logger.error('Failed to start', { reason: 'Port in use' });
 * ```
 */
export class Logger {
  /**
   * Source module name for this logger instance.
   * @internal
   */
  private source: string;

  /**
   * Creates a new Logger instance.
   *
   * @param source - Name identifying the source module or component
   *
   * @example
   * ```typescript
   * const logger = new Logger('CidrAllocator');
   * ```
   */
  constructor(source: string) {
    this.source = source;
  }

  /**
   * Internal method to output a log message.
   *
   * @param level - Log level for the message
   * @param message - Message text
   * @param data - Optional additional data to log
   *
   * @internal
   */
  private _log(level: LogLevel, message: string, data?: unknown): void {
    // Skip logging if below configured level or silent
    if (level > globalOptions.level || globalOptions.level === LogLevel.SILENT) {
      return;
    }

    // Format the message
    const formattedMessage = formatLogMessage(level, this.source, message);

    // Format any additional data
    const formattedData = data !== undefined ? `\n${formatLogData(data)}` : '';

    // Output to appropriate console method
    switch (level) {
      case LogLevel.ERROR:
        if (formattedData) {
          console.error(`${formattedMessage}${formattedData}`);
        } else {
          console.error(formattedMessage);
        }
        break;
      case LogLevel.WARN:
        if (formattedData) {
          console.warn(`${formattedMessage}${formattedData}`);
        } else {
          console.warn(formattedMessage);
        }
        break;
      default:
        if (formattedData) {
          console.info(`${formattedMessage}${formattedData}`);
        } else {
          console.info(formattedMessage);
        }
        break;
    }
  }

  /**
   * Logs a message at TRACE level.
   *
   * @remarks
   * Use for detailed debugging information that is typically only
   * needed when diagnosing specific issues.
   *
   * @param message - Log message
   * @param data - Optional data to include
   *
   * @example
   * ```typescript
   * logger.trace('Entering function', { args: [1, 2, 3] });
   * ```
   */
  trace(message: string, data?: unknown): void {
    this._log(LogLevel.TRACE, message, data);
  }

  /**
   * Logs a message at DEBUG level.
   *
   * @remarks
   * Use for information useful during development and debugging.
   *
   * @param message - Log message
   * @param data - Optional data to include
   *
   * @example
   * ```typescript
   * logger.debug('Configuration loaded', { accounts: config.accounts.length });
   * ```
   */
  debug(message: string, data?: unknown): void {
    this._log(LogLevel.DEBUG, message, data);
  }

  /**
   * Logs a message at INFO level.
   *
   * @remarks
   * Use for general operational information about normal application flow.
   *
   * @param message - Log message
   * @param data - Optional data to include
   *
   * @example
   * ```typescript
   * logger.info('Generated 100 subnet allocations');
   * ```
   */
  info(message: string, data?: unknown): void {
    this._log(LogLevel.INFO, message, data);
  }

  /**
   * Logs a message at WARN level.
   *
   * @remarks
   * Use for potentially problematic situations that don't prevent operation
   * but should be addressed.
   *
   * @param message - Log message
   * @param data - Optional data to include
   *
   * @example
   * ```typescript
   * logger.warn('Region has no AZ mapping, using defaults', { region: 'us-unknown-1' });
   * ```
   */
  warn(message: string, data?: unknown): void {
    this._log(LogLevel.WARN, message, data);
  }

  /**
   * Logs a message at ERROR level.
   *
   * @remarks
   * Use for error conditions that affect operation. These should typically
   * be accompanied by error handling.
   *
   * @param message - Log message
   * @param data - Optional data to include (e.g., error object)
   *
   * @example
   * ```typescript
   * logger.error('Failed to write output file', { path: outputPath, error: err.message });
   * ```
   */
  error(message: string, data?: unknown): void {
    this._log(LogLevel.ERROR, message, data);
  }
}

/**
 * Creates a new Logger instance for a specific source.
 *
 * @remarks
 * Factory function for creating loggers. Prefer this over direct
 * Logger instantiation for consistency.
 *
 * @param source - Name identifying the source module or component
 * @returns New Logger instance configured with the source name
 *
 * @example
 * ```typescript
 * import { createLogger } from '@subnetter/core';
 *
 * // At module level
 * const logger = createLogger('CidrAllocator');
 *
 * // In functions
 * logger.info('Starting allocation');
 * logger.debug('Processing account', { name: 'production' });
 * ```
 */
export function createLogger(source: string): Logger {
  return new Logger(source);
}
