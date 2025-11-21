#!/usr/bin/env ts-node

/**
 * Cache Statistics Reporter
 *
 * Display comprehensive cache statistics for all cache layers.
 */

import RedisClient from '../infrastructure/optimization/cache/redis-client';
import WorkflowCache from '../infrastructure/optimization/cache/workflow-cache';
import ExecutionCache from '../infrastructure/optimization/cache/execution-cache';
import ApiCache from '../infrastructure/optimization/cache/api-cache';
import SessionStore from '../infrastructure/optimization/cache/session-store';

async function displayCacheStats() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Cache Statistics Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Redis connection status
    const isConnected = await RedisClient.ping();
    console.log(`🔌 Redis Connection: ${isConnected ? '✅ Connected' : '❌ Disconnected'}\n`);

    if (!isConnected) {
      console.error('❌ Cannot retrieve cache statistics - Redis not connected\n');
      process.exit(1);
    }

    // Workflow Cache
    console.log('📦 Workflow Cache:');
    const workflowStats = await WorkflowCache.getStats();
    const workflowHitRate = await WorkflowCache.getHitRate();

    console.log(`  Hits:       ${workflowStats.hits.toLocaleString()}`);
    console.log(`  Misses:     ${workflowStats.misses.toLocaleString()}`);
    console.log(`  Sets:       ${workflowStats.sets.toLocaleString()}`);
    console.log(`  Deletes:    ${workflowStats.deletes.toLocaleString()}`);
    console.log(`  Hit Rate:   ${workflowHitRate.toFixed(2)}%\n`);

    // Execution Cache
    console.log('⚡ Execution Cache:');
    const executionStats = await ExecutionCache.getStats();
    const executionHitRate = await ExecutionCache.getHitRate();

    console.log(`  Hits:       ${executionStats.hits.toLocaleString()}`);
    console.log(`  Misses:     ${executionStats.misses.toLocaleString()}`);
    console.log(`  Sets:       ${executionStats.sets.toLocaleString()}`);
    console.log(`  Deletes:    ${executionStats.deletes.toLocaleString()}`);
    console.log(`  Hit Rate:   ${executionHitRate.toFixed(2)}%\n`);

    // API Cache
    console.log('🌐 API Cache:');
    const apiStats = await ApiCache.getStats();
    const apiHitRate = await ApiCache.getHitRate();

    console.log(`  Hits:       ${apiStats.hits.toLocaleString()}`);
    console.log(`  Misses:     ${apiStats.misses.toLocaleString()}`);
    console.log(`  Sets:       ${apiStats.sets.toLocaleString()}`);
    console.log(`  Deletes:    ${apiStats.deletes.toLocaleString()}`);
    console.log(`  Hit Rate:   ${apiHitRate.toFixed(2)}%\n`);

    // Session Store
    console.log('🔐 Session Store:');
    const sessionStats = await SessionStore.getStats();
    const activeSessionCount = await SessionStore.getActiveCount();

    console.log(`  Created:    ${sessionStats.created.toLocaleString()}`);
    console.log(`  Hits:       ${sessionStats.hits.toLocaleString()}`);
    console.log(`  Misses:     ${sessionStats.misses.toLocaleString()}`);
    console.log(`  Updated:    ${sessionStats.updated.toLocaleString()}`);
    console.log(`  Destroyed:  ${sessionStats.destroyed.toLocaleString()}`);
    console.log(`  Expired:    ${sessionStats.expired.toLocaleString()}`);
    console.log(`  Active:     ${activeSessionCount.toLocaleString()}\n`);

    // Overall Summary
    const totalHits = workflowStats.hits + executionStats.hits + apiStats.hits + sessionStats.hits;
    const totalMisses =
      workflowStats.misses + executionStats.misses + apiStats.misses + sessionStats.misses;
    const overallHitRate =
      totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Overall Summary:');
    console.log(`  Total Hits:     ${totalHits.toLocaleString()}`);
    console.log(`  Total Misses:   ${totalMisses.toLocaleString()}`);
    console.log(`  Hit Rate:       ${overallHitRate.toFixed(2)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Recommendations
    if (overallHitRate < 70) {
      console.log('⚠️  Recommendations:');
      console.log('  - Cache hit rate is below 70%, consider increasing TTL values');
      console.log('  - Check if cache invalidation is too aggressive');
      console.log('  - Review caching strategy for frequently accessed data\n');
    } else if (overallHitRate >= 90) {
      console.log('✅ Excellent cache performance! Hit rate above 90%\n');
    }
  } catch (error: any) {
    console.error('❌ Error retrieving cache statistics:', error.message);
    process.exit(1);
  } finally {
    await RedisClient.disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  displayCacheStats();
}

export { displayCacheStats };
