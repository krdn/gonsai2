/**
 * n8n API Client Service
 *
 * @description n8n REST API와의 통신을 담당하는 클라이언트
 */

import { envConfig } from '../../../apps/backend/src/utils/env-validator';
import { log } from '../../../apps/backend/src/utils/logger';
import {
  N8nWorkflow,
  ExecutionResult,
  ExecutionStatus,
  ExecutionError,
  NodeExecutionResult,
} from '../types/agent.types';

/**
 * n8n API 클라이언트 클래스
 */
export class N8nClientService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = envConfig.N8N_BASE_URL;
    this.apiKey = envConfig.N8N_API_KEY;
  }

  /**
   * 모든 워크플로우 조회
   */
  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      log.error('Failed to get workflows from n8n', error);
      throw error;
    }
  }

  /**
   * 특정 워크플로우 조회
   */
  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Workflow not found: ${workflowId}`);
        }
        throw new Error(`Failed to fetch workflow: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      log.error('Failed to get workflow from n8n', error, { workflowId });
      throw error;
    }
  }

  /**
   * 워크플로우 실행
   */
  async executeWorkflow(
    workflowId: string,
    inputData?: Record<string, unknown>
  ): Promise<{ executionId: string; data?: unknown }> {
    try {
      log.info('Executing workflow via n8n API', { workflowId });

      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          data: inputData || {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('Workflow execution failed', undefined, {
          workflowId,
          status: response.status,
          error: errorText,
        });
        throw new Error(`Workflow execution failed: ${errorText}`);
      }

      const result = await response.json();

      log.info('Workflow execution started', {
        workflowId,
        executionId: result.data.executionId,
      });

      return {
        executionId: result.data.executionId,
        data: result.data,
      };
    } catch (error) {
      log.error('Failed to execute workflow', error, { workflowId });
      throw error;
    }
  }

  /**
   * 실행 상태 조회
   */
  async getExecution(executionId: string): Promise<ExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/executions/${executionId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Execution not found: ${executionId}`);
        }
        throw new Error(`Failed to fetch execution: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseExecutionResult(data.data);
    } catch (error) {
      log.error('Failed to get execution from n8n', error, { executionId });
      throw error;
    }
  }

  /**
   * 실행 상태 폴링 (완료될 때까지 대기)
   */
  async waitForExecution(
    executionId: string,
    timeout: number = 300000, // 5분
    pollInterval: number = 2000 // 2초
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.getExecution(executionId);

      if (result.status === 'success' || result.status === 'failed') {
        return result;
      }

      // 2초 대기
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Execution timeout: ${executionId}`);
  }

  /**
   * 실행 삭제
   */
  async deleteExecution(executionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/executions/${executionId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete execution: ${response.statusText}`);
      }

      log.info('Execution deleted', { executionId });
    } catch (error) {
      log.error('Failed to delete execution', error, { executionId });
      throw error;
    }
  }

  /**
   * 워크플로우의 모든 실행 기록 조회
   */
  async getWorkflowExecutions(
    workflowId: string,
    limit: number = 10
  ): Promise<ExecutionResult[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/executions?workflowId=${workflowId}&limit=${limit}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch executions: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.data || []).map((exec: any) => this.parseExecutionResult(exec));
    } catch (error) {
      log.error('Failed to get workflow executions', error, { workflowId });
      throw error;
    }
  }

  /**
   * n8n 실행 데이터를 ExecutionResult로 변환
   */
  private parseExecutionResult(n8nExecution: any): ExecutionResult {
    const status = this.mapN8nStatus(n8nExecution.finished, n8nExecution.stoppedAt, n8nExecution.data);

    const result: ExecutionResult = {
      executionId: n8nExecution.id,
      workflowId: n8nExecution.workflowId,
      status,
      startedAt: new Date(n8nExecution.startedAt),
      finishedAt: n8nExecution.stoppedAt ? new Date(n8nExecution.stoppedAt) : undefined,
      duration: n8nExecution.stoppedAt
        ? new Date(n8nExecution.stoppedAt).getTime() - new Date(n8nExecution.startedAt).getTime()
        : undefined,
      outputData: n8nExecution.data?.resultData?.runData,
    };

    // 에러 정보 파싱
    if (n8nExecution.data?.resultData?.error) {
      result.error = this.parseExecutionError(n8nExecution.data.resultData.error);
    }

    // 노드 실행 결과 파싱
    if (n8nExecution.data?.resultData?.runData) {
      result.nodeExecutions = this.parseNodeExecutions(n8nExecution.data.resultData.runData);
    }

    return result;
  }

  /**
   * n8n 상태를 ExecutionStatus로 매핑
   */
  private mapN8nStatus(finished: boolean, stoppedAt: string | null, data: any): ExecutionStatus {
    if (!finished && !stoppedAt) {
      return 'running';
    }

    if (finished && !data?.resultData?.error) {
      return 'success';
    }

    return 'failed';
  }

  /**
   * n8n 에러를 ExecutionError로 변환
   */
  private parseExecutionError(n8nError: any): ExecutionError {
    return {
      message: n8nError.message || 'Unknown error',
      description: n8nError.description,
      stack: n8nError.stack,
      nodeId: n8nError.node?.id,
      nodeName: n8nError.node?.name,
      context: n8nError.context,
    };
  }

  /**
   * 노드 실행 결과 파싱
   */
  private parseNodeExecutions(runData: Record<string, any[]>): NodeExecutionResult[] {
    const results: NodeExecutionResult[] = [];

    for (const [nodeName, executions] of Object.entries(runData)) {
      for (const execution of executions) {
        results.push({
          nodeId: execution.source?.[0]?.previousNode || nodeName,
          nodeName,
          nodeType: execution.executionStatus || 'unknown',
          startedAt: execution.startTime ? new Date(execution.startTime) : new Date(),
          finishedAt: execution.executionTime ? new Date(execution.executionTime) : undefined,
          duration: execution.executionTime && execution.startTime
            ? new Date(execution.executionTime).getTime() - new Date(execution.startTime).getTime()
            : undefined,
          executionStatus: execution.error ? 'error' : 'success',
          data: execution.data,
          error: execution.error?.message,
        });
      }
    }

    return results;
  }

  /**
   * 공통 HTTP 헤더 생성
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': this.apiKey,
    };
  }
}

/**
 * 싱글톤 인스턴스
 */
export const n8nClient = new N8nClientService();
