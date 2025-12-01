/**
 * Folders API
 */

import { getApiUrl, fetchWithErrorHandling } from './client';
import { FolderResponse, FolderTreeNode, FolderPermissionResponse, PermissionLevel } from './types';

export const foldersApi = {
  /**
   * 사용자가 접근 가능한 폴더 목록 조회
   */
  list: (options?: { tree?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.tree) {
      params.set('tree', 'true');
    }
    const queryString = params.toString();
    return fetchWithErrorHandling<{ success: boolean; data: FolderResponse[] | FolderTreeNode[] }>(
      `${getApiUrl()}/api/folders${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * 폴더 트리 구조 조회
   */
  tree: () =>
    fetchWithErrorHandling<{ success: boolean; data: FolderTreeNode[] }>(
      `${getApiUrl()}/api/folders?tree=true`
    ),

  /**
   * 특정 폴더 조회
   */
  get: (id: string) =>
    fetchWithErrorHandling<{ success: boolean; data: FolderResponse }>(
      `${getApiUrl()}/api/folders/${id}`
    ),

  /**
   * 폴더 생성 (admin 전용)
   */
  create: (data: { name: string; description?: string; parentId?: string }) =>
    fetchWithErrorHandling<{ success: boolean; data: FolderResponse }>(
      `${getApiUrl()}/api/folders`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  /**
   * 폴더 수정
   */
  update: (id: string, data: { name?: string; description?: string; parentId?: string | null }) =>
    fetchWithErrorHandling<{ success: boolean; data: FolderResponse }>(
      `${getApiUrl()}/api/folders/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),

  /**
   * 폴더 삭제 (admin 전용)
   */
  delete: (id: string, options?: { deleteChildren?: boolean }) =>
    fetchWithErrorHandling(
      `${getApiUrl()}/api/folders/${id}${options?.deleteChildren ? '?deleteChildren=true' : ''}`,
      {
        method: 'DELETE',
      }
    ),

  /**
   * 폴더 내 워크플로우 ID 목록 조회
   */
  getWorkflows: (id: string) =>
    fetchWithErrorHandling<{ success: boolean; data: string[] }>(
      `${getApiUrl()}/api/folders/${id}/workflows`
    ),

  /**
   * 워크플로우를 폴더에 할당
   */
  assignWorkflow: (folderId: string, workflowId: string) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/workflows`, {
      method: 'POST',
      body: JSON.stringify({ workflowId }),
    }),

  /**
   * 여러 워크플로우를 폴더에 일괄 할당
   */
  assignWorkflows: (folderId: string, workflowIds: string[]) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/workflows/bulk`, {
      method: 'POST',
      body: JSON.stringify({ workflowIds }),
    }),

  /**
   * 워크플로우 폴더 할당 해제
   */
  unassignWorkflow: (folderId: string, workflowId: string) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/workflows/${workflowId}`, {
      method: 'DELETE',
    }),

  /**
   * 폴더 권한 목록 조회
   */
  getPermissions: (id: string) =>
    fetchWithErrorHandling<{ success: boolean; data: FolderPermissionResponse[] }>(
      `${getApiUrl()}/api/folders/${id}/permissions`
    ),

  /**
   * 사용자에게 폴더 권한 부여
   */
  addPermission: (folderId: string, userId: string, permission: PermissionLevel) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ userId, permission }),
    }),

  /**
   * 폴더 권한 수정
   */
  updatePermission: (folderId: string, userId: string, permission: PermissionLevel) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/permissions/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ permission }),
    }),

  /**
   * 폴더 권한 삭제
   */
  removePermission: (folderId: string, userId: string) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/permissions/${userId}`, {
      method: 'DELETE',
    }),

  /**
   * 현재 사용자의 모든 폴더 권한 조회
   */
  getMyPermissions: () => fetchWithErrorHandling(`${getApiUrl()}/api/folders/my-permissions`),
};
