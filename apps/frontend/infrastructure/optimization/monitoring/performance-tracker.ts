/**
 * Performance Tracking System
 *
 * Monitors n8n execution times, API response times, memory usage,
 * and generates performance reports.
 */

import RedisClient from '../cache/redis-client';

interface PerformanceMetric {
  type: 'execution' | 'api' | 'memory' | 'cache';
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  executions: {
    total: number;
    avgDuration: number;
    p50: number;
    p95: number;
    p99: number;
    slowest: Array<{ workflowId: string; duration: number }>;
  };
  api: {
    totalRequests: number;
    avgResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
  };
  memory: {
    avg: number;
    max: number;
    min: number;
  };
  cache: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
}

class PerformanceTracker {
  private static readonly PREFIX = 'perf:';
  private static readonly RETENTION_DAYS = 7;

  /**
   * Track n8n execution time
   */
  static async trackExecution(
    workflowId: string,
    executionId: string,
    duration: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const metric: PerformanceMetric = {
      type: 'execution',
      name: workflowId,
      value: duration,
      timestamp: Date.now(),
      metadata: {
        executionId,
        ...metadata,
      },
    };

    await this.recordMetric(metric);
  }

  /**
   * Track API response time
   */
  static async trackApiCall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number
  ): Promise<void> {
    const metric: PerformanceMetric = {
      type: 'api',
      name: `${method}:${endpoint}`,
      value: responseTime,
      timestamp: Date.now(),
      metadata: {
        statusCode,
      },
    };

    await this.recordMetric(metric);
  }

  /**
   * Track memory usage
   */
  static async trackMemory(): Promise<void> {
    if (typeof process === 'undefined') return;

    const usage = process.memoryUsage();

    const metric: PerformanceMetric = {
      type: 'memory',
      name: 'heap_used',
      value: usage.heapUsed,
      timestamp: Date.now(),
      metadata: {
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
      },
    };

    await this.recordMetric(metric);
  }

  /**
   * Track cache performance
   */
  static async trackCache(
    cacheName: string,
    hits: number,
    misses: number
  ): Promise<void> {
    const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

    const metric: PerformanceMetric = {
      type: 'cache',
      name: cacheName,
      value: hitRate,
      timestamp: Date.now(),
      metadata: {
        hits,
        misses,
      },
    };

    await this.recordMetric(metric);
  }

  /**
   * Record metric to Redis
   */
  private static async recordMetric(metric: PerformanceMetric): Promise<void> {
    const client = await RedisClient.getClient();
    const key = `${this.PREFIX}${metric.type}:${metric.name}`;

    try {
      // Store as sorted set with timestamp as score
      await client.zadd(key, metric.timestamp, JSON.stringify(metric));

      // Set expiry
      const ttl = this.RETENTION_DAYS * 24 * 60 * 60;
      await client.expire(key, ttl);

      // Trim old data
      const cutoff = Date.now() - ttl * 1000;
      await client.zremrangebyscore(key, 0, cutoff);
    } catch (error) {
      console.error('❌ Failed to record performance metric:', error);
    }
  }

  /**
   * Get metrics for a time range
   */
  static async getMetrics(
    type: PerformanceMetric['type'],
    name?: string,
    startTime?: number,
    endTime?: number
  ): Promise<PerformanceMetric[]> {
    const client = await RedisClient.getClient();
    const pattern = name
      ? `${this.PREFIX}${type}:${name}`
      : `${this.PREFIX}${type}:*`;

    const keys = await client.keys(pattern);
    const metrics: PerformanceMetric[] = [];

    const start = startTime || Date.now() - 24 * 60 * 60 * 1000; // Last 24h
    const end = endTime || Date.now();

    for (const key of keys) {
      try {
        const values = await client.zrangebyscore(key, start, end);

        values.forEach(value => {
          metrics.push(JSON.parse(value));
        });
      } catch (error) {
        console.error(`❌ Failed to get metrics from ${key}:`, error);
      }
    }

    return metrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Generate performance report
   */
  static async generateReport(
    startTime?: number,
    endTime?: number
  ): Promise<PerformanceReport> {
    const start = startTime || Date.now() - 24 * 60 * 60 * 1000; // Last 24h
    const end = endTime || Date.now();

    // Get all metrics
    const [executionMetrics, apiMetrics, memoryMetrics, cacheMetrics] =
      await Promise.all([
        this.getMetrics('execution', undefined, start, end),
        this.getMetrics('api', undefined, start, end),
        this.getMetrics('memory', undefined, start, end),
        this.getMetrics('cache', undefined, start, end),
      ]);

    // Analyze executions
    const executionDurations = executionMetrics.map(m => m.value).sort((a, b) => a - b);
    const executionStats = {
      total: executionMetrics.length,
      avgDuration: this.average(executionDurations),
      p50: this.percentile(executionDurations, 0.5),
      p95: this.percentile(executionDurations, 0.95),
      p99: this.percentile(executionDurations, 0.99),
      slowest: executionMetrics
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map(m => ({
          workflowId: m.name,
          duration: m.value,
        })),
    };

    // Analyze API calls
    const apiTimes = apiMetrics.map(m => m.value).sort((a, b) => a - b);

    // Group by endpoint
    const endpointStats = new Map<string, number[]>();
    apiMetrics.forEach(m => {
      if (!endpointStats.has(m.name)) {
        endpointStats.set(m.name, []);
      }
      endpointStats.get(m.name)!.push(m.value);
    });

    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        avgTime: this.average(times),
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    const apiStats = {
      totalRequests: apiMetrics.length,
      avgResponseTime: this.average(apiTimes),
      p50: this.percentile(apiTimes, 0.5),
      p95: this.percentile(apiTimes, 0.95),
      p99: this.percentile(apiTimes, 0.99),
      slowestEndpoints,
    };

    // Analyze memory
    const memoryValues = memoryMetrics.map(m => m.value);
    const memoryStats = {
      avg: this.average(memoryValues),
      max: Math.max(...memoryValues),
      min: Math.min(...memoryValues),
    };

    // Analyze cache
    let totalHits = 0;
    let totalMisses = 0;

    cacheMetrics.forEach(m => {
      if (m.metadata) {
        totalHits += m.metadata.hits || 0;
        totalMisses += m.metadata.misses || 0;
      }
    });

    const cacheStats = {
      hitRate: totalHits + totalMisses > 0
        ? (totalHits / (totalHits + totalMisses)) * 100
        : 0,
      totalHits,
      totalMisses,
    };

    return {
      period: {
        start: new Date(start),
        end: new Date(end),
      },
      executions: executionStats,
      api: apiStats,
      memory: memoryStats,
      cache: cacheStats,
    };
  }

  /**
   * Calculate average
   */
  private static average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private static percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;

    return sorted[Math.max(0, index)];
  }

  /**
   * Clear all metrics
   */
  static async clear(): Promise<void> {
    const client = await RedisClient.getClient();

    try {
      const keys = await client.keys(`${this.PREFIX}*`);

      if (keys.length > 0) {
        await client.del(...keys);
      }

      console.log(`✅ Cleared ${keys.length} performance metrics`);
    } catch (error) {
      console.error('❌ Failed to clear performance metrics:', error);
    }
  }

  /**
   * Get real-time stats
   */
  static async getRealTimeStats(): Promise<{
    executionsPerMinute: number;
    apiCallsPerMinute: number;
    avgExecutionTime: number;
    avgApiResponseTime: number;
    currentMemory: number;
    cacheHitRate: number;
  }> {
    const oneMinuteAgo = Date.now() - 60 * 1000;
    const now = Date.now();

    const [executions, apiCalls, memory, cache] = await Promise.all([
      this.getMetrics('execution', undefined, oneMinuteAgo, now),
      this.getMetrics('api', undefined, oneMinuteAgo, now),
      this.getMetrics('memory', undefined, oneMinuteAgo, now),
      this.getMetrics('cache', undefined, oneMinuteAgo, now),
    ]);

    const executionTimes = executions.map(m => m.value);
    const apiTimes = apiCalls.map(m => m.value);

    let cacheHits = 0;
    let cacheMisses = 0;
    cache.forEach(m => {
      if (m.metadata) {
        cacheHits += m.metadata.hits || 0;
        cacheMisses += m.metadata.misses || 0;
      }
    });

    return {
      executionsPerMinute: executions.length,
      apiCallsPerMinute: apiCalls.length,
      avgExecutionTime: this.average(executionTimes),
      avgApiResponseTime: this.average(apiTimes),
      currentMemory: memory.length > 0 ? memory[memory.length - 1].value : 0,
      cacheHitRate: cacheHits + cacheMisses > 0
        ? (cacheHits / (cacheHits + cacheMisses)) * 100
        : 0,
    };
  }

  /**
   * Start automatic tracking
   */
  static startAutoTracking(intervalMs = 60000): NodeJS.Timeout {
    return setInterval(async () => {
      await this.trackMemory();
    }, intervalMs);
  }

  /**
   * Stop automatic tracking
   */
  static stopAutoTracking(interval: NodeJS.Timeout): void {
    clearInterval(interval);
  }
}

export default PerformanceTracker;
export type { PerformanceMetric, PerformanceReport };
