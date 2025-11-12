/**
 * Integration Test Setup
 *
 * Setup for each integration test file.
 */

// Environment variables for integration tests
process.env.NEXT_PUBLIC_N8N_URL = 'http://localhost:5679';
process.env.N8N_API_KEY = ''; // No API key for test instance
process.env.MONGODB_URI = 'mongodb://localhost:27017/n8n-test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '2'; // Different DB for integration tests

// Increase timeout for integration tests
jest.setTimeout(30000);

// Cleanup after each test
afterEach(async () => {
  jest.clearAllMocks();
});
