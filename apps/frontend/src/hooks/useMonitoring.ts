/**
 * Monitoring React Query Hooks
 *
 * 모니터링 API를 위한 커스텀 React Query 훅
 * - 자동 캐싱 및 백그라운드 갱신
 * - 에러 리트라이
 * - 타입 안전한 데이터 관리
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';

/**
 * 시스템 통계 타입
 */
export interface SystemStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  runningExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  period: string;
  timestamp: string;
}

/**
 * 최근 실행 타입
 */
export interface RecentExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: string;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  duration?: number;
}

/**
 * 시간별 메트릭 타입
 */
export interface HourlyMetric {
  timestamp: string;
  success: number;
  error: number;
  total: number;
}

/**
 * 시스템 통계 조회 훅
 *
 * @param options - React Query 옵션
 * @returns 시스템 통계 쿼리 결과
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useMonitoringStats();
 * ```
 */
export function useMonitoringStats(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.monitoring.stats(),
    queryFn: async () => {
      const response = await monitoringApi.stats();
      if (response.success && response.data) {
        return response.data as SystemStats;
      }
      throw new Error(response.error || 'Failed to fetch stats');
    },
    refetchInterval: options?.refetchInterval ?? 60000, // 기본 1분마다 갱신
    staleTime: 30 * 1000, // 30초 동안 신선한 상태 유지
  });
}

/**
 * 최근 실행 목록 조회 훅
 *
 * @param limit - 조회할 실행 수 (기본: 20)
 * @param options - React Query 옵션
 * @returns 최근 실행 목록 쿼리 결과
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useRecentExecutions(20);
 * ```
 */
export function useRecentExecutions(limit: number = 20, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.monitoring.recentExecutions(limit),
    queryFn: async () => {
      const response = await monitoringApi.recentExecutions(limit);
      if (response.success && response.data) {
        return response.data as RecentExecution[];
      }
      throw new Error(response.error || 'Failed to fetch executions');
    },
    refetchInterval: options?.refetchInterval ?? 30000, // 기본 30초마다 갱신
    staleTime: 15 * 1000, // 15초 동안 신선한 상태 유지
  });
}

/**
 * 시간별 메트릭 조회 훅
 *
 * @param hours - 조회할 시간 범위 (기본: 24)
 * @param options - React Query 옵션
 * @returns 시간별 메트릭 쿼리 결과
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useHourlyMetrics(24);
 * ```
 */
export function useHourlyMetrics(hours: number = 24, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.monitoring.hourlyMetrics(hours),
    queryFn: async () => {
      const response = await monitoringApi.hourlyMetrics(hours);
      if (response.success && response.data) {
        return response.data as HourlyMetric[];
      }
      throw new Error(response.error || 'Failed to fetch hourly metrics');
    },
    refetchInterval: options?.refetchInterval ?? 5 * 60 * 1000, // 기본 5분마다 갱신
    staleTime: 60 * 1000, // 1분 동안 신선한 상태 유지
  });
}

/**
 * 모니터링 캐시 무효화 훅
 *
 * @returns 캐시 무효화 함수들
 *
 * @example
 * ```tsx
 * const { invalidateStats, invalidateAll } = useInvalidateMonitoring();
 * invalidateAll(); // 모든 모니터링 캐시 무효화
 * ```
 */
export function useInvalidateMonitoring() {
  const queryClient = useQueryClient();

  return {
    invalidateStats: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.stats() }),
    invalidateExecutions: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.monitoring.all,
        predicate: (query) =>
          query.queryKey[0] === 'monitoring' && query.queryKey[1] === 'executions',
      }),
    invalidateMetrics: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.monitoring.all,
        predicate: (query) => query.queryKey[0] === 'monitoring' && query.queryKey[1] === 'metrics',
      }),
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.all }),
  };
}
