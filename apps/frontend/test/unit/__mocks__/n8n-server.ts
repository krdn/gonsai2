/**
 * Mock n8n Server
 *
 * Express-based mock server for testing n8n API integration.
 */

import express, { Express, Request, Response } from 'express';
import { Server } from 'http';

interface MockWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface MockExecution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook';
  status: 'success' | 'error' | 'waiting' | 'running';
  startedAt: string;
  stoppedAt?: string;
  data?: any;
}

class MockN8nServer {
  private app: Express;
  private server: Server | null = null;
  private port: number = 5678;

  private workflows: Map<string, MockWorkflow> = new Map();
  private executions: Map<string, MockExecution> = new Map();

  constructor(port?: number) {
    if (port) this.port = port;
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
    this.setupDefaultData();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/healthz', (req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Workflows endpoints
    this.app.get('/api/v1/workflows', this.getWorkflows.bind(this));
    this.app.get('/api/v1/workflows/:id', this.getWorkflow.bind(this));
    this.app.post('/api/v1/workflows', this.createWorkflow.bind(this));
    this.app.put('/api/v1/workflows/:id', this.updateWorkflow.bind(this));
    this.app.delete('/api/v1/workflows/:id', this.deleteWorkflow.bind(this));

    // Executions endpoints
    this.app.get('/api/v1/executions', this.getExecutions.bind(this));
    this.app.get('/api/v1/executions/:id', this.getExecution.bind(this));
    this.app.post('/api/v1/executions/:id/retry', this.retryExecution.bind(this));

    // Workflow execution
    this.app.post('/api/v1/workflows/:id/execute', this.executeWorkflow.bind(this));
  }

  /**
   * Setup default test data
   */
  private setupDefaultData(): void {
    // Add test workflows
    this.workflows.set('wf-1', {
      id: 'wf-1',
      name: 'Test Workflow 1',
      active: true,
      nodes: [
        { id: 'node-1', type: 'n8n-nodes-base.start', position: [0, 0] },
        { id: 'node-2', type: 'n8n-nodes-base.httpRequest', position: [200, 0] },
      ],
      connections: {},
      tags: ['test'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.workflows.set('wf-2', {
      id: 'wf-2',
      name: 'Test Workflow 2',
      active: false,
      nodes: [
        { id: 'node-1', type: 'n8n-nodes-base.start', position: [0, 0] },
      ],
      connections: {},
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add test executions
    this.executions.set('exec-1', {
      id: 'exec-1',
      workflowId: 'wf-1',
      mode: 'manual',
      status: 'success',
      startedAt: new Date(Date.now() - 60000).toISOString(),
      stoppedAt: new Date().toISOString(),
    });

    this.executions.set('exec-2', {
      id: 'exec-2',
      workflowId: 'wf-1',
      mode: 'trigger',
      status: 'error',
      startedAt: new Date(Date.now() - 120000).toISOString(),
      stoppedAt: new Date(Date.now() - 60000).toISOString(),
      data: {
        resultData: {
          error: {
            message: 'Connection timeout',
          },
        },
      },
    });
  }

  /**
   * Get workflows
   */
  private getWorkflows(req: Request, res: Response): void {
    const workflows = Array.from(this.workflows.values());
    res.json({ data: workflows });
  }

  /**
   * Get workflow by ID
   */
  private getWorkflow(req: Request, res: Response): void {
    const workflow = this.workflows.get(req.params.id);

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    res.json(workflow);
  }

  /**
   * Create workflow
   */
  private createWorkflow(req: Request, res: Response): void {
    const id = `wf-${Date.now()}`;
    const workflow: MockWorkflow = {
      id,
      name: req.body.name || 'New Workflow',
      active: req.body.active || false,
      nodes: req.body.nodes || [],
      connections: req.body.connections || {},
      tags: req.body.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workflows.set(id, workflow);
    res.status(201).json(workflow);
  }

  /**
   * Update workflow
   */
  private updateWorkflow(req: Request, res: Response): void {
    const workflow = this.workflows.get(req.params.id);

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    const updated = {
      ...workflow,
      ...req.body,
      id: workflow.id,
      updatedAt: new Date().toISOString(),
    };

    this.workflows.set(req.params.id, updated);
    res.json(updated);
  }

  /**
   * Delete workflow
   */
  private deleteWorkflow(req: Request, res: Response): void {
    const exists = this.workflows.has(req.params.id);

    if (!exists) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    this.workflows.delete(req.params.id);
    res.status(204).send();
  }

  /**
   * Get executions
   */
  private getExecutions(req: Request, res: Response): void {
    let executions = Array.from(this.executions.values());

    // Filter by workflowId
    if (req.query.workflowId) {
      executions = executions.filter(e => e.workflowId === req.query.workflowId);
    }

    // Filter by status
    if (req.query.status) {
      executions = executions.filter(e => e.status === req.query.status);
    }

    // Limit
    const limit = parseInt(req.query.limit as string) || 50;
    executions = executions.slice(0, limit);

    res.json({ data: executions });
  }

  /**
   * Get execution by ID
   */
  private getExecution(req: Request, res: Response): void {
    const execution = this.executions.get(req.params.id);

    if (!execution) {
      return res.status(404).json({ message: 'Execution not found' });
    }

    res.json(execution);
  }

  /**
   * Execute workflow
   */
  private executeWorkflow(req: Request, res: Response): void {
    const workflow = this.workflows.get(req.params.id);

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    const executionId = `exec-${Date.now()}`;
    const execution: MockExecution = {
      id: executionId,
      workflowId: req.params.id,
      mode: 'manual',
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    this.executions.set(executionId, execution);

    // Simulate execution completion after 100ms
    setTimeout(() => {
      const completed: MockExecution = {
        ...execution,
        status: 'success',
        stoppedAt: new Date().toISOString(),
      };
      this.executions.set(executionId, completed);
    }, 100);

    res.json({ executionId });
  }

  /**
   * Retry execution
   */
  private retryExecution(req: Request, res: Response): void {
    const execution = this.executions.get(req.params.id);

    if (!execution) {
      return res.status(404).json({ message: 'Execution not found' });
    }

    const newExecutionId = `exec-${Date.now()}`;
    const newExecution: MockExecution = {
      id: newExecutionId,
      workflowId: execution.workflowId,
      mode: 'manual',
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    this.executions.set(newExecutionId, newExecution);

    setTimeout(() => {
      const completed: MockExecution = {
        ...newExecution,
        status: 'success',
        stoppedAt: new Date().toISOString(),
      };
      this.executions.set(newExecutionId, completed);
    }, 100);

    res.json({ executionId: newExecutionId });
  }

  /**
   * Start server
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Mock n8n server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock n8n server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Reset server data
   */
  reset(): void {
    this.workflows.clear();
    this.executions.clear();
    this.setupDefaultData();
  }

  /**
   * Add custom workflow
   */
  addWorkflow(workflow: MockWorkflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Add custom execution
   */
  addExecution(execution: MockExecution): void {
    this.executions.set(execution.id, execution);
  }
}

export default MockN8nServer;
export type { MockWorkflow, MockExecution };
