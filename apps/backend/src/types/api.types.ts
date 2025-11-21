/**
 * API Types
 *
 * @description API 요청/응답 타입 정의
 */

/**
 * 표준 API 응답 인터페이스
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 워크플로우 실행 요청
 */
export interface ExecuteWorkflowRequest {
  workflowId: string;
  inputData?: Record<string, unknown>;
  options?: {
    waitForExecution?: boolean;
    timeout?: number;
  };
}

/**
 * 워크플로우 실행 응답
 */
export interface ExecuteWorkflowResponse {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt?: string;
  data?: unknown;
  error?: string;
}

/**
 * n8n 웹훅 페이로드
 */
export interface N8nWebhookPayload {
  workflowId: string;
  executionId: string;
  event:
    | 'workflow.execute.success'
    | 'workflow.execute.failed'
    | 'node.execute.start'
    | 'node.execute.end';
  timestamp: string;
  data?: unknown;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * 헬스체크 응답
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  timestamp: string;
  services: {
    mongodb: 'connected' | 'disconnected';
    n8n: 'reachable' | 'unreachable';
  };
}
