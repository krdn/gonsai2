/**
 * Execution Queue
 */

import type { AgentTask } from './types';

export class ExecutionQueue {
  private queue: AgentTask[] = [];

  enqueue(task: AgentTask): void {
    this.queue.push(task);
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  dequeue(): AgentTask | undefined {
    return this.queue.shift();
  }

  size(): number {
    return this.queue.length;
  }
}
