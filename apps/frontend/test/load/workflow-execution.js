/**
 * K6 Load Test - Workflow Execution
 *
 * Tests concurrent workflow execution performance.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const workflowDuration = new Trend('workflow_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 VUs
    { duration: '3m', target: 50 }, // Peak load at 50 VUs
    { duration: '2m', target: 100 }, // Spike to 100 VUs
    { duration: '2m', target: 50 }, // Back to 50 VUs
    { duration: '1m', target: 0 }, // Ramp down
  ],

  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'], // Error rate below 1%
    errors: ['rate<0.05'], // Custom error rate below 5%
    workflow_duration: ['p(95)<5000'], // 95% workflows complete under 5s
  },
};

// Test data
const BASE_URL = __ENV.N8N_URL || 'http://localhost:5679';
const API_KEY = __ENV.N8N_API_KEY || '';

// Sample workflow definition
const testWorkflow = {
  name: `Load Test Workflow ${Date.now()}`,
  active: false,
  nodes: [
    {
      id: 'start',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [250, 300],
      parameters: {},
    },
    {
      id: 'set',
      type: 'n8n-nodes-base.set',
      typeVersion: 1,
      position: [450, 300],
      parameters: {
        values: {
          string: [
            {
              name: 'test',
              value: 'load_test',
            },
          ],
        },
      },
    },
  ],
  connections: {
    start: {
      main: [[{ node: 'set', type: 'main', index: 0 }]],
    },
  },
};

// Setup: Create test workflow
export function setup() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['X-N8N-API-KEY'] = API_KEY;
  }

  const createResponse = http.post(`${BASE_URL}/api/v1/workflows`, JSON.stringify(testWorkflow), {
    headers,
  });

  check(createResponse, {
    'workflow created': (r) => r.status === 200 || r.status === 201,
  });

  const workflow = JSON.parse(createResponse.body);
  console.log(`Created test workflow: ${workflow.id}`);

  return { workflowId: workflow.id };
}

// Main test function
export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['X-N8N-API-KEY'] = API_KEY;
  }

  // Execute workflow
  const startTime = Date.now();

  const executeResponse = http.post(
    `${BASE_URL}/api/v1/workflows/${data.workflowId}/execute`,
    null,
    { headers }
  );

  const executeSuccess = check(executeResponse, {
    'workflow executed': (r) => r.status === 200,
    'execution ID returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.executionId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!executeSuccess);

  if (executeSuccess) {
    const execution = JSON.parse(executeResponse.body);

    // Wait for execution to complete
    let completed = false;
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max

    while (!completed && attempts < maxAttempts) {
      sleep(0.5);

      const statusResponse = http.get(`${BASE_URL}/api/v1/executions/${execution.executionId}`, {
        headers,
      });

      if (statusResponse.status === 200) {
        const status = JSON.parse(statusResponse.body);

        if (status.status === 'success' || status.status === 'error') {
          completed = true;

          const duration = Date.now() - startTime;
          workflowDuration.add(duration);

          check(status, {
            'workflow succeeded': (s) => s.status === 'success',
          });
        }
      }

      attempts++;
    }

    if (!completed) {
      errorRate.add(1);
      console.log(`Workflow ${execution.executionId} did not complete in time`);
    }
  }

  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

// Teardown: Delete test workflow
export function teardown(data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['X-N8N-API-KEY'] = API_KEY;
  }

  const deleteResponse = http.del(`${BASE_URL}/api/v1/workflows/${data.workflowId}`, null, {
    headers,
  });

  check(deleteResponse, {
    'workflow deleted': (r) => r.status === 200 || r.status === 204,
  });

  console.log(`Deleted test workflow: ${data.workflowId}`);
}
