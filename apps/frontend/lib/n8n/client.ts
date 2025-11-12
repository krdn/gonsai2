/**
 * n8n API Client
 *
 * Type-safe client for n8n REST API with error handling and retry logic.
 */

interface N8nClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retries?: number;
}

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Execution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'internal';
  status: 'success' | 'error' | 'waiting' | 'running';
  startedAt: string;
  stoppedAt?: string;
  data?: any;
}

interface ExecutionFilter {
  workflowId?: string;
  status?: Execution['status'];
  limit?: number;
}

class N8nApiClient {
  private config: Required<N8nClientConfig>;

  constructor(config: N8nClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
    };
  }

  /**
   * Make API request with retries
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': this.config.apiKey,
      ...options.headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return null as T;
        }

        return await response.json();
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.message?.includes('HTTP 4')) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retries) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/healthz');
  }

  /**
   * Get all workflows
   */
  async getWorkflows(): Promise<Workflow[]> {
    const response = await this.request<{ data: Workflow[] }>('/api/v1/workflows');
    return response.data;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<Workflow> {
    return this.request(`/api/v1/workflows/${id}`);
  }

  /**
   * Create workflow
   */
  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    return this.request('/api/v1/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  /**
   * Update workflow
   */
  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    return this.request(`/api/v1/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    await this.request(`/api/v1/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get executions
   */
  async getExecutions(filter: ExecutionFilter = {}): Promise<Execution[]> {
    const params = new URLSearchParams();

    if (filter.workflowId) params.append('workflowId', filter.workflowId);
    if (filter.status) params.append('status', filter.status);
    if (filter.limit) params.append('limit', filter.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<{ data: Execution[] }>(`/api/v1/executions${query}`);

    return response.data;
  }

  /**
   * Get execution by ID
   */
  async getExecution(id: string): Promise<Execution> {
    return this.request(`/api/v1/executions/${id}`);
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(id: string, data?: any): Promise<{ executionId: string }> {
    return this.request(`/api/v1/workflows/${id}/execute`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Retry execution
   */
  async retryExecution(id: string): Promise<{ executionId: string }> {
    return this.request(`/api/v1/executions/${id}/retry`, {
      method: 'POST',
    });
  }
}

export default N8nApiClient;
export type { N8nClientConfig, Workflow, Execution, ExecutionFilter };
