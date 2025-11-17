/**
 * Workflows Routes
 *
 * @description n8n 워크플로우 관리 및 실행 API
 */

import { Router, Request, Response } from 'express';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import { getCorrelationId } from '../middleware/correlation-id.middleware';
import { workflowRepository, executionRepository } from '../repositories/workflow.repository';
import { ApiResponse, ExecuteWorkflowRequest, ExecuteWorkflowResponse } from '../types/api.types';
import { asyncHandler, authenticateN8nApiKey } from '../middleware';
import { N8nApiError, NotFoundError } from '../utils/errors';

const router = Router();

// n8n API 응답 타입
interface N8nExecutionResponse {
  data: {
    executionId: string;
    [key: string]: any;
  };
}

// 모든 워크플로우 라우트는 인증 필요
router.use(authenticateN8nApiKey);

/**
 * GET /api/workflows
 * 모든 워크플로우 조회 (n8n API 프록시)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);

    // n8n API에서 직접 워크플로우 조회
    const n8nResponse = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': envConfig.N8N_API_KEY,
      },
    });

    if (!n8nResponse.ok) {
      throw new N8nApiError(`Failed to fetch workflows from n8n: ${n8nResponse.status}`, {
        correlationId,
        status: n8nResponse.status,
      });
    }

    const n8nData = (await n8nResponse.json()) as { data?: any[] };

    const response: ApiResponse = {
      success: true,
      data: n8nData.data || [],
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/workflows/:id
 * 특정 워크플로우 조회
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const workflow = await workflowRepository.findByN8nId(id);

    if (!workflow) {
      throw new NotFoundError('Workflow', id);
    }

    const response: ApiResponse = {
      success: true,
      data: workflow,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * POST /api/workflows/:id/execute
 * 워크플로우 실행
 */
router.post(
  '/:id/execute',
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

      // Webhook 응답에서 execution ID 추출 (없을 수 있음)
      executionId = `webhook-${Date.now()}`;

      log.info('Webhook workflow triggered successfully', {
        correlationId,
        workflowId: id,
        webhookUrl,
      });
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new N8nApiError(`Workflow execution failed: ${errorText}`, {
          correlationId,
          workflowId: id,
          status: response.status,
        });
      }

      const n8nResponse = (await response.json()) as N8nExecutionResponse;
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
 * 워크플로우 실행 기록 조회 (n8n API 프록시)
 */
router.get(
  '/:id/executions',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    try {
      // n8n API에서 실행 기록 조회
      const n8nResponse = await fetch(
        `${envConfig.N8N_BASE_URL}/api/v1/executions?workflowId=${id}&limit=${limit}`,
        {
          headers: {
            'X-N8N-API-KEY': envConfig.N8N_API_KEY,
          },
        }
      );

      if (!n8nResponse.ok) {
        throw new Error(`n8n API request failed: ${n8nResponse.status}`);
      }

      const n8nData = (await n8nResponse.json()) as { data?: any[] };

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
