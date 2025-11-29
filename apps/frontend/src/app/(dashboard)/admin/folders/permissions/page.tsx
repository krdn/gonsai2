'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Users,
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  ArrowLeft,
  X,
  AlertCircle,
  FolderOpen,
  User,
  Edit,
} from 'lucide-react';
import {
  foldersApi,
  usersApi,
  FolderResponse,
  FolderPermissionResponse,
  PermissionLevel,
  UserResponse,
} from '@/lib/api-client';
import { useFolderPermissions } from '@/hooks/useFolders';

// 권한 레벨별 표시 정보
const PERMISSION_INFO: Record<
  PermissionLevel,
  { label: string; color: string; description: string }
> = {
  viewer: {
    label: '뷰어',
    color: 'bg-gray-100 text-gray-700',
    description: '워크플로우 목록 및 상세 정보 조회만 가능',
  },
  executor: {
    label: '실행자',
    color: 'bg-blue-100 text-blue-700',
    description: '워크플로우 조회 및 실행 가능',
  },
  editor: {
    label: '편집자',
    color: 'bg-green-100 text-green-700',
    description: '워크플로우 조회, 실행, 편집 가능',
  },
  admin: {
    label: '관리자',
    color: 'bg-purple-100 text-purple-700',
    description: '모든 작업 가능 (권한 관리 포함)',
  },
};

// 권한 관리 콘텐츠 컴포넌트
function PermissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folder');

  // 상태
  const [folder, setFolder] = useState<FolderResponse | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<FolderPermissionResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form 상태
  const [permissionForm, setPermissionForm] = useState({
    userId: '',
    permission: 'viewer' as PermissionLevel,
  });

  // 권한 목록
  const {
    data: permissionsData,
    refetch: refetchPermissions,
    isLoading: permissionsLoading,
  } = useFolderPermissions(folderId || '');
  const permissions = permissionsData?.data || [];

  // 폴더 정보 로드
  useEffect(() => {
    if (folderId) {
      loadFolderAndUsers(folderId);
    }
  }, [folderId]);

  const loadFolderAndUsers = async (id: string) => {
    try {
      const [folderRes, usersRes] = await Promise.all([
        foldersApi.get(id),
        usersApi.list().catch(() => ({ data: [] })),
      ]);
      setFolder(folderRes.data);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError('폴더 정보를 불러올 수 없습니다');
    }
  };

  // 권한 추가
  const handleAddPermission = async () => {
    if (!folderId || !permissionForm.userId) return;
    try {
      setLoading(true);
      setError(null);
      await foldersApi.addPermission(folderId, permissionForm.userId, permissionForm.permission);
      setIsAddModalOpen(false);
      setPermissionForm({ userId: '', permission: 'viewer' });
      refetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 추가 실패');
    } finally {
      setLoading(false);
    }
  };

  // 권한 수정
  const handleUpdatePermission = async () => {
    if (!folderId || !selectedPermission) return;
    try {
      setLoading(true);
      setError(null);
      await foldersApi.updatePermission(
        folderId,
        selectedPermission.userId,
        permissionForm.permission
      );
      setIsEditModalOpen(false);
      setSelectedPermission(null);
      refetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 수정 실패');
    } finally {
      setLoading(false);
    }
  };

  // 권한 삭제
  const handleDeletePermission = async () => {
    if (!folderId || !selectedPermission) return;
    try {
      setLoading(true);
      setError(null);
      await foldersApi.removePermission(folderId, selectedPermission.userId);
      setIsDeleteModalOpen(false);
      setSelectedPermission(null);
      refetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 삭제 실패');
    } finally {
      setLoading(false);
    }
  };

  // 권한이 없는 사용자 목록
  const availableUsers = users.filter((user) => !permissions.some((p) => p.userId === user.id));

  if (!folderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg text-gray-600">폴더가 선택되지 않았습니다</p>
          <button
            onClick={() => router.push('/admin/folders')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            폴더 관리로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/admin/folders?folder=${folderId}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Shield className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">권한 관리</h1>
                <p className="text-sm text-gray-500">
                  {folder ? `${folder.name} 폴더의 사용자 권한을 관리합니다` : '로딩 중...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchPermissions()}
                disabled={permissionsLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${permissionsLoading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
              <button
                onClick={() => {
                  setPermissionForm({ userId: '', permission: 'viewer' });
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>권한 추가</span>
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
        <div className="flex-1 p-6">
          {/* 폴더 정보 */}
          {folder && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-amber-500" />
                <div>
                  <h2 className="font-semibold text-gray-900">{folder.name}</h2>
                  {folder.description && (
                    <p className="text-sm text-gray-500">{folder.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 권한 레벨 설명 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">권한 레벨 설명</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(PERMISSION_INFO).map(([level, info]) => (
                <div key={level} className="bg-white rounded-lg p-3">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${info.color}`}
                  >
                    {info.label}
                  </span>
                  <p className="mt-2 text-xs text-gray-600">{info.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 권한 목록 */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                사용자 권한 ({permissions.length})
              </h3>
            </div>

            {permissionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>할당된 권한이 없습니다</p>
                <p className="text-sm">권한 추가 버튼을 눌러 사용자에게 권한을 부여하세요</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {permission.userName || '알 수 없는 사용자'}
                        </p>
                        <p className="text-sm text-gray-500">{permission.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded ${
                          PERMISSION_INFO[permission.permission].color
                        }`}
                      >
                        {PERMISSION_INFO[permission.permission].label}
                      </span>
                      {permission.inherited && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                          상속됨
                        </span>
                      )}
                      {!permission.inherited && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPermission(permission);
                              setPermissionForm({
                                userId: permission.userId,
                                permission: permission.permission,
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="권한 수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPermission(permission);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="권한 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 권한 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">권한 추가</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용자 *</label>
                <select
                  value={permissionForm.userId}
                  onChange={(e) => setPermissionForm({ ...permissionForm, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">사용자 선택</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    모든 사용자에게 이미 권한이 부여되었습니다
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">권한 레벨 *</label>
                <select
                  value={permissionForm.permission}
                  onChange={(e) =>
                    setPermissionForm({
                      ...permissionForm,
                      permission: e.target.value as PermissionLevel,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {Object.entries(PERMISSION_INFO).map(([level, info]) => (
                    <option key={level} value={level}>
                      {info.label} - {info.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddPermission}
                disabled={!permissionForm.userId || loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 권한 수정 모달 */}
      {isEditModalOpen && selectedPermission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">권한 수정</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{selectedPermission.userName}</p>
              <p className="text-sm text-gray-500">{selectedPermission.userEmail}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">권한 레벨 *</label>
              <select
                value={permissionForm.permission}
                onChange={(e) =>
                  setPermissionForm({
                    ...permissionForm,
                    permission: e.target.value as PermissionLevel,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {Object.entries(PERMISSION_INFO).map(([level, info]) => (
                  <option key={level} value={level}>
                    {info.label} - {info.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleUpdatePermission}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 권한 삭제 확인 모달 */}
      {isDeleteModalOpen && selectedPermission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">권한 삭제</h3>
            </div>
            <p className="text-gray-600 mb-6">
              <strong>{selectedPermission.userName}</strong>의 권한을 삭제하시겠습니까?
              <br />
              <span className="text-sm text-red-600">
                이 사용자는 더 이상 이 폴더의 워크플로우에 접근할 수 없습니다.
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
                onClick={handleDeletePermission}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Suspense로 감싼 페이지 export
export default function FolderPermissionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">권한 정보를 불러오는 중...</p>
          </div>
        </div>
      }
    >
      <PermissionsContent />
    </Suspense>
  );
}
