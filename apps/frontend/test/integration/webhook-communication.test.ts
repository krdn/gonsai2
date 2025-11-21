/**
 * Webhook Communication Integration Tests
 *
 * Tests webhook-based workflow execution with real n8n instance.
 */

import N8nApiClient from '@/lib/n8n/client';
import TestEnvironment from './helpers/test-env';
import type { Workflow } from '@/lib/n8n/client';

describe('Webhook Communication Integration', () => {
  let client: N8nApiClient;
  let testWorkflowId: string;

  beforeAll(() => {
    const url = TestEnvironment.getUrl();
    client = new N8nApiClient({
      baseUrl: url,
      apiKey: '',
      timeout: 30000,
    });
  });

  afterEach(async () => {
    // Cleanup: Delete test workflow if created
    if (testWorkflowId) {
      try {
        await client.deleteWorkflow(testWorkflowId);
      } catch (error) {
        // Ignore errors during cleanup
      }
      testWorkflowId = '';
    }
  });

  describe('Webhook Workflow Creation', () => {
    it('should create workflow with webhook trigger', async () => {
      const workflow: Partial<Workflow> = {
        name: 'Webhook Test Workflow',
        active: false,
        nodes: [
          {
            id: 'webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [0, 0],
            parameters: {
              path: 'test-webhook',
              httpMethod: 'POST',
              responseMode: 'onReceived',
            },
            webhookId: 'test-webhook-id',
          },
          {
            id: 'set',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [200, 0],
            parameters: {
              values: {
                string: [
                  {
                    name: 'webhook_data',
                    value: '={{ $json.body }}',
                  },
                ],
              },
            },
          },
        ],
        connections: {
          webhook: {
            main: [[{ node: 'set', type: 'main', index: 0 }]],
          },
        },
      };

      const created = await client.createWorkflow(workflow);

      expect(created).toHaveProperty('id');
      expect(created.nodes).toHaveLength(2);
      expect(created.nodes[0].type).toBe('n8n-nodes-base.webhook');

      testWorkflowId = created.id;
    });

    it('should activate workflow with webhook', async () => {
      // Create workflow with webhook
      const workflow: Partial<Workflow> = {
        name: 'Webhook Activation Test',
        active: false,
        nodes: [
          {
            id: 'webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [0, 0],
            parameters: {
              path: 'activation-test',
              httpMethod: 'GET',
            },
            webhookId: 'activation-test-id',
          },
        ],
        connections: {},
      };

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;

      // Activate workflow
      const activated = await client.updateWorkflow(testWorkflowId, {
        active: true,
      });

      expect(activated.active).toBe(true);

      // Deactivate for cleanup
      await client.updateWorkflow(testWorkflowId, { active: false });
    });
  });

  describe('Webhook Execution', () => {
    beforeEach(async () => {
      // Create and activate webhook workflow
      const workflow: Partial<Workflow> = {
        name: 'Webhook Execution Test',
        active: true,
        nodes: [
          {
            id: 'webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [0, 0],
            parameters: {
              path: 'execution-test',
              httpMethod: 'POST',
              responseMode: 'onReceived',
              options: {},
            },
            webhookId: 'execution-test-id',
          },
          {
            id: 'set',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [200, 0],
            parameters: {
              values: {
                string: [
                  {
                    name: 'processed',
                    value: 'true',
                  },
                ],
              },
            },
          },
        ],
        connections: {
          webhook: {
            main: [[{ node: 'set', type: 'main', index: 0 }]],
          },
        },
      };

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;

      // Wait for webhook to be registered
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it('should trigger workflow via webhook POST', async () => {
      const webhookUrl = `${TestEnvironment.getUrl()}/webhook/execution-test`;
      const testData = { message: 'test webhook data', timestamp: Date.now() };

      // Send POST request to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      expect(response.ok).toBe(true);

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify execution was created
      const executions = await client.getExecutions({
        workflowId: testWorkflowId,
      });

      expect(executions.length).toBeGreaterThan(0);

      const latestExecution = executions[0];
      expect(latestExecution.mode).toBe('webhook');
      expect(latestExecution.workflowId).toBe(testWorkflowId);
    });

    it('should pass webhook data to workflow', async () => {
      const webhookUrl = `${TestEnvironment.getUrl()}/webhook/execution-test`;
      const testData = {
        userId: 'user123',
        action: 'test_action',
        payload: { key: 'value' },
      };

      // Trigger webhook
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get execution details
      const executions = await client.getExecutions({
        workflowId: testWorkflowId,
      });

      expect(executions.length).toBeGreaterThan(0);

      const latestExecution = executions[0];
      expect(latestExecution.status).toBe('success');

      // Verify webhook data was passed
      const executionDetails = await client.getExecution(latestExecution.id);
      expect(executionDetails).toHaveProperty('data');
    });
  });

  describe('Webhook Error Handling', () => {
    it('should handle webhook with invalid data', async () => {
      // Create workflow
      const workflow: Partial<Workflow> = {
        name: 'Webhook Error Test',
        active: true,
        nodes: [
          {
            id: 'webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [0, 0],
            parameters: {
              path: 'error-test',
              httpMethod: 'POST',
            },
            webhookId: 'error-test-id',
          },
        ],
        connections: {},
      };

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const webhookUrl = `${TestEnvironment.getUrl()}/webhook/error-test`;

      // Send malformed data
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      // Webhook should still respond (error handling in workflow)
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 404 for non-existent webhook', async () => {
      const webhookUrl = `${TestEnvironment.getUrl()}/webhook/non-existent-webhook`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Webhook Response Modes', () => {
    it('should respond immediately with onReceived mode', async () => {
      // Create workflow with onReceived response mode
      const workflow: Partial<Workflow> = {
        name: 'Webhook OnReceived Test',
        active: true,
        nodes: [
          {
            id: 'webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [0, 0],
            parameters: {
              path: 'on-received-test',
              httpMethod: 'POST',
              responseMode: 'onReceived',
            },
            webhookId: 'on-received-test-id',
          },
          {
            id: 'wait',
            type: 'n8n-nodes-base.wait',
            typeVersion: 1,
            position: [200, 0],
            parameters: {
              amount: 5,
              unit: 'seconds',
            },
          },
        ],
        connections: {
          webhook: {
            main: [[{ node: 'wait', type: 'main', index: 0 }]],
          },
        },
      };

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const webhookUrl = `${TestEnvironment.getUrl()}/webhook/on-received-test`;

      // Measure response time
      const startTime = Date.now();
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      });
      const responseTime = Date.now() - startTime;

      // Response should be immediate (not wait 5 seconds)
      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(2000); // Less than 2 seconds
    });
  });

  describe('Multiple Webhook Workflows', () => {
    let workflow1Id: string;
    let workflow2Id: string;

    afterEach(async () => {
      // Cleanup both workflows
      if (workflow1Id) {
        try {
          await client.deleteWorkflow(workflow1Id);
        } catch (error) {
          // Ignore
        }
        workflow1Id = '';
      }

      if (workflow2Id) {
        try {
          await client.deleteWorkflow(workflow2Id);
        } catch (error) {
          // Ignore
        }
        workflow2Id = '';
      }
    });

    it('should handle multiple webhook workflows independently', async () => {
      // Create first workflow
      const workflow1: Partial<Workflow> = {
        name: 'Webhook Multi Test 1',
        active: true,
        nodes: [
          {
            id: 'webhook1',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [0, 0],
            parameters: {
              path: 'multi-test-1',
              httpMethod: 'POST',
            },
            webhookId: 'multi-test-1-id',
          },
        ],
        connections: {},
      };

      // Create second workflow
      const workflow2: Partial<Workflow> = {
        name: 'Webhook Multi Test 2',
        active: true,
        nodes: [
          {
            id: 'webhook2',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [0, 0],
            parameters: {
              path: 'multi-test-2',
              httpMethod: 'POST',
            },
            webhookId: 'multi-test-2-id',
          },
        ],
        connections: {},
      };

      const created1 = await client.createWorkflow(workflow1);
      const created2 = await client.createWorkflow(workflow2);

      workflow1Id = created1.id;
      workflow2Id = created2.id;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Trigger both webhooks
      const webhook1Url = `${TestEnvironment.getUrl()}/webhook/multi-test-1`;
      const webhook2Url = `${TestEnvironment.getUrl()}/webhook/multi-test-2`;

      const [response1, response2] = await Promise.all([
        fetch(webhook1Url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow: 1 }),
        }),
        fetch(webhook2Url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow: 2 }),
        }),
      ]);

      expect(response1.ok).toBe(true);
      expect(response2.ok).toBe(true);

      // Wait for executions
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify both workflows executed
      const executions1 = await client.getExecutions({ workflowId: workflow1Id });
      const executions2 = await client.getExecutions({ workflowId: workflow2Id });

      expect(executions1.length).toBeGreaterThan(0);
      expect(executions2.length).toBeGreaterThan(0);
    });
  });
});
