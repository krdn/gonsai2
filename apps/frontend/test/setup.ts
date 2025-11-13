/**
 * Jest Test Setup
 *
 * Global setup for all tests including mocks and environment configuration.
 */

// Environment variables for testing
process.env.NEXT_PUBLIC_N8N_URL = 'http://localhost:5678';
process.env.N8N_API_KEY = 'test-api-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/n8n-test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '1'; // Use different DB for tests

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  onclose: (() => void) | null = null;

  send = jest.fn();
  close = jest.fn();

  constructor(public url: string) {
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
}

global.WebSocket = MockWebSocket as any;

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
