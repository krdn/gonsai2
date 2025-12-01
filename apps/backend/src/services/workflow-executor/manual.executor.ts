/**
 * Manual 워크플로우 실행기
 */

import { IWorkflowExecutor } from './executor.interface';
import { ExecutionContext, ExecutionResult, WorkflowNode } from './types';
import { envConfig } from '../../utils/env-validator';
import { log } from '../../utils/logger';
import { N8nApiError } from '../../utils/errors';
import { executionRepository } from '../../repositories/workflow.repository';
import { checkN8nResponse, parseN8nResponse } from '../../utils/n8n-helpers';

interface N8nExecutionResponse {
  data: {
    executionId: string;
    [key: string]: unknown;
  };
}

export class ManualExecutor implements IWorkflowExecutor {
  canHandle(nodes: WorkflowNode[]): boolean {
    // Webhook 노드가 없으면 Manual 실행
    const hasWebhook = nodes.some(
      (node) =>
        node.type === 'n8n-nodes-base.webhook' || node.type === 'n8n-nodes-base.webhookTrigger'
    );
    return !hasWebhook;
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { correlationId, workflowId, inputData } = context;

    log.info('Executing manual workflow', {
      correlationId,
      workflowId,
    });

    const response = await fetch(
      `${envConfig.N8N_BASE_URL}/api/v1/workflows/${workflowId}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': envConfig.N8N_API_KEY,
        },
        body: JSON.stringify({ data: inputData || {} }),
      }
    );

    await checkN8nResponse(response, {
      correlationId,
      workflowId,
      operation: 'execute workflow',
    });

    const n8nResponse = await parseN8nResponse<N8nExecutionResponse>(response, {
      correlationId,
      workflowId,
      operation: 'execute workflow',
    });

    const executionId = n8nResponse.data.executionId;

    // MongoDB에 실행 기록 저장
    const execution = await executionRepository.createExecution({
      n8nExecutionId: executionId,
      workflowId,
      n8nWorkflowId: workflowId,
      status: 'running',
      mode: 'manual',
      startedAt: new Date(),
      inputData,
    });

    log.info('Manual workflow execution started', {
      correlationId,
      executionId,
      workflowId,
    });

    return {
      executionId,
      workflowId,
      status: 'running',
      mode: 'manual',
      startedAt: execution.startedAt,
    };
  }
}
