const chalk = require("chalk");

/**
 * Available log levels in order of verbosity
 */
export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /** The minimum level of logs to output */
  level: LogLevel;
  /** Whether to use color in the output */
  useColor: boolean;
  /** Whether to include timestamps in log messages */
  timestamps: boolean;
  /** Whether to include the source module/component in log messages */
  showSource: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_OPTIONS: LoggerOptions = {
  // Use silent level by default in test environment to avoid spamming test output
  level: process.env.NODE_ENV === 'test' ? LogLevel.SILENT : LogLevel.INFO,
  useColor: true,
  timestamps: false,
  showSource: true
};

/**
 * Global logger configuration
 */
let globalOptions: LoggerOptions = { ...DEFAULT_OPTIONS };

/**
 * Configure the global logger settings
 * 
 * @param options The options to set
 */
export function configureLogger(options: Partial<LoggerOptions>): void {
  globalOptions = {
    ...globalOptions,
    ...options
  };
}

/**
 * Parse a string log level to its enum value
 * 
 * @param level The string log level
 * @returns The corresponding LogLevel enum value
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
 * Format a log message with the appropriate prefixes and styling
 * 
 * @param level The log level
 * @param source The source of the log message
 * @param message The log message
 * @returns The formatted log message
 */
function formatLogMessage(level: LogLevel, source: string, message: string): string {
  const { useColor, timestamps, showSource } = globalOptions;
  
  // Prepare timestamp if enabled
  const timestamp = timestamps ? `${new Date().toISOString()} ` : '';
  
  // Prepare source if enabled
  const sourcePrefix = showSource && source ? `[${source}] ` : '';
  
  // Prepare level prefix
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
 * Format log data for output
 * 
 * @param data The data to format for logging
 * @returns Formatted string representation of the data
 */
function formatLogData(data: unknown): string {
  try {
    if (data === undefined) return 'undefined';
    if (data === null) return 'null';
    
    if (typeof data === 'string') return data;
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);
    
    // Handle objects and arrays
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return `[Unformattable data: ${String(error)}]`;
  }
}

/**
 * Logger class for logging messages at different levels
 */
export class Logger {
  /**
   * The name of the source for this logger
   */
  private source: string;
  
  /**
   * Create a new logger
   * 
   * @param source The source name for the logger
   */
  constructor(source: string) {
    this.source = source;
  }
  
  /**
   * Internal method to log a message
   * 
   * @param level The log level
   * @param message The message to log
   * @param data Optional additional data to log
   */
  private _log(level: LogLevel, message: string, data?: unknown): void {
    // Skip logging if the level is lower than the configured level
    if (level > globalOptions.level || globalOptions.level === LogLevel.SILENT) {
      return;
    }
    
    // Format the message
    const formattedMessage = formatLogMessage(level, this.source, message);
    
    // Format any additional data
    const formattedData = data !== undefined ? `\n${formatLogData(data)}` : '';
    
    // Log to the appropriate output
    switch (level) {
      case LogLevel.ERROR:
        if (formattedData) {
          // Use error method for errors
          console.error(`${formattedMessage}${formattedData}`);
        } else {
          console.error(formattedMessage);
        }
        break;
      case LogLevel.WARN:
        if (formattedData) {
          // Use warn method for warnings
          console.warn(`${formattedMessage}${formattedData}`);
        } else {
          console.warn(formattedMessage);
        }
        break;
      default:
        if (formattedData) {
          // Use info method for all other levels
          console.info(`${formattedMessage}${formattedData}`);
        } else {
          console.info(formattedMessage);
        }
        break;
    }
  }
  
  /**
   * Log a message at the TRACE level
   * 
   * @param message The message to log
   * @param data Optional additional data to log
   */
  trace(message: string, data?: unknown): void {
    this._log(LogLevel.TRACE, message, data);
  }
  
  /**
   * Log a message at the DEBUG level
   * 
   * @param message The message to log
   * @param data Optional additional data to log
   */
  debug(message: string, data?: unknown): void {
    this._log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log a message at the INFO level
   * 
   * @param message The message to log
   * @param data Optional additional data to log
   */
  info(message: string, data?: unknown): void {
    this._log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log a message at the WARN level
   * 
   * @param message The message to log
   * @param data Optional additional data to log
   */
  warn(message: string, data?: unknown): void {
    this._log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log a message at the ERROR level
   * 
   * @param message The message to log
   * @param data Optional additional data to log
   */
  error(message: string, data?: unknown): void {
    this._log(LogLevel.ERROR, message, data);
  }
}

/**
 * Create a new logger
 * 
 * @param source The source name for the logger
 * @returns A new logger instance
 */
export function createLogger(source: string): Logger {
  return new Logger(source);
} 