/**
 * n8n Workflow Types
 *
 * @description n8n 워크플로우 관리를 위한 타입 정의
 */

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings?: WorkflowSettings;
  staticData?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, { id: string; name: string }>;
  disabled?: boolean;
  notes?: string;
}

export interface N8nConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<{
      node: string;
      type: string;
      index: number;
    }>;
  };
}

export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  saveExecutionProgress?: boolean;
  callerPolicy?: 'workflowsFromAList' | 'workflowsFromSameOwner' | 'any';
  timezone?: string;
  errorWorkflow?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'cli' | 'retry';
  status: 'new' | 'running' | 'success' | 'error' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  finished: boolean;
  retryOf?: string;
  retrySuccessId?: string;
  data?: ExecutionData;
}

export interface ExecutionData {
  startData?: {
    destinationNode?: string;
    runNodeFilter?: string[];
  };
  resultData: {
    runData: Record<string, NodeExecutionData[]>;
    error?: ExecutionError;
    lastNodeExecuted?: string;
  };
  executionData?: {
    contextData: Record<string, any>;
    metadata: Record<string, any>;
    nodeExecutionStack: any[];
    waitingExecution: Record<string, any>;
    waitingExecutionSource: Record<string, any>;
  };
}

export interface NodeExecutionData {
  startTime: number;
  executionTime: number;
  executionStatus?: 'success' | 'error';
  source: any[];
  data: {
    main: any[][];
  };
  error?: ExecutionError;
}

export interface ExecutionError {
  name: string;
  message: string;
  description?: string;
  stack?: string;
  node?: string;
  timestamp: number;
  context?: Record<string, any>;
}

export interface WorkflowExecuteRequest {
  workflowId: string;
  data?: {
    trigger?: Record<string, any>;
    executionData?: Record<string, any>;
  };
}

export interface WorkflowExecuteResponse {
  executionId: string;
  status: 'started' | 'queued';
  workflowId: string;
  startedAt: string;
}

export interface WorkflowListFilter {
  active?: boolean;
  tags?: string[];
  search?: string;
}

export interface WorkflowStatistics {
  workflowId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  minExecutionTime?: number;
  maxExecutionTime?: number;
  lastExecutionAt?: string;
  aiNodesUsed?: number;
}
