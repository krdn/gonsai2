/**
 * API 모듈 통합 export
 *
 * 기존 api-client.ts와의 호환성을 유지하면서 모듈화된 구조 제공
 */

// Client & Error
export { getApiUrl, fetchWithErrorHandling, ApiClientError } from './client';

// Types
export * from './types';

// API Modules
export { workflowsApi, executionsApi } from './workflows.api';
export { foldersApi } from './folders.api';
export { usersApi } from './users.api';
export { monitoringApi, systemApi, agentsApi, tagsApi } from './monitoring.api';
export { adminApi } from './admin.api';
export { dashboardApi } from './dashboard.api';

// 기존 api-client.ts 호환을 위한 통합 export
import { workflowsApi, executionsApi } from './workflows.api';
import { foldersApi } from './folders.api';
import { usersApi } from './users.api';
import { monitoringApi, systemApi, agentsApi, tagsApi } from './monitoring.api';
import { adminApi } from './admin.api';
import { dashboardApi } from './dashboard.api';

export const apiClient = {
  workflows: workflowsApi,
  executions: executionsApi,
  monitoring: monitoringApi,
  system: systemApi,
  agents: agentsApi,
  tags: tagsApi,
  folders: foldersApi,
  users: usersApi,
  admin: adminApi,
  dashboard: dashboardApi,
};

export default apiClient;
