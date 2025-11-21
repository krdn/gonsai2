/**
 * Execution Result Cache
 *
 * Caches n8n workflow execution results with configurable TTL
 * to reduce database queries for completed executions.
 */

import RedisClient from './redis-client';

interface ExecutionResult {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'internal';
  status: 'success' | 'error' | 'waiting' | 'running';
  startedAt: string;
  stoppedAt?: string;
  duration?: number;
  data?: any;
  error?: string;
}

interface ExecutionCacheOptions {
  ttl?: number; // Custom TTL in seconds
}

class ExecutionCache {
  private static readonly PREFIX = 'execution:';
  private static readonly RECENT_KEY = 'execution:recent';
  private static readonly STATS_KEY = 'execution:stats';

  // TTL based on status
  private static readonly TTL_SUCCESS = 3600; // 1 hour
  private static readonly TTL_ERROR = 1800; // 30 minutes
  private static readonly TTL_RUNNING = 300; // 5 minutes
  private static readonly RECENT_TTL = 600; // 10 minutes
  private static readonly RECENT_LIMIT = 100; // Keep last 100

  /**
   * Get execution result by ID
   */
  static async get(executionId: string): Promise<ExecutionResult | null> {
    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${executionId}`;

    try {
      const data = await client.get(key);

      if (data) {
        await this.incrementStat('hits');
        return JSON.parse(data);
      }

      await this.incrementStat('misses');
      return null;
    } catch (error) {
      console.error(`❌ Failed to get execution ${executionId} from cache:`, error);
      return null;
    }
  }

  /**
   * Set execution result with automatic TTL based on status
   */
  static async set(
    executionId: string,
    result: ExecutionResult,
    options: ExecutionCacheOptions = {}
  ): Promise<void> {
    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${executionId}`;

    // Determine TTL based on status or custom value
    let ttl = options.ttl;
    if (!ttl) {
      switch (result.status) {
        case 'success':
          ttl = this.TTL_SUCCESS;
          break;
        case 'error':
          ttl = this.TTL_ERROR;
          break;
        case 'running':
        case 'waiting':
          ttl = this.TTL_RUNNING;
          break;
        default:
          ttl = this.TTL_SUCCESS;
      }
    }

    try {
      await client.setex(key, ttl, JSON.stringify(result));
      await this.addToRecent(executionId, result.workflowId);
      await this.incrementStat('sets');
    } catch (error) {
      console.error(`❌ Failed to set execution ${executionId} in cache:`, error);
    }
  }

  /**
   * Delete execution result
   */
  static async delete(executionId: string): Promise<void> {
    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${executionId}`;

    try {
      await client.del(key);
      await this.removeFromRecent(executionId);
      await this.incrementStat('deletes');
    } catch (error) {
      console.error(`❌ Failed to delete execution ${executionId} from cache:`, error);
    }
  }

  /**
   * Get executions by workflow ID
   */
  static async getByWorkflow(workflowId: string, limit = 20): Promise<ExecutionResult[]> {
    const client = await RedisClient.getClient();
    const results: ExecutionResult[] = [];

    try {
      // Get recent executions for this workflow
      const recentIds = await client.zrevrange(`${this.RECENT_KEY}:${workflowId}`, 0, limit - 1);

      // Fetch execution data
      const keys = recentIds.map((id) => `${this.PREFIX}${id}`);
      if (keys.length > 0) {
        const values = await client.mget(...keys);

        values.forEach((value, index) => {
          if (value) {
            results.push(JSON.parse(value));
            this.incrementStat('hits');
          } else {
            this.incrementStat('misses');
          }
        });
      }
    } catch (error) {
      console.error(`❌ Failed to get executions for workflow ${workflowId}:`, error);
    }

    return results;
  }

  /**
   * Get recent executions across all workflows
   */
  static async getRecent(limit = 50): Promise<ExecutionResult[]> {
    const client = await RedisClient.getClient();
    const results: ExecutionResult[] = [];

    try {
      const recentIds = await client.zrevrange(this.RECENT_KEY, 0, limit - 1);

      const keys = recentIds.map((id) => `${this.PREFIX}${id}`);
      if (keys.length > 0) {
        const values = await client.mget(...keys);

        values.forEach((value) => {
          if (value) {
            results.push(JSON.parse(value));
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to get recent executions:', error);
    }

    return results;
  }

  /**
   * Add execution to recent list
   */
  private static async addToRecent(executionId: string, workflowId: string): Promise<void> {
    const client = await RedisClient.getClient();
    const timestamp = Date.now();

    try {
      const pipeline = client.pipeline();

      // Add to global recent list
      pipeline.zadd(this.RECENT_KEY, timestamp, executionId);
      pipeline.zremrangebyrank(this.RECENT_KEY, 0, -(this.RECENT_LIMIT + 1));
      pipeline.expire(this.RECENT_KEY, this.RECENT_TTL);

      // Add to workflow-specific recent list
      const workflowKey = `${this.RECENT_KEY}:${workflowId}`;
      pipeline.zadd(workflowKey, timestamp, executionId);
      pipeline.zremrangebyrank(workflowKey, 0, -(this.RECENT_LIMIT + 1));
      pipeline.expire(workflowKey, this.RECENT_TTL);

      await pipeline.exec();
    } catch (error) {
      console.error('❌ Failed to add execution to recent list:', error);
    }
  }

  /**
   * Remove execution from recent list
   */
  private static async removeFromRecent(executionId: string): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      // Remove from global recent list
      await client.zrem(this.RECENT_KEY, executionId);

      // Remove from all workflow-specific lists (scan and remove)
      const keys = await client.keys(`${this.RECENT_KEY}:*`);
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        keys.forEach((key) => pipeline.zrem(key, executionId));
        await pipeline.exec();
      }
    } catch (error) {
      console.error('❌ Failed to remove execution from recent list:', error);
    }
  }

  /**
   * Update execution status (for running executions)
   */
  static async updateStatus(executionId: string, status: ExecutionResult['status']): Promise<void> {
    const execution = await this.get(executionId);

    if (execution) {
      execution.status = status;

      if (status === 'success' || status === 'error') {
        execution.stoppedAt = new Date().toISOString();

        if (execution.startedAt) {
          const start = new Date(execution.startedAt).getTime();
          const stop = new Date(execution.stoppedAt).getTime();
          execution.duration = stop - start;
        }
      }

      await this.set(executionId, execution);
    }
  }

  /**
   * Clear execution cache by workflow ID
   */
  static async clearByWorkflow(workflowId: string): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      // Get all execution IDs for this workflow from recent list
      const executionIds = await client.zrange(`${this.RECENT_KEY}:${workflowId}`, 0, -1);

      if (executionIds.length > 0) {
        const keys = executionIds.map((id) => `${this.PREFIX}${id}`);
        await client.del(...keys);
      }

      // Clear recent list for this workflow
      await client.del(`${this.RECENT_KEY}:${workflowId}`);

      console.log(
        `✅ Cleared ${executionIds.length} execution cache entries for workflow ${workflowId}`
      );
    } catch (error) {
      console.error(`❌ Failed to clear execution cache for workflow ${workflowId}:`, error);
    }
  }

  /**
   * Clear all execution cache
   */
  static async clear(): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      const keys = await client.keys(`${this.PREFIX}*`);
      const recentKeys = await client.keys(`${this.RECENT_KEY}*`);

      const allKeys = [...keys, ...recentKeys, this.STATS_KEY];

      if (allKeys.length > 0) {
        await client.del(...allKeys);
      }

      console.log(`✅ Cleared ${allKeys.length} execution cache entries`);
    } catch (error) {
      console.error('❌ Failed to clear execution cache:', error);
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
      console.error('❌ Failed to get execution cache stats:', error);
      return { hits: 0, misses: 0, sets: 0, deletes: 0 };
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
}

export default ExecutionCache;
