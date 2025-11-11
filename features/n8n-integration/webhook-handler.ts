/**
 * n8n Webhook Handler
 *
 * @module n8n-integration/webhook-handler
 * @description Handles incoming webhooks from n8n workflows
 *
 * @aiContext
 * This module processes webhook requests triggered by n8n workflows.
 * Supports various response modes and authentication methods.
 *
 * Usage in Express:
 * ```typescript
 * const handler = new WebhookHandler(n8nClient);
 * app.post('/webhook/:path', handler.handle.bind(handler));
 * ```
 */

import type {
  WebhookRequest,
  WebhookResponse,
  WorkflowExecution,
} from './types';
import type { N8nClient } from './api-client';

/**
 * Webhook handler configuration
 */
export interface WebhookHandlerConfig {
  /** n8n client instance */
  n8nClient: N8nClient;

  /** Authentication validator (optional) */
  authValidator?: (request: WebhookRequest) => Promise<boolean>;

  /** Response timeout in milliseconds */
  responseTimeout?: number;

  /** Enable detailed logging */
  enableLogging?: boolean;
}

/**
 * Webhook processing result
 */
export interface WebhookResult {
  /** HTTP status code */
  statusCode: number;

  /** Response body */
  body: unknown;

  /** Response headers */
  headers?: Record<string, string>;

  /** Execution ID (if workflow was triggered) */
  executionId?: string;

  /** Processing metadata */
  metadata: {
    /** Time taken to process (ms) */
    processingTime: number;

    /** Whether workflow was triggered */
    workflowTriggered: boolean;

    /** Any warnings */
    warnings?: string[];
  };
}

/**
 * Webhook handler for n8n workflows
 *
 * @aiContext
 * Handles the full lifecycle of webhook requests:
 * 1. Authentication
 * 2. Validation
 * 3. Workflow triggering
 * 4. Response generation
 */
export class WebhookHandler {
  private readonly n8nClient: N8nClient;
  private readonly authValidator?: (request: WebhookRequest) => Promise<boolean>;
  private readonly responseTimeout: number;
  private readonly enableLogging: boolean;

  constructor(config: WebhookHandlerConfig) {
    this.n8nClient = config.n8nClient;
    this.authValidator = config.authValidator;
    this.responseTimeout = config.responseTimeout ?? 30000; // 30s default
    this.enableLogging = config.enableLogging ?? true;
  }

  /**
   * Handle incoming webhook request
   *
   * @aiContext
   * Main entry point for webhook processing.
   * Returns a WebhookResult that can be sent to the HTTP client.
   *
   * @example
   * ```typescript
   * const result = await handler.handle({
   *   headers: req.headers,
   *   body: req.body,
   *   query: req.query,
   *   params: req.params
   * });
   * res.status(result.statusCode).json(result.body);
   * ```
   */
  async handle(request: WebhookRequest): Promise<WebhookResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Step 1: Authentication
      if (this.authValidator) {
        const isAuthenticated = await this.authValidator(request);
        if (!isAuthenticated) {
          return this.createErrorResult(
            401,
            'Unauthorized',
            startTime,
            warnings
          );
        }
      }

      // Step 2: Extract workflow identifier from path
      const workflowId = this.extractWorkflowId(request);
      if (!workflowId) {
        return this.createErrorResult(
          400,
          'Workflow ID not found in request',
          startTime,
          warnings
        );
      }

      // Step 3: Validate request body
      const validationResult = this.validateRequestBody(request.body);
      if (!validationResult.isValid) {
        return this.createErrorResult(
          400,
          validationResult.error ?? 'Invalid request body',
          startTime,
          warnings
        );
      }

      // Step 4: Trigger workflow
      this.log('info', `Triggering workflow ${workflowId}`);

      const execution = await this.n8nClient.executions.execute(
        workflowId,
        this.buildTriggerData(request)
      );

      this.log('info', `Workflow ${workflowId} triggered: ${execution.id}`);

      // Step 5: Wait for response (or return immediately)
      const responseMode = this.getResponseMode(request);

      if (responseMode === 'onReceived') {
        // Return immediately without waiting
        return this.createSuccessResult(
          202,
          { message: 'Workflow triggered', executionId: execution.id },
          startTime,
          warnings,
          execution.id
        );
      }

      // Wait for workflow completion
      try {
        const completedExecution =
          await this.n8nClient.executions.waitForCompletion(execution.id, {
            maxWaitMs: this.responseTimeout,
          });

        if (completedExecution.status === 'error') {
          return this.createErrorResult(
            500,
            completedExecution.error?.message ?? 'Workflow execution failed',
            startTime,
            warnings,
            execution.id
          );
        }

        // Extract response from last node
        const responseData = this.extractResponseData(completedExecution);

        return this.createSuccessResult(
          200,
          responseData,
          startTime,
          warnings,
          execution.id
        );
      } catch (timeoutError) {
        warnings.push('Workflow execution timeout');
        return this.createSuccessResult(
          202,
          {
            message: 'Workflow execution in progress',
            executionId: execution.id,
          },
          startTime,
          warnings,
          execution.id
        );
      }
    } catch (error) {
      this.log('error', `Webhook handling error: ${error}`);

      return this.createErrorResult(
        500,
        error instanceof Error ? error.message : 'Internal server error',
        startTime,
        warnings
      );
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Extract workflow ID from request
   */
  private extractWorkflowId(request: WebhookRequest): string | undefined {
    // Try path params first
    if (request.params.workflowId) {
      return request.params.workflowId;
    }

    // Try query params
    if (request.query.workflowId) {
      return request.query.workflowId;
    }

    // Try custom header
    if (request.headers['x-n8n-workflow-id']) {
      return request.headers['x-n8n-workflow-id'];
    }

    return undefined;
  }

  /**
   * Validate request body
   */
  private validateRequestBody(body: unknown): {
    isValid: boolean;
    error?: string;
  } {
    // Basic validation - can be extended
    if (body === undefined || body === null) {
      return { isValid: false, error: 'Request body is required' };
    }

    return { isValid: true };
  }

  /**
   * Build trigger data from request
   */
  private buildTriggerData(request: WebhookRequest): Record<string, unknown> {
    return {
      headers: request.headers,
      body: request.body,
      query: request.query,
      params: request.params,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get response mode from request
   */
  private getResponseMode(
    request: WebhookRequest
  ): 'onReceived' | 'lastNode' {
    const mode = request.headers['x-n8n-response-mode'] ?? 'lastNode';
    return mode === 'onReceived' ? 'onReceived' : 'lastNode';
  }

  /**
   * Extract response data from execution
   */
  private extractResponseData(execution: WorkflowExecution): unknown {
    const runData = execution.data.resultData.runData;
    const nodeNames = Object.keys(runData);

    if (nodeNames.length === 0) {
      return { success: true, message: 'Workflow completed' };
    }

    // Get last node's output
    const lastNodeName = nodeNames[nodeNames.length - 1];
    const lastNodeData = runData[lastNodeName];

    if (!lastNodeData || lastNodeData.length === 0) {
      return { success: true, message: 'Workflow completed' };
    }

    const lastRun = lastNodeData[lastNodeData.length - 1];
    const mainData = lastRun.data?.main?.[0];

    if (!mainData || mainData.length === 0) {
      return { success: true, message: 'Workflow completed' };
    }

    return mainData[0].json;
  }

  /**
   * Create success result
   */
  private createSuccessResult(
    statusCode: number,
    body: unknown,
    startTime: number,
    warnings: string[],
    executionId?: string
  ): WebhookResult {
    return {
      statusCode,
      body,
      executionId,
      metadata: {
        processingTime: Date.now() - startTime,
        workflowTriggered: !!executionId,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(
    statusCode: number,
    message: string,
    startTime: number,
    warnings: string[],
    executionId?: string
  ): WebhookResult {
    return {
      statusCode,
      body: { error: message },
      executionId,
      metadata: {
        processingTime: Date.now() - startTime,
        workflowTriggered: !!executionId,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    };
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'warn' | 'error', message: string): void {
    if (this.enableLogging) {
      console[level](`[WebhookHandler] ${message}`);
    }
  }
}

/**
 * Create webhook handler with default configuration
 *
 * @aiContext
 * Convenience factory for creating webhook handlers.
 */
export function createWebhookHandler(
  n8nClient: N8nClient,
  config?: Omit<WebhookHandlerConfig, 'n8nClient'>
): WebhookHandler {
  return new WebhookHandler({
    n8nClient,
    ...config,
  });
}
