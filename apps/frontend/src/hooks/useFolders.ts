/**
 * useFolders Hook
 *
 * @description 폴더 목록을 가져오고 자동 동기화하는 커스텀 훅
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  foldersApi,
  FolderResponse,
  FolderTreeNode,
  FolderPermissionResponse,
} from '@/lib/api-client';

/**
 * 폴더 목록을 가져오는 훅
 *
 * @param options.tree - true면 트리 구조로, false면 플랫 리스트로 반환
 * @param options.refetchInterval - 자동 갱신 간격 (밀리초), undefined면 자동 갱신 비활성화
 * @returns 폴더 목록과 로딩/에러 상태
 */
export function useFolders(options?: { tree?: boolean; refetchInterval?: number }) {
  const { tree = false, refetchInterval } = options || {};

  return useQuery<{ success: boolean; data: FolderResponse[] | FolderTreeNode[] }, Error>({
    queryKey: ['folders', { tree }],
    queryFn: async () => {
      const response = await foldersApi.list({ tree });
      return response;
    },
    refetchInterval: refetchInterval ?? 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 폴더 트리 구조를 가져오는 훅
 *
 * @param refetchInterval - 자동 갱신 간격 (밀리초)
 * @returns 폴더 트리와 로딩/에러 상태
 */
export function useFolderTree(refetchInterval?: number) {
  return useQuery<{ success: boolean; data: FolderTreeNode[] }, Error>({
    queryKey: ['folders', 'tree'],
    queryFn: async () => {
      const response = await foldersApi.tree();
      return response;
    },
    refetchInterval: refetchInterval ?? 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 폴더 트리 배열만 반환하는 편의 훅
 *
 * @param refetchInterval - 자동 갱신 간격 (밀리초)
 * @returns 폴더 트리 배열
 */
export function useFolderTreeList(refetchInterval?: number): FolderTreeNode[] {
  const { data } = useFolderTree(refetchInterval);
  return data?.data || [];
}

/**
 * 플랫 폴더 목록만 반환하는 편의 훅
 *
 * @param refetchInterval - 자동 갱신 간격 (밀리초)
 * @returns 폴더 배열
 */
export function useFolderList(refetchInterval?: number): FolderResponse[] {
  const { data } = useFolders({ tree: false, refetchInterval });
  return (data?.data as FolderResponse[]) || [];
}

/**
 * 특정 폴더 상세 정보를 가져오는 훅
 *
 * @param folderId - 폴더 ID
 * @returns 폴더 상세 정보와 로딩/에러 상태
 */
export function useFolder(folderId: string) {
  return useQuery<{ success: boolean; data: FolderResponse }, Error>({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      const response = await foldersApi.get(folderId);
      return response;
    },
    enabled: !!folderId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 폴더 내 워크플로우 ID 목록을 가져오는 훅
 *
 * @param folderId - 폴더 ID
 * @returns 워크플로우 ID 목록과 로딩/에러 상태
 */
export function useFolderWorkflows(folderId: string) {
  return useQuery<{ success: boolean; data: string[] }, Error>({
    queryKey: ['folder', folderId, 'workflows'],
    queryFn: async () => {
      const response = await foldersApi.getWorkflows(folderId);
      return response;
    },
    enabled: !!folderId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * 폴더 권한 목록을 가져오는 훅
 *
 * @param folderId - 폴더 ID
 * @returns 권한 목록과 로딩/에러 상태
 */
export function useFolderPermissions(folderId: string) {
  return useQuery<{ success: boolean; data: FolderPermissionResponse[] }, Error>({
    queryKey: ['folder', folderId, 'permissions'],
    queryFn: async () => {
      const response = await foldersApi.getPermissions(folderId);
      return response;
    },
    enabled: !!folderId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * 폴더 생성 mutation 훅
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; parentId?: string }) => {
      const response = await foldersApi.create(data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

/**
 * 폴더 수정 mutation 훅
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string; parentId?: string | null };
    }) => {
      const response = await foldersApi.update(id, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

/**
 * 폴더 삭제 mutation 훅
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, deleteChildren }: { id: string; deleteChildren?: boolean }) => {
      const response = await foldersApi.delete(id, { deleteChildren });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

/**
 * 워크플로우를 폴더에 할당하는 mutation 훅
 */
export function useAssignWorkflowToFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, workflowId }: { folderId: string; workflowId: string }) => {
      const response = await foldersApi.assignWorkflow(folderId, workflowId);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folder', variables.folderId, 'workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

/**
 * 워크플로우 폴더 할당 해제 mutation 훅
 */
export function useUnassignWorkflowFromFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, workflowId }: { folderId: string; workflowId: string }) => {
      const response = await foldersApi.unassignWorkflow(folderId, workflowId);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folder', variables.folderId, 'workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
