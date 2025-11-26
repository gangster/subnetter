/** @type {import('jest').Config} */
const baseConfig = require('./jest.config.cjs');

// Create a new configuration without the testMatch and setupFilesAfterEnv properties
// E2E tests should use real filesystem and dependencies, not mocks
const { testMatch, setupFilesAfterEnv, ...configWithoutTestMatch } = baseConfig;

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
  // E2E tests use a separate setup file that doesn't mock fs
  setupFilesAfterEnv: ['<rootDir>/jest.e2e.setup.cjs'],
  // Add longer timeout for E2E tests
  testTimeout: 30000
}; 