/**
 * Redis Client Configuration
 *
 * Centralized Redis connection management with connection pooling,
 * automatic reconnection, and error handling.
 */

import Redis, { RedisOptions } from 'ioredis';

// Redis connection configuration
const REDIS_CONFIG: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),

  // Connection pooling
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,

  // Reconnection strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Connection timeout
  connectTimeout: 10000,

  // Keep-alive
  keepAlive: 30000,

  // Lazy connect (connect on first command)
  lazyConnect: true,
};

// Singleton Redis client
class RedisClient {
  private static instance: Redis | null = null;
  private static isConnecting = false;

  static async getClient(): Promise<Redis> {
    if (!this.instance) {
      if (this.isConnecting) {
        // Wait for existing connection attempt
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.getClient();
      }

      this.isConnecting = true;
      this.instance = new Redis(REDIS_CONFIG);

      // Event handlers
      this.instance.on('connect', () => {
        console.log('✅ Redis: Connected successfully');
      });

      this.instance.on('ready', () => {
        console.log('✅ Redis: Ready to accept commands');
        this.isConnecting = false;
      });

      this.instance.on('error', (error) => {
        console.error('❌ Redis: Connection error:', error.message);
      });

      this.instance.on('close', () => {
        console.log('⚠️  Redis: Connection closed');
      });

      this.instance.on('reconnecting', () => {
        console.log('🔄 Redis: Reconnecting...');
      });

      // Connect
      await this.instance.connect();
    }

    return this.instance;
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
    }
  }

  static async ping(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Redis ping failed:', error);
      return false;
    }
  }

  static async flushAll(): Promise<void> {
    const client = await this.getClient();
    await client.flushall();
  }
}

export default RedisClient;
