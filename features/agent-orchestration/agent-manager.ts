/**
 * AI Agent Manager
 */

import type { AgentTask, AgentResult } from './types';

export class AgentManager {
  private tasks: Map<string, AgentTask> = new Map();

  async createTask(workflowId: string, data: Record<string, unknown>): Promise<AgentTask> {
    const task: AgentTask = {
      id: crypto.randomUUID(),
      workflowId,
      priority: 'medium',
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    return task;
  }

  async getTask(taskId: string): Promise<AgentTask | undefined> {
    return this.tasks.get(taskId);
  }
}
