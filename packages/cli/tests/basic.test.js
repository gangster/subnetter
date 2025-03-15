// Mock dependencies
jest.mock('commander', () => {
    return {
        Command: jest.fn().mockImplementation(() => {
            return {
                name: jest.fn().mockReturnThis(),
                description: jest.fn().mockReturnThis(),
                version: jest.fn().mockReturnThis(),
                command: jest.fn().mockReturnThis(),
                option: jest.fn().mockReturnThis(),
                requiredOption: jest.fn().mockReturnThis(),
                action: jest.fn().mockReturnThis(),
                parse: jest.fn().mockReturnThis()
            };
        })
    };
});
// Mock core package
jest.mock('@subnetter/core', () => {
    return {
        loadConfig: jest.fn(),
        CidrAllocator: jest.fn(() => ({
            generateAllocations: jest.fn()
        })),
        writeAllocationsToCsv: jest.fn(),
        filterAllocationsByProvider: jest.fn()
    };
});
// Import CLI module to test
import '../src/index';
import { Command } from 'commander';
// The core package imports are only needed for the mock types
// import { loadConfig, CidrAllocator, writeAllocationsToCsv, filterAllocationsByProvider } from '@subnetter/core';
// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((_code) => {
    return undefined;
});
describe('CLI', () => {
    // Basic test to ensure the test setup works
    it('should set up mocks correctly', () => {
        expect(jest.isMockFunction(require('@subnetter/core').loadConfig)).toBe(true);
        expect(jest.isMockFunction(require('@subnetter/core').CidrAllocator)).toBe(true);
        expect(jest.isMockFunction(require('@subnetter/core').writeAllocationsToCsv)).toBe(true);
        expect(jest.isMockFunction(require('@subnetter/core').filterAllocationsByProvider)).toBe(true);
    });
    it('should initialize the CLI with commander', () => {
        // Check that Commander was initialized
        expect(Command).toHaveBeenCalled();
        const commanderInstance = Command.mock.results[0].value;
        // Check that basic setup methods were called
        expect(commanderInstance.name).toHaveBeenCalledWith('subnetter');
        expect(commanderInstance.description).toHaveBeenCalledWith('IPv4 CIDR allocation tool for cloud infrastructure');
        expect(commanderInstance.version).toHaveBeenCalledWith('1.0.0');
        // Check command registration
        expect(commanderInstance.command).toHaveBeenCalledWith('generate');
        expect(commanderInstance.command).toHaveBeenCalledWith('validate');
    });
    afterAll(() => {
        // Restore console methods
        mockConsoleLog.mockRestore();
        mockConsoleError.mockRestore();
        mockProcessExit.mockRestore();
    });
});
