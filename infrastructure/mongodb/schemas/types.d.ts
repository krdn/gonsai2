/**
 * MongoDB Schema Type Definitions for n8n Integration
 *
 * @description MongoDB 컬렉션의 TypeScript 타입 정의
 */
import { ObjectId } from 'mongodb';
/**
 * WorkflowSchema - n8n 워크플로우 정보
 */
export interface WorkflowDocument {
  _id?: ObjectId;
  n8nWorkflowId: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  settings: WorkflowSettings;
  tags?: string[];
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
}
export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
  timezone?: string;
  executionTimeout?: number;
}
/**
 * ExecutionSchema - 워크플로우 실행 기록
 */
export interface ExecutionDocument {
  _id?: ObjectId;
  n8nExecutionId: string;
  workflowId: string;
  n8nWorkflowId: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  startedAt: Date;
  finishedAt?: Date;
  executionTime?: number;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  nodeExecutions?: NodeExecution[];
  errorDetails?: ExecutionError;
  retryCount?: number;
  retryOf?: string;
  createdAt: Date;
}
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'waiting' | 'canceled';
export type ExecutionMode = 'manual' | 'trigger' | 'webhook' | 'retry' | 'cli';
export interface NodeExecution {
  nodeName: string;
  nodeType: string;
  executionTime?: number;
  startTime?: Date;
  itemCount?: number;
  error?: string;
}
export interface ExecutionError {
  message: string;
  node?: string;
  stack?: string;
  errorType?: string;
  causeChain?: string[];
}
/**
 * AgentLogSchema - AI 에이전트 실행 로그
 */
export interface AgentLogDocument {
  _id?: ObjectId;
  agentType: string;
  executionId: string;
  n8nExecutionId?: string;
  timestamp: Date;
  action: string;
  result: AgentResult;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  model?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
export type AgentResult = 'success' | 'failed' | 'partial' | 'timeout' | 'canceled';
/**
 * ErrorPatternSchema - 에러 패턴 및 자동 수정
 */
export interface ErrorPatternDocument {
  _id?: ObjectId;
  errorType: string;
  category: ErrorCategory;
  pattern: string;
  description?: string;
  frequency: number;
  lastOccurred?: Date;
  solutions: ErrorSolution[];
  autoFixEnabled: boolean;
  severity: ErrorSeverity;
  affectedWorkflows?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
export type ErrorCategory =
  | 'connection'
  | 'authentication'
  | 'execution'
  | 'resource'
  | 'configuration'
  | 'data'
  | 'network'
  | 'timeout';
export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';
export interface ErrorSolution {
  title: string;
  description: string;
  action?: string;
  command?: string;
  requiresApproval: boolean;
  successRate?: number;
  averageFixTime?: number;
}
/**
 * Collection Names
 */
export declare const COLLECTIONS: {
  readonly WORKFLOWS: 'workflows';
  readonly EXECUTIONS: 'executions';
  readonly AGENT_LOGS: 'agent_logs';
  readonly ERROR_PATTERNS: 'error_patterns';
};
/**
 * Index Definitions
 */
export interface IndexDefinition {
  keys: Record<string, 1 | -1 | 'text'>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
    name?: string;
    partialFilterExpression?: Record<string, unknown>;
    [key: string]: unknown;
  };
}
//# sourceMappingURL=types.d.ts.map
