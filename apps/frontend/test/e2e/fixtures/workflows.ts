/**
 * E2E Test Fixtures - Workflows
 *
 * Test data for E2E workflow tests.
 */

export const testWorkflows = {
  simple: {
    name: 'E2E Simple Workflow',
    description: 'Simple workflow for E2E testing',
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
                name: 'message',
                value: 'E2E Test Message',
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
  },

  httpRequest: {
    name: 'E2E HTTP Request Workflow',
    description: 'Workflow with HTTP request for E2E testing',
    nodes: [
      {
        id: 'start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300],
        parameters: {},
      },
      {
        id: 'http',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 1,
        position: [450, 300],
        parameters: {
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET',
        },
      },
    ],
    connections: {
      start: {
        main: [[{ node: 'http', type: 'main', index: 0 }]],
      },
    },
  },

  branching: {
    name: 'E2E Branching Workflow',
    description: 'Workflow with conditional branching',
    nodes: [
      {
        id: 'start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300],
        parameters: {},
      },
      {
        id: 'if',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [450, 300],
        parameters: {
          conditions: {
            boolean: [
              {
                value1: true,
                value2: true,
              },
            ],
          },
        },
      },
      {
        id: 'true-branch',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [650, 200],
        parameters: {
          values: {
            string: [
              {
                name: 'branch',
                value: 'true',
              },
            ],
          },
        },
      },
      {
        id: 'false-branch',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [650, 400],
        parameters: {
          values: {
            string: [
              {
                name: 'branch',
                value: 'false',
              },
            ],
          },
        },
      },
    ],
    connections: {
      start: {
        main: [[{ node: 'if', type: 'main', index: 0 }]],
      },
      if: {
        main: [
          [{ node: 'true-branch', type: 'main', index: 0 }],
          [{ node: 'false-branch', type: 'main', index: 0 }],
        ],
      },
    },
  },
};

export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'test-password-123',
  },
  user: {
    email: 'user@test.com',
    password: 'test-password-456',
  },
};

export const testExecutions = {
  success: {
    status: 'success',
    duration: 1234,
    startedAt: '2024-01-01T00:00:00.000Z',
    stoppedAt: '2024-01-01T00:00:01.234Z',
  },
  error: {
    status: 'error',
    duration: 567,
    startedAt: '2024-01-01T00:00:00.000Z',
    stoppedAt: '2024-01-01T00:00:00.567Z',
    error: {
      message: 'Test error message',
    },
  },
  running: {
    status: 'running',
    startedAt: '2024-01-01T00:00:00.000Z',
  },
};
