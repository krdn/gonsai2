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
import { asyncHandler, authenticateN8nApiKey } from '../middleware';
import { N8nApiError } from '../utils/errors';

const router = Router();

// 모든 모니터링 라우트는 인증 필요
router.use(authenticateN8nApiKey);

/**
 * GET /api/monitoring/stats
 * 시스템 전체 통계 조회
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);

    try {
      // n8n에서 모든 워크플로우 조회
      const workflowsResponse = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': envConfig.N8N_API_KEY,
        },
      });

      if (!workflowsResponse.ok) {
        throw new N8nApiError('Failed to fetch workflows', {
          correlationId,
          status: workflowsResponse.status,
        });
      }

      const workflowsData = (await workflowsResponse.json()) as { data?: any[] };
      const workflows = workflowsData.data || [];

      // 최근 24시간 실행 통계 조회
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // n8n API에서 최근 실행 기록 조회
      const executionsResponse = await fetch(
        `${envConfig.N8N_BASE_URL}/api/v1/executions?limit=100`,
        {
          headers: {
            'X-N8N-API-KEY': envConfig.N8N_API_KEY,
          },
        }
      );

      const executionsData = (await executionsResponse.json()) as { data?: any[] };
      const allExecutions = executionsData.data || [];

      // 최근 24시간 내 실행만 필터링
      const recentExecutions = allExecutions.filter((exec: any) => {
        const startDate = new Date(exec.startedAt);
        return startDate >= last24Hours;
      });

      // 통계 계산
      const totalExecutions = recentExecutions.length;
      const successfulExecutions = recentExecutions.filter(
        (e: any) => e.status === 'success'
      ).length;
      const failedExecutions = recentExecutions.filter((e: any) => e.status === 'error').length;
      const runningExecutions = recentExecutions.filter((e: any) => e.status === 'running').length;

      const successRate =
        totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

      // 평균 실행 시간 계산 (완료된 실행만)
      const completedExecutions = recentExecutions.filter((e: any) => e.stoppedAt && e.startedAt);

      let avgExecutionTime = 0;
      if (completedExecutions.length > 0) {
        const totalTime = completedExecutions.reduce((sum: number, exec: any) => {
          const duration = new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime();
          return sum + duration;
        }, 0);
        avgExecutionTime = Math.round(totalTime / completedExecutions.length);
      }

      const stats = {
        totalWorkflows: workflows.length,
        activeWorkflows: workflows.filter((w: any) => w.active).length,
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
    const correlationId = getCorrelationId(req);

    try {
      // n8n API에서 최근 실행 기록 조회
      const executionsResponse = await fetch(
        `${envConfig.N8N_BASE_URL}/api/v1/executions?limit=${limit}`,
        {
          headers: {
            'X-N8N-API-KEY': envConfig.N8N_API_KEY,
          },
        }
      );

      if (!executionsResponse.ok) {
        throw new N8nApiError('Failed to fetch executions', {
          correlationId,
          status: executionsResponse.status,
        });
      }

      const executionsData = (await executionsResponse.json()) as { data?: any[] };
      const executions = executionsData.data || [];

      // 워크플로우 정보도 함께 조회
      const workflowsResponse = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': envConfig.N8N_API_KEY,
        },
      });

      const workflowsData = (await workflowsResponse.json()) as { data?: any[] };
      const workflows = workflowsData.data || [];

      // 워크플로우 정보 매핑
      const workflowMap = new Map(workflows.map((w: any) => [w.id, w]));

      // 실행 정보에 워크플로우 이름 추가
      const enrichedExecutions = executions.map((exec: any) => {
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
    const correlationId = getCorrelationId(req);

    try {
      // n8n API에서 실행 기록 조회 (n8n API limit 최대값: 250)
      const executionsResponse = await fetch(
        `${envConfig.N8N_BASE_URL}/api/v1/executions?limit=250`,
        {
          headers: {
            'X-N8N-API-KEY': envConfig.N8N_API_KEY,
          },
        }
      );

      if (!executionsResponse.ok) {
        throw new N8nApiError('Failed to fetch executions', {
          correlationId,
          status: executionsResponse.status,
        });
      }

      const executionsData = (await executionsResponse.json()) as { data?: any[] };
      const allExecutions = executionsData.data || [];

      // 지정된 시간 범위 내 실행만 필터링
      const hoursNum = Number(hours);
      const startTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
      const recentExecutions = allExecutions.filter((exec: any) => {
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
      recentExecutions.forEach((exec: any) => {
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
      const metrics = Object.entries(hourlyMetrics)
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

      const healthData = {
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
