/**
 * Workflow Execution Integration Tests
 *
 * Tests workflow execution with real n8n instance.
 */

import N8nApiClient from '@/lib/n8n/client';
import WorkflowParser from '@/lib/n8n/workflow-parser';
import TestEnvironment from './helpers/test-env';
import type { Workflow } from '@/lib/n8n/client';

describe('Workflow Execution Integration', () => {
  let client: N8nApiClient;
  let testWorkflowId: string;

  beforeAll(() => {
    const url = TestEnvironment.getUrl();
    client = new N8nApiClient({
      baseUrl: url,
      apiKey: '', // No API key needed for test instance
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

  describe('Workflow Lifecycle', () => {
    it('should create a new workflow', async () => {
      const workflow: Partial<Workflow> = {
        name: 'Test Workflow',
        active: false,
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
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
                    name: 'message',
                    value: 'Hello from integration test',
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

      const created = await client.createWorkflow(workflow);

      expect(created).toHaveProperty('id');
      expect(created.name).toBe('Test Workflow');
      expect(created.nodes).toHaveLength(2);

      testWorkflowId = created.id;
    });

    it('should retrieve workflow by ID', async () => {
      // Create workflow
      const workflow: Partial<Workflow> = {
        name: 'Retrieve Test',
        active: false,
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
        ],
        connections: {},
      };

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;

      // Retrieve workflow
      const retrieved = await client.getWorkflow(testWorkflowId);

      expect(retrieved.id).toBe(testWorkflowId);
      expect(retrieved.name).toBe('Retrieve Test');
    });

    it('should update existing workflow', async () => {
      // Create workflow
      const workflow: Partial<Workflow> = {
        name: 'Original Name',
        active: false,
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
        ],
        connections: {},
      };

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;

      // Update workflow
      const updated = await client.updateWorkflow(testWorkflowId, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.id).toBe(testWorkflowId);
    });

    it('should delete workflow', async () => {
      // Create workflow
      const workflow: Partial<Workflow> = {
        name: 'To Be Deleted',
        active: false,
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
        ],
        connections: {},
      };

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;

      // Delete workflow
      await client.deleteWorkflow(testWorkflowId);

      // Verify deletion
      await expect(client.getWorkflow(testWorkflowId)).rejects.toThrow();

      testWorkflowId = ''; // Already deleted
    });
  });

  describe('Workflow Execution', () => {
    beforeEach(async () => {
      // Create test workflow for execution
      const workflow: Partial<Workflow> = {
        name: 'Execution Test',
        active: false,
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
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
                    name: 'test',
                    value: 'execution_test',
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

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;
    });

    it('should execute workflow successfully', async () => {
      const result = await client.executeWorkflow(testWorkflowId);

      expect(result).toHaveProperty('executionId');
      expect(result.executionId).toBeTruthy();
    });

    it('should retrieve execution details', async () => {
      // Execute workflow
      const execResult = await client.executeWorkflow(testWorkflowId);

      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get execution details
      const execution = await client.getExecution(execResult.executionId);

      expect(execution.id).toBe(execResult.executionId);
      expect(execution.workflowId).toBe(testWorkflowId);
      expect(['success', 'error', 'waiting', 'running']).toContain(execution.status);
    });

    it('should list executions for workflow', async () => {
      // Execute workflow multiple times
      await client.executeWorkflow(testWorkflowId);
      await client.executeWorkflow(testWorkflowId);

      // Wait for executions to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // List executions
      const executions = await client.getExecutions({
        workflowId: testWorkflowId,
      });

      expect(executions.length).toBeGreaterThanOrEqual(2);
      executions.forEach(exec => {
        expect(exec.workflowId).toBe(testWorkflowId);
      });
    });

    it('should filter executions by status', async () => {
      // Execute workflow
      await client.executeWorkflow(testWorkflowId);

      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get successful executions
      const successExecutions = await client.getExecutions({
        workflowId: testWorkflowId,
        status: 'success',
      });

      successExecutions.forEach(exec => {
        expect(exec.status).toBe('success');
      });
    });
  });

  describe('Workflow Parsing Integration', () => {
    it('should parse created workflow correctly', async () => {
      // Create complex workflow
      const workflow: Partial<Workflow> = {
        name: 'Parse Test',
        active: false,
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
          {
            id: 'if',
            type: 'n8n-nodes-base.if',
            typeVersion: 1,
            position: [200, 0],
            parameters: {},
          },
          {
            id: 'branch1',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [400, -100],
            parameters: {},
          },
          {
            id: 'branch2',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [400, 100],
            parameters: {},
          },
        ],
        connections: {
          start: {
            main: [[{ node: 'if', type: 'main', index: 0 }]],
          },
          if: {
            main: [
              [{ node: 'branch1', type: 'main', index: 0 }],
              [{ node: 'branch2', type: 'main', index: 0 }],
            ],
          },
        },
      };

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;

      // Parse workflow
      const parsed = WorkflowParser.parse(created);

      expect(parsed.nodeCount).toBe(4);
      expect(parsed.connectionCount).toBe(3);
      expect(parsed.complexity).toBeGreaterThan(0);
      expect(parsed.estimatedDuration).toBeGreaterThan(0);
    });

    it('should validate workflow structure', async () => {
      // Create valid workflow
      const workflow: Partial<Workflow> = {
        name: 'Validation Test',
        active: false,
        nodes: [
          {
            id: 'start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
          {
            id: 'set',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [200, 0],
            parameters: {},
          },
        ],
        connections: {
          start: {
            main: [[{ node: 'set', type: 'main', index: 0 }]],
          },
        },
      };

      const created = await client.createWorkflow(workflow);
      testWorkflowId = created.id;

      // Validate workflow
      const validation = WorkflowParser.validate(created);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle non-existent workflow', async () => {
      await expect(client.getWorkflow('non-existent-id')).rejects.toThrow();
    });

    it('should handle invalid workflow data', async () => {
      const invalidWorkflow = {
        name: 'Invalid',
        active: false,
        nodes: [],
        connections: {},
      };

      await expect(client.createWorkflow(invalidWorkflow)).rejects.toThrow();
    });

    it('should handle execution of non-existent workflow', async () => {
      await expect(client.executeWorkflow('non-existent-id')).rejects.toThrow();
    });
  });
});
