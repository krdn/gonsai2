#!/usr/bin/env ts-node

/**
 * Performance Report Generator
 *
 * Generate comprehensive performance reports with trends and recommendations.
 */

import PerformanceTracker from '../infrastructure/optimization/monitoring/performance-tracker';
import RedisClient from '../infrastructure/optimization/cache/redis-client';

interface ReportOptions {
  period?: 'hour' | 'day' | 'week' | 'month';
  format?: 'console' | 'json' | 'markdown';
  output?: string;
}

async function generatePerformanceReport(options: ReportOptions = {}) {
  const { period = 'day', format = 'console', output } = options;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Performance Report Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Calculate time range
    const now = Date.now();
    let startTime: number;

    switch (period) {
      case 'hour':
        startTime = now - 60 * 60 * 1000;
        break;
      case 'day':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = now - 24 * 60 * 60 * 1000;
    }

    console.log(`📅 Generating report for last ${period}...\n`);

    // Generate report
    const report = await PerformanceTracker.generateReport(startTime, now);

    // Format output
    if (format === 'console') {
      displayConsoleReport(report);
    } else if (format === 'json') {
      const jsonOutput = JSON.stringify(report, null, 2);

      if (output) {
        const fs = require('fs');
        fs.writeFileSync(output, jsonOutput);
        console.log(`✅ Report saved to: ${output}\n`);
      } else {
        console.log(jsonOutput);
      }
    } else if (format === 'markdown') {
      const markdown = generateMarkdownReport(report);

      if (output) {
        const fs = require('fs');
        fs.writeFileSync(output, markdown);
        console.log(`✅ Report saved to: ${output}\n`);
      } else {
        console.log(markdown);
      }
    }

  } catch (error: any) {
    console.error('❌ Error generating performance report:', error.message);
    process.exit(1);
  } finally {
    await RedisClient.disconnect();
  }
}

function displayConsoleReport(report: any): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 Performance Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Period
  console.log(`📅 Report Period:`);
  console.log(`  Start: ${new Date(report.period.start).toLocaleString()}`);
  console.log(`  End:   ${new Date(report.period.end).toLocaleString()}\n`);

  // Executions
  console.log('⚡ Workflow Executions:');
  console.log(`  Total:        ${report.executions.total.toLocaleString()}`);
  console.log(`  Avg Duration: ${report.executions.avgDuration.toFixed(0)}ms`);
  console.log(`  P50:          ${report.executions.p50.toFixed(0)}ms`);
  console.log(`  P95:          ${report.executions.p95.toFixed(0)}ms`);
  console.log(`  P99:          ${report.executions.p99.toFixed(0)}ms`);

  if (report.executions.slowest.length > 0) {
    console.log(`\n  🐌 Slowest Workflows:`);
    report.executions.slowest.slice(0, 5).forEach((item: any, index: number) => {
      console.log(`    ${index + 1}. ${item.workflowId}: ${item.duration.toFixed(0)}ms`);
    });
  }
  console.log('');

  // API
  console.log('🌐 API Performance:');
  console.log(`  Total Requests:   ${report.api.totalRequests.toLocaleString()}`);
  console.log(`  Avg Response:     ${report.api.avgResponseTime.toFixed(0)}ms`);
  console.log(`  P50:              ${report.api.p50.toFixed(0)}ms`);
  console.log(`  P95:              ${report.api.p95.toFixed(0)}ms`);
  console.log(`  P99:              ${report.api.p99.toFixed(0)}ms`);

  if (report.api.slowestEndpoints.length > 0) {
    console.log(`\n  🐌 Slowest Endpoints:`);
    report.api.slowestEndpoints.slice(0, 5).forEach((item: any, index: number) => {
      console.log(`    ${index + 1}. ${item.endpoint}: ${item.avgTime.toFixed(0)}ms`);
    });
  }
  console.log('');

  // Memory
  console.log('💾 Memory Usage:');
  console.log(`  Average: ${formatBytes(report.memory.avg)}`);
  console.log(`  Maximum: ${formatBytes(report.memory.max)}`);
  console.log(`  Minimum: ${formatBytes(report.memory.min)}\n`);

  // Cache
  console.log('🗄️  Cache Performance:');
  console.log(`  Hit Rate:    ${report.cache.hitRate.toFixed(2)}%`);
  console.log(`  Total Hits:  ${report.cache.totalHits.toLocaleString()}`);
  console.log(`  Total Misses:${report.cache.totalMisses.toLocaleString()}\n`);

  // Recommendations
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 Recommendations:');

  const recommendations: string[] = [];

  if (report.executions.p95 > 5000) {
    recommendations.push('  ⚠️  P95 execution time is high (>5s), consider workflow optimization');
  }

  if (report.api.p95 > 1000) {
    recommendations.push('  ⚠️  P95 API response time is high (>1s), consider caching or optimization');
  }

  if (report.cache.hitRate < 70) {
    recommendations.push('  ⚠️  Cache hit rate is below 70%, consider increasing TTL values');
  }

  if (report.memory.max > 1.5 * report.memory.avg) {
    recommendations.push('  ⚠️  Memory usage spikes detected, investigate memory leaks');
  }

  if (recommendations.length === 0) {
    console.log('  ✅ Performance is within acceptable ranges\n');
  } else {
    recommendations.forEach(rec => console.log(rec));
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function generateMarkdownReport(report: any): string {
  let markdown = '# Performance Report\n\n';

  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

  markdown += '## Report Period\n\n';
  markdown += `- **Start:** ${new Date(report.period.start).toLocaleString()}\n`;
  markdown += `- **End:** ${new Date(report.period.end).toLocaleString()}\n\n`;

  markdown += '## Workflow Executions\n\n';
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total | ${report.executions.total.toLocaleString()} |\n`;
  markdown += `| Avg Duration | ${report.executions.avgDuration.toFixed(0)}ms |\n`;
  markdown += `| P50 | ${report.executions.p50.toFixed(0)}ms |\n`;
  markdown += `| P95 | ${report.executions.p95.toFixed(0)}ms |\n`;
  markdown += `| P99 | ${report.executions.p99.toFixed(0)}ms |\n\n`;

  if (report.executions.slowest.length > 0) {
    markdown += '### Slowest Workflows\n\n';
    markdown += `| Workflow ID | Duration |\n`;
    markdown += `|-------------|----------|\n`;
    report.executions.slowest.slice(0, 5).forEach((item: any) => {
      markdown += `| ${item.workflowId} | ${item.duration.toFixed(0)}ms |\n`;
    });
    markdown += '\n';
  }

  markdown += '## API Performance\n\n';
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Requests | ${report.api.totalRequests.toLocaleString()} |\n`;
  markdown += `| Avg Response Time | ${report.api.avgResponseTime.toFixed(0)}ms |\n`;
  markdown += `| P50 | ${report.api.p50.toFixed(0)}ms |\n`;
  markdown += `| P95 | ${report.api.p95.toFixed(0)}ms |\n`;
  markdown += `| P99 | ${report.api.p99.toFixed(0)}ms |\n\n`;

  if (report.api.slowestEndpoints.length > 0) {
    markdown += '### Slowest Endpoints\n\n';
    markdown += `| Endpoint | Avg Time |\n`;
    markdown += `|----------|----------|\n`;
    report.api.slowestEndpoints.slice(0, 5).forEach((item: any) => {
      markdown += `| ${item.endpoint} | ${item.avgTime.toFixed(0)}ms |\n`;
    });
    markdown += '\n';
  }

  markdown += '## Memory Usage\n\n';
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Average | ${formatBytes(report.memory.avg)} |\n`;
  markdown += `| Maximum | ${formatBytes(report.memory.max)} |\n`;
  markdown += `| Minimum | ${formatBytes(report.memory.min)} |\n\n`;

  markdown += '## Cache Performance\n\n';
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Hit Rate | ${report.cache.hitRate.toFixed(2)}% |\n`;
  markdown += `| Total Hits | ${report.cache.totalHits.toLocaleString()} |\n`;
  markdown += `| Total Misses | ${report.cache.totalMisses.toLocaleString()} |\n\n`;

  return markdown;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ReportOptions = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--period' && args[i + 1]) {
    options.period = args[i + 1] as any;
    i++;
  } else if (args[i] === '--format' && args[i + 1]) {
    options.format = args[i + 1] as any;
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    options.output = args[i + 1];
    i++;
  }
}

// Run if executed directly
if (require.main === module) {
  generatePerformanceReport(options);
}

export { generatePerformanceReport };
