/**
 * K6 Load Test - n8n API
 *
 * Tests n8n API endpoints under load.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const getWorkflowsDuration = new Trend('get_workflows_duration');
const getExecutionsDuration = new Trend('get_executions_duration');
const apiCalls = new Counter('api_calls_total');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm up
    { duration: '2m', target: 50 }, // Moderate load
    { duration: '1m', target: 100 }, // High load
    { duration: '2m', target: 50 }, // Back to moderate
    { duration: '30s', target: 0 }, // Cool down
  ],

  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1s
    http_req_failed: ['rate<0.01'], // Error rate below 1%
    errors: ['rate<0.05'], // Custom errors below 5%
    get_workflows_duration: ['p(95)<500'], // GET workflows under 500ms
    get_executions_duration: ['p(95)<800'], // GET executions under 800ms
  },
};

const BASE_URL = __ENV.N8N_URL || 'http://localhost:5679';
const API_KEY = __ENV.N8N_API_KEY || '';

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['X-N8N-API-KEY'] = API_KEY;
  }

  return headers;
}

export default function () {
  const headers = getHeaders();

  // Test 1: GET /api/v1/workflows
  group('GET Workflows', () => {
    const startTime = Date.now();

    const response = http.get(`${BASE_URL}/api/v1/workflows`, { headers });

    const duration = Date.now() - startTime;
    getWorkflowsDuration.add(duration);
    apiCalls.add(1);

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'has data array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch (e) {
          return false;
        }
      },
      'response time OK': (r) => duration < 1000,
    });

    errorRate.add(!success);
  });

  sleep(0.5);

  // Test 2: GET /api/v1/executions
  group('GET Executions', () => {
    const startTime = Date.now();

    const response = http.get(`${BASE_URL}/api/v1/executions?limit=10`, { headers });

    const duration = Date.now() - startTime;
    getExecutionsDuration.add(duration);
    apiCalls.add(1);

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'has data array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch (e) {
          return false;
        }
      },
      'response time OK': (r) => duration < 1500,
    });

    errorRate.add(!success);
  });

  sleep(0.5);

  // Test 3: Health Check
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/healthz`, { headers });

    apiCalls.add(1);

    const success = check(response, {
      'health check OK': (r) => r.status === 200,
      'response time fast': (r) => r.timings.duration < 200,
    });

    errorRate.add(!success);
  });

  // Random sleep between requests (1-2 seconds)
  sleep(Math.random() + 1);
}

// Handle summary
export function handleSummary(data) {
  return {
    'test-results/api-load-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors;

  let summary = `\n${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `${indent}📊 K6 Load Test Summary - n8n API\n`;
  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Test duration
  const duration = data.state.testRunDurationMs / 1000;
  summary += `${indent}⏱️  Test Duration: ${duration.toFixed(1)}s\n\n`;

  // HTTP metrics
  const httpReqs = data.metrics.http_reqs.values.count;
  const httpReqDuration = data.metrics.http_req_duration.values;
  const httpReqFailed = data.metrics.http_req_failed.values.rate;

  summary += `${indent}🌐 HTTP Requests:\n`;
  summary += `${indent}  Total: ${httpReqs}\n`;
  summary += `${indent}  Failed: ${(httpReqFailed * 100).toFixed(2)}%\n`;
  summary += `${indent}  Avg Duration: ${httpReqDuration.avg.toFixed(2)}ms\n`;
  summary += `${indent}  P50: ${httpReqDuration['p(50)'].toFixed(2)}ms\n`;
  summary += `${indent}  P95: ${httpReqDuration['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99: ${httpReqDuration['p(99)'].toFixed(2)}ms\n\n`;

  // Custom metrics
  if (data.metrics.get_workflows_duration) {
    const gwDuration = data.metrics.get_workflows_duration.values;
    summary += `${indent}📋 GET Workflows:\n`;
    summary += `${indent}  Avg: ${gwDuration.avg.toFixed(2)}ms\n`;
    summary += `${indent}  P95: ${gwDuration['p(95)'].toFixed(2)}ms\n\n`;
  }

  if (data.metrics.get_executions_duration) {
    const geDuration = data.metrics.get_executions_duration.values;
    summary += `${indent}⚡ GET Executions:\n`;
    summary += `${indent}  Avg: ${geDuration.avg.toFixed(2)}ms\n`;
    summary += `${indent}  P95: ${geDuration['p(95)'].toFixed(2)}ms\n\n`;
  }

  // Virtual Users
  const vus = data.metrics.vus.values.max;
  summary += `${indent}👥 Max Virtual Users: ${vus}\n\n`;

  // Throughput
  const rps = httpReqs / duration;
  summary += `${indent}🚀 Throughput: ${rps.toFixed(2)} req/s\n\n`;

  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return summary;
}
