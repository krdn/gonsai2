/**
 * Metrics Collector Service
 *
 * @description n8n 실행 메트릭 수집 및 저장
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { log } from '../../../apps/backend/src/utils/logger';
import {
  ExecutionMetric,
  NodeMetric,
  AITokenUsage,
  ResourceUsage,
  WorkflowStatistics,
  ErrorFrequency,
  TimeRange,
  TimeUnit,
} from '../types/monitoring.types';

/**
 * AI 모델 비용 (USD per 1K tokens)
 */
const AI_MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
};

/**
 * Metrics Collector 클래스
 */
export class MetricsCollectorService {
  private db: Db | null = null;
  private metricsCollection: Collection<ExecutionMetric> | null = null;
  private client: MongoClient | null = null;

  constructor() {
    log.info('Metrics Collector Service initialized');
  }

  /**
   * MongoDB 연결
   */
  async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gonsai2';
      this.client = new MongoClient(mongoUri);
      await this.client.connect();

      this.db = this.client.db();
      this.metricsCollection = this.db.collection<ExecutionMetric>('execution_metrics');

      // 인덱스 생성
      await this.createIndexes();

      log.info('Metrics Collector connected to MongoDB');
    } catch (error) {
      log.error('Failed to connect Metrics Collector to MongoDB', error);
      throw error;
    }
  }

  /**
   * 인덱스 생성
   */
  private async createIndexes(): Promise<void> {
    if (!this.metricsCollection) return;

    await this.metricsCollection.createIndex({ executionId: 1 }, { unique: true });
    await this.metricsCollection.createIndex({ workflowId: 1, startedAt: -1 });
    await this.metricsCollection.createIndex({ status: 1, startedAt: -1 });
    await this.metricsCollection.createIndex({ startedAt: -1 });

    log.info('Metrics collection indexes created');
  }

  /**
   * 실행 메트릭 저장
   */
  async saveExecutionMetric(metric: ExecutionMetric): Promise<void> {
    try {
      if (!this.metricsCollection) {
        throw new Error('Metrics collection not initialized');
      }

      await this.metricsCollection.insertOne(metric);

      log.info('Execution metric saved', {
        executionId: metric.executionId,
        workflowId: metric.workflowId,
        duration: metric.duration,
      });
    } catch (error) {
      log.error('Failed to save execution metric', error);
      throw error;
    }
  }

  /**
   * 노드 메트릭 계산
   */
  calculateNodeMetrics(
    nodeId: string,
    nodeName: string,
    nodeType: string,
    startedAt: Date,
    finishedAt: Date,
    inputItems: number,
    outputItems: number,
    error?: string
  ): NodeMetric {
    return {
      nodeId,
      nodeName,
      nodeType,
      startedAt,
      finishedAt,
      duration: finishedAt.getTime() - startedAt.getTime(),
      inputItems,
      outputItems,
      error,
    };
  }

  /**
   * AI 토큰 사용량 계산
   */
  calculateAITokenUsage(
    model: string,
    promptTokens: number,
    completionTokens: number,
    provider: 'openai' | 'anthropic' | 'other'
  ): AITokenUsage {
    const totalTokens = promptTokens + completionTokens;
    const costs = AI_MODEL_COSTS[model] || { input: 0, output: 0 };

    const cost =
      (promptTokens / 1000) * costs.input + (completionTokens / 1000) * costs.output;

    return {
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      provider,
    };
  }

  /**
   * 리소스 사용량 측정
   */
  async measureResourceUsage(): Promise<ResourceUsage> {
    // Node.js 프로세스 메모리 사용량
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;

    // CPU 사용량 (간단한 근사치)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // microseconds to seconds

    return {
      cpuPercent: Math.min(cpuPercent, 100),
      memoryMB: Math.round(memoryMB),
      networkKB: 0, // 실제 구현 시 네트워크 모니터링 필요
    };
  }

  /**
   * 워크플로우 통계 조회
   */
  async getWorkflowStatistics(
    workflowId: string,
    timeRange?: TimeRange
  ): Promise<WorkflowStatistics | null> {
    try {
      if (!this.metricsCollection) {
        throw new Error('Metrics collection not initialized');
      }

      const query: any = { workflowId };

      if (timeRange) {
        query.startedAt = {
          $gte: timeRange.start,
          $lte: timeRange.end,
        };
      }

      const metrics = await this.metricsCollection.find(query).toArray();

      if (metrics.length === 0) {
        return null;
      }

      const totalExecutions = metrics.length;
      const successfulExecutions = metrics.filter((m) => m.status === 'success').length;
      const failedExecutions = metrics.filter((m) => m.status === 'failed').length;
      const successRate = (successfulExecutions / totalExecutions) * 100;

      const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
      const averageDuration = totalDuration / totalExecutions;

      const totalAITokens = metrics.reduce(
        (sum, m) => sum + (m.aiTokenUsage?.totalTokens || 0),
        0
      );

      const totalCost = metrics.reduce((sum, m) => sum + (m.aiTokenUsage?.cost || 0), 0);

      const lastExecution = metrics.sort(
        (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
      )[0];

      // 오류 빈도 계산
      const errorMap = new Map<string, ErrorFrequency>();
      metrics.forEach((m) => {
        if (m.error) {
          const existing = errorMap.get(m.error);
          if (existing) {
            existing.count++;
            if (m.startedAt > existing.lastOccurrence) {
              existing.lastOccurrence = m.startedAt;
            }
          } else {
            errorMap.set(m.error, {
              errorMessage: m.error,
              count: 1,
              lastOccurrence: m.startedAt,
            });
          }
        }
      });

      const topErrors = Array.from(errorMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        workflowId,
        workflowName: metrics[0].workflowName,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate,
        averageDuration,
        totalDuration,
        totalAITokens: totalAITokens > 0 ? totalAITokens : undefined,
        totalCost: totalCost > 0 ? totalCost : undefined,
        lastExecutionAt: lastExecution.startedAt,
        errorRate: (failedExecutions / totalExecutions) * 100,
        topErrors,
      };
    } catch (error) {
      log.error('Failed to get workflow statistics', error, { workflowId });
      throw error;
    }
  }

  /**
   * 전체 워크플로우 통계 조회
   */
  async getAllWorkflowStatistics(timeRange?: TimeRange): Promise<WorkflowStatistics[]> {
    try {
      if (!this.metricsCollection) {
        throw new Error('Metrics collection not initialized');
      }

      const query: any = {};

      if (timeRange) {
        query.startedAt = {
          $gte: timeRange.start,
          $lte: timeRange.end,
        };
      }

      // 모든 워크플로우 ID 조회
      const workflowIds = await this.metricsCollection.distinct('workflowId', query);

      // 각 워크플로우 통계 조회
      const statistics = await Promise.all(
        workflowIds.map((workflowId) => this.getWorkflowStatistics(workflowId, timeRange))
      );

      return statistics.filter((s) => s !== null) as WorkflowStatistics[];
    } catch (error) {
      log.error('Failed to get all workflow statistics', error);
      throw error;
    }
  }

  /**
   * 실행 성공률 계산
   */
  async calculateSuccessRate(timeRange: TimeRange): Promise<number> {
    try {
      if (!this.metricsCollection) {
        throw new Error('Metrics collection not initialized');
      }

      const query = {
        startedAt: {
          $gte: timeRange.start,
          $lte: timeRange.end,
        },
      };

      const total = await this.metricsCollection.countDocuments(query);

      if (total === 0) {
        return 100;
      }

      const successful = await this.metricsCollection.countDocuments({
        ...query,
        status: 'success',
      });

      return (successful / total) * 100;
    } catch (error) {
      log.error('Failed to calculate success rate', error);
      return 0;
    }
  }

  /**
   * 평균 실행 시간 계산
   */
  async calculateAverageExecutionTime(timeRange: TimeRange): Promise<number> {
    try {
      if (!this.metricsCollection) {
        throw new Error('Metrics collection not initialized');
      }

      const result = await this.metricsCollection
        .aggregate([
          {
            $match: {
              startedAt: {
                $gte: timeRange.start,
                $lte: timeRange.end,
              },
            },
          },
          {
            $group: {
              _id: null,
              avgDuration: { $avg: '$duration' },
            },
          },
        ])
        .toArray();

      return result.length > 0 ? result[0].avgDuration : 0;
    } catch (error) {
      log.error('Failed to calculate average execution time', error);
      return 0;
    }
  }

  /**
   * 총 AI 토큰 사용량 계산
   */
  async calculateTotalAITokens(timeRange: TimeRange): Promise<number> {
    try {
      if (!this.metricsCollection) {
        throw new Error('Metrics collection not initialized');
      }

      const result = await this.metricsCollection
        .aggregate([
          {
            $match: {
              startedAt: {
                $gte: timeRange.start,
                $lte: timeRange.end,
              },
              aiTokenUsage: { $exists: true },
            },
          },
          {
            $group: {
              _id: null,
              totalTokens: { $sum: '$aiTokenUsage.totalTokens' },
            },
          },
        ])
        .toArray();

      return result.length > 0 ? result[0].totalTokens : 0;
    } catch (error) {
      log.error('Failed to calculate total AI tokens', error);
      return 0;
    }
  }

  /**
   * 총 비용 계산
   */
  async calculateTotalCost(timeRange: TimeRange): Promise<number> {
    try {
      if (!this.metricsCollection) {
        throw new Error('Metrics collection not initialized');
      }

      const result = await this.metricsCollection
        .aggregate([
          {
            $match: {
              startedAt: {
                $gte: timeRange.start,
                $lte: timeRange.end,
              },
              aiTokenUsage: { $exists: true },
            },
          },
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$aiTokenUsage.cost' },
            },
          },
        ])
        .toArray();

      return result.length > 0 ? result[0].totalCost : 0;
    } catch (error) {
      log.error('Failed to calculate total cost', error);
      return 0;
    }
  }

  /**
   * 최근 실행 메트릭 조회
   */
  async getRecentMetrics(limit: number = 20): Promise<ExecutionMetric[]> {
    try {
      if (!this.metricsCollection) {
        throw new Error('Metrics collection not initialized');
      }

      return await this.metricsCollection
        .find()
        .sort({ startedAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      log.error('Failed to get recent metrics', error);
      throw error;
    }
  }

  /**
   * 시간 범위 생성 헬퍼
   */
  createTimeRange(duration: number, unit: TimeUnit): TimeRange {
    const end = new Date();
    const start = new Date();

    switch (unit) {
      case 'minute':
        start.setMinutes(start.getMinutes() - duration);
        break;
      case 'hour':
        start.setHours(start.getHours() - duration);
        break;
      case 'day':
        start.setDate(start.getDate() - duration);
        break;
      case 'week':
        start.setDate(start.getDate() - duration * 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - duration);
        break;
    }

    return { start, end, unit };
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      log.info('Metrics Collector disconnected from MongoDB');
    }
  }
}

/**
 * 싱글톤 인스턴스
 */
export const metricsCollector = new MetricsCollectorService();
