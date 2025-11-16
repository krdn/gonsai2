/**
 * useTags Hook
 *
 * @description n8n 태그 목록을 가져오고 자동 동기화하는 커스텀 훅
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { N8nTag, N8nTagsResponse } from '@/types/tags';

/**
 * 태그 목록을 가져오는 훅
 *
 * @param refetchInterval - 자동 갱신 간격 (밀리초), undefined면 자동 갱신 비활성화
 * @returns 태그 목록과 로딩/에러 상태
 */
export function useTags(refetchInterval?: number) {
  return useQuery<N8nTagsResponse, Error>({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await apiClient.tags.list();
      return response;
    },
    // 자동 갱신 설정 (기본값: 30초마다)
    refetchInterval: refetchInterval ?? 30000,
    // 포커스 시 자동 갱신
    refetchOnWindowFocus: true,
    // 마운트 시 자동 갱신
    refetchOnMount: true,
    // 실패 시 재시도 (최대 3번)
    retry: 3,
    // 재시도 지연 시간 (exponential backoff)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // 5분간 캐시 유지
    staleTime: 5 * 60 * 1000,
    // 10분간 캐시된 데이터 보관
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 태그 목록 배열만 반환하는 편의 훅
 *
 * @param refetchInterval - 자동 갱신 간격 (밀리초)
 * @returns 태그 배열
 */
export function useTagList(refetchInterval?: number): N8nTag[] {
  const { data } = useTags(refetchInterval);
  return data?.data || [];
}

/**
 * 특정 태그 ID로 태그 찾기
 *
 * @param tagId - 찾을 태그 ID
 * @returns 태그 객체 또는 undefined
 */
export function useTag(tagId: string): N8nTag | undefined {
  const { data } = useTags();
  return data?.data.find((tag) => tag.id === tagId);
}

/**
 * 태그 이름으로 태그 찾기
 *
 * @param tagName - 찾을 태그 이름
 * @returns 태그 객체 또는 undefined
 */
export function useTagByName(tagName: string): N8nTag | undefined {
  const { data } = useTags();
  return data?.data.find((tag) => tag.name === tagName);
}
