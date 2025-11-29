'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  Shield,
  ShieldOff,
  Key,
  UserCheck,
  UserX,
  Search,
  AlertCircle,
} from 'lucide-react';
import { usersApi, UserResponse, CreateUserDto, UpdateUserDto } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

// 역할별 스타일
const ROLE_STYLES = {
  admin: {
    label: '관리자',
    color: 'bg-purple-100 text-purple-700',
    icon: Shield,
  },
  user: {
    label: '사용자',
    color: 'bg-gray-100 text-gray-700',
    icon: Users,
  },
};

// 상태별 스타일
const STATUS_STYLES = {
  active: {
    label: '활성',
    color: 'bg-green-100 text-green-700',
  },
  inactive: {
    label: '비활성',
    color: 'bg-red-100 text-red-700',
  },
};

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 폼 상태
  const [createForm, setCreateForm] = useState<CreateUserDto>({
    email: '',
    password: '',
    name: '',
    role: 'user',
  });
  const [editForm, setEditForm] = useState<UpdateUserDto>({});
  const [newPassword, setNewPassword] = useState('');

  // 사용자 목록 로드
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.list();
      setUsers(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 검색 필터링
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 사용자 생성
  const handleCreateUser = async () => {
    try {
      setModalLoading(true);
      setModalError(null);
      await usersApi.create(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({ email: '', password: '', name: '', role: 'user' });
      loadUsers();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '사용자 생성 실패');
    } finally {
      setModalLoading(false);
    }
  };

  // 사용자 수정
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      setModalLoading(true);
      setModalError(null);
      await usersApi.update(selectedUser.id, editForm);
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setEditForm({});
      loadUsers();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '사용자 수정 실패');
    } finally {
      setModalLoading(false);
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setModalLoading(true);
      setModalError(null);
      await usersApi.delete(selectedUser.id);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '사용자 삭제 실패');
    } finally {
      setModalLoading(false);
    }
  };

  // 역할 토글
  const handleToggleRole = async (user: UserResponse) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await usersApi.changeRole(user.id, newRole);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '역할 변경 실패');
    }
  };

  // 활성화 상태 토글
  const handleToggleStatus = async (user: UserResponse) => {
    try {
      await usersApi.changeStatus(user.id, !user.isActive);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 실패');
    }
  };

  // 비밀번호 재설정
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    try {
      setModalLoading(true);
      setModalError(null);
      await usersApi.resetPassword(selectedUser.id, newPassword);
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '비밀번호 재설정 실패');
    } finally {
      setModalLoading(false);
    }
  };

  // 수정 모달 열기
  const openEditModal = (user: UserResponse) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // 날짜 포맷
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
              <p className="text-sm text-gray-500">시스템 사용자를 관리합니다</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button
              onClick={() => {
                setModalError(null);
                setCreateForm({ email: '', password: '', name: '', role: 'user' });
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              사용자 추가
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="이름 또는 이메일로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Users className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchTerm ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  역할
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const roleStyle = ROLE_STYLES[user.role];
                const statusStyle =
                  user.isActive !== false ? STATUS_STYLES.active : STATUS_STYLES.inactive;
                const isCurrentUser = user.id === currentUser?.id;
                const RoleIcon = roleStyle.icon;

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 ${isCurrentUser ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-blue-600">(나)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${roleStyle.color}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {roleStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusStyle.color}`}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 역할 변경 버튼 */}
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleToggleRole(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.role === 'admin'
                                ? 'text-purple-600 hover:bg-purple-100'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title={user.role === 'admin' ? '사용자로 변경' : '관리자로 변경'}
                          >
                            {user.role === 'admin' ? (
                              <ShieldOff className="w-4 h-4" />
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* 활성화/비활성화 버튼 */}
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive !== false
                                ? 'text-green-600 hover:bg-green-100'
                                : 'text-red-600 hover:bg-red-100'
                            }`}
                            title={user.isActive !== false ? '비활성화' : '활성화'}
                          >
                            {user.isActive !== false ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* 비밀번호 재설정 */}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setNewPassword('');
                            setModalError(null);
                            setIsPasswordModalOpen(true);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                          title="비밀번호 재설정"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* 수정 버튼 */}
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* 삭제 버튼 */}
                        {!isCurrentUser && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setModalError(null);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 사용자 수 */}
      <div className="mt-4 text-sm text-gray-500">
        총 {filteredUsers.length}명의 사용자
        {searchTerm && ` (검색 결과)`}
      </div>

      {/* 사용자 생성 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">새 사용자 추가</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="사용자 이름"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="최소 6자 이상"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, role: e.target.value as 'admin' | 'user' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user">사용자</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateUser}
                disabled={
                  modalLoading || !createForm.email || !createForm.password || !createForm.name
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalLoading ? '처리 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 수정 모달 */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">사용자 수정</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {selectedUser.id !== currentUser?.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                  <select
                    value={editForm.role || selectedUser.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="user">사용자</option>
                    <option value="admin">관리자</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={modalLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {modalLoading ? '처리 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">사용자 삭제</h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {modalError}
              </div>
            )}

            <div className="mb-6">
              <p className="text-gray-600">
                정말 <span className="font-semibold text-gray-900">{selectedUser.name}</span>{' '}
                사용자를 삭제하시겠습니까?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                이 작업은 되돌릴 수 없으며, 해당 사용자의 모든 폴더 권한도 함께 삭제됩니다.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={modalLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {modalLoading ? '처리 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 재설정 모달 */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">비밀번호 재설정</h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {modalError}
              </div>
            )}

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{selectedUser.name}</p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="최소 6자 이상"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleResetPassword}
                disabled={modalLoading || newPassword.length < 6}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalLoading ? '처리 중...' : '비밀번호 변경'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
