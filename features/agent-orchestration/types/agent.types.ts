/**
 * Agent Orchestration Types
 *
 * @description AI 에이전트 실행 및 관리를 위한 타입 정의
 */

/**
 * n8n AI 노드 타입
 */
export type AINodeType =
  | 'n8n-nodes-base.openAi'
  | 'n8n-nodes-base.openAiChat'
  | '@n8n/n8n-nodes-langchain.chatOpenAi'
  | '@n8n/n8n-nodes-langchain.chatAnthropic'
  | 'n8n-nodes-base.httpRequest';

/**
 * 워크플로우 실행 모드
 */
export type ExecutionMode = 'manual' | 'webhook' | 'trigger' | 'retry';

/**
 * 실행 우선순위
 */
export type ExecutionPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 실행 상태
 */
export type ExecutionStatus =
  | 'queued'
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'timeout'
  | 'canceled';

/**
 * n8n 워크플로우 정보
 */
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  settings?: WorkflowSettings;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * n8n 노드 정보
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

/**
 * 워크플로우 설정
 */
export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  executionTimeout?: number;
  saveExecutionProgress?: boolean;
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
}

/**
 * AI 노드 정보
 */
export interface AINodeInfo {
  nodeId: string;
  nodeName: string;
  nodeType: AINodeType;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemMessage?: string;
  parameters: Record<string, unknown>;
}

/**
 * 워크플로우 실행 요청
 */
export interface ExecutionRequest {
  workflowId: string;
  mode: ExecutionMode;
  priority?: ExecutionPriority;
  inputData?: Record<string, unknown>;
  options?: ExecutionOptions;
  metadata?: Record<string, unknown>;
}

/**
 * 실행 옵션
 */
export interface ExecutionOptions {
  waitForExecution?: boolean;
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * 워크플로우 실행 결과
 */
export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  error?: ExecutionError;
  nodeExecutions?: NodeExecutionResult[];
  metadata?: Record<string, unknown>;
}

/**
 * 노드 실행 결과
 */
export interface NodeExecutionResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  executionStatus: 'success' | 'error';
  data?: unknown;
  error?: string;
}

/**
 * 실행 에러 정보
 */
export interface ExecutionError {
  message: string;
  description?: string;
  stack?: string;
  nodeId?: string;
  nodeName?: string;
  context?: Record<string, unknown>;
}

/**
 * 실행 진행 상태
 */
export interface ExecutionProgress {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  currentNode?: string;
  completedNodes: number;
  totalNodes: number;
  progress: number; // 0-100
  estimatedTimeRemaining?: number;
}

/**
 * Bull 큐 작업 데이터
 */
export interface QueueJobData {
  executionId: string;
  workflowId: string;
  mode: ExecutionMode;
  inputData?: Record<string, unknown>;
  options?: ExecutionOptions;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Bull 큐 작업 결과
 */
export interface QueueJobResult {
  executionId: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt: Date;
  duration: number;
  outputData?: Record<string, unknown>;
  error?: ExecutionError;
}

/**
 * Agent 통계
 */
export interface AgentStats {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  averageDuration: number;
  totalTokensUsed?: number;
  totalCost?: number;
  // Extended stats
  totalWorkflows?: number;
  activeWorkflows?: number;
  totalAINodes?: number;
  nodeTypeDistribution?: Record<string, number>;
  queueStats?: QueueStats;
}

/**
 * 큐 통계
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}
