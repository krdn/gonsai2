/**
 * N8n API Client
 *
 * Client for interacting with n8n REST API.
 */

export interface N8nClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retries?: number;
}

export interface Workflow {
  id: string;
  name: string;
  active?: boolean;
  nodes: WorkflowNode[];
  connections: Record<
    string,
    { main: Array<Array<{ node: string; type: string; index: number }>> }
  >;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
}

export interface Execution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook';
  status: 'running' | 'success' | 'error' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  data?: Record<string, unknown>;
}

export interface ExecutionFilters {
  workflowId?: string;
  status?: string;
  limit?: number;
}

class N8nApiClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retries: number;

  constructor(config: N8nClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.retries = config.retries ?? 3;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const headers = {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': this.apiKey,
      ...options.headers,
    };

    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts <= this.retries) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`HTTP ${response.status}: ${errorText}`);

          // Don't retry 4xx errors
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }

          lastError = error;
          attempts++;
          continue;
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
          // Don't retry 4xx errors
          if (error.message.includes('HTTP 4')) {
            throw error;
          }
          lastError = error;
        }

        attempts++;

        if (attempts <= this.retries) {
          // Wait before retry with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request('/healthz');
  }

  async getWorkflows(): Promise<Workflow[]> {
    const result = await this.request<{ data: Workflow[] }>('/api/v1/workflows');
    return result.data || [];
  }

  async getWorkflow(id: string): Promise<Workflow> {
    return this.request(`/api/v1/workflows/${id}`);
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    return this.request('/api/v1/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    return this.request(`/api/v1/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.request(`/api/v1/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async getExecutions(filters?: ExecutionFilters): Promise<Execution[]> {
    const params = new URLSearchParams();

    if (filters?.workflowId) {
      params.append('workflowId', filters.workflowId);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }

    const queryString = params.toString();
    const path = queryString ? `/api/v1/executions?${queryString}` : '/api/v1/executions';

    const result = await this.request<{ data: Execution[] }>(path);
    return result.data || [];
  }

  async getExecution(id: string): Promise<Execution> {
    return this.request(`/api/v1/executions/${id}`);
  }

  async executeWorkflow(id: string): Promise<{ executionId: string }> {
    return this.request(`/api/v1/workflows/${id}/execute`, {
      method: 'POST',
    });
  }

  async retryExecution(id: string): Promise<{ executionId: string }> {
    return this.request(`/api/v1/executions/${id}/retry`, {
      method: 'POST',
    });
  }
}

export default N8nApiClient;
