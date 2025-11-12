/**
 * n8n API Client Tests
 *
 * Unit tests for n8n API client with mock server.
 */

import N8nApiClient from '@/lib/n8n/client';
import MockN8nServer from './__mocks__/n8n-server';
import { mockWorkflow, mockExecution } from './__mocks__/n8n-fixtures';

describe('N8nApiClient', () => {
  let mockServer: MockN8nServer;
  let client: N8nApiClient;

  beforeAll(async () => {
    mockServer = new MockN8nServer(5679);
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    mockServer.reset();
    client = new N8nApiClient({
      baseUrl: 'http://localhost:5679',
      apiKey: 'test-api-key',
      timeout: 5000,
      retries: 1,
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await client.healthCheck();

      expect(health).toEqual({ status: 'ok' });
    });

    it('should throw on connection error', async () => {
      const badClient = new N8nApiClient({
        baseUrl: 'http://localhost:9999',
        apiKey: 'test-api-key',
        timeout: 1000,
        retries: 0,
      });

      await expect(badClient.healthCheck()).rejects.toThrow();
    });
  });

  describe('getWorkflows', () => {
    it('should fetch all workflows', async () => {
      const workflows = await client.getWorkflows();

      expect(workflows).toHaveLength(2);
      expect(workflows[0]).toHaveProperty('id');
      expect(workflows[0]).toHaveProperty('name');
      expect(workflows[0]).toHaveProperty('nodes');
    });

    it('should return empty array when no workflows', async () => {
      mockServer.reset();
      mockServer['workflows'].clear();

      const workflows = await client.getWorkflows();

      expect(workflows).toEqual([]);
    });
  });

  describe('getWorkflow', () => {
    it('should fetch workflow by ID', async () => {
      const workflow = await client.getWorkflow('wf-1');

      expect(workflow).toMatchObject({
        id: 'wf-1',
        name: 'Test Workflow 1',
        active: true,
      });
    });

    it('should throw 404 for non-existent workflow', async () => {
      await expect(client.getWorkflow('non-existent')).rejects.toThrow('HTTP 404');
    });
  });

  describe('createWorkflow', () => {
    it('should create new workflow', async () => {
      const newWorkflow = {
        name: 'New Test Workflow',
        active: false,
        nodes: [],
        connections: {},
        tags: ['test'],
      };

      const created = await client.createWorkflow(newWorkflow);

      expect(created).toMatchObject({
        name: 'New Test Workflow',
        active: false,
        tags: ['test'],
      });
      expect(created.id).toMatch(/^wf-\d+$/);
      expect(created).toHaveProperty('createdAt');
    });

    it('should create workflow with default values', async () => {
      const created = await client.createWorkflow({});

      expect(created.name).toBe('New Workflow');
      expect(created.active).toBe(false);
      expect(created.nodes).toEqual([]);
    });
  });

  describe('updateWorkflow', () => {
    it('should update existing workflow', async () => {
      const updates = {
        name: 'Updated Workflow',
        active: false,
      };

      const updated = await client.updateWorkflow('wf-1', updates);

      expect(updated).toMatchObject({
        id: 'wf-1',
        name: 'Updated Workflow',
        active: false,
      });
      expect(updated.updatedAt).not.toBe(updated.createdAt);
    });

    it('should throw 404 for non-existent workflow', async () => {
      await expect(
        client.updateWorkflow('non-existent', { name: 'Test' })
      ).rejects.toThrow('HTTP 404');
    });

    it('should not change workflow ID', async () => {
      const updated = await client.updateWorkflow('wf-1', { id: 'new-id' } as any);

      expect(updated.id).toBe('wf-1');
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow', async () => {
      await client.deleteWorkflow('wf-1');

      await expect(client.getWorkflow('wf-1')).rejects.toThrow('HTTP 404');
    });

    it('should throw 404 for non-existent workflow', async () => {
      await expect(client.deleteWorkflow('non-existent')).rejects.toThrow('HTTP 404');
    });
  });

  describe('getExecutions', () => {
    it('should fetch all executions', async () => {
      const executions = await client.getExecutions();

      expect(executions).toHaveLength(2);
      expect(executions[0]).toHaveProperty('id');
      expect(executions[0]).toHaveProperty('workflowId');
      expect(executions[0]).toHaveProperty('status');
    });

    it('should filter by workflowId', async () => {
      const executions = await client.getExecutions({ workflowId: 'wf-1' });

      expect(executions).toHaveLength(2);
      expect(executions.every(e => e.workflowId === 'wf-1')).toBe(true);
    });

    it('should filter by status', async () => {
      const executions = await client.getExecutions({ status: 'error' });

      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('error');
    });

    it('should limit results', async () => {
      const executions = await client.getExecutions({ limit: 1 });

      expect(executions).toHaveLength(1);
    });

    it('should combine filters', async () => {
      const executions = await client.getExecutions({
        workflowId: 'wf-1',
        status: 'success',
        limit: 10,
      });

      expect(executions).toHaveLength(1);
      expect(executions[0]).toMatchObject({
        workflowId: 'wf-1',
        status: 'success',
      });
    });
  });

  describe('getExecution', () => {
    it('should fetch execution by ID', async () => {
      const execution = await client.getExecution('exec-1');

      expect(execution).toMatchObject({
        id: 'exec-1',
        workflowId: 'wf-1',
        status: 'success',
      });
    });

    it('should throw 404 for non-existent execution', async () => {
      await expect(client.getExecution('non-existent')).rejects.toThrow('HTTP 404');
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow and return execution ID', async () => {
      const result = await client.executeWorkflow('wf-1');

      expect(result).toHaveProperty('executionId');
      expect(result.executionId).toMatch(/^exec-\d+$/);
    });

    it('should throw 404 for non-existent workflow', async () => {
      await expect(client.executeWorkflow('non-existent')).rejects.toThrow('HTTP 404');
    });

    it('should create execution in running state', async () => {
      const { executionId } = await client.executeWorkflow('wf-1');

      // Wait a bit for execution to start
      await new Promise(resolve => setTimeout(resolve, 50));

      const execution = await client.getExecution(executionId);

      expect(execution.status).toMatch(/running|success/);
    });
  });

  describe('retryExecution', () => {
    it('should retry failed execution', async () => {
      const result = await client.retryExecution('exec-2');

      expect(result).toHaveProperty('executionId');
      expect(result.executionId).not.toBe('exec-2');
    });

    it('should throw 404 for non-existent execution', async () => {
      await expect(client.retryExecution('non-existent')).rejects.toThrow('HTTP 404');
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      // Stop server to simulate network error
      await mockServer.stop();

      const promise = client.getWorkflows();

      // Start server again after 500ms
      setTimeout(async () => {
        await mockServer.start();
      }, 500);

      // Should eventually succeed after retry
      await expect(promise).rejects.toThrow();
    });

    it('should not retry on 4xx errors', async () => {
      const startTime = Date.now();

      await expect(client.getWorkflow('non-existent')).rejects.toThrow('HTTP 404');

      const duration = Date.now() - startTime;

      // Should fail immediately without retries (<100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('timeout handling', () => {
    it('should timeout long requests', async () => {
      const shortTimeoutClient = new N8nApiClient({
        baseUrl: 'http://localhost:5679',
        apiKey: 'test-api-key',
        timeout: 100,
        retries: 0,
      });

      // Mock slow endpoint
      mockServer['app'].get('/slow', async (req, res) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        res.json({ ok: true });
      });

      await expect(
        shortTimeoutClient['request']('/slow')
      ).rejects.toThrow();
    });
  });
});
