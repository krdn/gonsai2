/**
 * n8n 태그 관련 타입 정의
 */

/**
 * n8n 태그
 */
export interface N8nTag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 태그 목록 API 응답
 */
export interface N8nTagsResponse {
  data: N8nTag[];
}

/**
 * 태그 생성 요청
 */
export interface CreateTagRequest {
  name: string;
}

/**
 * 태그 생성 응답
 */
export type CreateTagResponse = N8nTag;
