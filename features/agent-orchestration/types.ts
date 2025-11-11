/**
 * Agent Orchestration Types
 */

export interface AgentTask {
  id: string;
  workflowId: string;
  priority: 'low' | 'medium' | 'high';
  data: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
}

export interface AgentResult {
  taskId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
}
