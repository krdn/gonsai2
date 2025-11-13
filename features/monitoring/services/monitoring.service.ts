/**
 * Monitoring Service
 *
 * @description 통합 모니터링 서비스 - 모든 모니터링 컴포넌트 조율
 */

import { log } from '../../../apps/backend/src/utils/logger';
import { metricsCollector } from './metrics-collector.service';
import { dashboardService } from './dashboard.service';
import { alertManager } from './alert-manager.service';
import { logAggregator } from './log-aggregator.service';
import {
  DashboardData,
  ExecutionMetric,
  TimeRange,
  AlertRule,
  Alert,
  AlertLevel,
} from '../types/monitoring.types';

/**
 * Monitoring Service 클래스
 */
export class MonitoringService {
  private initialized: boolean = false;

  constructor() {
    log.info('Monitoring Service initialized');
  }

  /**
   * 모니터링 시스템 초기화
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log.warn('Monitoring system already initialized');
      return;
    }

    try {
      log.info('Initializing monitoring system...');

      // 1. Metrics Collector 연결
      await metricsCollector.connect();

      // 2. Alert Manager 초기화
      await alertManager.initialize();

      // 3. Log Aggregator 초기화
      await logAggregator.initialize();

      this.initialized = true;

      log.info('Monitoring system initialized successfully');
    } catch (error) {
      log.error('Failed to initialize monitoring system', error);
      throw error;
    }
  }

  /**
   * 모니터링 서비스 시작
   */
  start(): void {
    if (!this.initialized) {
      throw new Error('Monitoring system not initialized. Call initialize() first.');
    }

    try {
      // 알림 모니터링 시작
      alertManager.start();

      // 로그 집계 시작
      logAggregator.start();

      log.info('Monitoring services started');
    } catch (error) {
      log.error('Failed to start monitoring services', error);
      throw error;
    }
  }

  /**
   * 모니터링 서비스 중지
   */
  stop(): void {
    try {
      alertManager.stop();
      logAggregator.stop();

      log.info('Monitoring services stopped');
    } catch (error) {
      log.error('Failed to stop monitoring services', error);
    }
  }

  /**
   * 실행 메트릭 기록
   */
  async recordExecutionMetric(metric: ExecutionMetric): Promise<void> {
    try {
      await metricsCollector.saveExecutionMetric(metric);
    } catch (error) {
      log.error('Failed to record execution metric', error);
    }
  }

  /**
   * 대시보드 데이터 조회
   */
  async getDashboardData(timeRange: TimeRange): Promise<DashboardData> {
    try {
      return await dashboardService.getDashboardData(timeRange);
    } catch (error) {
      log.error('Failed to get dashboard data', error);
      throw error;
    }
  }

  /**
   * 워크플로우 통계 조회
   */
  async getWorkflowStatistics(workflowId: string, timeRange?: TimeRange) {
    try {
      return await metricsCollector.getWorkflowStatistics(workflowId, timeRange);
    } catch (error) {
      log.error('Failed to get workflow statistics', error, { workflowId });
      throw error;
    }
  }

  /**
   * 실시간 상태 조회
   */
  async getRealtimeStatus() {
    try {
      return await dashboardService.getRealtimeStatus();
    } catch (error) {
      log.error('Failed to get realtime status', error);
      throw error;
    }
  }

  /**
   * 시스템 헬스 조회
   */
  async getSystemHealth() {
    try {
      return await dashboardService.getSystemHealth();
    } catch (error) {
      log.error('Failed to get system health', error);
      throw error;
    }
  }

  /**
   * 알림 조회
   */
  async getAlerts(resolved?: boolean, level?: AlertLevel, limit?: number): Promise<Alert[]> {
    try {
      return await alertManager.getAlerts(resolved, level, limit);
    } catch (error) {
      log.error('Failed to get alerts', error);
      throw error;
    }
  }

  /**
   * 알림 확인
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      await alertManager.acknowledgeAlert(alertId, acknowledgedBy);
    } catch (error) {
      log.error('Failed to acknowledge alert', error, { alertId });
      throw error;
    }
  }

  /**
   * 알림 해결
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      await alertManager.resolveAlert(alertId);
    } catch (error) {
      log.error('Failed to resolve alert', error, { alertId });
      throw error;
    }
  }

  /**
   * 로그 조회
   */
  async getLogs(
    source?: string,
    level?: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ) {
    try {
      return await logAggregator.getLogs(source, level, startDate, endDate, limit);
    } catch (error) {
      log.error('Failed to get logs', error);
      throw error;
    }
  }

  /**
   * 로그 통계 조회
   */
  async getLogStatistics(startDate?: Date, endDate?: Date) {
    try {
      return await logAggregator.getLogStatistics(startDate, endDate);
    } catch (error) {
      log.error('Failed to get log statistics', error);
      throw error;
    }
  }

  /**
   * 시스템 메트릭 조회
   */
  async getSystemMetrics() {
    try {
      return await dashboardService.getSystemMetrics();
    } catch (error) {
      log.error('Failed to get system metrics', error);
      throw error;
    }
  }

  /**
   * 시간 범위 생성 헬퍼
   */
  createTimeRange(duration: number, unit: 'minute' | 'hour' | 'day' | 'week' | 'month'): TimeRange {
    return metricsCollector.createTimeRange(duration, unit);
  }

  /**
   * 모니터링 시스템 상태 확인
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    try {
      this.stop();

      await Promise.all([
        metricsCollector.disconnect(),
        alertManager.disconnect(),
        logAggregator.disconnect(),
      ]);

      this.initialized = false;

      log.info('Monitoring system disconnected');
    } catch (error) {
      log.error('Failed to disconnect monitoring system', error);
      throw error;
    }
  }
}

/**
 * 싱글톤 인스턴스
 */
export const monitoringService = new MonitoringService();
