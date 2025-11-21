/**
 * Workflow Executor - Simplified workflow execution management
 */

import type { N8nClient } from './api-client';
import type { WorkflowExecution, WorkflowTriggerData } from './types';

export class WorkflowExecutor {
  constructor(private readonly client: N8nClient) {}

  async executeAndWait(workflowId: string, data?: WorkflowTriggerData): Promise<WorkflowExecution> {
    const execution = await this.client.executions.execute(workflowId, data);
    return await this.client.executions.waitForCompletion(execution.id);
  }
}
