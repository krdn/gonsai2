/**
 * Users API
 */

import { getApiUrl, fetchWithErrorHandling } from './client';
import { UserResponse, CreateUserDto, UpdateUserDto } from './types';

export const usersApi = {
  /**
   * 모든 사용자 목록 조회 (admin 전용)
   */
  list: () =>
    fetchWithErrorHandling<{ success: boolean; data: UserResponse[] }>(`${getApiUrl()}/api/users`),

  /**
   * 현재 로그인한 사용자 정보 조회
   */
  me: () =>
    fetchWithErrorHandling<{ success: boolean; user: UserResponse }>(`${getApiUrl()}/api/users/me`),

  /**
   * 특정 사용자 정보 조회 (admin 전용)
   */
  get: (id: string) =>
    fetchWithErrorHandling<{ success: boolean; data: UserResponse }>(
      `${getApiUrl()}/api/users/${id}`
    ),

  /**
   * 새 사용자 생성 (admin 전용)
   */
  create: (data: CreateUserDto) =>
    fetchWithErrorHandling<{ success: boolean; data: UserResponse; message: string }>(
      `${getApiUrl()}/api/users`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  /**
   * 사용자 정보 수정 (admin 전용)
   */
  update: (id: string, data: UpdateUserDto) =>
    fetchWithErrorHandling<{ success: boolean; data: UserResponse; message: string }>(
      `${getApiUrl()}/api/users/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),

  /**
   * 사용자 삭제 (admin 전용)
   */
  delete: (id: string) =>
    fetchWithErrorHandling<{ success: boolean; message: string }>(
      `${getApiUrl()}/api/users/${id}`,
      {
        method: 'DELETE',
      }
    ),

  /**
   * 사용자 역할 변경 (admin 전용)
   */
  changeRole: (id: string, role: 'admin' | 'user') =>
    fetchWithErrorHandling<{ success: boolean; message: string }>(
      `${getApiUrl()}/api/users/${id}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }
    ),

  /**
   * 사용자 활성화/비활성화 (admin 전용)
   */
  changeStatus: (id: string, isActive: boolean) =>
    fetchWithErrorHandling<{ success: boolean; message: string }>(
      `${getApiUrl()}/api/users/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }
    ),

  /**
   * 사용자 비밀번호 재설정 (admin 전용)
   */
  resetPassword: (id: string, password: string) =>
    fetchWithErrorHandling<{ success: boolean; message: string }>(
      `${getApiUrl()}/api/users/${id}/password`,
      {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      }
    ),
};
