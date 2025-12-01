/**
 * Monitoring & System API
 */

import { getApiUrl, fetchWithErrorHandling } from './client';

export const monitoringApi = {
  /**
   * 시스템 전체 통계 조회
   */
  stats: () => fetchWithErrorHandling(`${getApiUrl()}/api/monitoring/stats`),

  /**
   * 최근 실행 목록 조회
   */
  recentExecutions: (limit: number = 20) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/monitoring/executions/recent?limit=${limit}`),

  /**
   * 시간별 메트릭 조회 (차트용)
   */
  hourlyMetrics: (hours: number = 24) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/monitoring/metrics/hourly?hours=${hours}`),

  /**
   * 시스템 헬스 체크
   */
  systemHealth: () => fetchWithErrorHandling(`${getApiUrl()}/api/monitoring/system/health`),
};

export const systemApi = {
  /**
   * 시스템 상태 조회
   */
  status: () => fetchWithErrorHandling(`${getApiUrl()}/api/system/status`),

  /**
   * 시스템 메트릭 조회
   */
  metrics: () => fetchWithErrorHandling(`${getApiUrl()}/api/system/metrics`),
};

export const agentsApi = {
  /**
   * AI 에이전트 워크플로우 목록 조회
   */
  list: () => fetchWithErrorHandling(`${getApiUrl()}/api/agents`),

  /**
   * 특정 AI 에이전트 워크플로우 상세 조회
   */
  get: (workflowId: string) => fetchWithErrorHandling(`${getApiUrl()}/api/agents/${workflowId}`),

  /**
   * AI 에이전트 워크플로우 실행
   */
  execute: (workflowId: string, inputData: any = {}, waitForResult: boolean = false) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/agents/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ inputData, waitForResult }),
    }),

  /**
   * AI 에이전트 워크플로우 실행 기록 조회
   */
  executions: (workflowId: string, limit: number = 20) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/agents/${workflowId}/executions?limit=${limit}`),

  /**
   * 전체 AI 에이전트 통계 조회
   */
  statsOverview: () => fetchWithErrorHandling(`${getApiUrl()}/api/agents/stats/overview`),
};

export const tagsApi = {
  /**
   * 모든 태그 조회
   */
  list: () => fetchWithErrorHandling(`${getApiUrl()}/api/tags`),

  /**
   * 특정 태그 조회
   */
  get: (id: string) => fetchWithErrorHandling(`${getApiUrl()}/api/tags/${id}`),

  /**
   * 새로운 태그 생성
   */
  create: (tagData: { name: string }) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/tags`, {
      method: 'POST',
      body: JSON.stringify(tagData),
    }),

  /**
   * 태그 삭제
   */
  delete: (id: string) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/tags/${id}`, {
      method: 'DELETE',
    }),
};
