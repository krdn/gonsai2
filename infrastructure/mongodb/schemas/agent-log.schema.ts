/**
 * Agent Log Schema Implementation
 *
 * @description AI 에이전트 실행 로그를 MongoDB에 저장하는 스키마
 */

import { Collection, CreateIndexesOptions, IndexSpecification } from 'mongodb';
import { AgentLogDocument, IndexDefinition, COLLECTIONS } from './types';

/**
 * Agent Log Collection Indexes
 */
export const AGENT_LOG_INDEXES: IndexDefinition[] = [
  // 에이전트 타입별 조회
  {
    keys: { agentType: 1, timestamp: -1 },
    options: {
      name: 'idx_agent_log_type',
    },
  },

  // 실행 ID로 조회 (특정 실행의 모든 로그)
  {
    keys: { executionId: 1, timestamp: 1 },
    options: {
      name: 'idx_agent_log_execution',
    },
  },

  // n8n 실행 ID로 조회
  {
    keys: { n8nExecutionId: 1, timestamp: 1 },
    options: {
      sparse: true,
      name: 'idx_agent_log_n8n_execution',
    },
  },

  // 타임스탬프 역순 (최근 로그)
  {
    keys: { timestamp: -1 },
    options: {
      name: 'idx_agent_log_timestamp',
    },
  },

  // 결과별 조회 (실패한 에이전트 찾기)
  {
    keys: { result: 1, timestamp: -1 },
    options: {
      name: 'idx_agent_log_result',
    },
  },

  // 모델별 조회 (비용 분석)
  {
    keys: { model: 1, timestamp: -1 },
    options: {
      sparse: true,
      name: 'idx_agent_log_model',
    },
  },

  // 토큰 사용량 분석
  {
    keys: { totalTokens: -1 },
    options: {
      sparse: true,
      name: 'idx_agent_log_tokens',
    },
  },

  // 비용 분석
  {
    keys: { cost: -1 },
    options: {
      sparse: true,
      name: 'idx_agent_log_cost',
    },
  },

  // 실행 시간 분석
  {
    keys: { duration: -1 },
    options: {
      sparse: true,
      name: 'idx_agent_log_duration',
    },
  },

  // 복합 인덱스: 에이전트 타입 + 결과 + 타임스탬프
  {
    keys: { agentType: 1, result: 1, timestamp: -1 },
    options: {
      name: 'idx_agent_log_type_result',
    },
  },

  // TTL 인덱스: 90일 후 자동 삭제
  {
    keys: { createdAt: 1 },
    options: {
      expireAfterSeconds: 90 * 24 * 60 * 60, // 90일
      name: 'idx_agent_log_ttl',
    },
  },
];

/**
 * Agent Log Collection 초기화
 */
export async function initializeAgentLogCollection(
  collection: Collection<AgentLogDocument>,
  db?: any
): Promise<void> {
  console.log('📋 Initializing Agent Log collection...');

  // 인덱스 생성
  for (const indexDef of AGENT_LOG_INDEXES) {
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
    await setupAgentLogValidation(db);
  }

  console.log('✅ Agent Log collection initialized');
}

/**
 * Agent Log Collection Validation Rules
 */
async function setupAgentLogValidation(db: any): Promise<void> {
  try {
    await db.command({
      collMod: COLLECTIONS.AGENT_LOGS,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['agentType', 'executionId', 'timestamp', 'action', 'result', 'createdAt'],
          properties: {
            agentType: {
              bsonType: 'string',
              description: 'Agent type must be a string',
            },
            executionId: {
              bsonType: 'string',
              description: 'Execution ID must be a string',
            },
            n8nExecutionId: {
              bsonType: ['string', 'null'],
              description: 'Optional n8n execution ID',
            },
            timestamp: {
              bsonType: 'date',
              description: 'Log timestamp must be a date',
            },
            action: {
              bsonType: 'string',
              description: 'Action must be a string',
            },
            result: {
              enum: ['success', 'failed', 'partial', 'timeout', 'canceled'],
              description: 'Result must be one of the enum values',
            },
            inputTokens: {
              bsonType: ['number', 'null'],
              minimum: 0,
              description: 'Input tokens must be non-negative',
            },
            outputTokens: {
              bsonType: ['number', 'null'],
              minimum: 0,
              description: 'Output tokens must be non-negative',
            },
            totalTokens: {
              bsonType: ['number', 'null'],
              minimum: 0,
              description: 'Total tokens must be non-negative',
            },
            cost: {
              bsonType: ['number', 'null'],
              minimum: 0,
              description: 'Cost must be non-negative',
            },
            model: {
              bsonType: ['string', 'null'],
              description: 'Optional AI model name',
            },
            duration: {
              bsonType: ['number', 'null'],
              minimum: 0,
              description: 'Duration in milliseconds',
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
 * Helper: Create new agent log document
 */
export function createAgentLogDocument(
  agentType: string,
  executionId: string,
  action: string,
  data: Partial<AgentLogDocument>
): AgentLogDocument {
  const now = new Date();

  return {
    agentType,
    executionId,
    n8nExecutionId: data.n8nExecutionId,
    timestamp: data.timestamp ?? now,
    action,
    result: data.result ?? 'success',
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    totalTokens: data.totalTokens ?? (data.inputTokens ?? 0) + (data.outputTokens ?? 0),
    cost: data.cost,
    model: data.model,
    duration: data.duration,
    metadata: data.metadata,
    createdAt: now,
  };
}

/**
 * Helper: Calculate token usage statistics
 */
export interface TokenUsageStats {
  totalLogs: number;
  totalTokens: number;
  totalCost: number;
  averageTokensPerLog: number;
  averageCostPerLog: number;
  byModel: Record<
    string,
    {
      count: number;
      tokens: number;
      cost: number;
    }
  >;
}

export async function calculateTokenUsageStats(
  collection: Collection<AgentLogDocument>,
  since?: Date
): Promise<TokenUsageStats> {
  const matchStage: any = {};
  if (since) {
    matchStage.timestamp = { $gte: since };
  }

  const stats = await collection
    .aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
          totalCost: { $sum: { $ifNull: ['$cost', 0] } },
        },
      },
    ])
    .toArray();

  const modelStats = await collection
    .aggregate([
      { $match: { ...matchStage, model: { $ne: null } } },
      {
        $group: {
          _id: '$model',
          count: { $sum: 1 },
          tokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
          cost: { $sum: { $ifNull: ['$cost', 0] } },
        },
      },
    ])
    .toArray();

  if (stats.length === 0) {
    return {
      totalLogs: 0,
      totalTokens: 0,
      totalCost: 0,
      averageTokensPerLog: 0,
      averageCostPerLog: 0,
      byModel: {},
    };
  }

  const result = stats[0];
  const byModel: Record<string, { count: number; tokens: number; cost: number }> = {};

  for (const modelStat of modelStats) {
    byModel[modelStat._id] = {
      count: modelStat.count,
      tokens: modelStat.tokens,
      cost: modelStat.cost,
    };
  }

  return {
    totalLogs: result.totalLogs,
    totalTokens: result.totalTokens,
    totalCost: result.totalCost,
    averageTokensPerLog: result.totalLogs > 0 ? result.totalTokens / result.totalLogs : 0,
    averageCostPerLog: result.totalLogs > 0 ? result.totalCost / result.totalLogs : 0,
    byModel,
  };
}

/**
 * Helper: Get agent performance metrics
 */
export interface AgentPerformanceMetrics {
  agentType: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  averageDuration: number;
  averageTokens: number;
  totalCost: number;
}

export async function getAgentPerformanceMetrics(
  collection: Collection<AgentLogDocument>,
  agentType: string,
  since?: Date
): Promise<AgentPerformanceMetrics> {
  const matchStage: any = { agentType };
  if (since) {
    matchStage.timestamp = { $gte: since };
  }

  const metrics = await collection
    .aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] },
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$result', 'failed'] }, 1, 0] },
          },
          averageDuration: { $avg: '$duration' },
          averageTokens: { $avg: '$totalTokens' },
          totalCost: { $sum: { $ifNull: ['$cost', 0] } },
        },
      },
    ])
    .toArray();

  if (metrics.length === 0) {
    return {
      agentType,
      totalExecutions: 0,
      successCount: 0,
      failedCount: 0,
      successRate: 0,
      averageDuration: 0,
      averageTokens: 0,
      totalCost: 0,
    };
  }

  const result = metrics[0];
  return {
    agentType,
    totalExecutions: result.totalExecutions,
    successCount: result.successCount,
    failedCount: result.failedCount,
    successRate: result.totalExecutions > 0 ? result.successCount / result.totalExecutions : 0,
    averageDuration: Math.round(result.averageDuration || 0),
    averageTokens: Math.round(result.averageTokens || 0),
    totalCost: result.totalCost,
  };
}
