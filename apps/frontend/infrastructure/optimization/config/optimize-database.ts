#!/usr/bin/env ts-node

/**
 * Database Optimization Script
 *
 * Creates indexes, optimizes queries, and analyzes MongoDB collections
 * for n8n workflow and execution data.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/n8n';

interface IndexDefinition {
  collection: string;
  name: string;
  keys: Record<string, 1 | -1>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
    partialFilterExpression?: any;
  };
}

// Optimized indexes for n8n collections
const INDEXES: IndexDefinition[] = [
  // Workflow collection indexes
  {
    collection: 'workflows',
    name: 'idx_workflows_active',
    keys: { active: 1, updatedAt: -1 },
    options: { sparse: true }
  },
  {
    collection: 'workflows',
    name: 'idx_workflows_tags',
    keys: { tags: 1 },
    options: { sparse: true }
  },
  {
    collection: 'workflows',
    name: 'idx_workflows_name',
    keys: { name: 1 }
  },

  // Execution collection indexes - CRITICAL for performance
  {
    collection: 'executions',
    name: 'idx_executions_workflow_status',
    keys: { workflowId: 1, status: 1, startedAt: -1 }
  },
  {
    collection: 'executions',
    name: 'idx_executions_status_started',
    keys: { status: 1, startedAt: -1 }
  },
  {
    collection: 'executions',
    name: 'idx_executions_finished',
    keys: { finishedAt: -1 },
    options: { sparse: true }
  },
  {
    collection: 'executions',
    name: 'idx_executions_mode',
    keys: { mode: 1, startedAt: -1 }
  },
  {
    collection: 'executions',
    name: 'idx_executions_error',
    keys: { status: 1, 'data.resultData.error': 1 },
    options: {
      partialFilterExpression: { status: 'error' }
    }
  },

  // TTL index for automatic cleanup of old executions (30 days)
  {
    collection: 'executions',
    name: 'idx_executions_ttl',
    keys: { finishedAt: 1 },
    options: {
      expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
      partialFilterExpression: {
        status: { $in: ['success', 'error'] },
        mode: { $ne: 'manual' }
      }
    }
  },

  // Credentials collection indexes
  {
    collection: 'credentials',
    name: 'idx_credentials_type',
    keys: { type: 1 }
  },

  // Tags collection indexes
  {
    collection: 'tags',
    name: 'idx_tags_name',
    keys: { name: 1 },
    options: { unique: true }
  }
];

async function createIndexes(client: MongoClient): Promise<void> {
  console.log('\n📊 Creating optimized indexes...\n');

  const db = client.db();
  let created = 0;
  let skipped = 0;

  for (const indexDef of INDEXES) {
    try {
      const collection = db.collection(indexDef.collection);

      // Check if index already exists
      const existingIndexes = await collection.indexes();
      const exists = existingIndexes.some(idx => idx.name === indexDef.name);

      if (exists) {
        console.log(`  ⏭️  Skipped: ${indexDef.collection}.${indexDef.name} (already exists)`);
        skipped++;
        continue;
      }

      // Create index
      await collection.createIndex(indexDef.keys, {
        name: indexDef.name,
        ...indexDef.options
      });

      console.log(`  ✅ Created: ${indexDef.collection}.${indexDef.name}`);
      created++;
    } catch (error: any) {
      console.error(`  ❌ Failed: ${indexDef.collection}.${indexDef.name} - ${error.message}`);
    }
  }

  console.log(`\n📈 Summary: ${created} created, ${skipped} skipped\n`);
}

async function analyzeCollections(client: MongoClient): Promise<void> {
  console.log('\n🔍 Analyzing collections...\n');

  const db = client.db();
  const collections = ['workflows', 'executions', 'credentials', 'tags'];

  for (const collectionName of collections) {
    try {
      const collection = db.collection(collectionName);

      // Get collection stats
      const stats = await db.command({ collStats: collectionName });

      console.log(`  📦 ${collectionName}:`);
      console.log(`     - Documents: ${stats.count.toLocaleString()}`);
      console.log(`     - Size: ${formatBytes(stats.size)}`);
      console.log(`     - Avg Doc Size: ${formatBytes(stats.avgObjSize || 0)}`);
      console.log(`     - Indexes: ${stats.nindexes}`);
      console.log(`     - Total Index Size: ${formatBytes(stats.totalIndexSize)}`);
      console.log('');
    } catch (error: any) {
      console.error(`  ❌ Failed to analyze ${collectionName}: ${error.message}`);
    }
  }
}

async function optimizeQueries(client: MongoClient): Promise<void> {
  console.log('\n⚡ Running query optimization...\n');

  const db = client.db();

  try {
    // Analyze slow queries (if profiling is enabled)
    const profile = db.collection('system.profile');
    const slowQueries = await profile
      .find({ millis: { $gt: 100 } })
      .sort({ ts: -1 })
      .limit(10)
      .toArray();

    if (slowQueries.length > 0) {
      console.log('  ⚠️  Slow queries detected (>100ms):');
      slowQueries.forEach((query, index) => {
        console.log(`     ${index + 1}. ${query.op} on ${query.ns} - ${query.millis}ms`);
      });
      console.log('\n  💡 Consider adding indexes for these queries\n');
    } else {
      console.log('  ✅ No slow queries detected\n');
    }
  } catch (error: any) {
    console.log('  ℹ️  Query profiling not enabled (this is normal)\n');
  }

  // Check index usage
  const executions = db.collection('executions');
  const indexStats = await executions.aggregate([{ $indexStats: {} }]).toArray();

  console.log('  📊 Index usage statistics:');
  indexStats.forEach(stat => {
    const usageCount = stat.accesses?.ops || 0;
    console.log(`     - ${stat.name}: ${usageCount.toLocaleString()} accesses`);
  });
  console.log('');
}

async function cleanupOldData(client: MongoClient): Promise<void> {
  console.log('\n🧹 Cleaning up old execution data...\n');

  const db = client.db();
  const executions = db.collection('executions');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const result = await executions.deleteMany({
      finishedAt: { $lt: thirtyDaysAgo },
      status: { $in: ['success', 'error'] },
      mode: { $ne: 'manual' }
    });

    console.log(`  ✅ Deleted ${result.deletedCount.toLocaleString()} old executions\n`);
  } catch (error: any) {
    console.error(`  ❌ Cleanup failed: ${error.message}\n`);
  }
}

async function generateAggregationPipelines(client: MongoClient): Promise<void> {
  console.log('\n📝 Generating optimized aggregation pipelines...\n');

  const db = client.db();
  const executions = db.collection('executions');

  // Example: Workflow success rate
  const successRatePipeline = [
    {
      $match: {
        finishedAt: { $exists: true }
      }
    },
    {
      $group: {
        _id: '$workflowId',
        total: { $sum: 1 },
        success: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        error: {
          $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
        },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $project: {
        _id: 1,
        total: 1,
        success: 1,
        error: 1,
        successRate: {
          $multiply: [{ $divide: ['$success', '$total'] }, 100]
        },
        avgDuration: 1
      }
    },
    {
      $sort: { total: -1 }
    },
    {
      $limit: 10
    }
  ];

  try {
    const results = await executions.aggregate(successRatePipeline).toArray();

    console.log('  📊 Top 10 workflows by execution count:');
    results.forEach((result, index) => {
      console.log(
        `     ${index + 1}. Workflow ${result._id}: ${result.total} executions, ` +
        `${result.successRate.toFixed(1)}% success, ` +
        `avg ${result.avgDuration ? (result.avgDuration / 1000).toFixed(2) : 'N/A'}s`
      );
    });
    console.log('');
  } catch (error: any) {
    console.error(`  ❌ Aggregation failed: ${error.message}\n`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 n8n Database Optimization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const client = new MongoClient(MONGODB_URI);

  try {
    // Connect
    console.log('\n📡 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Run optimizations
    await createIndexes(client);
    await analyzeCollections(client);
    await optimizeQueries(client);
    await cleanupOldData(client);
    await generateAggregationPipelines(client);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Optimization completed successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    console.error('\n❌ Optimization failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as optimizeDatabase };
