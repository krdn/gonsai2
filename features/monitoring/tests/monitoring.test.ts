/**
 * Monitoring System Integration Tests
 *
 * @description 모니터링 시스템의 주요 기능을 검증하는 통합 테스트
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MonitoringService } from '../services/monitoring.service';
import { metricsCollector } from '../services/metrics-collector.service';
import { alertManager } from '../services/alert-manager.service';
import { logAggregator } from '../services/log-aggregator.service';
import { ExecutionMetric, TimeRange } from '../types/monitoring.types';

describe('Monitoring System Integration Tests', () => {
  const monitoringService = MonitoringService.getInstance();

  beforeAll(async () => {
    // MongoDB URI가 설정되어 있는지 확인
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/gonsai2_test';
    }

    await monitoringService.initialize();
  });

  afterAll(async () => {
    await monitoringService.disconnect();
  });

  describe('MetricsCollector', () => {
    it('should save and retrieve execution metrics', async () => {
      const metric: ExecutionMetric = {
        executionId: 'test-execution-1',
        workflowId: 'test-workflow-1',
        workflowName: 'Test Workflow',
        status: 'success',
        startedAt: new Date(),
        finishedAt: new Date(),
        duration: 5000,
        nodeMetrics: [],
        resourceUsage: {
          cpuPercent: 25,
          memoryMB: 100,
          networkKB: 50,
        },
      };

      await monitoringService.recordExecutionMetric(metric);

      const timeRange: TimeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간 전
        end: new Date(),
        unit: 'day',
      };

      const statistics = await monitoringService.getWorkflowStatistics(
        'test-workflow-1',
        timeRange
      );

      expect(statistics).toBeDefined();
      expect(statistics?.workflowId).toBe('test-workflow-1');
      expect(statistics?.totalExecutions).toBeGreaterThan(0);
    });

    it('should calculate AI token costs correctly', () => {
      const tokenUsage = metricsCollector.calculateAITokenUsage('gpt-4', 1000, 500, 'openai');

      expect(tokenUsage.totalTokens).toBe(1500);
      expect(tokenUsage.cost).toBe(0.03 * 1 + 0.06 * 0.5); // $0.06
      expect(tokenUsage.provider).toBe('openai');
    });
  });

  describe('DashboardService', () => {
    it('should retrieve dashboard data', async () => {
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
        unit: 'day',
      };

      const dashboardData = await monitoringService.getDashboardData(timeRange);

      expect(dashboardData).toBeDefined();
      expect(dashboardData.overview).toBeDefined();
      expect(dashboardData.realtimeStatus).toBeDefined();
      expect(dashboardData.systemMetrics).toBeDefined();
    });

    it('should get system health status', async () => {
      const health = await monitoringService.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|critical/);
      expect(typeof health.cpuUsage).toBe('number');
      expect(typeof health.memoryUsage).toBe('number');
    });
  });

  describe('AlertManager', () => {
    it('should create and retrieve alerts', async () => {
      // Alert Manager가 초기화되어 있어야 함
      expect(alertManager['initialized']).toBe(true);

      const alerts = await monitoringService.getAlerts(false, 'warning', 10);

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should acknowledge alert', async () => {
      const alerts = await monitoringService.getAlerts(false, undefined, 1);

      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        await monitoringService.acknowledgeAlert(alertId, 'test-user');

        const acknowledgedAlerts = await monitoringService.getAlerts(false);
        const updated = acknowledgedAlerts.find((a) => a.id === alertId);

        expect(updated?.acknowledged).toBe(true);
      }
    });
  });

  describe('LogAggregator', () => {
    it('should retrieve aggregated logs', async () => {
      const logs = await monitoringService.getLogs(
        undefined,
        undefined,
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(),
        10
      );

      expect(Array.isArray(logs)).toBe(true);
    });

    it('should get log statistics', async () => {
      const stats = await monitoringService.getLogStatistics(
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date()
      );

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(stats.byLevel).toBeDefined();
      expect(stats.bySource).toBeDefined();
    });
  });

  describe('Time Range Helper', () => {
    it('should create time ranges correctly', () => {
      const dayRange = monitoringService.createTimeRange(1, 'day');
      const hourRange = monitoringService.createTimeRange(6, 'hour');

      expect(dayRange.unit).toBe('day');
      expect(hourRange.unit).toBe('hour');

      const dayDiff = dayRange.end.getTime() - dayRange.start.getTime();
      const hourDiff = hourRange.end.getTime() - hourRange.start.getTime();

      expect(dayDiff).toBeCloseTo(24 * 60 * 60 * 1000, -2); // 1일
      expect(hourDiff).toBeCloseTo(6 * 60 * 60 * 1000, -2); // 6시간
    });
  });
});
