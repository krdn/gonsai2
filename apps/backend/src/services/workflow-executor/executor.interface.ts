/**
 * 워크플로우 실행기 인터페이스
 */

import { ExecutionContext, ExecutionResult } from './types';

export interface IWorkflowExecutor {
  /**
   * 워크플로우 실행
   */
  execute(context: ExecutionContext): Promise<ExecutionResult>;

  /**
   * 이 실행기가 해당 워크플로우를 처리할 수 있는지 확인
   */
  canHandle(nodes: any[]): boolean;
}
