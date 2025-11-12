/**
 * Workflow Metadata Cache
 *
 * Caches n8n workflow metadata to reduce database queries and improve
 * workflow list/detail performance.
 */

import RedisClient from './redis-client';

interface WorkflowMetadata {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  nodes: number;
  connections: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

class WorkflowCache {
  private static readonly PREFIX = 'workflow:';
  private static readonly LIST_KEY = 'workflow:list';
  private static readonly STATS_KEY = 'workflow:stats';

  // TTL: 5 minutes for individual workflows, 2 minutes for list
  private static readonly WORKFLOW_TTL = 300;
  private static readonly LIST_TTL = 120;

  /**
   * Get workflow metadata by ID
   */
  static async get(workflowId: string): Promise<WorkflowMetadata | null> {
    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${workflowId}`;

    try {
      const data = await client.get(key);

      if (data) {
        await this.incrementStat('hits');
        return JSON.parse(data);
      }

      await this.incrementStat('misses');
      return null;
    } catch (error) {
      console.error(`❌ Failed to get workflow ${workflowId} from cache:`, error);
      return null;
    }
  }

  /**
   * Set workflow metadata
   */
  static async set(workflowId: string, metadata: WorkflowMetadata): Promise<void> {
    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${workflowId}`;

    try {
      await client.setex(
        key,
        this.WORKFLOW_TTL,
        JSON.stringify(metadata)
      );

      await this.incrementStat('sets');
    } catch (error) {
      console.error(`❌ Failed to set workflow ${workflowId} in cache:`, error);
    }
  }

  /**
   * Delete workflow metadata
   */
  static async delete(workflowId: string): Promise<void> {
    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${workflowId}`;

    try {
      await client.del(key);
      await this.invalidateList();
      await this.incrementStat('deletes');
    } catch (error) {
      console.error(`❌ Failed to delete workflow ${workflowId} from cache:`, error);
    }
  }

  /**
   * Get all workflows list (cached)
   */
  static async getList(): Promise<WorkflowMetadata[] | null> {
    const client = await RedisClient.getClient();

    try {
      const data = await client.get(this.LIST_KEY);

      if (data) {
        await this.incrementStat('hits');
        return JSON.parse(data);
      }

      await this.incrementStat('misses');
      return null;
    } catch (error) {
      console.error('❌ Failed to get workflow list from cache:', error);
      return null;
    }
  }

  /**
   * Set workflows list
   */
  static async setList(workflows: WorkflowMetadata[]): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      await client.setex(
        this.LIST_KEY,
        this.LIST_TTL,
        JSON.stringify(workflows)
      );

      await this.incrementStat('sets');
    } catch (error) {
      console.error('❌ Failed to set workflow list in cache:', error);
    }
  }

  /**
   * Invalidate workflows list cache
   */
  static async invalidateList(): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      await client.del(this.LIST_KEY);
    } catch (error) {
      console.error('❌ Failed to invalidate workflow list:', error);
    }
  }

  /**
   * Get multiple workflows by IDs
   */
  static async getMany(workflowIds: string[]): Promise<Map<string, WorkflowMetadata>> {
    const client = await RedisClient.getClient();
    const result = new Map<string, WorkflowMetadata>();

    const keys = workflowIds.map(id => `${this.PREFIX}${id}`);

    try {
      const values = await client.mget(...keys);

      values.forEach((value, index) => {
        if (value) {
          const metadata = JSON.parse(value);
          result.set(workflowIds[index], metadata);
          this.incrementStat('hits');
        } else {
          this.incrementStat('misses');
        }
      });
    } catch (error) {
      console.error('❌ Failed to get multiple workflows from cache:', error);
    }

    return result;
  }

  /**
   * Set multiple workflows
   */
  static async setMany(workflows: WorkflowMetadata[]): Promise<void> {
    const client = await RedisClient.getClient();
    const pipeline = client.pipeline();

    workflows.forEach(workflow => {
      const key = `${this.PREFIX}${workflow.id}`;
      pipeline.setex(key, this.WORKFLOW_TTL, JSON.stringify(workflow));
    });

    try {
      await pipeline.exec();
      await this.incrementStat('sets', workflows.length);
    } catch (error) {
      console.error('❌ Failed to set multiple workflows in cache:', error);
    }
  }

  /**
   * Clear all workflow cache
   */
  static async clear(): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      const keys = await client.keys(`${this.PREFIX}*`);

      if (keys.length > 0) {
        await client.del(...keys);
      }

      await client.del(this.LIST_KEY, this.STATS_KEY);
      console.log(`✅ Cleared ${keys.length} workflow cache entries`);
    } catch (error) {
      console.error('❌ Failed to clear workflow cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<CacheStats> {
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
      console.error('❌ Failed to get cache stats:', error);
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
      console.error('❌ Failed to reset cache stats:', error);
    }
  }

  /**
   * Increment cache statistic
   */
  private static async incrementStat(stat: keyof CacheStats, amount = 1): Promise<void> {
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

export default WorkflowCache;
