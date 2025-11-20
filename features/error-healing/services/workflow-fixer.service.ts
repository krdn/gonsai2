/**
 * Workflow Fixer Service
 *
 * @description n8n 워크플로우 자동 수정 시스템
 */

import { MongoClient } from 'mongodb';
import { envConfig } from '../../../apps/backend/src/utils/env-validator';
import { log } from '../../../apps/backend/src/utils/logger';
import { n8nClient } from '../../agent-orchestration/services/n8n-client.service';
import {
  AnalyzedError,
  WorkflowFixRequest,
  WorkflowFixResult,
  FixStrategy,
  FixStep,
  FixStatus,
  WorkflowTestResult,
  ErrorType,
} from '../types/error.types';

/**
 * 수정 전략 데이터베이스
 */
const FIX_STRATEGIES: Record<string, FixStrategy> = {
  reconnect_nodes: {
    id: 'reconnect_nodes',
    name: 'Reconnect Nodes',
    errorType: 'node_connection',
    description: '노드 간 연결 재설정',
    steps: [
      {
        order: 1,
        action: 'reconnect_nodes',
        parameters: {},
        rollbackable: true,
        description: '끊어진 노드 연결 복구',
      },
    ],
    requiresApproval: false,
    estimatedTime: 5,
  },

  update_credential: {
    id: 'update_credential',
    name: 'Update Credentials',
    errorType: 'authentication',
    description: '인증 정보 업데이트',
    steps: [
      {
        order: 1,
        action: 'update_credential',
        parameters: {},
        rollbackable: true,
        description: '노드의 인증 정보 갱신',
      },
    ],
    requiresApproval: true, // 보안 관련이므로 승인 필요
    estimatedTime: 10,
  },

  adjust_timeout: {
    id: 'adjust_timeout',
    name: 'Adjust Timeout',
    errorType: 'timeout',
    description: '타임아웃 값 조정',
    steps: [
      {
        order: 1,
        action: 'update_node_parameter',
        parameters: {
          parameterName: 'timeout',
          increment: 10000, // 10초 증가
        },
        rollbackable: true,
        description: '노드 타임아웃을 10초 증가',
      },
      {
        order: 2,
        action: 'update_node_parameter',
        parameters: {
          parameterName: 'retries',
          value: 3,
        },
        rollbackable: true,
        description: '재시도 횟수를 3회로 설정',
      },
    ],
    requiresApproval: false,
    estimatedTime: 5,
  },

  add_data_transformation: {
    id: 'add_data_transformation',
    name: 'Add Data Transformation',
    errorType: 'data_format',
    description: '데이터 변환 로직 추가',
    steps: [
      {
        order: 1,
        action: 'add_error_handler',
        parameters: {
          nodeType: 'n8n-nodes-base.function',
          code: 'try { return items; } catch (error) { return []; }',
        },
        rollbackable: true,
        description: '에러 핸들링 Function 노드 추가',
      },
    ],
    requiresApproval: false,
    estimatedTime: 15,
  },

  add_error_handler: {
    id: 'add_error_handler',
    name: 'Add Error Handler',
    errorType: 'api_error',
    description: '에러 핸들러 추가',
    steps: [
      {
        order: 1,
        action: 'add_conditional_logic',
        parameters: {
          condition: 'error',
        },
        rollbackable: true,
        description: '에러 발생 시 처리 경로 추가',
      },
    ],
    requiresApproval: false,
    estimatedTime: 10,
  },

  update_expression: {
    id: 'update_expression',
    name: 'Update Expression',
    errorType: 'invalid_expression',
    description: '표현식 수정',
    steps: [
      {
        order: 1,
        action: 'update_expression',
        parameters: {},
        rollbackable: true,
        description: '잘못된 표현식 수정',
      },
    ],
    requiresApproval: false,
    estimatedTime: 10,
  },
};

/**
 * Workflow Fixer 클래스
 */
export class WorkflowFixerService {
  private mongoClient: MongoClient;
  private fixStrategies: Record<string, FixStrategy>;

  constructor() {
    this.mongoClient = new MongoClient(envConfig.MONGODB_URI);
    this.fixStrategies = FIX_STRATEGIES;
    log.info('Workflow Fixer Service initialized');
  }

  /**
   * 워크플로우 수정 시도
   */
  async fixWorkflow(request: WorkflowFixRequest): Promise<WorkflowFixResult> {
    const fixId = `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startedAt = new Date();

    log.info('Starting workflow fix', {
      fixId,
      workflowId: request.workflowId,
      errorType: request.analyzedError.errorType,
    });

    try {
      // 1. 워크플로우 백업
      const backupWorkflow = await this.backupWorkflow(request.workflowId);

      // 2. Dry run인 경우 시뮬레이션만 수행
      if (request.dryRun) {
        return this.simulateFix(fixId, request, startedAt);
      }

      // 3. 수정 전략 실행
      const appliedSteps: FixStep[] = [];
      let failedStep: FixStep | undefined;

      for (const step of request.fixStrategy.steps) {
        try {
          await this.executeFixStep(request.workflowId, step, request.analyzedError);
          appliedSteps.push(step);
          log.info('Fix step completed', { fixId, step: step.order });
        } catch (error) {
          failedStep = step;
          log.error('Fix step failed', error, { fixId, step: step.order });

          // 롤백 가능한 경우 롤백 시도
          if (step.rollbackable) {
            await this.rollbackSteps(request.workflowId, appliedSteps, backupWorkflow);
          }

          throw error;
        }
      }

      // 4. 워크플로우 테스트
      const testResult = await this.testWorkflow(request.workflowId, request.analyzedError);

      // 5. 결과 생성
      const fixResult: WorkflowFixResult = {
        fixId,
        workflowId: request.workflowId,
        analyzedError: request.analyzedError,
        fixStrategy: request.fixStrategy,
        status: testResult.success ? 'fixed' : 'failed',
        appliedSteps,
        failedStep,
        backupWorkflow,
        testResult,
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime(),
      };

      // 6. 결과 저장
      await this.saveFixResult(fixResult);

      log.info('Workflow fix completed', {
        fixId,
        status: fixResult.status,
        duration: fixResult.duration,
      });

      return fixResult;
    } catch (error) {
      const fixResult: WorkflowFixResult = {
        fixId,
        workflowId: request.workflowId,
        analyzedError: request.analyzedError,
        fixStrategy: request.fixStrategy,
        status: 'failed',
        appliedSteps: [],
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime(),
        error: error instanceof Error ? error.message : String(error),
      };

      await this.saveFixResult(fixResult);

      log.error('Workflow fix failed', error, { fixId });
      throw error;
    }
  }

  /**
   * 워크플로우 백업
   */
  private async backupWorkflow(workflowId: string): Promise<Record<string, unknown>> {
    try {
      const workflow = await n8nClient.getWorkflow(workflowId);
      log.info('Workflow backed up', { workflowId });
      return workflow as unknown as Record<string, unknown>;
    } catch (error) {
      log.error('Failed to backup workflow', error, { workflowId });
      throw error;
    }
  }

  /**
   * 수정 단계 실행
   */
  private async executeFixStep(
    workflowId: string,
    step: FixStep,
    analyzedError: AnalyzedError
  ): Promise<void> {
    const { action, parameters } = step;

    switch (action) {
      case 'update_node_parameter':
        await this.updateNodeParameter(workflowId, analyzedError.executionError.nodeId, parameters);
        break;

      case 'reconnect_nodes':
        await this.reconnectNodes(workflowId, analyzedError);
        break;

      case 'adjust_timeout':
        await this.adjustTimeout(workflowId, analyzedError.executionError.nodeId);
        break;

      case 'add_error_handler':
        await this.addErrorHandler(workflowId, analyzedError);
        break;

      case 'update_expression':
        await this.updateExpression(workflowId, analyzedError);
        break;

      default:
        log.warn('Unknown fix action', { action });
    }
  }

  /**
   * 노드 파라미터 업데이트
   */
  private async updateNodeParameter(
    workflowId: string,
    nodeId: string,
    parameters: Record<string, unknown>
  ): Promise<void> {
    const workflow = await n8nClient.getWorkflow(workflowId);
    const node = workflow.nodes.find((n: any) => n.id === nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found in workflow`);
    }

    // 파라미터 업데이트 로직
    if (parameters.parameterName && parameters.increment) {
      const currentValue = (node.parameters[parameters.parameterName as string] as number) || 0;
      node.parameters[parameters.parameterName as string] =
        currentValue + (parameters.increment as number);
    } else if (parameters.parameterName && parameters.value !== undefined) {
      node.parameters[parameters.parameterName as string] = parameters.value;
    }

    // n8n API로 워크플로우 업데이트 (실제 구현 필요)
    // await n8nClient.updateWorkflow(workflowId, workflow);

    log.info('Node parameter updated', { workflowId, nodeId, parameters });
  }

  /**
   * 노드 재연결
   */
  private async reconnectNodes(workflowId: string, analyzedError: AnalyzedError): Promise<void> {
    log.info('Reconnecting nodes', { workflowId });
    // 실제 구현: 끊어진 연결 찾기 및 복구
    // 이 부분은 n8n 워크플로우 구조 분석 필요
  }

  /**
   * 타임아웃 조정
   */
  private async adjustTimeout(workflowId: string, nodeId: string): Promise<void> {
    await this.updateNodeParameter(workflowId, nodeId, {
      parameterName: 'timeout',
      increment: 10000,
    });
  }

  /**
   * 에러 핸들러 추가
   */
  private async addErrorHandler(workflowId: string, analyzedError: AnalyzedError): Promise<void> {
    log.info('Adding error handler', { workflowId });
    // 실제 구현: Function 노드 또는 IF 노드 추가
  }

  /**
   * 표현식 업데이트
   */
  private async updateExpression(workflowId: string, analyzedError: AnalyzedError): Promise<void> {
    log.info('Updating expression', { workflowId });
    // 실제 구현: 잘못된 표현식 찾기 및 수정
  }

  /**
   * 롤백
   */
  private async rollbackSteps(
    workflowId: string,
    appliedSteps: FixStep[],
    backupWorkflow: Record<string, unknown>
  ): Promise<void> {
    try {
      // 백업에서 복원
      // await n8nClient.updateWorkflow(workflowId, backupWorkflow);
      log.info('Rolled back workflow', { workflowId, stepsRolledBack: appliedSteps.length });
    } catch (error) {
      log.error('Failed to rollback workflow', error, { workflowId });
    }
  }

  /**
   * 워크플로우 테스트
   */
  private async testWorkflow(
    workflowId: string,
    analyzedError: AnalyzedError
  ): Promise<WorkflowTestResult> {
    try {
      const startTime = Date.now();

      // 워크플로우 실행
      const { executionId } = await n8nClient.executeWorkflow(workflowId, {
        test: true,
      });

      // 결과 대기
      const result = await n8nClient.waitForExecution(executionId, 60000);

      const executionTime = Date.now() - startTime;

      return {
        executionId,
        success: result.status === 'success',
        errorOccurred: result.status === 'failed',
        sameErrorType: false, // 실제 구현에서는 오류 비교 필요
        executionTime,
        outputData: result.outputData,
      };
    } catch (error) {
      log.error('Workflow test failed', error, { workflowId });

      return {
        executionId: 'test_failed',
        success: false,
        errorOccurred: true,
        sameErrorType: true,
        executionTime: 0,
      };
    }
  }

  /**
   * 시뮬레이션 (Dry Run)
   */
  private async simulateFix(
    fixId: string,
    request: WorkflowFixRequest,
    startedAt: Date
  ): Promise<WorkflowFixResult> {
    log.info('Simulating workflow fix (dry run)', { fixId });

    return {
      fixId,
      workflowId: request.workflowId,
      analyzedError: request.analyzedError,
      fixStrategy: request.fixStrategy,
      status: 'pending',
      appliedSteps: [],
      startedAt,
      completedAt: new Date(),
      duration: 0,
    };
  }

  /**
   * 수정 결과 저장
   */
  private async saveFixResult(fixResult: WorkflowFixResult): Promise<void> {
    try {
      await this.mongoClient.connect();

      await this.mongoClient
        .db()
        .collection('workflow_fixes')
        .insertOne({
          ...fixResult,
          createdAt: new Date(),
        });

      log.info('Fix result saved', { fixId: fixResult.fixId });
    } catch (error) {
      log.error('Failed to save fix result', error);
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 수정 전략 조회
   */
  getFixStrategy(errorType: ErrorType): FixStrategy | undefined {
    // errorType에 맞는 전략 찾기
    return Object.values(this.fixStrategies).find((strategy) => strategy.errorType === errorType);
  }

  /**
   * 커스텀 수정 전략 추가
   */
  addFixStrategy(strategy: FixStrategy): void {
    this.fixStrategies[strategy.id] = strategy;
    log.info('Custom fix strategy added', { strategyId: strategy.id });
  }
}

/**
 * 싱글톤 인스턴스
 */
export const workflowFixer = new WorkflowFixerService();
