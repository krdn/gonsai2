/**
 * Workflows API
 */

import { getApiUrl, fetchWithErrorHandling } from './client';

export const workflowsApi = {
  /**
   * 모든 워크플로우 조회
   * @param options.includeNodes - true로 설정하면 nodes 정보 포함
   */
  list: (options?: { includeNodes?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.includeNodes) {
      params.set('includeNodes', 'true');
    }
    const queryString = params.toString();
    const url = `${getApiUrl()}/api/workflows${queryString ? `?${queryString}` : ''}`;
    return fetchWithErrorHandling(url);
  },

  /**
   * 특정 워크플로우 조회
   */
  get: (id: string) => fetchWithErrorHandling(`${getApiUrl()}/api/workflows/${id}`),

  /**
   * 워크플로우 실행
   */
  execute: (id: string, inputData: any = {}, options: any = {}) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ inputData, options }),
    }),

  /**
   * 워크플로우 실행 기록 조회
   */
  executions: (id: string, limit: number = 10) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/workflows/${id}/executions?limit=${limit}`),
};

/**
 * Executions API
 */
export const executionsApi = {
  /**
   * 특정 실행 기록 조회
   */
  get: (id: string) => fetchWithErrorHandling(`${getApiUrl()}/api/executions/${id}`),

  /**
   * 워크플로우별 실행 기록 조회
   */
  listByWorkflow: (workflowId: string, limit: number = 10) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/workflows/${workflowId}/executions?limit=${limit}`),
};
