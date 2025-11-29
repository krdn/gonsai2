/**
 * Workflows Routes
 *
 * @description n8n 워크플로우 관리 및 실행 API (폴더 권한 기반 필터링)
 */

import { Router, Request, Response } from 'express';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import { getCorrelationId } from '../middleware/correlation-id.middleware';
import { executionRepository } from '../repositories/workflow.repository';
import { ApiResponse, ExecuteWorkflowRequest, ExecuteWorkflowResponse } from '../types/api.types';
import { asyncHandler, authenticateJWT, requireWorkflowAccess } from '../middleware';
import { N8nApiError, NotFoundError } from '../utils/errors';
import { parseN8nResponse, checkN8nResponse } from '../utils/n8n-helpers';
import { cacheService } from '../services/cache.service';
import { workflowFolderService } from '../services/workflow-folder.service';

// 캐시 TTL 상수 (초 단위)
const CACHE_TTL = {
  WORKFLOWS: 30, // 워크플로우 목록: 30초
  WORKFLOW_DETAIL: 60, // 워크플로우 상세: 60초
  EXECUTIONS: 10, // 실행 목록: 10초
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

// n8n API 응답 타입
interface N8nExecutionResponse {
  data: {
    executionId: string;
    [key: string]: unknown;
  };
}

// 모든 워크플로우 라우트는 JWT 인증 필요
router.use(authenticateJWT);

/**
 * GET /api/workflows
 * 모든 워크플로우 조회 (n8n API 프록시 + 폴더 권한 필터링)
 * - includeNodes=true 쿼리 파라미터로 nodes 정보 포함 가능
 * - admin은 모든 워크플로우 조회 가능
 * - 일반 사용자는 권한이 있는 폴더의 워크플로우만 조회
 * - 폴더에 할당되지 않은 워크플로우는 admin만 조회 가능
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);
    const includeNodes = req.query.includeNodes === 'true';
    const isAdmin = req.userRole === 'admin';

    // ⚡ 성능 최적화: 캐싱 적용
    const cacheKey = includeNodes ? 'workflows:list:withNodes' : 'workflows:list';
    const n8nData = await fetchN8nApi<{ data?: Record<string, unknown>[] }>(
      '/api/v1/workflows',
      cacheKey,
      CACHE_TTL.WORKFLOWS
    );

    let workflows = n8nData.data || [];

    // 권한 기반 필터링 (admin이 아닌 경우)
    if (!isAdmin && workflows.length > 0) {
      // 사용자가 접근 가능한 워크플로우 ID 조회
      const accessibleWorkflowIds = await workflowFolderService.getAccessibleWorkflowIds(
        req.userId!,
        false
      );

      if (accessibleWorkflowIds.length === 0) {
        // 접근 가능한 워크플로우 없음
        workflows = [];
      } else {
        // 접근 가능한 워크플로우만 필터링
        const accessibleSet = new Set(accessibleWorkflowIds);
        workflows = workflows.filter((w) => accessibleSet.has(w.id as string));
      }
    }

    // nodes 정보가 필요한 경우, 각 워크플로우의 상세 정보를 가져옴
    if (includeNodes && workflows.length > 0) {
      const workflowsWithNodes = await Promise.all(
        workflows.map(async (workflow: Record<string, unknown>) => {
          try {
            const detail = await fetchN8nApi<Record<string, unknown>>(
              `/api/v1/workflows/${workflow.id}`,
              `workflow:detail:${workflow.id}`,
              CACHE_TTL.WORKFLOW_DETAIL
            );
            return {
              ...workflow,
              nodes: (detail.nodes as unknown[]) || [],
              connections: (detail.connections as Record<string, unknown>) || {},
            };
          } catch (error) {
            log.warn('Failed to fetch workflow detail', {
              correlationId,
              workflowId: workflow.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            return workflow;
          }
        })
      );
      workflows = workflowsWithNodes;
    }

    // 워크플로우-폴더 매핑 정보 추가
    const workflowFolderMap = await workflowFolderService.getWorkflowToFolderMap();
    workflows = workflows.map((w) => ({
      ...w,
      folderId: workflowFolderMap.get(w.id as string) || null,
    }));

    log.info('Workflows retrieved', {
      correlationId,
      count: workflows.length,
      includeNodes,
      isAdmin,
      userId: req.userId,
    });

    const response: ApiResponse = {
      success: true,
      data: workflows,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/workflows/:id
 * 특정 워크플로우 조회 (n8n API 프록시 + 권한 검증)
 */
router.get(
  '/:id',
  requireWorkflowAccess('view'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const correlationId = getCorrelationId(req);

    try {
      // ⚡ 성능 최적화: 캐싱 적용
      const workflow = await fetchN8nApi<any>(
        `/api/v1/workflows/${id}`,
        `workflow:detail:${id}`,
        CACHE_TTL.WORKFLOW_DETAIL
      );

      // 폴더 정보 추가
      const folderId = await workflowFolderService.getFolderForWorkflow(id);

      log.info('Workflow detail retrieved', {
        correlationId,
        workflowId: id,
        folderId,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          ...workflow,
          folderId,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      if (error instanceof N8nApiError && (error as any).details?.status === 404) {
        throw new NotFoundError('Workflow', id);
      }
      throw error;
    }
  })
);

/**
 * POST /api/workflows/:id/execute
 * 워크플로우 실행 (실행 권한 검증)
 */
router.post(
  '/:id/execute',
  requireWorkflowAccess('execute'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const body = req.body as ExecuteWorkflowRequest;
    const correlationId = getCorrelationId(req);

    log.info('Executing workflow', {
      correlationId,
      workflowId: id,
      waitForExecution: body.options?.waitForExecution,
    });

    // 1. 워크플로우 상세 정보 조회하여 트리거 타입 확인
    const workflowDetailsResponse = await fetch(
      `${envConfig.N8N_BASE_URL}/api/v1/workflows/${id}`,
      {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': envConfig.N8N_API_KEY,
        },
      }
    );

    if (!workflowDetailsResponse.ok) {
      const errorText = await workflowDetailsResponse.text();
      throw new N8nApiError(`Failed to fetch workflow details: ${errorText}`, {
        correlationId,
        workflowId: id,
        status: workflowDetailsResponse.status,
      });
    }

    const workflowDetails = (await workflowDetailsResponse.json()) as any;
    const nodes = workflowDetails.nodes || [];

    // Webhook 트리거 노드 찾기
    const webhookNode = nodes.find(
      (node: any) =>
        node.type === 'n8n-nodes-base.webhook' || node.type === 'n8n-nodes-base.webhookTrigger'
    );

    let response: globalThis.Response;
    let executionId: string;

    if (webhookNode) {
      // 2-A. Webhook 워크플로우인 경우 - Webhook URL로 직접 호출
      const webhookPath = webhookNode.parameters?.path || 'webhook';
      const webhookUrl = `${envConfig.N8N_BASE_URL}/webhook/${webhookPath}`;

      log.info('Detected webhook workflow, calling webhook URL', {
        correlationId,
        workflowId: id,
        webhookPath,
        webhookUrl,
      });

      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body.inputData || {}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new N8nApiError(`Webhook execution failed: ${errorText}`, {
          correlationId,
          workflowId: id,
          webhookUrl,
          status: response.status,
        });
      }

      // Content-Type 확인하여 HTML, JSON, 텍스트 응답 처리
      const contentType = response.headers.get('content-type');
      let webhookResponseData: any;
      let isHtmlResponse = false;

      if (contentType && contentType.includes('text/html')) {
        // HTML 응답인 경우
        const htmlText = await response.text();
        webhookResponseData = { htmlContent: htmlText };
        isHtmlResponse = true;
      } else if (contentType && contentType.includes('application/json')) {
        // JSON 응답인 경우
        webhookResponseData = await response.json();
      } else {
        // 기타 응답 형식
        const textContent = await response.text();
        webhookResponseData = { textContent, contentType: contentType || 'unknown' };
      }

      // Webhook 응답에서 execution ID 추출 (없으면 생성)
      executionId =
        webhookResponseData.executionId || webhookResponseData.id || `webhook-${Date.now()}`;

      log.info('Webhook workflow triggered successfully', {
        correlationId,
        workflowId: id,
        webhookUrl,
        isHtmlResponse,
      });

      // MongoDB에 실행 기록 저장
      const execution = await executionRepository.createExecution({
        n8nExecutionId: executionId,
        workflowId: id,
        n8nWorkflowId: id,
        status: 'success',
        mode: 'webhook',
        startedAt: new Date(),
        finishedAt: new Date(),
        inputData: body.inputData,
      });

      log.info('Webhook workflow execution completed', {
        correlationId,
        executionId,
        workflowId: id,
      });

      // Webhook 응답을 그대로 프론트엔드에 전달
      const apiResponse: ApiResponse = {
        success: true,
        data: {
          executionId,
          workflowId: id,
          status: 'success',
          startedAt: execution.startedAt.toISOString(),
          finishedAt: execution.finishedAt?.toISOString(),
          message: isHtmlResponse
            ? 'HTML 응답을 받았습니다.'
            : '워크플로우가 성공적으로 실행되었습니다.',
          webhookResponse: webhookResponseData, // 전체 webhook 응답 포함
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(apiResponse);
      return; // 여기서 응답 종료
    } else {
      // 2-B. Manual 트리거 워크플로우인 경우 - 기존 API 엔드포인트 사용
      log.info('Detected manual workflow, using execute API', {
        correlationId,
        workflowId: id,
      });

      response = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/workflows/${id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': envConfig.N8N_API_KEY,
        },
        body: JSON.stringify({
          data: body.inputData || {},
        }),
      });

      // 응답 상태 확인
      await checkN8nResponse(response, {
        correlationId,
        workflowId: id,
        operation: 'execute workflow',
      });

      // JSON 응답 파싱
      const n8nResponse = await parseN8nResponse<N8nExecutionResponse>(response, {
        correlationId,
        workflowId: id,
        operation: 'execute workflow',
      });
      executionId = n8nResponse.data.executionId;
    }

    // 3. MongoDB에 실행 기록 저장
    const execution = await executionRepository.createExecution({
      n8nExecutionId: executionId,
      workflowId: id,
      n8nWorkflowId: id,
      status: 'running',
      mode: webhookNode ? 'webhook' : 'manual',
      startedAt: new Date(),
      inputData: body.inputData,
    });

    log.info('Workflow execution started', {
      correlationId,
      executionId,
      workflowId: id,
      mode: webhookNode ? 'webhook' : 'manual',
    });

    const apiResponse: ApiResponse<ExecuteWorkflowResponse> = {
      success: true,
      data: {
        executionId,
        workflowId: id,
        status: 'running',
        startedAt: execution.startedAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(202).json(apiResponse);
  })
);

/**
 * GET /api/workflows/:id/executions
 * 워크플로우 실행 기록 조회 (n8n API 프록시 + 권한 검증)
 */
router.get(
  '/:id/executions',
  requireWorkflowAccess('view'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    const correlationId = getCorrelationId(req);

    try {
      // ⚡ 성능 최적화: 캐싱 적용
      const n8nData = await fetchN8nApi<{ data?: any[] }>(
        `/api/v1/executions?workflowId=${id}&limit=${limit}`,
        `executions:workflow:${id}:${limit}`,
        CACHE_TTL.EXECUTIONS
      );

      log.info('Workflow executions retrieved', {
        correlationId,
        workflowId: id,
        count: n8nData.data?.length || 0,
      });

      const response: ApiResponse = {
        success: true,
        data: n8nData.data || [],
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to fetch executions from n8n', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch executions',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

export default router;
