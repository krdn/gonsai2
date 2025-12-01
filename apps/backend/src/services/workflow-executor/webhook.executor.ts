/**
 * Webhook 워크플로우 실행기
 */

import { IWorkflowExecutor } from './executor.interface';
import { ExecutionContext, ExecutionResult, WorkflowNode } from './types';
import { envConfig } from '../../utils/env-validator';
import { log } from '../../utils/logger';
import { N8nApiError } from '../../utils/errors';
import { executionRepository } from '../../repositories/workflow.repository';

export class WebhookExecutor implements IWorkflowExecutor {
  canHandle(nodes: WorkflowNode[]): boolean {
    return nodes.some(
      (node) =>
        node.type === 'n8n-nodes-base.webhook' || node.type === 'n8n-nodes-base.webhookTrigger'
    );
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { correlationId, workflowId, inputData } = context;

    // Webhook 노드 찾기
    const workflowDetails = await this.fetchWorkflowDetails(workflowId, correlationId);
    const webhookNode = workflowDetails.nodes.find(
      (node: WorkflowNode) =>
        node.type === 'n8n-nodes-base.webhook' || node.type === 'n8n-nodes-base.webhookTrigger'
    );

    if (!webhookNode) {
      throw new Error('Webhook node not found');
    }

    const webhookPath = (webhookNode.parameters?.path as string) || 'webhook';
    const webhookUrl = `${envConfig.N8N_BASE_URL}/webhook/${webhookPath}`;

    log.info('Executing webhook workflow', {
      correlationId,
      workflowId,
      webhookPath,
      webhookUrl,
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputData || {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new N8nApiError(`Webhook execution failed: ${errorText}`, {
        correlationId,
        workflowId,
        webhookUrl,
        status: response.status,
      });
    }

    // 응답 처리
    const { webhookResponseData, isHtmlResponse } = await this.parseResponse(response);
    const executionId =
      webhookResponseData.executionId || webhookResponseData.id || `webhook-${Date.now()}`;

    // MongoDB에 실행 기록 저장
    const execution = await executionRepository.createExecution({
      n8nExecutionId: executionId,
      workflowId,
      n8nWorkflowId: workflowId,
      status: 'success',
      mode: 'webhook',
      startedAt: new Date(),
      finishedAt: new Date(),
      inputData,
    });

    log.info('Webhook workflow execution completed', {
      correlationId,
      executionId,
      workflowId,
      isHtmlResponse,
    });

    return {
      executionId,
      workflowId,
      status: 'success',
      mode: 'webhook',
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      message: isHtmlResponse
        ? 'HTML 응답을 받았습니다.'
        : '워크플로우가 성공적으로 실행되었습니다.',
      webhookResponse: webhookResponseData,
    };
  }

  private async fetchWorkflowDetails(
    workflowId: string,
    correlationId: string
  ): Promise<{ nodes: WorkflowNode[] }> {
    const response = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: { 'X-N8N-API-KEY': envConfig.N8N_API_KEY },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new N8nApiError(`Failed to fetch workflow details: ${errorText}`, {
        correlationId,
        workflowId,
        status: response.status,
      });
    }

    return response.json();
  }

  private async parseResponse(
    response: Response
  ): Promise<{ webhookResponseData: any; isHtmlResponse: boolean }> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('text/html')) {
      const htmlText = await response.text();
      return { webhookResponseData: { htmlContent: htmlText }, isHtmlResponse: true };
    }

    if (contentType?.includes('application/json')) {
      const jsonData = await response.json();
      return { webhookResponseData: jsonData, isHtmlResponse: false };
    }

    const textContent = await response.text();
    return {
      webhookResponseData: { textContent, contentType: contentType || 'unknown' },
      isHtmlResponse: false,
    };
  }
}
