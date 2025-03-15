/** @type {import('jest').Config} */
const { defaults } = require('jest-config');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/packages/*/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  collectCoverage: true,
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['json-summary', 'json', 'lcov', 'text', 'clover'],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/**/__mocks__/**',
    '!packages/*/src/**/index.ts',
    '!packages/docs/**/*'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      useESM: false,
      tsconfig: 'tsconfig.json'
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ansi-styles|supports-color|is-fullwidth-code-point|fast-cidr-tools|strip-ansi|emoji-regex|string-width|eastasianwidth)/)'
  ],
  moduleNameMapper: {
    '^@subnetter/core$': '<rootDir>/packages/core/src/index.ts',
    '^@subnetter/cli$': '<rootDir>/packages/cli/src/index.ts',
    // Map .js imports to .ts source files
    '../../src/(.*)\.js$': '<rootDir>/packages/core/src/$1.ts',
    '../src/(.*)\.js$': '<rootDir>/packages/cli/src/$1.ts'
  },
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  verbose: true
}; 