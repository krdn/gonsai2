/**
 * TanStack Query Client
 *
 * 성능 최적화된 기본 설정:
 * - staleTime: 데이터가 신선한 것으로 간주되는 시간 (이 기간 동안 캐시된 데이터 사용)
 * - gcTime: 캐시된 데이터가 메모리에서 제거되기까지의 시간
 * - refetchOnWindowFocus: 창 포커스 시 재요청 여부
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1분 - 데이터가 신선한 것으로 간주
      gcTime: 10 * 60 * 1000, // 10분 - 캐시 유지 시간 증가
      retry: 2, // 재시도 횟수 증가
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: false, // 이미 캐시된 데이터가 있으면 재요청하지 않음
      refetchOnReconnect: true, // 네트워크 재연결 시 재요청
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Query Keys - 타입 안전한 캐시 키 관리
 */
export const queryKeys = {
  monitoring: {
    all: ['monitoring'] as const,
    stats: () => [...queryKeys.monitoring.all, 'stats'] as const,
    recentExecutions: (limit: number) =>
      [...queryKeys.monitoring.all, 'executions', { limit }] as const,
    hourlyMetrics: (hours: number) => [...queryKeys.monitoring.all, 'metrics', { hours }] as const,
  },
  workflows: {
    all: ['workflows'] as const,
    list: () => [...queryKeys.workflows.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.workflows.all, 'detail', id] as const,
    executions: (id: string, limit: number) =>
      [...queryKeys.workflows.all, 'executions', { id, limit }] as const,
  },
  agents: {
    all: ['agents'] as const,
    list: () => [...queryKeys.agents.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.agents.all, 'detail', id] as const,
    stats: () => [...queryKeys.agents.all, 'stats'] as const,
  },
  tags: {
    all: ['tags'] as const,
    list: () => [...queryKeys.tags.all, 'list'] as const,
  },
};
