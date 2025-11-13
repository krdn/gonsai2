/**
 * Cache Service
 *
 * @description Redis 기반 캐싱 레이어
 */

import Redis from 'ioredis';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import { RedisError } from '../utils/errors';

/**
 * 캐시 옵션
 */
export interface CacheOptions {
  /** TTL (초 단위) */
  ttl?: number;
  /** 캐시 키 prefix */
  prefix?: string;
}

/**
 * 캐시 통계
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: string;
}

class CacheService {
  private client: Redis | null = null;
  private isEnabled: boolean = false;
  private stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * Redis 연결
   */
  async connect(): Promise<void> {
    try {
      // Redis URI가 설정되지 않은 경우 캐싱 비활성화
      if (!envConfig.REDIS_URI) {
        log.warn('Redis URI not configured, caching disabled');
        this.isEnabled = false;
        return;
      }

      log.info('Connecting to Redis...', {
        uri: envConfig.REDIS_URI.replace(/\/\/.*@/, '//***:***@'),
      });

      this.client = new Redis(envConfig.REDIS_URI, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      // 이벤트 리스너
      this.client.on('error', (error) => {
        log.error('Redis error', error);
      });

      this.client.on('connect', () => {
        log.info('Redis connected successfully');
        this.isEnabled = true;
      });

      this.client.on('reconnecting', () => {
        log.warn('Redis reconnecting...');
      });

      this.client.on('close', () => {
        log.warn('Redis connection closed');
        this.isEnabled = false;
      });

      // 연결 대기
      await this.client.ping();
    } catch (error) {
      log.error('Redis connection failed, caching disabled', error);
      this.isEnabled = false;
      this.client = null;
    }
  }

  /**
   * Redis 연결 해제
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isEnabled = false;
      log.info('Redis disconnected');
    }
  }

  /**
   * 캐시 조회
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const data = await this.client.get(fullKey);

      if (data) {
        this.stats.hits++;
        return JSON.parse(data) as T;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      log.error('Cache get failed', error, { key });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * 캐시 저장
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const serialized = JSON.stringify(value);

      if (options?.ttl) {
        await this.client.setex(fullKey, options.ttl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }
    } catch (error) {
      log.error('Cache set failed', error, { key });
      throw new RedisError('Failed to set cache', error as Error);
    }
  }

  /**
   * 캐시 삭제
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      await this.client.del(fullKey);
    } catch (error) {
      log.error('Cache delete failed', error, { key });
      throw new RedisError('Failed to delete cache', error as Error);
    }
  }

  /**
   * 패턴으로 캐시 삭제
   */
  async deletePattern(pattern: string, options?: CacheOptions): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      const fullPattern = this.buildKey(pattern, options?.prefix);
      const keys = await this.client.keys(fullPattern);

      if (keys.length > 0) {
        await this.client.del(...keys);
        log.info('Deleted cached keys', { pattern, count: keys.length });
      }
    } catch (error) {
      log.error('Cache pattern delete failed', error, { pattern });
      throw new RedisError('Failed to delete cache pattern', error as Error);
    }
  }

  /**
   * 캐시 존재 여부 확인
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      log.error('Cache exists check failed', error, { key });
      return false;
    }
  }

  /**
   * TTL 조회
   */
  async getTTL(key: string, options?: CacheOptions): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return -1;
    }

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      return await this.client.ttl(fullKey);
    } catch (error) {
      log.error('Cache TTL check failed', error, { key });
      return -1;
    }
  }

  /**
   * 전체 캐시 삭제
   */
  async flush(): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      await this.client.flushdb();
      log.warn('All cache flushed');
    } catch (error) {
      log.error('Cache flush failed', error);
      throw new RedisError('Failed to flush cache', error as Error);
    }
  }

  /**
   * 캐시 통계 조회
   */
  async getStats(): Promise<CacheStats> {
    if (!this.isEnabled || !this.client) {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: '0 B',
      };
    }

    try {
      const total = this.stats.hits + this.stats.misses;
      const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

      const dbSize = await this.client.dbsize();
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)\r\n/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        totalKeys: dbSize,
        memoryUsage,
      };
    } catch (error) {
      log.error('Failed to get cache stats', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 'unknown',
      };
    }
  }

  /**
   * 캐시 키 빌드
   */
  private buildKey(key: string, prefix?: string): string {
    const basePrefix = 'gonsai2';
    const parts = [basePrefix];

    if (prefix) {
      parts.push(prefix);
    }

    parts.push(key);
    return parts.join(':');
  }

  /**
   * 캐시 활성화 여부
   */
  isActive(): boolean {
    return this.isEnabled && this.client !== null;
  }

  /**
   * 캐시 래퍼 - 없으면 함수 실행 후 저장
   */
  async wrap<T>(key: string, fn: () => Promise<T>, options?: CacheOptions): Promise<T> {
    // 캐시 조회
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // 캐시 미스 - 함수 실행
    const result = await fn();

    // 결과 캐싱
    await this.set(key, result, options);

    return result;
  }
}

// Singleton 인스턴스
export const cacheService = new CacheService();
