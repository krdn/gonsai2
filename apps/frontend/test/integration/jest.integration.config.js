/**
 * Jest Configuration for Integration Tests
 *
 * Requires Docker and docker-compose to be installed.
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  displayName: 'integration',
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.integration.ts'],

  // Test match patterns
  testMatch: ['<rootDir>/test/integration/**/*.test.ts'],

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Timeout for integration tests (longer than unit tests)
  testTimeout: 30000,

  // Run tests serially (not in parallel) to avoid container conflicts
  maxWorkers: 1,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Coverage (optional for integration tests)
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    'infrastructure/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/test/**',
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/global-teardown.ts',
};

module.exports = createJestConfig(customJestConfig);
