/**
 * User Dashboard API (사용자 대시보드)
 */

import { getApiUrl, fetchWithErrorHandling } from './client';
import {
  UserDashboardOverview,
  WorkflowStatsData,
  AIRecommendationsData,
  UserQuickActionsData,
  SystemStatusData,
  ActivityTimelineData,
} from './types';

export const dashboardApi = {
  /**
   * 대시보드 개요
   */
  getOverview: () =>
    fetchWithErrorHandling<{ success: boolean; data: UserDashboardOverview }>(
      `${getApiUrl()}/api/dashboard/overview`
    ),

  /**
   * 워크플로우 통계
   */
  getWorkflowStats: () =>
    fetchWithErrorHandling<{ success: boolean; data: WorkflowStatsData }>(
      `${getApiUrl()}/api/dashboard/workflow-stats`
    ),

  /**
   * AI 추천
   */
  getAIRecommendations: () =>
    fetchWithErrorHandling<{ success: boolean; data: AIRecommendationsData }>(
      `${getApiUrl()}/api/dashboard/ai-recommendations`
    ),

  /**
   * 빠른 액션
   */
  getQuickActions: () =>
    fetchWithErrorHandling<{ success: boolean; data: UserQuickActionsData }>(
      `${getApiUrl()}/api/dashboard/quick-actions`
    ),

  /**
   * 시스템 상태
   */
  getSystemStatus: () =>
    fetchWithErrorHandling<{ success: boolean; data: SystemStatusData }>(
      `${getApiUrl()}/api/dashboard/system-status`
    ),

  /**
   * 활동 타임라인
   */
  getActivityTimeline: () =>
    fetchWithErrorHandling<{ success: boolean; data: ActivityTimelineData }>(
      `${getApiUrl()}/api/dashboard/activity-timeline`
    ),
};
