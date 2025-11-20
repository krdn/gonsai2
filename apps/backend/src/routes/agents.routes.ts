/**
 * Agents Routes
 *
 * @description AI 에이전트 관리 및 실행 API
 */

import { Router, Request, Response } from 'express';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import { getCorrelationId } from '../middleware/correlation-id.middleware';
import { ApiResponse } from '../types/api.types';
import { asyncHandler, authenticateN8nApiKey } from '../middleware';
import { N8nApiError } from '../utils/errors';
import { parseN8nResponse, checkN8nResponse } from '../utils/n8n-helpers';
import { AI_NODE_TYPES } from '../utils/n8n-constants';
import {
  N8nWorkflow,
  N8nNode,
  N8nExecution,
  N8nListResponse,
  AgentInfo,
  AgentDetailInfo,
  AgentWorkflowSummary,
  AgentWorkflowDetail,
  ExecutionStats,
  FormattedExecution,
  NodeTypeDistribution,
  AgentOverviewStats,
} from '../types/n8n.types';

const router = Router();

// 모든 agents 라우트는 인증 필요
router.use(authenticateN8nApiKey);

/**
 * GET /api/agents
 * AI 에이전트 워크플로우 목록 조회 (AI 노드가 포함된 워크플로우만)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);

    try {
      // n8n에서 모든 워크플로우 조회
      const workflowsResponse = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': envConfig.N8N_API_KEY },
      });

      if (!workflowsResponse.ok) {
        throw new N8nApiError('Failed to fetch workflows', {
          correlationId,
          status: workflowsResponse.status,
        });
      }

      const workflowsData = (await workflowsResponse.json()) as N8nListResponse<N8nWorkflow>;
      const workflows = workflowsData.data || [];

      // AI 노드가 포함된 워크플로우 필터링 및 정보 추출
      const agentWorkflows: AgentWorkflowSummary[] = workflows
        .map((workflow: N8nWorkflow) => {
          const aiNodes = (workflow.nodes || []).filter((node: N8nNode) =>
            AI_NODE_TYPES.includes(node.type as (typeof AI_NODE_TYPES)[number])
          );

          if (aiNodes.length === 0) {
            return null;
          }

          // AI 노드 정보 추출
          const agents: AgentInfo[] = aiNodes.map((node: N8nNode) => ({
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            model: node.parameters?.model || node.parameters?.resource || 'Unknown',
            position: node.position,
          }));

          return {
            id: workflow.id,
            name: workflow.name,
            active: workflow.active,
            tags: workflow.tags || [],
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
            aiNodeCount: aiNodes.length,
            agents,
          };
        })
        .filter((workflow): workflow is AgentWorkflowSummary => workflow !== null);

      log.info('Agent workflows retrieved', {
        correlationId,
        totalWorkflows: workflows.length,
        agentWorkflows: agentWorkflows.length,
      });

      const response: ApiResponse = {
        success: true,
        data: agentWorkflows,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to fetch agent workflows', error);
      throw error;
    }
  })
);

/**
 * GET /api/agents/:workflowId
 * 특정 AI 에이전트 워크플로우 상세 정보 조회
 */
router.get(
  '/:workflowId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { workflowId } = req.params;
    const correlationId = getCorrelationId(req);

    try {
      // 워크플로우 상세 정보 조회
      const workflowResponse = await fetch(
        `${envConfig.N8N_BASE_URL}/api/v1/workflows/${workflowId}`,
        {
          headers: { 'X-N8N-API-KEY': envConfig.N8N_API_KEY },
        }
      );

      if (!workflowResponse.ok) {
        throw new N8nApiError('Failed to fetch workflow', {
          correlationId,
          status: workflowResponse.status,
        });
      }

      const workflow = (await workflowResponse.json()) as N8nWorkflow;

      // AI 노드 추출 및 상세 정보
      const aiNodes = (workflow.nodes || []).filter((node: N8nNode) =>
        AI_NODE_TYPES.includes(node.type as (typeof AI_NODE_TYPES)[number])
      );

      const agents: AgentDetailInfo[] = aiNodes.map((node: N8nNode) => ({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        model: node.parameters?.model || node.parameters?.resource || 'Unknown',
        temperature: node.parameters?.temperature,
        maxTokens: node.parameters?.maxTokens || node.parameters?.max_tokens,
        systemMessage: node.parameters?.systemMessage || node.parameters?.system,
        position: node.position,
        parameters: node.parameters,
      }));

      // 최근 실행 통계 조회
      const executionsResponse = await fetch(
        `${envConfig.N8N_BASE_URL}/api/v1/executions?workflowId=${workflowId}&limit=50`,
        {
          headers: { 'X-N8N-API-KEY': envConfig.N8N_API_KEY },
        }
      );

      let executionStats: ExecutionStats = {
        totalExecutions: 0,
        successCount: 0,
        failedCount: 0,
        successRate: 0,
        lastExecutedAt: null,
      };

      if (executionsResponse.ok) {
        const executionsData = (await executionsResponse.json()) as N8nListResponse<N8nExecution>;
        const executions = executionsData.data || [];

        executionStats = {
          totalExecutions: executions.length,
          successCount: executions.filter((e: N8nExecution) => e.status === 'success').length,
          failedCount: executions.filter((e: N8nExecution) => e.status === 'error').length,
          successRate:
            executions.length > 0
              ? Math.round(
                  (executions.filter((e: N8nExecution) => e.status === 'success').length /
                    executions.length) *
                    100
                )
              : 0,
          lastExecutedAt: executions[0]?.startedAt || null,
        };
      }

      const detailedWorkflow: AgentWorkflowDetail = {
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        tags: workflow.tags || [],
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        settings: workflow.settings,
        aiNodeCount: aiNodes.length,
        totalNodeCount: workflow.nodes?.length || 0,
        agents,
        executionStats,
      };

      log.info('Agent workflow details retrieved', {
        correlationId,
        workflowId,
        aiNodeCount: aiNodes.length,
      });

      const response: ApiResponse = {
        success: true,
        data: detailedWorkflow,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to fetch agent workflow details', error, { workflowId });
      throw error;
    }
  })
);

/**
 * POST /api/agents/:workflowId/execute
 * AI 에이전트 워크플로우 실행
 */
router.post(
  '/:workflowId/execute',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { workflowId } = req.params;
    const { inputData = {}, waitForResult = false } = req.body;
    const correlationId = getCorrelationId(req);

    try {
      log.info('Executing agent workflow', {
        correlationId,
        workflowId,
        waitForResult,
      });

      // n8n 워크플로우 실행
      const executeResponse = await fetch(
        `${envConfig.N8N_BASE_URL}/api/v1/workflows/${workflowId}/execute`,
        {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': envConfig.N8N_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(inputData),
        }
      );

      // 응답 상태 확인
      await checkN8nResponse(executeResponse, {
        correlationId,
        workflowId,
        operation: 'execute agent workflow',
      });

      // JSON 응답 파싱
      const executionResult = await parseN8nResponse<N8nExecution>(executeResponse, {
        correlationId,
        workflowId,
        operation: 'execute agent workflow',
      });

      log.info('Agent workflow executed', {
        correlationId,
        workflowId,
        executionId: executionResult.id,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          executionId: executionResult.id,
          workflowId,
          status: executionResult.status || 'running',
          startedAt: executionResult.startedAt || new Date().toISOString(),
          message: waitForResult ? 'Execution completed' : 'Execution started',
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to execute agent workflow', error, { workflowId });
      throw error;
    }
  })
);

/**
 * GET /api/agents/:workflowId/executions
 * AI 에이전트 워크플로우 실행 기록 조회
 */
router.get(
  '/:workflowId/executions',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { workflowId } = req.params;
    const { limit = 20 } = req.query;
    const correlationId = getCorrelationId(req);

    try {
      const executionsResponse = await fetch(
        `${envConfig.N8N_BASE_URL}/api/v1/executions?workflowId=${workflowId}&limit=${limit}`,
        {
          headers: { 'X-N8N-API-KEY': envConfig.N8N_API_KEY },
        }
      );

      if (!executionsResponse.ok) {
        throw new N8nApiError('Failed to fetch executions', {
          correlationId,
          status: executionsResponse.status,
        });
      }

      const executionsData = (await executionsResponse.json()) as N8nListResponse<N8nExecution>;
      const executions = executionsData.data || [];

      // 실행 기록 포맷팅
      const formattedExecutions: FormattedExecution[] = executions.map((exec: N8nExecution) => ({
        id: exec.id,
        workflowId: exec.workflowId,
        status: exec.status,
        mode: exec.mode,
        startedAt: exec.startedAt,
        stoppedAt: exec.stoppedAt,
        duration:
          exec.stoppedAt && exec.startedAt
            ? new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()
            : null,
      }));

      const response: ApiResponse = {
        success: true,
        data: formattedExecutions,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to fetch agent executions', error, { workflowId });
      throw error;
    }
  })
);

/**
 * GET /api/agents/stats/overview
 * 전체 AI 에이전트 통계 조회
 */
router.get(
  '/stats/overview',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);

    try {
      // 모든 워크플로우 조회
      const workflowsResponse = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': envConfig.N8N_API_KEY },
      });

      if (!workflowsResponse.ok) {
        throw new N8nApiError('Failed to fetch workflows', {
          correlationId,
          status: workflowsResponse.status,
        });
      }

      const workflowsData = (await workflowsResponse.json()) as N8nListResponse<N8nWorkflow>;
      const workflows = workflowsData.data || [];

      // AI 노드 통계
      let totalAINodes = 0;
      let agentWorkflowCount = 0;
      const nodeTypeCount: NodeTypeDistribution = {};

      workflows.forEach((workflow: N8nWorkflow) => {
        const aiNodes = (workflow.nodes || []).filter((node: N8nNode) =>
          AI_NODE_TYPES.includes(node.type as (typeof AI_NODE_TYPES)[number])
        );

        if (aiNodes.length > 0) {
          agentWorkflowCount++;
          totalAINodes += aiNodes.length;

          aiNodes.forEach((node: N8nNode) => {
            nodeTypeCount[node.type] = (nodeTypeCount[node.type] || 0) + 1;
          });
        }
      });

      // 최근 24시간 실행 통계
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const executionsResponse = await fetch(
        `${envConfig.N8N_BASE_URL}/api/v1/executions?limit=200`,
        {
          headers: { 'X-N8N-API-KEY': envConfig.N8N_API_KEY },
        }
      );

      let executionStats: ExecutionStats = {
        totalExecutions: 0,
        successCount: 0,
        failedCount: 0,
        successRate: 0,
        averageDuration: 0,
      };

      if (executionsResponse.ok) {
        const executionsData = (await executionsResponse.json()) as N8nListResponse<N8nExecution>;
        const allExecutions = executionsData.data || [];

        // 24시간 내 실행만 필터링
        const recentExecutions = allExecutions.filter((exec: N8nExecution) => {
          const startDate = new Date(exec.startedAt);
          return startDate >= last24Hours;
        });

        const successCount = recentExecutions.filter(
          (e: N8nExecution) => e.status === 'success'
        ).length;
        const failedCount = recentExecutions.filter(
          (e: N8nExecution) => e.status === 'error'
        ).length;

        // 평균 실행 시간 계산
        const completedExecutions = recentExecutions.filter(
          (e: N8nExecution) => e.stoppedAt && e.startedAt
        );

        let avgDuration = 0;
        if (completedExecutions.length > 0) {
          const totalDuration = completedExecutions.reduce((sum: number, exec: N8nExecution) => {
            const duration =
              new Date(exec.stoppedAt!).getTime() - new Date(exec.startedAt).getTime();
            return sum + duration;
          }, 0);
          avgDuration = Math.round(totalDuration / completedExecutions.length);
        }

        executionStats = {
          totalExecutions: recentExecutions.length,
          successCount,
          failedCount,
          successRate:
            recentExecutions.length > 0
              ? Math.round((successCount / recentExecutions.length) * 100)
              : 0,
          averageDuration: avgDuration,
        };
      }

      const stats: AgentOverviewStats = {
        totalWorkflows: workflows.length,
        agentWorkflows: agentWorkflowCount,
        activeWorkflows: workflows.filter((w: N8nWorkflow) => w.active).length,
        totalAINodes,
        nodeTypeDistribution: nodeTypeCount,
        executionStats,
        timestamp: new Date().toISOString(),
      };

      log.info('Agent overview stats retrieved', {
        correlationId,
        agentWorkflows: agentWorkflowCount,
        totalAINodes,
      });

      const response: ApiResponse = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      log.error('Failed to fetch agent overview stats', error);
      throw error;
    }
  })
);

export default router;
