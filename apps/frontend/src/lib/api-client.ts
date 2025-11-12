/**
 * API Client
 *
 * @description Backend API와 통신하기 위한 클라이언트
 */

import type {
  N8nWorkflow,
  WorkflowExecution,
  WorkflowExecuteRequest,
  WorkflowExecuteResponse,
  WorkflowStatistics,
} from '@/types/workflow';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `API Error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`[API] Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Workflow APIs
  async getWorkflows(): Promise<N8nWorkflow[]> {
    return this.request<N8nWorkflow[]>('/api/workflows');
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/api/workflows/${id}`);
  }

  async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async updateWorkflow(
    id: string,
    workflow: Partial<N8nWorkflow>
  ): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  async deleteWorkflow(id: string): Promise<void> {
    return this.request<void>(`/api/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async activateWorkflow(id: string): Promise<void> {
    return this.request<void>(`/api/workflows/${id}/activate`, {
      method: 'POST',
    });
  }

  async deactivateWorkflow(id: string): Promise<void> {
    return this.request<void>(`/api/workflows/${id}/deactivate`, {
      method: 'POST',
    });
  }

  // Execution APIs
  async executeWorkflow(
    request: WorkflowExecuteRequest
  ): Promise<WorkflowExecuteResponse> {
    return this.request<WorkflowExecuteResponse>('/api/executions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getExecutions(
    workflowId?: string,
    limit: number = 20
  ): Promise<WorkflowExecution[]> {
    const params = new URLSearchParams();
    if (workflowId) params.append('workflowId', workflowId);
    params.append('limit', limit.toString());

    return this.request<WorkflowExecution[]>(`/api/executions?${params}`);
  }

  async getExecution(id: string): Promise<WorkflowExecution> {
    return this.request<WorkflowExecution>(`/api/executions/${id}`);
  }

  async retryExecution(id: string): Promise<WorkflowExecuteResponse> {
    return this.request<WorkflowExecuteResponse>(`/api/executions/${id}/retry`, {
      method: 'POST',
    });
  }

  async stopExecution(id: string): Promise<void> {
    return this.request<void>(`/api/executions/${id}/stop`, {
      method: 'POST',
    });
  }

  // Statistics APIs
  async getWorkflowStatistics(
    workflowId: string
  ): Promise<WorkflowStatistics> {
    return this.request<WorkflowStatistics>(
      `/api/workflows/${workflowId}/statistics`
    );
  }

  // Agent APIs
  async getAgents(): Promise<any[]> {
    return this.request<any[]>('/api/agents');
  }

  async getAgent(id: string): Promise<any> {
    return this.request<any>(`/api/agents/${id}`);
  }

  async createAgent(agent: any): Promise<any> {
    return this.request<any>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(agent),
    });
  }

  async updateAgent(id: string, agent: any): Promise<any> {
    return this.request<any>(`/api/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(agent),
    });
  }

  async deleteAgent(id: string): Promise<void> {
    return this.request<void>(`/api/agents/${id}`, {
      method: 'DELETE',
    });
  }

  // Monitoring APIs
  async getDashboardData(timeRange: string = 'day'): Promise<any> {
    return this.request<any>(`/api/monitoring/dashboard?timeRange=${timeRange}`);
  }

  async getRealtimeStatus(): Promise<any> {
    return this.request<any>('/api/monitoring/realtime');
  }

  async getSystemHealth(): Promise<any> {
    return this.request<any>('/api/monitoring/health');
  }

  async getAlerts(): Promise<any[]> {
    return this.request<any[]>('/api/monitoring/alerts');
  }

  async acknowledgeAlert(id: string): Promise<void> {
    return this.request<void>(`/api/monitoring/alerts/${id}/acknowledge`, {
      method: 'POST',
    });
  }
}

export const apiClient = new APIClient(API_BASE_URL);
