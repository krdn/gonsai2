/**
 * 워크플로우 실행 관련 타입 정의
 */

export interface ExecutionContext {
  correlationId: string;
  workflowId: string;
  inputData: Record<string, unknown>;
  options?: ExecutionOptions;
}

export interface ExecutionOptions {
  waitForExecution?: boolean;
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  mode: 'manual' | 'webhook';
  startedAt: Date;
  finishedAt?: Date;
  message?: string;
  webhookResponse?: unknown;
}

export interface WorkflowDetails {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  active: boolean;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
}
