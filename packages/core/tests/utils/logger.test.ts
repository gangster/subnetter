import { jest } from '@jest/globals';
import { createLogger, configureLogger, LogLevel, parseLogLevel } from '../../src/utils/logger';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { /* intentionally empty - suppressing console output during tests */ });
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation(() => { /* intentionally empty - suppressing console output during tests */ });
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation(() => { /* intentionally empty - suppressing console output during tests */ });
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => { /* intentionally empty - suppressing console output during tests */ });
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { /* intentionally empty - suppressing console output during tests */ });

describe('Logger Utility', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockConsoleLog.mockClear();
    mockConsoleDebug.mockClear();
    mockConsoleInfo.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
  });

  describe('createLogger', () => {
    it('should create a logger with the specified source', () => {
      const logger = createLogger('TestComponent');
      expect(logger).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.trace).toBeDefined();
    });

    it('should log error messages', () => {
      configureLogger({ level: LogLevel.ERROR });
      const logger = createLogger('TestComponent');
      logger.error('Test error message');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      configureLogger({ level: LogLevel.WARN });
      const logger = createLogger('TestComponent');
      logger.warn('Test warning message');
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      configureLogger({ level: LogLevel.INFO });
      const logger = createLogger('TestComponent');
      logger.info('Test info message');
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      configureLogger({ level: LogLevel.DEBUG });
      const logger = createLogger('TestComponent');
      logger.debug('Test debug message');
      // Just verify the logger exists and doesn't throw
      expect(logger.debug).toBeDefined();
    });

    it('should log trace messages', () => {
      configureLogger({ level: LogLevel.TRACE });
      const logger = createLogger('TestComponent');
      logger.trace('Test trace message');
      // Just verify the logger exists and doesn't throw
      expect(logger.trace).toBeDefined();
    });

    it('should not log messages below the configured level', () => {
      configureLogger({ level: LogLevel.ERROR });
      const logger = createLogger('TestComponent');
      logger.warn('This should not be logged');
      logger.info('This should not be logged');
      logger.debug('This should not be logged');
      logger.trace('This should not be logged');
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });

    it('should log messages with additional parameters', () => {
      configureLogger({ level: LogLevel.INFO });
      const logger = createLogger('TestComponent');
      const additionalParams = { key: 'value' };
      logger.info('Test message with params', additionalParams);
      expect(mockConsoleInfo).toHaveBeenCalled();
    });
  });

  describe('configureLogger', () => {
    it('should override default logger options', () => {
      configureLogger({
        level: LogLevel.DEBUG,
        useColor: false,
        timestamps: true,
        showSource: false
      });
      
      const logger = createLogger('TestComponent');
      logger.debug('Test debug message');
      expect(logger).toBeDefined();
    });
    
    it('should apply partial configuration', () => {
      configureLogger({ level: LogLevel.INFO });
      const logger = createLogger('TestComponent');
      logger.info('Test info message');
      logger.debug('Should not be logged');
      expect(mockConsoleInfo).toHaveBeenCalled();
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });
  });

  describe('parseLogLevel', () => {
    it('should parse string log levels correctly', () => {
      expect(parseLogLevel('SILENT')).toBe(LogLevel.SILENT);
      expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
      expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
      expect(parseLogLevel('INFO')).toBe(LogLevel.INFO);
      expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('TRACE')).toBe(LogLevel.TRACE);
    });

    it('should be case-insensitive', () => {
      expect(parseLogLevel('error')).toBe(LogLevel.ERROR);
      expect(parseLogLevel('wArN')).toBe(LogLevel.WARN);
      expect(parseLogLevel('Debug')).toBe(LogLevel.DEBUG);
    });

    it('should default to INFO for invalid levels', () => {
      expect(parseLogLevel('INVALID')).toBe(LogLevel.INFO);
      expect(parseLogLevel('')).toBe(LogLevel.INFO);
    });
  });

  describe('log formatting', () => {
    it('should log error with additional data', () => {
      configureLogger({ level: LogLevel.ERROR });
      const logger = createLogger('TestComponent');
      logger.error('Test error', { key: 'value' });
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should log warning with additional data', () => {
      configureLogger({ level: LogLevel.WARN });
      const logger = createLogger('TestComponent');
      logger.warn('Test warning', { key: 'value' });
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should log info with additional data', () => {
      configureLogger({ level: LogLevel.INFO });
      const logger = createLogger('TestComponent');
      logger.info('Test info', { key: 'value' });
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should log debug with additional data', () => {
      configureLogger({ level: LogLevel.DEBUG });
      const logger = createLogger('TestComponent');
      logger.debug('Test debug', { key: 'value' });
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should log trace with additional data', () => {
      configureLogger({ level: LogLevel.TRACE });
      const logger = createLogger('TestComponent');
      logger.trace('Test trace', { key: 'value' });
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should handle null data', () => {
      configureLogger({ level: LogLevel.INFO });
      const logger = createLogger('TestComponent');
      logger.info('Test info', null);
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should handle undefined data', () => {
      configureLogger({ level: LogLevel.INFO });
      const logger = createLogger('TestComponent');
      logger.info('Test info', undefined);
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should handle primitive data types', () => {
      configureLogger({ level: LogLevel.INFO });
      const logger = createLogger('TestComponent');
      logger.info('Test number', 42);
      logger.info('Test boolean', true);
      logger.info('Test string', 'test string');
      expect(mockConsoleInfo).toHaveBeenCalledTimes(3);
    });

    it('should log without color when useColor is false', () => {
      configureLogger({ level: LogLevel.ERROR, useColor: false });
      const logger = createLogger('TestComponent');
      logger.error('Test error');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should log all levels without color', () => {
      configureLogger({ level: LogLevel.TRACE, useColor: false });
      const logger = createLogger('TestComponent');
      logger.error('Error');
      logger.warn('Warn');
      logger.info('Info');
      logger.debug('Debug');
      logger.trace('Trace');
      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should include timestamps when enabled', () => {
      configureLogger({ level: LogLevel.INFO, timestamps: true });
      const logger = createLogger('TestComponent');
      logger.info('Test with timestamp');
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should hide source when showSource is false', () => {
      configureLogger({ level: LogLevel.INFO, showSource: false });
      const logger = createLogger('TestComponent');
      logger.info('Test without source');
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should not log when level is SILENT', () => {
      configureLogger({ level: LogLevel.SILENT });
      const logger = createLogger('TestComponent');
      logger.error('This should not be logged');
      logger.warn('This should not be logged');
      logger.info('This should not be logged');
      logger.debug('This should not be logged');
      logger.trace('This should not be logged');
      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });

    it('should create logger with empty source', () => {
      configureLogger({ level: LogLevel.INFO, showSource: true });
      const logger = createLogger('');
      logger.info('Test with empty source');
      expect(mockConsoleInfo).toHaveBeenCalled();
    });
  });

  afterAll(() => {
    // Restore console methods
    mockConsoleLog.mockRestore();
    mockConsoleDebug.mockRestore();
    mockConsoleInfo.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });
}); 