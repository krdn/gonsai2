/**
 * 워크플로우 실행기 팩토리
 */

import { IWorkflowExecutor } from './executor.interface';
import { WebhookExecutor } from './webhook.executor';
import { ManualExecutor } from './manual.executor';
import { WorkflowNode } from './types';

class WorkflowExecutorFactory {
  private executors: IWorkflowExecutor[] = [];

  constructor() {
    // 실행기 등록 (우선순위 순서)
    this.executors.push(new WebhookExecutor());
    this.executors.push(new ManualExecutor()); // 기본 실행기
  }

  /**
   * 워크플로우 노드를 기반으로 적절한 실행기 반환
   */
  getExecutor(nodes: WorkflowNode[]): IWorkflowExecutor {
    for (const executor of this.executors) {
      if (executor.canHandle(nodes)) {
        return executor;
      }
    }

    // 기본적으로 ManualExecutor 반환 (항상 canHandle = true)
    return this.executors[this.executors.length - 1];
  }
}

// 싱글톤 인스턴스
export const workflowExecutorFactory = new WorkflowExecutorFactory();
