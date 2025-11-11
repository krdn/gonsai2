/**
 * Workflow Monitor - Execution monitoring and metrics
 */

import type { N8nClient } from './api-client';
import type { ExecutionMetrics } from './types';

export class WorkflowMonitor {
  constructor(private readonly client: N8nClient) {}

  async getMetrics(workflowId: string): Promise<ExecutionMetrics> {
    const executions = await this.client.executions.getAll({
      workflowId,
      pageSize: 100
    });

    const successful = executions.data.filter(e => e.status === 'success').length;
    const total = executions.data.length;

    return {
      workflowId,
      workflowName: '',
      totalExecutions: total,
      successCount: successful,
      errorCount: total - successful,
      successRate: total > 0 ? successful / total : 0,
      avgExecutionTime: 0,
    };
  }
}
