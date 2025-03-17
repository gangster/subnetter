/** @type {import('jest').Config} */
const baseConfig = require('./jest.config.cjs');

// Create a new configuration without the testMatch property
const { testMatch, ...configWithoutTestMatch } = baseConfig;

module.exports = {
  ...configWithoutTestMatch,
  testRegex: '/__tests__/e2e/.*\\.(test|spec)\\.[tj]sx?$',
  collectCoverageFrom: [
    'packages/*/src/**/*.{js,ts}',
    '!packages/docs/**/*', // Exclude docs
    '!**/node_modules/**',
    '!**/dist/**',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/**/__mocks__/**',
    '!packages/*/src/**/index.ts'
  ],
  // Add longer timeout for E2E tests
  testTimeout: 30000
}; 