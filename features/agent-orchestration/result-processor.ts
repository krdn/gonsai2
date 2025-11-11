/**
 * Result Processor
 */

import type { AgentResult } from './types';

export class ResultProcessor {
  async process(result: AgentResult): Promise<void> {
    console.log(`Processing result for task ${result.taskId}`);
    // Process and store result
  }
}
