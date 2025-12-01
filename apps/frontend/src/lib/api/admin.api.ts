/**
 * Admin Dashboard API
 */

import { getApiUrl, fetchWithErrorHandling } from './client';
import {
  AdminDashboardOverview,
  UserActivityData,
  FolderStatsData,
  SystemHealthData,
  AIInsightsData,
  QuickActionsData,
  AuditLogData,
} from './types';

export const adminApi = {
  /**
   * 대시보드 개요 통계
   */
  getOverview: () =>
    fetchWithErrorHandling<{ success: boolean; data: AdminDashboardOverview }>(
      `${getApiUrl()}/api/admin/dashboard/overview`
    ),

  /**
   * 사용자 활동 통계
   */
  getUserActivity: (days: number = 30) =>
    fetchWithErrorHandling<{ success: boolean; data: UserActivityData }>(
      `${getApiUrl()}/api/admin/dashboard/user-activity?days=${days}`
    ),

  /**
   * 폴더 및 권한 통계
   */
  getFolderStats: () =>
    fetchWithErrorHandling<{ success: boolean; data: FolderStatsData }>(
      `${getApiUrl()}/api/admin/dashboard/folder-stats`
    ),

  /**
   * 시스템 상태 및 헬스 체크
   */
  getSystemHealth: () =>
    fetchWithErrorHandling<{ success: boolean; data: SystemHealthData }>(
      `${getApiUrl()}/api/admin/dashboard/system-health`
    ),

  /**
   * AI 인사이트
   */
  getAIInsights: () =>
    fetchWithErrorHandling<{ success: boolean; data: AIInsightsData }>(
      `${getApiUrl()}/api/admin/dashboard/ai-insights`
    ),

  /**
   * 빠른 액션
   */
  getQuickActions: () =>
    fetchWithErrorHandling<{ success: boolean; data: QuickActionsData }>(
      `${getApiUrl()}/api/admin/dashboard/quick-actions`
    ),

  /**
   * 감사 로그
   */
  getAuditLog: (page: number = 1, limit: number = 20) =>
    fetchWithErrorHandling<{ success: boolean; data: AuditLogData }>(
      `${getApiUrl()}/api/admin/dashboard/audit-log?page=${page}&limit=${limit}`
    ),
};
