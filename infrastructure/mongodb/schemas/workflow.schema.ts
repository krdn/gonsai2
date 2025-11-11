/**
 * Workflow Schema Implementation
 *
 * @description n8n 워크플로우 정보를 MongoDB에 저장하는 스키마
 */

import { Collection, CreateIndexesOptions, IndexSpecification } from 'mongodb';
import { WorkflowDocument, IndexDefinition, COLLECTIONS } from './types';

/**
 * Workflow Collection Indexes
 */
export const WORKFLOW_INDEXES: IndexDefinition[] = [
  // n8n 워크플로우 ID로 빠른 조회 (유니크)
  {
    keys: { n8nWorkflowId: 1 },
    options: {
      unique: true,
      name: 'idx_n8n_workflow_id',
    },
  },

  // 이름으로 검색
  {
    keys: { name: 1 },
    options: {
      name: 'idx_workflow_name',
    },
  },

  // 활성화 상태 필터링
  {
    keys: { active: 1 },
    options: {
      name: 'idx_workflow_active',
    },
  },

  // 마지막 동기화 시간 (오래된 워크플로우 찾기)
  {
    keys: { lastSyncedAt: -1 },
    options: {
      name: 'idx_workflow_last_synced',
    },
  },

  // 생성 시간 역순 (최신 워크플로우)
  {
    keys: { createdAt: -1 },
    options: {
      name: 'idx_workflow_created',
    },
  },

  // 태그로 검색 (배열 인덱스)
  {
    keys: { tags: 1 },
    options: {
      sparse: true,
      name: 'idx_workflow_tags',
    },
  },

  // 복합 인덱스: 활성화 상태 + 마지막 동기화
  {
    keys: { active: 1, lastSyncedAt: -1 },
    options: {
      name: 'idx_workflow_active_synced',
    },
  },
];

/**
 * Workflow Collection 초기화
 */
export async function initializeWorkflowCollection(
  collection: Collection<WorkflowDocument>,
  db?: any
): Promise<void> {
  console.log('📋 Initializing Workflow collection...');

  // 인덱스 생성
  for (const indexDef of WORKFLOW_INDEXES) {
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
    await setupWorkflowValidation(db);
  }

  console.log('✅ Workflow collection initialized');
}

/**
 * Workflow Collection Validation Rules
 */
async function setupWorkflowValidation(db: any): Promise<void> {
  try {
    await db.command({
      collMod: COLLECTIONS.WORKFLOWS,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['n8nWorkflowId', 'name', 'active', 'lastSyncedAt', 'createdAt', 'updatedAt'],
          properties: {
            n8nWorkflowId: {
              bsonType: 'string',
              description: 'n8n workflow ID must be a string',
            },
            name: {
              bsonType: 'string',
              minLength: 1,
              description: 'Workflow name must be a non-empty string',
            },
            description: {
              bsonType: ['string', 'null'],
              description: 'Optional workflow description',
            },
            active: {
              bsonType: 'bool',
              description: 'Active status must be boolean',
            },
            nodes: {
              bsonType: 'array',
              description: 'Workflow nodes array',
              items: {
                bsonType: 'object',
                required: ['id', 'name', 'type', 'typeVersion', 'position'],
                properties: {
                  id: { bsonType: 'string' },
                  name: { bsonType: 'string' },
                  type: { bsonType: 'string' },
                  typeVersion: { bsonType: 'number' },
                  position: {
                    bsonType: 'array',
                    minItems: 2,
                    maxItems: 2,
                    items: { bsonType: 'number' },
                  },
                },
              },
            },
            settings: {
              bsonType: 'object',
              description: 'Workflow settings',
            },
            tags: {
              bsonType: ['array', 'null'],
              description: 'Optional tags array',
              items: { bsonType: 'string' },
            },
            lastSyncedAt: {
              bsonType: 'date',
              description: 'Last sync timestamp',
            },
            createdAt: {
              bsonType: 'date',
              description: 'Creation timestamp',
            },
            updatedAt: {
              bsonType: 'date',
              description: 'Last update timestamp',
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
 * Helper: Create new workflow document
 */
export function createWorkflowDocument(
  n8nWorkflowId: string,
  name: string,
  data: Partial<WorkflowDocument>
): WorkflowDocument {
  const now = new Date();

  return {
    n8nWorkflowId,
    name,
    description: data.description,
    active: data.active ?? false,
    nodes: data.nodes ?? [],
    settings: data.settings ?? {},
    tags: data.tags,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Helper: Update workflow sync time
 */
export function updateWorkflowSyncTime(
  workflow: Partial<WorkflowDocument>
): Partial<WorkflowDocument> {
  return {
    ...workflow,
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };
}
