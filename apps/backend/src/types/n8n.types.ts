/**
 * n8n API Types
 *
 * @description n8n API 응답 타입 정의
 */

/**
 * n8n 노드 파라미터
 */
export interface N8nNodeParameters {
  model?: string;
  resource?: string;
  temperature?: number;
  maxTokens?: number;
  max_tokens?: number;
  systemMessage?: string;
  system?: string;
  [key: string]: string | number | boolean | N8nNodeParameters | N8nNodeParameters[] | undefined;
}

/**
 * n8n 노드
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: N8nNodeParameters;
  credentials?: Record<string, { id: string; name: string }>;
  disabled?: boolean;
  notes?: string;
}

/**
 * n8n 워크플로우 태그
 */
export interface N8nTag {
  id: string;
  name: string;
}

/**
 * n8n 워크플로우
 */
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes?: N8nNode[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  tags?: N8nTag[];
  createdAt: string;
  updatedAt: string;
}

/**
 * n8n 실행 기록
 */
export interface N8nExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  mode: 'manual' | 'webhook' | 'trigger';
  startedAt: string;
  stoppedAt?: string;
  data?: Record<string, unknown>;
}

/**
 * n8n API 응답 (목록)
 */
export interface N8nListResponse<T> {
  data?: T[];
  nextCursor?: string;
}

/**
 * AI 에이전트 정보
 */
export interface AgentInfo {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  model: string;
  position: [number, number];
}

/**
 * AI 에이전트 상세 정보
 */
export interface AgentDetailInfo extends AgentInfo {
  temperature?: number;
  maxTokens?: number;
  systemMessage?: string;
  parameters: N8nNodeParameters;
}

/**
 * 에이전트 워크플로우 요약
 */
export interface AgentWorkflowSummary {
  id: string;
  name: string;
  active: boolean;
  tags: N8nTag[];
  createdAt: string;
  updatedAt: string;
  aiNodeCount: number;
  agents: AgentInfo[];
}

/**
 * 에이전트 워크플로우 상세
 */
export interface AgentWorkflowDetail {
  id: string;
  name: string;
  active: boolean;
  tags: N8nTag[];
  createdAt: string;
  updatedAt: string;
  settings?: Record<string, unknown>;
  aiNodeCount: number;
  totalNodeCount: number;
  agents: AgentDetailInfo[];
  executionStats: ExecutionStats;
}

/**
 * 실행 통계
 */
export interface ExecutionStats {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  lastExecutedAt?: string | null;
  averageDuration?: number;
}

/**
 * 포맷된 실행 기록
 */
export interface FormattedExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: string;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  duration: number | null;
}

/**
 * 시간별 메트릭
 */
export interface HourlyMetric {
  timestamp: string;
  success: number;
  error: number;
  total: number;
}

/**
 * 노드 타입 분포
 */
export type NodeTypeDistribution = Record<string, number>;

/**
 * 에이전트 통계 개요
 */
export interface AgentOverviewStats {
  totalWorkflows: number;
  agentWorkflows: number;
  activeWorkflows: number;
  totalAINodes: number;
  nodeTypeDistribution: NodeTypeDistribution;
  executionStats: ExecutionStats;
  timestamp: string;
}

/**
 * 모니터링 통계
 */
export interface MonitoringStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  runningExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  period: string;
  timestamp: string;
}

/**
 * 시스템 헬스 정보
 */
export interface SystemHealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    n8n: {
      status: 'up' | 'down';
      url: string;
    };
    mongodb: {
      status: 'up' | 'down';
    };
    backend: {
      status: 'up' | 'down';
      uptime: number;
    };
  };
  timestamp: string;
}

/**
 * Aggregate 결과 타입 (통계용)
 */
export interface AggregateStatsResult {
  total: Array<{ count: number }>;
  active?: Array<{ count: number }>;
  inactive?: Array<{ count: number }>;
  success?: Array<{ count: number }>;
  error?: Array<{ count: number }>;
  running?: Array<{ count: number }>;
}
