/**
 * Execution Schema Implementation
 *
 * @description 워크플로우 실행 기록을 MongoDB에 저장하는 스키마
 */

import { Collection, CreateIndexesOptions, IndexSpecification } from 'mongodb';
import { ExecutionDocument, IndexDefinition, COLLECTIONS } from './types';

/**
 * Execution Collection Indexes
 */
export const EXECUTION_INDEXES: IndexDefinition[] = [
  // n8n 실행 ID로 빠른 조회 (유니크)
  {
    keys: { n8nExecutionId: 1 },
    options: {
      unique: true,
      name: 'idx_n8n_execution_id',
    },
  },

  // 워크플로우별 실행 조회
  {
    keys: { workflowId: 1, startedAt: -1 },
    options: {
      name: 'idx_execution_workflow',
    },
  },

  // n8n 워크플로우 ID로 조회 (빠른 필터링)
  {
    keys: { n8nWorkflowId: 1, startedAt: -1 },
    options: {
      name: 'idx_execution_n8n_workflow',
    },
  },

  // 상태별 실행 조회
  {
    keys: { status: 1, startedAt: -1 },
    options: {
      name: 'idx_execution_status',
    },
  },

  // 실행 모드별 조회
  {
    keys: { mode: 1, startedAt: -1 },
    options: {
      name: 'idx_execution_mode',
    },
  },

  // 시작 시간 역순 (최근 실행)
  {
    keys: { startedAt: -1 },
    options: {
      name: 'idx_execution_started',
    },
  },

  // 종료 시간 역순 (완료된 실행)
  {
    keys: { finishedAt: -1 },
    options: {
      sparse: true,
      name: 'idx_execution_finished',
    },
  },

  // 실행 시간 분석 (긴 실행 찾기)
  {
    keys: { executionTime: -1 },
    options: {
      sparse: true,
      name: 'idx_execution_time',
    },
  },

  // 재시도 체인 추적
  {
    keys: { retryOf: 1 },
    options: {
      sparse: true,
      name: 'idx_execution_retry',
    },
  },

  // 복합 인덱스: 워크플로우 + 상태 + 시작 시간
  {
    keys: { workflowId: 1, status: 1, startedAt: -1 },
    options: {
      name: 'idx_execution_workflow_status',
    },
  },

  // TTL 인덱스: 30일 후 자동 삭제 (성공한 실행만)
  {
    keys: { createdAt: 1 },
    options: {
      expireAfterSeconds: 30 * 24 * 60 * 60, // 30일
      partialFilterExpression: { status: 'success' },
      name: 'idx_execution_ttl',
    },
  },
];

/**
 * Execution Collection 초기화
 */
export async function initializeExecutionCollection(
  collection: Collection<ExecutionDocument>,
  db?: any
): Promise<void> {
  console.log('📋 Initializing Execution collection...');

  // 인덱스 생성
  for (const indexDef of EXECUTION_INDEXES) {
    try {
      const indexSpec: IndexSpecification = indexDef.keys;
      const options: CreateIndexesOptions = indexDef.options || {};

      await collection.createIndex(indexSpec, options);
      console.log(`  ✅ Created index: ${options.name || JSON.stringify(indexSpec)}`);
    } catch (error) {
      console.error(`  ❌ Failed to create index:`, error);
      throw error;
    }
  }

  // 컬렉션 검증 규칙 설정
  if (db) {
    await setupExecutionValidation(db);
  }

  console.log('✅ Execution collection initialized');
}

/**
 * Execution Collection Validation Rules
 */
async function setupExecutionValidation(db: any): Promise<void> {
  try {
    await db.command({
      collMod: COLLECTIONS.EXECUTIONS,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'n8nExecutionId',
            'workflowId',
            'n8nWorkflowId',
            'status',
            'mode',
            'startedAt',
            'createdAt',
          ],
          properties: {
            n8nExecutionId: {
              bsonType: 'string',
              description: 'n8n execution ID must be a string',
            },
            workflowId: {
              bsonType: 'string',
              description: 'Workflow MongoDB ID must be a string',
            },
            n8nWorkflowId: {
              bsonType: 'string',
              description: 'n8n workflow ID must be a string',
            },
            status: {
              enum: ['pending', 'running', 'success', 'failed', 'waiting', 'canceled'],
              description: 'Status must be one of the enum values',
            },
            mode: {
              enum: ['manual', 'trigger', 'webhook', 'retry', 'cli'],
              description: 'Mode must be one of the enum values',
            },
            startedAt: {
              bsonType: 'date',
              description: 'Start time must be a date',
            },
            finishedAt: {
              bsonType: ['date', 'null'],
              description: 'Optional finish time',
            },
            executionTime: {
              bsonType: ['number', 'null'],
              minimum: 0,
              description: 'Execution time in milliseconds',
            },
            retryCount: {
              bsonType: ['number', 'null'],
              minimum: 0,
              description: 'Retry count must be non-negative',
            },
            retryOf: {
              bsonType: ['string', 'null'],
              description: 'Optional retry of execution ID',
            },
            createdAt: {
              bsonType: 'date',
              description: 'Creation timestamp',
            },
          },
        },
      },
      validationLevel: 'moderate',
      validationAction: 'error',
    });

    console.log('  ✅ Validation rules applied');
  } catch (error) {
    console.warn('  ⚠️  Validation rules not applied (may not be supported):', error);
  }
}

/**
 * Helper: Create new execution document
 */
export function createExecutionDocument(
  n8nExecutionId: string,
  workflowId: string,
  n8nWorkflowId: string,
  data: Partial<ExecutionDocument>
): ExecutionDocument {
  const now = new Date();

  return {
    n8nExecutionId,
    workflowId,
    n8nWorkflowId,
    status: data.status ?? 'pending',
    mode: data.mode ?? 'manual',
    startedAt: data.startedAt ?? now,
    finishedAt: data.finishedAt,
    executionTime: data.executionTime,
    inputData: data.inputData,
    outputData: data.outputData,
    nodeExecutions: data.nodeExecutions,
    errorDetails: data.errorDetails,
    retryCount: data.retryCount ?? 0,
    retryOf: data.retryOf,
    createdAt: now,
  };
}

/**
 * Helper: Update execution on completion
 */
export function completeExecution(
  execution: Partial<ExecutionDocument>,
  status: 'success' | 'failed' | 'canceled',
  finishedAt?: Date
): Partial<ExecutionDocument> {
  const finished = finishedAt ?? new Date();
  const started = execution.startedAt ?? new Date();
  const executionTime = finished.getTime() - started.getTime();

  return {
    ...execution,
    status,
    finishedAt: finished,
    executionTime,
  };
}

/**
 * Helper: Calculate execution statistics
 */
export interface ExecutionStats {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  averageExecutionTime: number;
  successRate: number;
}

export async function calculateExecutionStats(
  collection: Collection<ExecutionDocument>,
  workflowId: string,
  since?: Date
): Promise<ExecutionStats> {
  const matchStage: any = { workflowId };
  if (since) {
    matchStage.startedAt = { $gte: since };
  }

  const stats = await collection
    .aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          averageExecutionTime: { $avg: '$executionTime' },
        },
      },
    ])
    .toArray();

  if (stats.length === 0) {
    return {
      totalExecutions: 0,
      successCount: 0,
      failedCount: 0,
      averageExecutionTime: 0,
      successRate: 0,
    };
  }

  const result = stats[0];
  return {
    totalExecutions: result.totalExecutions,
    successCount: result.successCount,
    failedCount: result.failedCount,
    averageExecutionTime: Math.round(result.averageExecutionTime || 0),
    successRate: result.totalExecutions > 0 ? result.successCount / result.totalExecutions : 0,
  };
}
