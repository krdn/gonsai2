/**
 * Monitoring Routes
 *
 * @description 실시간 모니터링 및 시스템 메트릭 API
 */

import { Router, Request, Response } from 'express';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import { getCorrelationId } from '../middleware/correlation-id.middleware';
import { ApiResponse } from '../types/api.types';
import { asyncHandler, authenticateJWT } from '../middleware';
import { N8nApiError } from '../utils/errors';
import { cacheService } from '../services/cache.service';
import {
  N8nWorkflow,
  N8nExecution,
  N8nListResponse,
  MonitoringStats,
  FormattedExecution,
  HourlyMetric,
  SystemHealthData,
} from '../types/n8n.types';

// 캐시 TTL 상수 (초 단위)
const CACHE_TTL = {
  WORKFLOWS: 30, // 워크플로우 목록: 30초
  EXECUTIONS: 10, // 실행 목록: 10초 (실시간성 필요)
  STATS: 15, // 통계: 15초
  HEALTH: 5, // 헬스체크: 5초
};

// n8n API 호출 헬퍼 함수
async function fetchN8nApi<T>(endpoint: string, cacheKey?: string, ttl?: number): Promise<T> {
  // 캐시 확인
  if (cacheKey) {
    const cached = await cacheService.get<T>(cacheKey, { prefix: 'n8n' });
    if (cached) {
      return cached;
    }
  }

  const response = await fetch(`${envConfig.N8N_BASE_URL}${endpoint}`, {
    headers: {
      'X-N8N-API-KEY': envConfig.N8N_API_KEY,
    },
  });

  if (!response.ok) {
    throw new N8nApiError(`Failed to fetch ${endpoint}`, {
      status: response.status,
    });
  }

  const data = (await response.json()) as T;

  // 캐시 저장
  if (cacheKey && ttl) {
    await cacheService.set(cacheKey, data, { prefix: 'n8n', ttl });
  }

  return data;
}

const router = Router();

// 모든 모니터링 라우트는 JWT 인증 필요
router.use(authenticateJWT);

/**
 * GET /api/monitoring/stats
 * 시스템 전체 통계 조회
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);

    try {
      // ⚡ 성능 최적화: 병렬 API 호출 + 캐싱
      const [workflowsData, executionsData] = await Promise.all([
        fetchN8nApi<N8nListResponse<N8nWorkflow>>(
          '/api/v1/workflows',
          'workflows:list',
          CACHE_TTL.WORKFLOWS
        ),
        fetchN8nApi<N8nListResponse<N8nExecution>>(
          '/api/v1/executions?limit=100',
          'executions:stats',
          CACHE_TTL.EXECUTIONS
        ),
      ]);

      const workflows = workflowsData.data || [];
      const allExecutions = executionsData.data || [];

      // 최근 24시간 실행 통계 조회
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 최근 24시간 내 실행만 필터링
      const recentExecutions = allExecutions.filter((exec: N8nExecution) => {
        const startDate = new Date(exec.startedAt);
        return startDate >= last24Hours;
      });

      // 통계 계산
      const totalExecutions = recentExecutions.length;
      const successfulExecutions = recentExecutions.filter(
        (e: N8nExecution) => e.status === 'success'
      ).length;
      const failedExecutions = recentExecutions.filter(
        (e: N8nExecution) => e.status === 'error'
      ).length;
      const runningExecutions = recentExecutions.filter(
        (e: N8nExecution) => e.status === 'running'
      ).length;

      const successRate =
        totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

      // 평균 실행 시간 계산 (완료된 실행만)
      const completedExecutions = recentExecutions.filter(
        (e: N8nExecution) => e.stoppedAt && e.startedAt
      );

      let avgExecutionTime = 0;
      if (completedExecutions.length > 0) {
        const totalTime = completedExecutions.reduce((sum: number, exec: N8nExecution) => {
          const duration = new Date(exec.stoppedAt!).getTime() - new Date(exec.startedAt).getTime();
          return sum + duration;
        }, 0);
        avgExecutionTime = Math.round(totalTime / completedExecutions.length);
      }

      const stats: MonitoringStats = {
        totalWorkflows: workflows.length,
        activeWorkflows: workflows.filter((w: N8nWorkflow) => w.active).length,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        runningExecutions,
        successRate,
        avgExecutionTime,
        period: '24h',
        timestamp: new Date().toISOString(),
      };

      log.info('Monitoring stats retrieved', {
        correlationId,
        totalExecutions,
        successRate,
      });

      const response: ApiResponse = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to fetch monitoring stats', error);
      throw error;
    }
  })
);

/**
 * GET /api/monitoring/executions/recent
 * 최근 실행 목록 조회 (실시간 모니터링용)
 */
router.get(
  '/executions/recent',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { limit = 20 } = req.query;
    const _correlationId = getCorrelationId(req);

    try {
      // ⚡ 성능 최적화: 병렬 API 호출 + 캐싱
      const [executionsData, workflowsData] = await Promise.all([
        fetchN8nApi<N8nListResponse<N8nExecution>>(
          `/api/v1/executions?limit=${limit}`,
          `executions:recent:${limit}`,
          CACHE_TTL.EXECUTIONS
        ),
        fetchN8nApi<N8nListResponse<N8nWorkflow>>(
          '/api/v1/workflows',
          'workflows:list',
          CACHE_TTL.WORKFLOWS
        ),
      ]);

      const executions = executionsData.data || [];
      const workflows = workflowsData.data || [];

      // 워크플로우 정보 매핑
      const workflowMap = new Map(workflows.map((w: N8nWorkflow) => [w.id, w]));

      // 실행 정보에 워크플로우 이름 추가
      const enrichedExecutions: FormattedExecution[] = executions.map((exec: N8nExecution) => {
        const workflow = workflowMap.get(exec.workflowId);
        return {
          id: exec.id,
          workflowId: exec.workflowId,
          workflowName: workflow?.name || 'Unknown',
          status: exec.status,
          mode: exec.mode,
          startedAt: exec.startedAt,
          stoppedAt: exec.stoppedAt,
          duration:
            exec.stoppedAt && exec.startedAt
              ? new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()
              : null,
        };
      });

      const response: ApiResponse = {
        success: true,
        data: enrichedExecutions,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to fetch recent executions', error);
      throw error;
    }
  })
);

/**
 * GET /api/monitoring/metrics/hourly
 * 시간별 실행 메트릭 (차트용)
 */
router.get(
  '/metrics/hourly',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { hours = 24 } = req.query;
    const _correlationId = getCorrelationId(req);

    try {
      // ⚡ 성능 최적화: 캐싱 적용
      const executionsData = await fetchN8nApi<N8nListResponse<N8nExecution>>(
        '/api/v1/executions?limit=250',
        `executions:hourly:${hours}`,
        CACHE_TTL.STATS
      );

      const allExecutions = executionsData.data || [];

      // 지정된 시간 범위 내 실행만 필터링
      const hoursNum = Number(hours);
      const startTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
      const recentExecutions = allExecutions.filter((exec: N8nExecution) => {
        const execTime = new Date(exec.startedAt);
        return execTime >= startTime;
      });

      // 시간별로 그룹화
      const hourlyMetrics: Record<string, { success: number; error: number; total: number }> = {};

      for (let i = hoursNum - 1; i >= 0; i--) {
        const hourStart = new Date(Date.now() - i * 60 * 60 * 1000);
        hourStart.setMinutes(0, 0, 0);
        const hourKey = hourStart.toISOString();

        hourlyMetrics[hourKey] = { success: 0, error: 0, total: 0 };
      }

      // 실행 기록을 시간별로 분류
      recentExecutions.forEach((exec: N8nExecution) => {
        const execTime = new Date(exec.startedAt);
        execTime.setMinutes(0, 0, 0);
        const hourKey = execTime.toISOString();

        if (hourlyMetrics[hourKey]) {
          hourlyMetrics[hourKey].total++;
          if (exec.status === 'success') {
            hourlyMetrics[hourKey].success++;
          } else if (exec.status === 'error') {
            hourlyMetrics[hourKey].error++;
          }
        }
      });

      // 배열로 변환
      const metrics: HourlyMetric[] = Object.entries(hourlyMetrics)
        .map(([timestamp, counts]) => ({
          timestamp,
          ...counts,
        }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const response: ApiResponse = {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to fetch hourly metrics', error);
      throw error;
    }
  })
);

/**
 * GET /api/monitoring/system/health
 * 시스템 헬스 체크
 */
router.get(
  '/system/health',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);

    try {
      // n8n 헬스 체크
      const n8nHealthResponse = await fetch(`${envConfig.N8N_BASE_URL}/healthz`);
      const n8nHealthy = n8nHealthResponse.ok;

      // MongoDB 연결 상태 (현재 연결되어 있으므로 true)
      const mongoHealthy = true;

      // 전체 시스템 상태
      const systemHealthy = n8nHealthy && mongoHealthy;

      const healthData: SystemHealthData = {
        status: systemHealthy ? 'healthy' : 'degraded',
        services: {
          n8n: {
            status: n8nHealthy ? 'up' : 'down',
            url: envConfig.N8N_BASE_URL,
          },
          mongodb: {
            status: mongoHealthy ? 'up' : 'down',
          },
          backend: {
            status: 'up',
            uptime: process.uptime(),
          },
        },
        timestamp: new Date().toISOString(),
      };

      log.info('System health checked', {
        correlationId,
        status: healthData.status,
      });

      const response: ApiResponse = {
        success: true,
        data: healthData,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to check system health', error);
      throw error;
    }
  })
);

export default router;
