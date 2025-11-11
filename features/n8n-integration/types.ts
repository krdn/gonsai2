/**
 * Type definitions for n8n integration
 *
 * @module n8n-integration/types
 * @description Type-safe interfaces for n8n REST API and workflow execution
 *
 * @aiContext
 * These types mirror the n8n REST API v1 structure.
 * Reference: https://docs.n8n.io/api/
 */

// ============================================
// Core n8n API Types
// ============================================

/**
 * n8n API client configuration
 */
export interface N8nClientConfig {
  /** n8n API base URL (e.g., http://localhost:5678) */
  baseUrl: string;

  /** n8n API key for authentication */
  apiKey: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Retry configuration for failed requests */
  retry?: {
    maxAttempts: number;
    delayMs: number;
  };
}

/**
 * Generic API response wrapper
 */
export interface N8nApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// ============================================
// Workflow Types
// ============================================

/**
 * n8n workflow definition
 */
export interface Workflow {
  /** Unique workflow identifier */
  id: string;

  /** Human-readable workflow name */
  name: string;

  /** Workflow activation status */
  active: boolean;

  /** Workflow nodes configuration */
  nodes: WorkflowNode[];

  /** Connections between nodes */
  connections: WorkflowConnections;

  /** Workflow settings */
  settings?: WorkflowSettings;

  /** Workflow metadata */
  createdAt: string;
  updatedAt: string;
}

/**
 * Workflow node definition
 */
export interface WorkflowNode {
  /** Unique node identifier within workflow */
  id: string;

  /** Node type (e.g., n8n-nodes-base.webhook) */
  type: string;

  /** Node display name */
  name: string;

  /** Node position in UI */
  position: [number, number];

  /** Node parameters */
  parameters: Record<string, unknown>;

  /** Node credentials */
  credentials?: Record<string, { id: string; name: string }>;
}

/**
 * Workflow connections between nodes
 */
export interface WorkflowConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<
      Array<{
        node: string;
        type: string;
        index: number;
      }>
    >;
  };
}

/**
 * Workflow settings
 */
export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveManualExecutions?: boolean;
  saveExecutionProgress?: boolean;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  timezone?: string;
}

/**
 * Workflow execution trigger data
 */
export interface WorkflowTriggerData {
  /** Data to pass to workflow */
  [key: string]: unknown;
}

// ============================================
// Execution Types
// ============================================

/**
 * Workflow execution result
 */
export interface WorkflowExecution {
  /** Unique execution identifier */
  id: string;

  /** Workflow that was executed */
  workflowId: string;

  /** Execution mode */
  mode: 'manual' | 'trigger' | 'webhook' | 'retry';

  /** Execution status */
  status: 'running' | 'success' | 'error' | 'waiting' | 'canceled';

  /** Execution start time */
  startedAt: string;

  /** Execution finish time */
  finishedAt?: string;

  /** Execution data */
  data: ExecutionData;

  /** Execution error (if failed) */
  error?: ExecutionError;
}

/**
 * Execution data containing node results
 */
export interface ExecutionData {
  /** Results from each executed node */
  resultData: {
    runData: {
      [nodeName: string]: Array<{
        startTime: number;
        executionTime: number;
        data: {
          main: Array<Array<{ json: Record<string, unknown> }>>;
        };
        error?: ExecutionError;
      }>;
    };
  };
}

/**
 * Execution error details
 */
export interface ExecutionError {
  /** Error message */
  message: string;

  /** Error stack trace */
  stack?: string;

  /** Node where error occurred */
  node?: string;

  /** Additional error context */
  context?: Record<string, unknown>;
}

/**
 * Execution summary for monitoring
 */
export interface ExecutionSummary {
  id: string;
  workflowId: string;
  status: WorkflowExecution['status'];
  startedAt: string;
  finishedAt?: string;
  executionTime?: number;
}

// ============================================
// Webhook Types
// ============================================

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  /** Webhook path (e.g., /webhook/data-processor) */
  path: string;

  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /** Workflow to trigger */
  workflowId: string;

  /** Authentication method */
  authentication?: 'none' | 'basicAuth' | 'headerAuth';

  /** Response mode */
  responseMode?: 'onReceived' | 'lastNode' | 'responseNode';
}

/**
 * Webhook request data
 */
export interface WebhookRequest {
  /** Request headers */
  headers: Record<string, string>;

  /** Request body */
  body: unknown;

  /** Query parameters */
  query: Record<string, string>;

  /** URL parameters */
  params: Record<string, string>;
}

/**
 * Webhook response
 */
export interface WebhookResponse {
  /** HTTP status code */
  statusCode: number;

  /** Response body */
  body: unknown;

  /** Response headers */
  headers?: Record<string, string>;
}

// ============================================
// Monitoring Types
// ============================================

/**
 * Execution metrics for monitoring
 */
export interface ExecutionMetrics {
  /** Workflow identifier */
  workflowId: string;

  /** Workflow name */
  workflowName: string;

  /** Total executions in period */
  totalExecutions: number;

  /** Successful executions */
  successCount: number;

  /** Failed executions */
  errorCount: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Average execution time (ms) */
  avgExecutionTime: number;

  /** Last execution timestamp */
  lastExecutedAt?: string;
}

/**
 * Workflow health status
 */
export interface WorkflowHealthStatus {
  workflowId: string;
  workflowName: string;
  isActive: boolean;
  isHealthy: boolean;
  lastSuccessfulExecution?: string;
  lastError?: {
    timestamp: string;
    message: string;
  };
  metrics: ExecutionMetrics;
}

// ============================================
// Batch Operations
// ============================================

/**
 * Batch execution request
 */
export interface BatchExecutionRequest {
  /** Workflows to execute */
  workflows: Array<{
    workflowId: string;
    triggerData?: WorkflowTriggerData;
  }>;

  /** Execution mode */
  mode?: 'parallel' | 'sequential';

  /** Stop on first error */
  stopOnError?: boolean;
}

/**
 * Batch execution result
 */
export interface BatchExecutionResult {
  /** Total workflows executed */
  total: number;

  /** Successful executions */
  successful: number;

  /** Failed executions */
  failed: number;

  /** Individual results */
  results: Array<{
    workflowId: string;
    executionId?: string;
    status: 'success' | 'error';
    error?: string;
  }>;
}

// ============================================
// Error Types
// ============================================

/**
 * n8n API error
 */
export class N8nApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'N8nApiError';
  }
}

/**
 * Workflow execution error
 */
export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    public executionId: string,
    public workflowId: string,
    public nodeError?: ExecutionError
  ) {
    super(message);
    this.name = 'WorkflowExecutionError';
  }
}

// ============================================
// Utility Types
// ============================================

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Query filters for listing workflows/executions
 */
export interface QueryFilters {
  /** Filter by active status */
  active?: boolean;

  /** Search by name */
  name?: string;

  /** Pagination */
  page?: number;
  pageSize?: number;

  /** Sorting */
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Execution query filters
 */
export interface ExecutionQueryFilters extends QueryFilters {
  /** Filter by workflow ID */
  workflowId?: string;

  /** Filter by status */
  status?: WorkflowExecution['status'];

  /** Filter by date range */
  startedAfter?: string;
  startedBefore?: string;
}
