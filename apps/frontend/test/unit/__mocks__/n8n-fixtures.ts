/**
 * Test Fixtures
 *
 * Common test data for n8n integration tests.
 */

export const mockWorkflow = {
  id: 'test-workflow-1',
  name: 'Test Workflow',
  active: true,
  nodes: [
    {
      id: 'start-node',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
    },
    {
      id: 'http-node',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 1,
      position: [200, 0],
      parameters: {
        url: 'https://api.example.com/data',
        method: 'GET',
      },
    },
    {
      id: 'set-node',
      type: 'n8n-nodes-base.set',
      typeVersion: 1,
      position: [400, 0],
      parameters: {
        values: {
          string: [
            {
              name: 'result',
              value: '={{ $json.data }}',
            },
          ],
        },
      },
    },
  ],
  connections: {
    'start-node': {
      main: [[{ node: 'http-node', type: 'main', index: 0 }]],
    },
    'http-node': {
      main: [[{ node: 'set-node', type: 'main', index: 0 }]],
    },
  },
  tags: ['test', 'api'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const mockExecution = {
  id: 'test-execution-1',
  workflowId: 'test-workflow-1',
  mode: 'manual' as const,
  status: 'success' as const,
  startedAt: '2024-01-01T12:00:00.000Z',
  stoppedAt: '2024-01-01T12:00:05.000Z',
  data: {
    resultData: {
      runData: {
        'start-node': [
          {
            startTime: 1704110400000,
            executionTime: 1,
            data: {
              main: [[{ json: {} }]],
            },
          },
        ],
        'http-node': [
          {
            startTime: 1704110401000,
            executionTime: 2000,
            data: {
              main: [[{ json: { data: 'test data' } }]],
            },
          },
        ],
        'set-node': [
          {
            startTime: 1704110403000,
            executionTime: 1,
            data: {
              main: [[{ json: { result: 'test data' } }]],
            },
          },
        ],
      },
    },
  },
};

export const mockErrorExecution = {
  id: 'test-execution-error',
  workflowId: 'test-workflow-1',
  mode: 'trigger' as const,
  status: 'error' as const,
  startedAt: '2024-01-01T12:00:00.000Z',
  stoppedAt: '2024-01-01T12:00:03.000Z',
  data: {
    resultData: {
      error: {
        message: 'ECONNREFUSED: Connection refused',
        stack: 'Error: ECONNREFUSED...',
        name: 'Error',
      },
      runData: {
        'start-node': [
          {
            startTime: 1704110400000,
            executionTime: 1,
            data: {
              main: [[{ json: {} }]],
            },
          },
        ],
        'http-node': [
          {
            startTime: 1704110401000,
            executionTime: 2000,
            error: {
              message: 'ECONNREFUSED: Connection refused',
            },
          },
        ],
      },
    },
  },
};

export const mockWebhook = {
  path: '/webhook-test',
  method: 'POST',
  workflowId: 'test-workflow-1',
  webhookId: 'webhook-1',
  node: 'webhook-node',
};

export const mockApiResponses = {
  healthCheck: { status: 'ok' },

  workflowList: {
    data: [mockWorkflow],
  },

  executionList: {
    data: [mockExecution, mockErrorExecution],
  },

  executeWorkflow: {
    executionId: 'new-execution-id',
  },
};

export const mockErrorPatterns = {
  connectionRefused: {
    pattern: 'ECONNREFUSED',
    category: 'network',
    severity: 'high',
    count: 5,
  },

  timeout: {
    pattern: 'ETIMEDOUT',
    category: 'network',
    severity: 'medium',
    count: 3,
  },

  unauthorized: {
    pattern: 'Unauthorized',
    category: 'authentication',
    severity: 'high',
    count: 2,
  },

  notFound: {
    pattern: 'Not Found',
    category: 'data',
    severity: 'low',
    count: 1,
  },
};

export const mockWorkflowMetrics = {
  workflowId: 'test-workflow-1',
  totalExecutions: 100,
  successfulExecutions: 95,
  failedExecutions: 5,
  averageDuration: 2500,
  p50Duration: 2000,
  p95Duration: 5000,
  p99Duration: 8000,
  lastExecution: '2024-01-01T12:00:00.000Z',
};
