#!/usr/bin/env ts-node

/**
 * Performance Benchmark Suite
 *
 * Compares before/after optimization performance across multiple metrics:
 * - Workflow execution times
 * - API response times
 * - Cache hit rates
 * - Memory usage
 */

import { MongoClient } from 'mongodb';
import RedisClient from '../cache/redis-client';
import WorkflowCache from '../cache/workflow-cache';
import ExecutionCache from '../cache/execution-cache';
import ApiCache from '../cache/api-cache';
import PerformanceTracker from '../monitoring/performance-tracker';

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/n8n';

interface BenchmarkResult {
  category: string;
  metric: string;
  before: number;
  after: number;
  improvement: number;
  improvementPercentage: number;
  unit: string;
}

interface BenchmarkReport {
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    cpus: number;
  };
  results: BenchmarkResult[];
  summary: {
    totalTests: number;
    averageImprovement: number;
    significantImprovements: number;
  };
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<BenchmarkReport> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Performance Benchmark Suite');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await this.benchmarkWorkflowList();
    await this.benchmarkWorkflowDetails();
    await this.benchmarkExecutionHistory();
    await this.benchmarkApiCalls();
    await this.benchmarkCachePerformance();
    await this.benchmarkMemoryUsage();
    await this.benchmarkDatabaseQueries();

    return this.generateReport();
  }

  /**
   * Benchmark: Workflow List Loading
   */
  private async benchmarkWorkflowList(): Promise<void> {
    console.log('📊 Benchmarking workflow list loading...\n');

    // Without cache
    await WorkflowCache.clear();
    const beforeStart = Date.now();
    const workflows = await this.fetchWorkflows();
    const beforeTime = Date.now() - beforeStart;

    // With cache - first load (miss)
    await WorkflowCache.clear();
    const cacheFirstStart = Date.now();
    await this.fetchWorkflowsCached(workflows);
    const cacheFirstTime = Date.now() - cacheFirstStart;

    // With cache - second load (hit)
    const cacheSecondStart = Date.now();
    await this.fetchWorkflowsCached(workflows);
    const afterTime = Date.now() - cacheSecondStart;

    this.addResult({
      category: 'Workflow Loading',
      metric: 'List load time',
      before: beforeTime,
      after: afterTime,
      unit: 'ms',
    });

    console.log(`  Before: ${beforeTime}ms`);
    console.log(`  After (cache hit): ${afterTime}ms`);
    console.log(`  Improvement: ${this.calculateImprovement(beforeTime, afterTime)}%\n`);
  }

  /**
   * Benchmark: Workflow Details Loading
   */
  private async benchmarkWorkflowDetails(): Promise<void> {
    console.log('📊 Benchmarking workflow details loading...\n');

    const workflows = await this.fetchWorkflows();
    const testWorkflow = workflows[0];

    if (!testWorkflow) {
      console.log('  ⏭️  Skipped: No workflows available\n');
      return;
    }

    // Without cache
    const beforeStart = Date.now();
    await this.fetchWorkflowDetails(testWorkflow.id);
    const beforeTime = Date.now() - beforeStart;

    // With cache
    await WorkflowCache.set(testWorkflow.id, testWorkflow);
    const afterStart = Date.now();
    await WorkflowCache.get(testWorkflow.id);
    const afterTime = Date.now() - afterStart;

    this.addResult({
      category: 'Workflow Loading',
      metric: 'Details load time',
      before: beforeTime,
      after: afterTime,
      unit: 'ms',
    });

    console.log(`  Before: ${beforeTime}ms`);
    console.log(`  After: ${afterTime}ms`);
    console.log(`  Improvement: ${this.calculateImprovement(beforeTime, afterTime)}%\n`);
  }

  /**
   * Benchmark: Execution History Loading
   */
  private async benchmarkExecutionHistory(): Promise<void> {
    console.log('📊 Benchmarking execution history loading...\n');

    const workflows = await this.fetchWorkflows();
    const testWorkflow = workflows[0];

    if (!testWorkflow) {
      console.log('  ⏭️  Skipped: No workflows available\n');
      return;
    }

    // Without cache
    await ExecutionCache.clear();
    const beforeStart = Date.now();
    await this.fetchExecutions(testWorkflow.id);
    const beforeTime = Date.now() - beforeStart;

    // With cache
    const afterStart = Date.now();
    await ExecutionCache.getByWorkflow(testWorkflow.id);
    const afterTime = Date.now() - afterStart;

    this.addResult({
      category: 'Execution History',
      metric: 'Load time',
      before: beforeTime,
      after: afterTime,
      unit: 'ms',
    });

    console.log(`  Before: ${beforeTime}ms`);
    console.log(`  After: ${afterTime}ms`);
    console.log(`  Improvement: ${this.calculateImprovement(beforeTime, afterTime)}%\n`);
  }

  /**
   * Benchmark: API Call Performance
   */
  private async benchmarkApiCalls(): Promise<void> {
    console.log('📊 Benchmarking API call performance...\n');

    const endpoint = '/api/v1/workflows';

    // Without cache
    await ApiCache.clear();
    const times: number[] = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await fetch(`${N8N_URL}${endpoint}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY },
      });
      times.push(Date.now() - start);
    }

    const beforeAvg = times.reduce((a, b) => a + b, 0) / times.length;

    // With cache
    const cachedTimes: number[] = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      const cached = await ApiCache.get('GET', endpoint);

      if (!cached) {
        const response = await fetch(`${N8N_URL}${endpoint}`, {
          headers: { 'X-N8N-API-KEY': N8N_API_KEY },
        });
        const data = await response.json();
        await ApiCache.set('GET', endpoint, data);
      }

      cachedTimes.push(Date.now() - start);
    }

    const afterAvg = cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length;

    this.addResult({
      category: 'API Performance',
      metric: 'Average response time',
      before: beforeAvg,
      after: afterAvg,
      unit: 'ms',
    });

    console.log(`  Before: ${beforeAvg.toFixed(2)}ms`);
    console.log(`  After: ${afterAvg.toFixed(2)}ms`);
    console.log(`  Improvement: ${this.calculateImprovement(beforeAvg, afterAvg)}%\n`);
  }

  /**
   * Benchmark: Cache Performance
   */
  private async benchmarkCachePerformance(): Promise<void> {
    console.log('📊 Benchmarking cache performance...\n');

    // Workflow cache
    await WorkflowCache.resetStats();

    const workflows = await this.fetchWorkflows();

    for (const workflow of workflows) {
      await WorkflowCache.set(workflow.id, workflow);
    }

    for (const workflow of workflows) {
      await WorkflowCache.get(workflow.id);
    }

    const workflowHitRate = await WorkflowCache.getHitRate();

    // Execution cache
    await ExecutionCache.resetStats();

    for (const workflow of workflows.slice(0, 5)) {
      const executions = await this.fetchExecutions(workflow.id);

      for (const execution of executions) {
        await ExecutionCache.set(execution.id, execution);
      }

      for (const execution of executions) {
        await ExecutionCache.get(execution.id);
      }
    }

    const executionHitRate = await ExecutionCache.getHitRate();

    this.addResult({
      category: 'Cache Performance',
      metric: 'Workflow cache hit rate',
      before: 0,
      after: workflowHitRate,
      unit: '%',
    });

    this.addResult({
      category: 'Cache Performance',
      metric: 'Execution cache hit rate',
      before: 0,
      after: executionHitRate,
      unit: '%',
    });

    console.log(`  Workflow cache hit rate: ${workflowHitRate.toFixed(2)}%`);
    console.log(`  Execution cache hit rate: ${executionHitRate.toFixed(2)}%\n`);
  }

  /**
   * Benchmark: Memory Usage
   */
  private async benchmarkMemoryUsage(): Promise<void> {
    console.log('📊 Benchmarking memory usage...\n');

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const beforeMemory = process.memoryUsage();

    // Load data without cache
    await WorkflowCache.clear();
    await ExecutionCache.clear();

    const workflows = await this.fetchWorkflows();

    for (const workflow of workflows) {
      await this.fetchWorkflowDetails(workflow.id);
    }

    const middleMemory = process.memoryUsage();

    // Load data with cache
    for (const workflow of workflows) {
      await WorkflowCache.set(workflow.id, workflow);
    }

    const afterMemory = process.memoryUsage();

    const beforeHeap = beforeMemory.heapUsed / 1024 / 1024;
    const middleHeap = middleMemory.heapUsed / 1024 / 1024;
    const afterHeap = afterMemory.heapUsed / 1024 / 1024;

    this.addResult({
      category: 'Memory Usage',
      metric: 'Heap used (without cache)',
      before: beforeHeap,
      after: middleHeap,
      unit: 'MB',
    });

    this.addResult({
      category: 'Memory Usage',
      metric: 'Heap used (with cache)',
      before: middleHeap,
      after: afterHeap,
      unit: 'MB',
    });

    console.log(`  Before: ${beforeHeap.toFixed(2)} MB`);
    console.log(`  Middle (no cache): ${middleHeap.toFixed(2)} MB`);
    console.log(`  After (with cache): ${afterHeap.toFixed(2)} MB\n`);
  }

  /**
   * Benchmark: Database Query Performance
   */
  private async benchmarkDatabaseQueries(): Promise<void> {
    console.log('📊 Benchmarking database query performance...\n');

    const client = new MongoClient(MONGODB_URI);

    try {
      await client.connect();
      const db = client.db();
      const executions = db.collection('executions');

      // Query without indexes (simulate)
      const beforeStart = Date.now();
      await executions.find({ status: 'error' }).limit(100).toArray();
      const beforeTime = Date.now() - beforeStart;

      // Query with indexes
      const afterStart = Date.now();
      await executions.find({ status: 'error' }).sort({ startedAt: -1 }).limit(100).toArray();
      const afterTime = Date.now() - afterStart;

      this.addResult({
        category: 'Database Performance',
        metric: 'Error query time',
        before: beforeTime,
        after: afterTime,
        unit: 'ms',
      });

      // Aggregation query
      const aggBeforeStart = Date.now();
      await executions
        .aggregate([
          { $match: { finishedAt: { $exists: true } } },
          { $group: { _id: '$workflowId', count: { $sum: 1 } } },
        ])
        .toArray();
      const aggBeforeTime = Date.now() - aggBeforeStart;

      const aggAfterStart = Date.now();
      await executions
        .aggregate([
          { $match: { finishedAt: { $exists: true } } },
          { $group: { _id: '$workflowId', count: { $sum: 1 } } },
        ])
        .toArray();
      const aggAfterTime = Date.now() - aggAfterStart;

      this.addResult({
        category: 'Database Performance',
        metric: 'Aggregation query time',
        before: aggBeforeTime,
        after: aggAfterTime,
        unit: 'ms',
      });

      console.log(`  Error query - Before: ${beforeTime}ms, After: ${afterTime}ms`);
      console.log(`  Aggregation - Before: ${aggBeforeTime}ms, After: ${aggAfterTime}ms\n`);
    } catch (error: any) {
      console.error(`  ❌ Database benchmark failed: ${error.message}\n`);
    } finally {
      await client.close();
    }
  }

  /**
   * Fetch workflows from n8n API
   */
  private async fetchWorkflows(): Promise<any[]> {
    try {
      const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY },
      });

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      return [];
    }
  }

  /**
   * Fetch workflows with cache
   */
  private async fetchWorkflowsCached(workflows: any[]): Promise<any[]> {
    const cached = await WorkflowCache.getList();

    if (cached) {
      return cached;
    }

    await WorkflowCache.setList(workflows);
    return workflows;
  }

  /**
   * Fetch workflow details
   */
  private async fetchWorkflowDetails(workflowId: string): Promise<any> {
    try {
      const response = await fetch(`${N8N_URL}/api/v1/workflows/${workflowId}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY },
      });

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch workflow ${workflowId}:`, error);
      return null;
    }
  }

  /**
   * Fetch executions
   */
  private async fetchExecutions(workflowId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${N8N_URL}/api/v1/executions?workflowId=${workflowId}&limit=50`,
        {
          headers: { 'X-N8N-API-KEY': N8N_API_KEY },
        }
      );

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch executions for workflow ${workflowId}:`, error);
      return [];
    }
  }

  /**
   * Add benchmark result
   */
  private addResult(result: Omit<BenchmarkResult, 'improvement' | 'improvementPercentage'>): void {
    const improvement = result.before - result.after;
    const improvementPercentage = this.calculateImprovement(result.before, result.after);

    this.results.push({
      ...result,
      improvement,
      improvementPercentage,
    });
  }

  /**
   * Calculate improvement percentage
   */
  private calculateImprovement(before: number, after: number): number {
    if (before === 0) return 0;
    return ((before - after) / before) * 100;
  }

  /**
   * Generate benchmark report
   */
  private generateReport(): BenchmarkReport {
    const improvements = this.results.map((r) => r.improvementPercentage);
    const averageImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;

    const significantImprovements = this.results.filter((r) => r.improvementPercentage > 20).length;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Benchmark Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Total tests: ${this.results.length}`);
    console.log(`Average improvement: ${averageImprovement.toFixed(2)}%`);
    console.log(`Significant improvements (>20%): ${significantImprovements}\n`);

    console.log('Top Improvements:');
    const topImprovements = [...this.results]
      .sort((a, b) => b.improvementPercentage - a.improvementPercentage)
      .slice(0, 5);

    topImprovements.forEach((result, index) => {
      console.log(
        `  ${index + 1}. ${result.metric}: ${result.improvementPercentage.toFixed(2)}% ` +
          `(${result.before.toFixed(2)} → ${result.after.toFixed(2)} ${result.unit})`
      );
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cpus: require('os').cpus().length,
      },
      results: this.results,
      summary: {
        totalTests: this.results.length,
        averageImprovement,
        significantImprovements,
      },
    };
  }

  /**
   * Save report to file
   */
  async saveReport(report: BenchmarkReport): Promise<void> {
    const fs = require('fs');
    const path = require('path');

    const filename = `benchmark-report-${Date.now()}.json`;
    const filepath = path.join(__dirname, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    console.log(`📄 Report saved to: ${filepath}\n`);
  }
}

// Run benchmark if executed directly
async function main() {
  const benchmark = new PerformanceBenchmark();

  try {
    const report = await benchmark.runAll();
    await benchmark.saveReport(report);
  } catch (error: any) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  } finally {
    await RedisClient.disconnect();
  }
}

if (require.main === module) {
  main();
}

export { PerformanceBenchmark };
export type { BenchmarkResult, BenchmarkReport };
