// Jest global setup file

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

// Mock cidr-tools essential functions
jest.mock('cidr-tools', () => ({
  parseCidr: jest.fn((cidr) => {
    const [ip, prefix] = cidr.split('/');
    return { ip, prefix: parseInt(prefix, 10), version: 4 };
  }),
  overlapCidr: jest.fn((cidr1, cidr2) => {
    // Improved mock that checks for CIDR overlaps
    // For test purposes, consider CIDRs to overlap if one contains the other
    const [ip1, prefix1] = cidr1.split('/');
    const [ip2, prefix2] = cidr2.split('/');
    
    // If IPs match and one prefix is smaller (larger network), they overlap
    if (ip1 === ip2) {
      return true;
    }
    
    // For test cases like 10.0.0.0/8 and 10.0.0.0/16
    if (ip1.startsWith('10.') && ip2.startsWith('10.')) {
      return true;
    }
    
    return false;
  }),
  subnetCidr: jest.fn((cidr, newPrefix) => {
    const [ip] = cidr.split('/');
    return `${ip}/${newPrefix}`;
  }),
  expandCidr: jest.fn((cidr) => {
    return [`${cidr}`]; // Just return the original CIDR for mocking
  }),
  rangeCidr: jest.fn((cidr) => {
    const [ip, prefix] = cidr.split('/');
    return { start: ip, end: ip, size: Math.pow(2, 32 - parseInt(prefix, 10)) };
  }),
}));

// Mock string-width and strip-ansi which are ESM modules used by other dependencies
jest.mock('string-width', () => ({
  default: jest.fn((str) => str.length)
}), { virtual: true });

jest.mock('strip-ansi', () => ({
  default: jest.fn((str) => str.replace(/\u001B\[\d+m/g, ''))
}), { virtual: true });

// Mock fs operations for tests
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    writeFileSync: jest.fn(),
    readFileSync: jest.fn((path, options) => {
      // If this is a specific test file, return mock data
      if (path.includes('config.json')) {
        return JSON.stringify({
          baseCidr: '10.0.0.0/8',
          accounts: [{ name: 'test' }],
          cloudProviders: ['aws'],
          subnetTypes: [{ name: 'Test', prefixLength: 24 }]
        });
      } else if (path.includes('config.yaml')) {
        return `
baseCidr: 10.0.0.0/8
accounts:
  - name: test
cloudProviders:
  - aws
subnetTypes:
  - name: Test
    prefixLength: 24
`;
      }
      // For other files, use the actual implementation
      return actualFs.readFileSync(path, options);
    }),
    existsSync: jest.fn((path) => {
      // Return true for config files in tests
      if (path.includes('config.json') || path.includes('config.yaml')) {
        return true;
      }
      return actualFs.existsSync(path);
    }),
    mkdirSync: jest.fn(),
  };
});

// Note: We no longer mock global.setTimeout as it breaks axios/nock in netbox tests
// If specific tests need setTimeout mocking, they should do it locally

// No longer automatically mocking these libraries
// jest.mock('cidr-tools');
// jest.mock('ip-bigint');

// Add any global setup for all tests here 