/**
 * Error Pattern Schema Implementation
 *
 * @description 에러 패턴 및 자동 수정을 MongoDB에 저장하는 스키마
 */

import { Collection, CreateIndexesOptions, IndexSpecification } from 'mongodb';
import { ErrorPatternDocument, IndexDefinition, COLLECTIONS } from './types';

/**
 * Error Pattern Collection Indexes
 */
export const ERROR_PATTERN_INDEXES: IndexDefinition[] = [
  // 에러 타입으로 빠른 조회 (유니크)
  {
    keys: { errorType: 1 },
    options: {
      unique: true,
      name: 'idx_error_pattern_type',
    },
  },

  // 카테고리별 조회
  {
    keys: { category: 1, frequency: -1 },
    options: {
      name: 'idx_error_pattern_category',
    },
  },

  // 발생 빈도 역순 (가장 흔한 에러)
  {
    keys: { frequency: -1 },
    options: {
      name: 'idx_error_pattern_frequency',
    },
  },

  // 마지막 발생 시간 역순 (최근 에러)
  {
    keys: { lastOccurred: -1 },
    options: {
      sparse: true,
      name: 'idx_error_pattern_last_occurred',
    },
  },

  // 심각도별 조회
  {
    keys: { severity: 1, frequency: -1 },
    options: {
      name: 'idx_error_pattern_severity',
    },
  },

  // 자동 수정 활성화된 에러
  {
    keys: { autoFixEnabled: 1, frequency: -1 },
    options: {
      name: 'idx_error_pattern_autofix',
    },
  },

  // 태그로 검색
  {
    keys: { tags: 1 },
    options: {
      sparse: true,
      name: 'idx_error_pattern_tags',
    },
  },

  // 영향받는 워크플로우 조회
  {
    keys: { affectedWorkflows: 1 },
    options: {
      sparse: true,
      name: 'idx_error_pattern_workflows',
    },
  },

  // 복합 인덱스: 카테고리 + 심각도 + 빈도
  {
    keys: { category: 1, severity: 1, frequency: -1 },
    options: {
      name: 'idx_error_pattern_category_severity',
    },
  },

  // 텍스트 검색 인덱스 (설명 검색)
  {
    keys: { description: 'text', errorType: 'text' },
    options: {
      name: 'idx_error_pattern_text_search',
    },
  },
];

/**
 * Error Pattern Collection 초기화
 */
export async function initializeErrorPatternCollection(
  collection: Collection<ErrorPatternDocument>,
  db?: any
): Promise<void> {
  console.log('📋 Initializing Error Pattern collection...');

  // 인덱스 생성
  for (const indexDef of ERROR_PATTERN_INDEXES) {
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
    await setupErrorPatternValidation(db);
  }

  console.log('✅ Error Pattern collection initialized');
}

/**
 * Error Pattern Collection Validation Rules
 */
async function setupErrorPatternValidation(db: any): Promise<void> {
  try {
    await db.command({
      collMod: COLLECTIONS.ERROR_PATTERNS,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'errorType',
            'category',
            'pattern',
            'frequency',
            'solutions',
            'autoFixEnabled',
            'severity',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            errorType: {
              bsonType: 'string',
              description: 'Error type must be a string',
            },
            category: {
              enum: [
                'connection',
                'authentication',
                'execution',
                'resource',
                'configuration',
                'data',
                'network',
                'timeout',
              ],
              description: 'Category must be one of the enum values',
            },
            pattern: {
              bsonType: 'string',
              description: 'Regex pattern must be a string',
            },
            description: {
              bsonType: ['string', 'null'],
              description: 'Optional description',
            },
            frequency: {
              bsonType: 'number',
              minimum: 0,
              description: 'Frequency must be non-negative',
            },
            lastOccurred: {
              bsonType: ['date', 'null'],
              description: 'Optional last occurrence timestamp',
            },
            solutions: {
              bsonType: 'array',
              minItems: 1,
              description: 'At least one solution required',
              items: {
                bsonType: 'object',
                required: ['title', 'description', 'requiresApproval'],
                properties: {
                  title: { bsonType: 'string' },
                  description: { bsonType: 'string' },
                  action: { bsonType: ['string', 'null'] },
                  command: { bsonType: ['string', 'null'] },
                  requiresApproval: { bsonType: 'bool' },
                  successRate: {
                    bsonType: ['number', 'null'],
                    minimum: 0,
                    maximum: 1,
                  },
                  averageFixTime: {
                    bsonType: ['number', 'null'],
                    minimum: 0,
                  },
                },
              },
            },
            autoFixEnabled: {
              bsonType: 'bool',
              description: 'Auto-fix enabled flag',
            },
            severity: {
              enum: ['critical', 'high', 'medium', 'low'],
              description: 'Severity must be one of the enum values',
            },
            affectedWorkflows: {
              bsonType: ['array', 'null'],
              description: 'Optional affected workflows array',
              items: { bsonType: 'string' },
            },
            tags: {
              bsonType: ['array', 'null'],
              description: 'Optional tags array',
              items: { bsonType: 'string' },
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
 * Helper: Create new error pattern document
 */
export function createErrorPatternDocument(
  errorType: string,
  category: string,
  pattern: string,
  data: Partial<ErrorPatternDocument>
): ErrorPatternDocument {
  const now = new Date();

  return {
    errorType,
    category: category as any,
    pattern,
    description: data.description,
    frequency: data.frequency ?? 0,
    lastOccurred: data.lastOccurred,
    solutions: data.solutions ?? [],
    autoFixEnabled: data.autoFixEnabled ?? false,
    severity: data.severity ?? 'medium',
    affectedWorkflows: data.affectedWorkflows,
    tags: data.tags,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Helper: Increment error occurrence
 */
export function incrementErrorOccurrence(
  errorPattern: Partial<ErrorPatternDocument>,
  workflowId?: string
): Partial<ErrorPatternDocument> {
  const affectedWorkflows = errorPattern.affectedWorkflows
    ? [...new Set([...errorPattern.affectedWorkflows, ...(workflowId ? [workflowId] : [])])]
    : workflowId
      ? [workflowId]
      : [];

  return {
    ...errorPattern,
    frequency: (errorPattern.frequency ?? 0) + 1,
    lastOccurred: new Date(),
    affectedWorkflows,
    updatedAt: new Date(),
  };
}

/**
 * Helper: Find matching error pattern
 */
export async function findMatchingErrorPattern(
  collection: Collection<ErrorPatternDocument>,
  errorMessage: string
): Promise<ErrorPatternDocument | null> {
  // 모든 에러 패턴 조회
  const patterns = await collection.find().toArray();

  // 정규식 매칭
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(errorMessage)) {
        return pattern;
      }
    } catch (error) {
      console.warn(`Invalid regex pattern for ${pattern.errorType}:`, error);
    }
  }

  return null;
}

/**
 * Helper: Get top frequent errors
 */
export async function getTopFrequentErrors(
  collection: Collection<ErrorPatternDocument>,
  limit: number = 10,
  category?: string
): Promise<ErrorPatternDocument[]> {
  const filter: any = {};
  if (category) {
    filter.category = category;
  }

  return collection.find(filter).sort({ frequency: -1 }).limit(limit).toArray();
}

/**
 * Helper: Get critical errors requiring attention
 */
export async function getCriticalErrors(
  collection: Collection<ErrorPatternDocument>
): Promise<ErrorPatternDocument[]> {
  return collection
    .find({
      $or: [{ severity: 'critical' }, { severity: 'high', frequency: { $gte: 10 } }],
    })
    .sort({ frequency: -1 })
    .toArray();
}

/**
 * Helper: Calculate error statistics by category
 */
export interface ErrorCategoryStats {
  category: string;
  totalErrors: number;
  totalOccurrences: number;
  autoFixEnabled: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export async function getErrorStatsByCategory(
  collection: Collection<ErrorPatternDocument>
): Promise<ErrorCategoryStats[]> {
  return collection
    .aggregate([
      {
        $group: {
          _id: '$category',
          totalErrors: { $sum: 1 },
          totalOccurrences: { $sum: '$frequency' },
          autoFixEnabled: {
            $sum: { $cond: ['$autoFixEnabled', 1, 0] },
          },
          criticalCount: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] },
          },
          highCount: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] },
          },
          mediumCount: {
            $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] },
          },
          lowCount: {
            $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalErrors: 1,
          totalOccurrences: 1,
          autoFixEnabled: 1,
          criticalCount: 1,
          highCount: 1,
          mediumCount: 1,
          lowCount: 1,
        },
      },
      { $sort: { totalOccurrences: -1 } },
    ])
    .toArray() as Promise<ErrorCategoryStats[]>;
}
