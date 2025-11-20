/**
 * Workflow Repository
 *
 * @description 워크플로우 데이터 접근 레이어
 */

import { BaseRepository } from './base.repository';
import { WithId } from 'mongodb';
import { Cacheable, CacheEvict } from '../decorators/cache.decorator';
import { COLLECTIONS } from '../../../../infrastructure/mongodb/schemas/types';

/**
 * n8n 노드 파라미터
 */
export interface N8nNodeParameters {
  [key: string]: string | number | boolean | N8nNodeParameters | N8nNodeParameters[];
}

/**
 * n8n 노드 위치
 */
export interface N8nNodePosition {
  x: number;
  y: number;
}

/**
 * n8n 노드 인터페이스
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: N8nNodeParameters;
  credentials?: Record<string, { id: string; name: string }>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';
}

/**
 * n8n 연결 정보
 */
export interface N8nConnectionInfo {
  node: string;
  type: string;
  index: number;
}

/**
 * n8n 연결 구조
 */
export interface N8nConnections {
  [sourceNode: string]: {
    [outputType: string]: N8nConnectionInfo[][];
  };
}

/**
 * n8n 워크플로우 설정
 */
export interface N8nWorkflowSettings {
  saveExecutionProgress?: boolean;
  saveManualExecutions?: boolean;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  executionTimeout?: number;
  errorWorkflow?: string;
  timezone?: string;
  executionOrder?: 'v0' | 'v1';
}

/**
 * n8n 정적 데이터
 */
export interface N8nStaticData {
  [nodeId: string]: Record<string, unknown>;
}

/**
 * 노드 실행 결과 데이터
 */
export interface NodeExecutionResult {
  executionTime?: number;
  startTime?: number;
  executionStatus?: string;
  data?: {
    main?: Array<Array<{ json: Record<string, unknown>; binary?: Record<string, unknown> }>>;
  };
  error?: {
    message: string;
    stack?: string;
  };
  [key: string]: unknown;
}

/**
 * 실행 데이터 (입력/출력)
 */
export type ExecutionData = Record<string, NodeExecutionResult | unknown>;

/**
 * 워크플로우 문서 인터페이스
 */
export interface IWorkflow {
  n8nWorkflowId: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings?: N8nWorkflowSettings;
  staticData?: N8nStaticData;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 실행 문서 인터페이스
 */
export interface IExecution {
  n8nExecutionId: string;
  workflowId: string;
  n8nWorkflowId: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  mode: 'manual' | 'webhook' | 'trigger';
  startedAt: Date;
  finishedAt?: Date;
  inputData?: ExecutionData;
  outputData?: ExecutionData;
  error?: string;
  createdAt: Date;
}

export class WorkflowRepository extends BaseRepository<IWorkflow> {
  protected collectionName = COLLECTIONS.WORKFLOWS;

  /**
   * n8n 워크플로우 ID로 조회 (캐싱)
   */
  @Cacheable({
    ttl: 300, // 5분
    prefix: 'workflow',
    keyGenerator: (id: string) => `n8n:${id}`,
  })
  async findByN8nId(n8nWorkflowId: string): Promise<WithId<IWorkflow> | null> {
    return this.findOne({ n8nWorkflowId });
  }

  /**
   * 활성 워크플로우 조회
   */
  @Cacheable({
    ttl: 60, // 1분
    prefix: 'workflow',
    keyGenerator: () => 'active',
  })
  async findActiveWorkflows(): Promise<WithId<IWorkflow>[]> {
    return this.find({ active: true }, { sort: { createdAt: -1 } });
  }

  /**
   * 워크플로우 생성/업데이트 (캐시 무효화)
   */
  @CacheEvict(['workflow:*'])
  async upsertWorkflow(
    workflow: Omit<IWorkflow, 'createdAt' | 'updatedAt'>
  ): Promise<WithId<IWorkflow>> {
    const existing = await this.findByN8nId(workflow.n8nWorkflowId);

    if (existing) {
      await this.updateById(existing._id.toString(), {
        $set: {
          ...workflow,
          updatedAt: new Date(),
        },
      });

      return { ...existing, ...workflow, updatedAt: new Date() };
    } else {
      return this.create({
        ...workflow,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IWorkflow);
    }
  }
}

export class ExecutionRepository extends BaseRepository<IExecution> {
  protected collectionName = COLLECTIONS.EXECUTIONS;

  /**
   * n8n 실행 ID로 조회
   */
  async findByN8nExecutionId(n8nExecutionId: string): Promise<WithId<IExecution> | null> {
    return this.findOne({ n8nExecutionId });
  }

  /**
   * 워크플로우별 실행 기록 조회 (캐싱)
   */
  @Cacheable({
    ttl: 30, // 30초
    prefix: 'execution',
    keyGenerator: (workflowId: string, limit: number) => `workflow:${workflowId}:${limit}`,
  })
  async findByWorkflowId(workflowId: string, limit: number = 10): Promise<WithId<IExecution>[]> {
    return this.find(
      { workflowId },
      {
        sort: { startedAt: -1 },
        limit,
      }
    );
  }

  /**
   * 실행 기록 생성 (캐시 무효화)
   */
  @CacheEvict((_result: any, execution: IExecution) => [
    `execution:workflow:${execution.workflowId}:*`,
  ])
  async createExecution(execution: Omit<IExecution, 'createdAt'>): Promise<WithId<IExecution>> {
    return this.create({
      ...execution,
      createdAt: new Date(),
    } as IExecution);
  }

  /**
   * 실행 상태 업데이트 (캐시 무효화)
   */
  @CacheEvict((_result: any, _executionId: string) => [`execution:*`])
  async updateExecutionStatus(
    executionId: string,
    status: IExecution['status'],
    data?: { outputData?: any; error?: string }
  ): Promise<void> {
    await this.update(
      { n8nExecutionId: executionId },
      {
        $set: {
          status,
          finishedAt: new Date(),
          ...data,
        },
      }
    );
  }

  /**
   * 실행 통계
   */
  @Cacheable({
    ttl: 60, // 1분
    prefix: 'execution',
    keyGenerator: (workflowId?: string) => (workflowId ? `stats:${workflowId}` : 'stats:all'),
  })
  async getExecutionStats(workflowId?: string): Promise<{
    total: number;
    success: number;
    error: number;
    running: number;
  }> {
    const filter = workflowId ? { workflowId } : {};

    const pipeline = [
      { $match: filter },
      {
        $facet: {
          total: [{ $count: 'count' }],
          success: [{ $match: { status: 'success' } }, { $count: 'count' }],
          error: [{ $match: { status: 'error' } }, { $count: 'count' }],
          running: [{ $match: { status: 'running' } }, { $count: 'count' }],
        },
      },
    ];

    const result = await this.aggregate<any>(pipeline);

    return {
      total: result[0]?.total[0]?.count || 0,
      success: result[0]?.success[0]?.count || 0,
      error: result[0]?.error[0]?.count || 0,
      running: result[0]?.running[0]?.count || 0,
    };
  }
}

// Singleton 인스턴스
export const workflowRepository = new WorkflowRepository();
export const executionRepository = new ExecutionRepository();
