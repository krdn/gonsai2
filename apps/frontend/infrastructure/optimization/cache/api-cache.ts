/**
 * API Response Cache
 *
 * Middleware for caching n8n API responses to reduce redundant calls
 * and improve overall API performance.
 */

import RedisClient from './redis-client';
import { createHash } from 'crypto';

interface CacheEntry {
  data: any;
  cachedAt: number;
  expiresAt: number;
}

interface ApiCacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  bypass?: boolean; // Skip cache
}

class ApiCache {
  private static readonly PREFIX = 'api:';
  private static readonly STATS_KEY = 'api:stats';

  // Default TTL: 5 minutes
  private static readonly DEFAULT_TTL = 300;

  /**
   * Generate cache key from request parameters
   */
  private static generateKey(
    method: string,
    endpoint: string,
    params?: Record<string, any>
  ): string {
    const hash = createHash('md5')
      .update(JSON.stringify({ method, endpoint, params }))
      .digest('hex');

    return `${this.PREFIX}${method}:${endpoint}:${hash}`;
  }

  /**
   * Get cached API response
   */
  static async get(
    method: string,
    endpoint: string,
    params?: Record<string, any>,
    options: ApiCacheOptions = {}
  ): Promise<any | null> {
    if (options.bypass) return null;

    const client = await RedisClient.getClient();
    const key = options.key || this.generateKey(method, endpoint, params);

    try {
      const data = await client.get(key);

      if (data) {
        const entry: CacheEntry = JSON.parse(data);

        // Check if expired
        if (entry.expiresAt > Date.now()) {
          await this.incrementStat('hits');
          return entry.data;
        }

        // Expired, delete it
        await client.del(key);
      }

      await this.incrementStat('misses');
      return null;
    } catch (error) {
      console.error('❌ Failed to get API cache:', error);
      return null;
    }
  }

  /**
   * Set API response cache
   */
  static async set(
    method: string,
    endpoint: string,
    data: any,
    params?: Record<string, any>,
    options: ApiCacheOptions = {}
  ): Promise<void> {
    if (options.bypass) return;

    const client = await RedisClient.getClient();
    const key = options.key || this.generateKey(method, endpoint, params);
    const ttl = options.ttl || this.DEFAULT_TTL;

    const entry: CacheEntry = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
    };

    try {
      await client.setex(key, ttl, JSON.stringify(entry));
      await this.incrementStat('sets');
    } catch (error) {
      console.error('❌ Failed to set API cache:', error);
    }
  }

  /**
   * Delete specific cache entry
   */
  static async delete(
    method: string,
    endpoint: string,
    params?: Record<string, any>,
    options: ApiCacheOptions = {}
  ): Promise<void> {
    const client = await RedisClient.getClient();
    const key = options.key || this.generateKey(method, endpoint, params);

    try {
      await client.del(key);
      await this.incrementStat('deletes');
    } catch (error) {
      console.error('❌ Failed to delete API cache:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidate(pattern: string): Promise<number> {
    const client = await RedisClient.getClient();

    try {
      const keys = await client.keys(`${this.PREFIX}${pattern}`);

      if (keys.length > 0) {
        await client.del(...keys);
        console.log(`✅ Invalidated ${keys.length} API cache entries`);
        return keys.length;
      }

      return 0;
    } catch (error) {
      console.error('❌ Failed to invalidate API cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate all cache for an endpoint
   */
  static async invalidateEndpoint(endpoint: string): Promise<number> {
    return this.invalidate(`*:${endpoint}:*`);
  }

  /**
   * Clear all API cache
   */
  static async clear(): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      const keys = await client.keys(`${this.PREFIX}*`);

      if (keys.length > 0) {
        await client.del(...keys);
      }

      await client.del(this.STATS_KEY);
      console.log(`✅ Cleared ${keys.length} API cache entries`);
    } catch (error) {
      console.error('❌ Failed to clear API cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats() {
    const client = await RedisClient.getClient();

    try {
      const stats = await client.hgetall(this.STATS_KEY);

      return {
        hits: parseInt(stats.hits || '0'),
        misses: parseInt(stats.misses || '0'),
        sets: parseInt(stats.sets || '0'),
        deletes: parseInt(stats.deletes || '0'),
      };
    } catch (error) {
      console.error('❌ Failed to get API cache stats:', error);
      return { hits: 0, misses: 0, sets: 0, deletes: 0 };
    }
  }

  /**
   * Reset cache statistics
   */
  static async resetStats(): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      await client.del(this.STATS_KEY);
    } catch (error) {
      console.error('❌ Failed to reset API cache stats:', error);
    }
  }

  /**
   * Increment cache statistic
   */
  private static async incrementStat(stat: string, amount = 1): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      await client.hincrby(this.STATS_KEY, stat, amount);
    } catch (error) {
      // Silent fail for stats
    }
  }

  /**
   * Calculate cache hit rate
   */
  static async getHitRate(): Promise<number> {
    const stats = await this.getStats();
    const total = stats.hits + stats.misses;

    if (total === 0) return 0;

    return (stats.hits / total) * 100;
  }

  /**
   * Middleware for Express/Next.js API routes
   */
  static middleware(options: ApiCacheOptions = {}) {
    return async (req: any, res: any, next: any) => {
      const method = req.method;
      const endpoint = req.path || req.url;
      const params = { ...req.query, ...req.body };

      // Only cache GET requests by default
      if (method !== 'GET' && !options.key) {
        return next();
      }

      // Check cache
      const cachedData = await this.get(method, endpoint, params, options);

      if (cachedData) {
        // Return cached response
        return res.status(200).json(cachedData);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache response
      res.json = function (data: any) {
        // Cache the response
        ApiCache.set(method, endpoint, data, params, options);

        // Send response
        return originalJson(data);
      };

      next();
    };
  }
}

export default ApiCache;
