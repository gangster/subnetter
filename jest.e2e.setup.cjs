// Jest E2E setup file - only includes necessary ESM mocks, not fs mock

// Create mocks for ES modules that are causing issues
jest.mock('chalk', () => ({
  default: {
    green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
    red: jest.fn((text) => `[RED]${text}[/RED]`),
    yellow: jest.fn((text) => `[YELLOW]${text}[/YELLOW]`),
    blue: jest.fn((text) => `[BLUE]${text}[/BLUE]`),
    cyan: jest.fn((text) => `[CYAN]${text}[/CYAN]`),
    gray: jest.fn((text) => `[GRAY]${text}[/GRAY]`),
    white: jest.fn((text) => `[WHITE]${text}[/WHITE]`),
    italic: jest.fn((text) => `[ITALIC]${text}[/ITALIC]`),
    bold: jest.fn((text) => `[BOLD]${text}[/BOLD]`),
    underline: jest.fn((text) => `[UNDERLINE]${text}[/UNDERLINE]`),
    dim: jest.fn((text) => `[DIM]${text}[/DIM]`),
  }
}));

// Mock string-width and strip-ansi which are ESM modules used by other dependencies
jest.mock('string-width', () => ({
  default: jest.fn((str) => str.length)
}), { virtual: true });

jest.mock('strip-ansi', () => ({
  default: jest.fn((str) => str.replace(/\u001B\[\d+m/g, ''))
}), { virtual: true });

// Note: E2E tests do NOT mock fs - they use real filesystem access

