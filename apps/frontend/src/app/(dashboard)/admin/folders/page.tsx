'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FolderOpen,
  Folder,
  Plus,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Workflow,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';
import {
  foldersApi,
  workflowsApi,
  FolderTreeNode,
  FolderResponse,
  PermissionLevel,
} from '@/lib/api-client';
import {
  useFolderTree,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useAssignWorkflowToFolder,
  useUnassignWorkflowFromFolder,
} from '@/hooks/useFolders';

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  folderId?: string | null;
}

// 폴더 관리 콘텐츠 컴포넌트
function FolderManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFolderId = searchParams.get('folder');

  // 상태
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderResponse | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 폴더 form 상태
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: '',
    parentId: '',
  });

  // Hooks
  const {
    data: folderTreeData,
    refetch: refetchFolders,
    isLoading: foldersLoading,
  } = useFolderTree();
  const createFolderMutation = useCreateFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const assignWorkflowMutation = useAssignWorkflowToFolder();
  const unassignWorkflowMutation = useUnassignWorkflowFromFolder();

  const folderTree = folderTreeData?.data || [];

  // 워크플로우 목록 로드
  useEffect(() => {
    loadWorkflows();
  }, []);

  // 선택된 폴더 정보 로드
  useEffect(() => {
    if (selectedFolderId) {
      loadFolderDetail(selectedFolderId);
    } else {
      setSelectedFolder(null);
    }
  }, [selectedFolderId]);

  const loadWorkflows = async () => {
    try {
      const response = await workflowsApi.list();
      setWorkflows(response.data || []);
    } catch (err) {
      console.error('워크플로우 로드 실패:', err);
    }
  };

  const loadFolderDetail = async (folderId: string) => {
    try {
      const response = await foldersApi.get(folderId);
      setSelectedFolder(response.data);
    } catch (err) {
      console.error('폴더 상세 로드 실패:', err);
      setSelectedFolder(null);
    }
  };

  // 폴더 토글
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // 폴더 선택
  const handleSelectFolder = (folder: FolderTreeNode) => {
    router.push(`/admin/folders?folder=${folder.id}`);
  };

  // 폴더 생성
  const handleCreateFolder = async () => {
    try {
      setLoading(true);
      setError(null);
      await createFolderMutation.mutateAsync({
        name: folderForm.name,
        description: folderForm.description || undefined,
        parentId: folderForm.parentId || undefined,
      });
      setIsCreateModalOpen(false);
      setFolderForm({ name: '', description: '', parentId: '' });
      refetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  // 폴더 수정
  const handleUpdateFolder = async () => {
    if (!selectedFolder) return;
    try {
      setLoading(true);
      setError(null);
      await updateFolderMutation.mutateAsync({
        id: selectedFolder.id,
        data: {
          name: folderForm.name,
          description: folderForm.description || undefined,
        },
      });
      setIsEditModalOpen(false);
      refetchFolders();
      loadFolderDetail(selectedFolder.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 수정 실패');
    } finally {
      setLoading(false);
    }
  };

  // 폴더 삭제
  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;
    try {
      setLoading(true);
      setError(null);
      await deleteFolderMutation.mutateAsync({
        id: selectedFolder.id,
        deleteChildren: false,
      });
      setIsDeleteModalOpen(false);
      setSelectedFolder(null);
      router.push('/admin/folders');
      refetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 삭제 실패');
    } finally {
      setLoading(false);
    }
  };

  // 워크플로우 할당
  const handleAssignWorkflow = async (workflowId: string) => {
    if (!selectedFolder) return;
    try {
      await assignWorkflowMutation.mutateAsync({
        folderId: selectedFolder.id,
        workflowId,
      });
      loadWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : '워크플로우 할당 실패');
    }
  };

  // 워크플로우 할당 해제
  const handleUnassignWorkflow = async (workflowId: string) => {
    if (!selectedFolder) return;
    try {
      await unassignWorkflowMutation.mutateAsync({
        folderId: selectedFolder.id,
        workflowId,
      });
      loadWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : '워크플로우 할당 해제 실패');
    }
  };

  // 폴더 트리 렌더링
  const renderFolderTree = (folders: FolderTreeNode[], level: number = 0) => {
    return folders.map((folder) => {
      const hasChildren = folder.children && folder.children.length > 0;
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;

      return (
        <div key={folder.id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
            onClick={() => handleSelectFolder(folder)}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            {hasChildren ? (
              <FolderOpen className="w-5 h-5 text-amber-500" />
            ) : (
              <Folder className="w-5 h-5 text-amber-500" />
            )}
            <span className="font-medium flex-1">{folder.name}</span>
            {folder.workflowCount !== undefined && folder.workflowCount > 0 && (
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                {folder.workflowCount}
              </span>
            )}
          </div>
          {hasChildren && isExpanded && <div>{renderFolderTree(folder.children!, level + 1)}</div>}
        </div>
      );
    });
  };

  // 폴더에 할당된 워크플로우
  const folderWorkflows = selectedFolder
    ? workflows.filter((w) => w.folderId === selectedFolder.id)
    : [];

  // 할당되지 않은 워크플로우
  const unassignedWorkflows = workflows.filter((w) => !w.folderId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-amber-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">폴더 관리</h1>
                <p className="text-sm text-gray-500">폴더를 생성하고 워크플로우를 할당하세요</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchFolders()}
                disabled={foldersLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${foldersLoading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
              <button
                onClick={() => {
                  setFolderForm({ name: '', description: '', parentId: selectedFolderId || '' });
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>새 폴더</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* 폴더 트리 */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                폴더 구조
              </h2>
              {foldersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : folderTree.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Folder className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>폴더가 없습니다</p>
                  <p className="text-sm">새 폴더를 만들어 보세요</p>
                </div>
              ) : (
                renderFolderTree(folderTree)
              )}
            </div>
          </div>

          {/* 폴더 상세 */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedFolder ? (
              <div className="space-y-6">
                {/* 폴더 정보 */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-8 h-8 text-amber-500" />
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedFolder.name}</h2>
                        {selectedFolder.description && (
                          <p className="text-sm text-gray-500">{selectedFolder.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setFolderForm({
                            name: selectedFolder.name,
                            description: selectedFolder.description || '',
                            parentId: selectedFolder.parentId || '',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>수정</span>
                      </button>
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="flex items-center gap-1 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>삭제</span>
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/admin/folders/permissions?folder=${selectedFolder.id}`)
                        }
                        className="flex items-center gap-1 px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        <span>권한 관리</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">생성일:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(selectedFolder.createdAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">수정일:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(selectedFolder.updatedAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 할당된 워크플로우 */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Workflow className="w-5 h-5 text-blue-600" />
                      할당된 워크플로우 ({folderWorkflows.length})
                    </h3>
                    <button
                      onClick={() => setIsAssignModalOpen(true)}
                      className="flex items-center gap-1 px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>워크플로우 할당</span>
                    </button>
                  </div>

                  {folderWorkflows.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Workflow className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>할당된 워크플로우가 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {folderWorkflows.map((workflow) => (
                        <div
                          key={workflow.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Workflow className="w-5 h-5 text-blue-500" />
                            <div>
                              <p className="font-medium text-gray-900">{workflow.name}</p>
                              <p className="text-xs text-gray-500">ID: {workflow.id}</p>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-xs rounded ${
                                workflow.active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {workflow.active ? '활성' : '비활성'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleUnassignWorkflow(workflow.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="할당 해제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">폴더를 선택하세요</p>
                  <p className="text-sm">좌측에서 폴더를 선택하면 상세 정보가 표시됩니다</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 폴더 생성 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">새 폴더 만들기</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">폴더 이름 *</label>
                <input
                  type="text"
                  value={folderForm.name}
                  onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="폴더 이름 입력"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={folderForm.description}
                  onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="폴더 설명 (선택)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!folderForm.name || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 폴더 수정 모달 */}
      {isEditModalOpen && selectedFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">폴더 수정</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">폴더 이름 *</label>
                <input
                  type="text"
                  value={folderForm.name}
                  onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={folderForm.description}
                  onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleUpdateFolder}
                disabled={!folderForm.name || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 폴더 삭제 확인 모달 */}
      {isDeleteModalOpen && selectedFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">폴더 삭제</h3>
            </div>
            <p className="text-gray-600 mb-6">
              <strong>{selectedFolder.name}</strong> 폴더를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-red-600">
                이 작업은 되돌릴 수 없습니다. 할당된 워크플로우는 미할당 상태가 됩니다.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteFolder}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 워크플로우 할당 모달 */}
      {isAssignModalOpen && selectedFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">워크플로우 할당</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{selectedFolder.name}</strong> 폴더에 할당할 워크플로우를 선택하세요
            </p>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {unassignedWorkflows.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Workflow className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>할당 가능한 워크플로우가 없습니다</p>
                </div>
              ) : (
                unassignedWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <Workflow className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-gray-900">{workflow.name}</p>
                        <p className="text-xs text-gray-500">ID: {workflow.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignWorkflow(workflow.id)}
                      className="px-3 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                    >
                      할당
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Suspense로 감싼 페이지 export
export default function FolderManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">폴더를 불러오는 중...</p>
          </div>
        </div>
      }
    >
      <FolderManagementContent />
    </Suspense>
  );
}
