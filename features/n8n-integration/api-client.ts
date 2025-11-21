/**
 * n8n REST API Client
 *
 * @module n8n-integration/api-client
 * @description Type-safe client for n8n REST API v1
 *
 * @aiContext
 * This client provides a simple, Promise-based interface to n8n.
 * All methods return typed responses and handle errors consistently.
 *
 * Usage example:
 * ```typescript
 * const client = new N8nClient({ baseUrl, apiKey });
 * const workflows = await client.workflows.getAll();
 * ```
 */

import type {
  N8nClientConfig,
  N8nApiResponse,
  Workflow,
  WorkflowExecution,
  WorkflowTriggerData,
  ExecutionQueryFilters,
  QueryFilters,
  PaginatedResponse,
  N8nApiError,
} from './types';

/**
 * Main n8n API client
 *
 * @aiContext
 * Instantiate once and reuse throughout the application.
 * Thread-safe and connection-pooled internally via fetch API.
 */
export class N8nClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly retryConfig: { maxAttempts: number; delayMs: number };

  constructor(config: N8nClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000; // 30s default
    this.retryConfig = config.retry ?? { maxAttempts: 3, delayMs: 1000 };

    // Validate configuration
    if (!this.apiKey) {
      throw new Error('N8nClient: API key is required');
    }
  }

  // ============================================
  // Workflow Operations
  // ============================================

  /**
   * Workflow-related API operations
   */
  public readonly workflows = {
    /**
     * Get all workflows
     *
     * @aiContext
     * Returns paginated list of workflows. Use filters to narrow down results.
     */
    getAll: async (filters?: QueryFilters): Promise<PaginatedResponse<Workflow>> => {
      const params = this.buildQueryParams(filters);
      return this.request<PaginatedResponse<Workflow>>('GET', '/workflows', params);
    },

    /**
     * Get workflow by ID
     */
    getById: async (workflowId: string): Promise<Workflow> => {
      return this.request<Workflow>('GET', `/workflows/${workflowId}`);
    },

    /**
     * Create new workflow
     *
     * @aiContext
     * The workflow object should include nodes and connections.
     * For templates, see .ai/n8n-templates/
     */
    create: async (workflow: Partial<Workflow>): Promise<Workflow> => {
      return this.request<Workflow>('POST', '/workflows', undefined, workflow);
    },

    /**
     * Update existing workflow
     */
    update: async (workflowId: string, workflow: Partial<Workflow>): Promise<Workflow> => {
      return this.request<Workflow>('PUT', `/workflows/${workflowId}`, undefined, workflow);
    },

    /**
     * Delete workflow
     */
    delete: async (workflowId: string): Promise<void> => {
      await this.request<void>('DELETE', `/workflows/${workflowId}`);
    },

    /**
     * Activate workflow
     */
    activate: async (workflowId: string): Promise<Workflow> => {
      return this.request<Workflow>('PATCH', `/workflows/${workflowId}/activate`);
    },

    /**
     * Deactivate workflow
     */
    deactivate: async (workflowId: string): Promise<Workflow> => {
      return this.request<Workflow>('PATCH', `/workflows/${workflowId}/deactivate`);
    },
  };

  // ============================================
  // Execution Operations
  // ============================================

  /**
   * Execution-related API operations
   */
  public readonly executions = {
    /**
     * Execute workflow manually
     *
     * @aiContext
     * Triggers workflow execution with provided data.
     * Returns execution ID immediately (non-blocking).
     * Use `waitForCompletion()` to wait for result.
     */
    execute: async (
      workflowId: string,
      triggerData?: WorkflowTriggerData
    ): Promise<WorkflowExecution> => {
      return this.request<WorkflowExecution>(
        'POST',
        `/workflows/${workflowId}/execute`,
        undefined,
        { data: triggerData }
      );
    },

    /**
     * Get execution by ID
     */
    getById: async (executionId: string): Promise<WorkflowExecution> => {
      return this.request<WorkflowExecution>('GET', `/executions/${executionId}`);
    },

    /**
     * Get all executions
     */
    getAll: async (
      filters?: ExecutionQueryFilters
    ): Promise<PaginatedResponse<WorkflowExecution>> => {
      const params = this.buildQueryParams(filters);
      return this.request<PaginatedResponse<WorkflowExecution>>('GET', '/executions', params);
    },

    /**
     * Delete execution
     */
    delete: async (executionId: string): Promise<void> => {
      await this.request<void>('DELETE', `/executions/${executionId}`);
    },

    /**
     * Retry failed execution
     *
     * @aiContext
     * Retries a failed execution from the point of failure.
     * Useful for transient errors (network, timeouts).
     */
    retry: async (executionId: string): Promise<WorkflowExecution> => {
      return this.request<WorkflowExecution>('POST', `/executions/${executionId}/retry`);
    },

    /**
     * Wait for execution to complete
     *
     * @aiContext
     * Polls execution status until completion or timeout.
     * Use this after `execute()` when you need the result.
     */
    waitForCompletion: async (
      executionId: string,
      options?: {
        pollIntervalMs?: number;
        maxWaitMs?: number;
      }
    ): Promise<WorkflowExecution> => {
      const pollInterval = options?.pollIntervalMs ?? 2000; // 2s default
      const maxWait = options?.maxWaitMs ?? 300000; // 5min default
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        const execution = await this.executions.getById(executionId);

        if (execution.status === 'success' || execution.status === 'error') {
          return execution;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      throw new Error(`Execution ${executionId} did not complete within ${maxWait}ms`);
    },
  };

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Build query parameters from filters
   */
  private buildQueryParams(filters?: Record<string, unknown>): Record<string, string> {
    if (!filters) return {};

    const params: Record<string, string> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    }

    return params;
  }

  /**
   * Make HTTP request to n8n API
   *
   * @aiContext
   * Handles authentication, retries, and error parsing automatically.
   */
  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: unknown
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);

    // Add query parameters
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }
    }

    // Retry logic
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': this.apiKey,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.timeout),
        });

        // Handle non-OK responses
        if (!response.ok) {
          const errorBody = await response.text();
          throw this.createApiError(response.status, errorBody);
        }

        // Parse response
        if (response.status === 204) {
          return undefined as T; // No content
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (client errors)
        if (
          error instanceof Error &&
          'statusCode' in error &&
          typeof error.statusCode === 'number' &&
          error.statusCode >= 400 &&
          error.statusCode < 500
        ) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.retryConfig.maxAttempts - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.retryConfig.delayMs * (attempt + 1))
          );
        }
      }
    }

    // All retries failed
    throw lastError ?? new Error('Request failed after all retry attempts');
  }

  /**
   * Create API error from response
   */
  private createApiError(statusCode: number, body: string): N8nApiError {
    let message = `n8n API error (${statusCode})`;

    try {
      const parsed = JSON.parse(body);
      if (parsed.message) {
        message = parsed.message;
      }
    } catch {
      // Body is not JSON, use as-is
      if (body) {
        message = `${message}: ${body}`;
      }
    }

    const error = new Error(message) as N8nApiError;
    error.name = 'N8nApiError';
    error.statusCode = statusCode;

    return error;
  }
}

/**
 * Create n8n client with environment variables
 *
 * @aiContext
 * Convenience factory that reads from process.env.
 * Use this in most cases for consistency.
 *
 * @example
 * ```typescript
 * const client = createN8nClient();
 * await client.workflows.getAll();
 * ```
 */
export function createN8nClient(config?: Partial<N8nClientConfig>): N8nClient {
  return new N8nClient({
    baseUrl: config?.baseUrl ?? process.env.N8N_API_URL ?? '',
    apiKey: config?.apiKey ?? process.env.N8N_API_KEY ?? '',
    timeout: config?.timeout,
    retry: config?.retry,
  });
}
