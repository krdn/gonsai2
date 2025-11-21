/**
 * Dashboard Service
 *
 * @description 대시보드 데이터 제공 및 실시간 상태 모니터링
 */

import os from 'os';
import { log } from '../../../apps/backend/src/utils/logger';
import { metricsCollector } from './metrics-collector.service';
import { n8nClient } from '../../agent-orchestration/services/n8n-client.service';
import { executionQueue } from '../../agent-orchestration/services/execution-queue.service';
import {
  DashboardData,
  DashboardOverview,
  RealtimeExecutionStatus,
  ExecutionSummary,
  SystemHealth,
  ErrorTrend,
  ErrorDataPoint,
  ErrorTypeStats,
  CostAnalysis,
  WorkflowCost,
  ProviderCost,
  CostDataPoint,
  SystemMetrics,
  CPUMetrics,
  MemoryMetrics,
  DiskMetrics,
  NetworkMetrics,
  TimeRange,
  ExecutionStatus,
} from '../types/monitoring.types';

/**
 * Dashboard Service 클래스
 */
export class DashboardService {
  constructor() {
    log.info('Dashboard Service initialized');
  }

  /**
   * 전체 대시보드 데이터 조회
   */
  async getDashboardData(timeRange: TimeRange): Promise<DashboardData> {
    try {
      const [
        overview,
        realtimeStatus,
        workflowStatistics,
        errorTrend,
        costAnalysis,
        recentAlerts,
        systemMetrics,
      ] = await Promise.all([
        this.getOverview(timeRange),
        this.getRealtimeStatus(),
        metricsCollector.getAllWorkflowStatistics(timeRange),
        this.getErrorTrend(timeRange),
        this.getCostAnalysis(timeRange),
        this.getRecentAlerts(10),
        this.getSystemMetrics(),
      ]);

      return {
        overview,
        realtimeStatus,
        workflowStatistics,
        errorTrend,
        costAnalysis,
        recentAlerts,
        systemMetrics,
      };
    } catch (error) {
      log.error('Failed to get dashboard data', error);
      throw error;
    }
  }

  /**
   * 대시보드 개요 조회
   */
  async getOverview(timeRange: TimeRange): Promise<DashboardOverview> {
    try {
      const [
        allStatistics,
        successRate,
        averageExecutionTime,
        totalAITokens,
        totalCost,
        activeWorkflows,
      ] = await Promise.all([
        metricsCollector.getAllWorkflowStatistics(timeRange),
        metricsCollector.calculateSuccessRate(timeRange),
        metricsCollector.calculateAverageExecutionTime(timeRange),
        metricsCollector.calculateTotalAITokens(timeRange),
        metricsCollector.calculateTotalCost(timeRange),
        this.countActiveWorkflows(),
      ]);

      const totalExecutions = allStatistics.reduce((sum, stat) => sum + stat.totalExecutions, 0);
      const successfulExecutions = allStatistics.reduce(
        (sum, stat) => sum + stat.successfulExecutions,
        0
      );
      const failedExecutions = allStatistics.reduce((sum, stat) => sum + stat.failedExecutions, 0);

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate,
        averageExecutionTime,
        totalAITokens,
        totalCost,
        activeWorkflows,
      };
    } catch (error) {
      log.error('Failed to get overview', error);
      throw error;
    }
  }

  /**
   * 실시간 실행 상태 조회
   */
  async getRealtimeStatus(): Promise<RealtimeExecutionStatus> {
    try {
      const queueStats = await executionQueue.getQueueStats();
      const recentMetrics = await metricsCollector.getRecentMetrics(10);

      // 실행 중인 작업
      const runningExecutions: ExecutionSummary[] = [];
      const recentCompletions: ExecutionSummary[] = [];

      recentMetrics.forEach((metric) => {
        const summary: ExecutionSummary = {
          executionId: metric.executionId,
          workflowId: metric.workflowId,
          workflowName: metric.workflowName,
          status: metric.status,
          startedAt: metric.startedAt,
          duration: metric.duration,
        };

        if (metric.status === 'running') {
          runningExecutions.push(summary);
        } else if (metric.status === 'success' || metric.status === 'failed') {
          recentCompletions.push(summary);
        }
      });

      const systemHealth = await this.getSystemHealth();

      return {
        runningExecutions,
        queuedExecutions: queueStats.waiting,
        recentCompletions,
        currentLoad: queueStats.active / Math.max(queueStats.active + queueStats.waiting, 1),
        systemHealth,
      };
    } catch (error) {
      log.error('Failed to get realtime status', error);
      throw error;
    }
  }

  /**
   * 시스템 헬스 조회
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // n8n API 연결 확인
      let n8nAPI = false;
      try {
        await n8nClient.getWorkflows();
        n8nAPI = true;
      } catch {
        n8nAPI = false;
      }

      // Redis 연결 확인
      let redis = false;
      try {
        await executionQueue.getQueueStats();
        redis = true;
      } catch {
        redis = false;
      }

      // MongoDB 연결 확인
      const database = metricsCollector['db'] !== null;

      // 워커 상태 확인
      const worker = true; // Bull 큐 워커 상태 확인 필요

      // 시스템 리소스
      const cpuUsage = (os.loadavg()[0] / os.cpus().length) * 100;
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

      // 디스크 사용량 (간단한 근사치)
      const diskUsage = 0; // 실제 구현 필요

      // 전체 상태 판단
      const allHealthy = n8nAPI && database && redis && worker;
      const someCritical =
        !n8nAPI || !database || cpuUsage > 90 || memoryUsage > 90 || diskUsage > 90;

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (someCritical) {
        status = 'critical';
      } else if (!allHealthy) {
        status = 'degraded';
      }

      return {
        status,
        n8nAPI,
        database,
        redis,
        worker,
        cpuUsage,
        memoryUsage,
        diskUsage,
      };
    } catch (error) {
      log.error('Failed to get system health', error);
      return {
        status: 'critical',
        n8nAPI: false,
        database: false,
        redis: false,
        worker: false,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
      };
    }
  }

  /**
   * 오류 트렌드 조회
   */
  async getErrorTrend(timeRange: TimeRange): Promise<ErrorTrend> {
    try {
      const allStatistics = await metricsCollector.getAllWorkflowStatistics(timeRange);

      // 시간대별 데이터 포인트 생성
      const dataPoints: ErrorDataPoint[] = [];
      const errorTypeMap = new Map<string, number>();

      // 간단한 구현: 전체 통계에서 오류 데이터 추출
      const totalErrors = allStatistics.reduce((sum, stat) => sum + stat.failedExecutions, 0);
      const totalExecutions = allStatistics.reduce((sum, stat) => sum + stat.totalExecutions, 0);
      const errorRate = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;

      // 오류 타입 통계 (실제로는 오류 메시지 분석 필요)
      allStatistics.forEach((stat) => {
        stat.topErrors.forEach((error) => {
          const existing = errorTypeMap.get(error.errorMessage);
          if (existing) {
            errorTypeMap.set(error.errorMessage, existing + error.count);
          } else {
            errorTypeMap.set(error.errorMessage, error.count);
          }
        });
      });

      const topErrorTypes: ErrorTypeStats[] = Array.from(errorTypeMap.entries())
        .map(([errorType, count]) => ({
          errorType,
          count,
          percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
          trend: 'stable' as const,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // 데이터 포인트 생성 (시간대별)
      dataPoints.push({
        timestamp: timeRange.end,
        errorCount: totalErrors,
        totalExecutions,
        errorRate,
      });

      return {
        timeRange,
        dataPoints,
        topErrorTypes,
        totalErrors,
        errorRate,
      };
    } catch (error) {
      log.error('Failed to get error trend', error);
      throw error;
    }
  }

  /**
   * 비용 분석 조회
   */
  async getCostAnalysis(timeRange: TimeRange): Promise<CostAnalysis> {
    try {
      const allStatistics = await metricsCollector.getAllWorkflowStatistics(timeRange);

      const totalCost = allStatistics.reduce((sum, stat) => sum + (stat.totalCost || 0), 0);

      // 워크플로우별 비용
      const costByWorkflow: WorkflowCost[] = allStatistics
        .filter((stat) => stat.totalCost && stat.totalCost > 0)
        .map((stat) => ({
          workflowId: stat.workflowId,
          workflowName: stat.workflowName,
          totalCost: stat.totalCost || 0,
          executionCount: stat.totalExecutions,
          averageCostPerExecution: (stat.totalCost || 0) / stat.totalExecutions,
          aiTokenUsage: stat.totalAITokens || 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost);

      // 제공자별 비용 (간단한 구현)
      const costByAIProvider: ProviderCost[] = [
        {
          provider: 'OpenAI',
          totalCost: totalCost * 0.6, // 예시
          tokenUsage: 0,
          percentage: 60,
        },
        {
          provider: 'Anthropic',
          totalCost: totalCost * 0.4, // 예시
          tokenUsage: 0,
          percentage: 40,
        },
      ];

      // 비용 트렌드 데이터 포인트
      const costTrend: CostDataPoint[] = [
        {
          timestamp: timeRange.end,
          cost: totalCost,
          tokenUsage: allStatistics.reduce((sum, stat) => sum + (stat.totalAITokens || 0), 0),
        },
      ];

      // 월간 비용 예측
      const daysInRange =
        (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
      const projectedMonthlyCost = daysInRange > 0 ? (totalCost / daysInRange) * 30 : 0;

      return {
        timeRange,
        totalCost,
        costByWorkflow,
        costByAIProvider,
        costTrend,
        projectedMonthlyCost,
      };
    } catch (error) {
      log.error('Failed to get cost analysis', error);
      throw error;
    }
  }

  /**
   * 최근 알림 조회
   */
  async getRecentAlerts(limit: number = 10): Promise<any[]> {
    // AlertManager와 통합 필요
    return [];
  }

  /**
   * 시스템 메트릭 조회
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const cpuCount = os.cpus().length;
      const loadAvg = os.loadavg();

      const cpu: CPUMetrics = {
        usage: (loadAvg[0] / cpuCount) * 100,
        cores: cpuCount,
        loadAverage: loadAvg,
      };

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const memory: MemoryMetrics = {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: (usedMem / totalMem) * 100,
      };

      // 디스크 및 네트워크는 간단한 구현
      const disk: DiskMetrics = {
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
      };

      const network: NetworkMetrics = {
        bytesIn: 0,
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0,
      };

      return {
        timestamp: new Date(),
        cpu,
        memory,
        disk,
        network,
      };
    } catch (error) {
      log.error('Failed to get system metrics', error);
      throw error;
    }
  }

  /**
   * 활성 워크플로우 수 조회
   */
  private async countActiveWorkflows(): Promise<number> {
    try {
      const workflows = await n8nClient.getWorkflows();
      return workflows.filter((w) => w.active).length;
    } catch (error) {
      log.error('Failed to count active workflows', error);
      return 0;
    }
  }
}

/**
 * 싱글톤 인스턴스
 */
export const dashboardService = new DashboardService();
