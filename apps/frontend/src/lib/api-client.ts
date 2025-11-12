/**
 * 중앙화된 API 클라이언트
 *
 * 모든 백엔드 API 요청을 관리하는 중앙 클라이언트
 * - 환경 변수에서 API URL과 인증 키를 가져옴
 * - 일관된 에러 처리
 * - 타입 안전성 제공
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || '';

/**
 * API 클라이언트 에러 클래스
 */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * HTTP 헤더 생성 (인증 포함)
 */
function getHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...customHeaders,
  };
}

/**
 * Fetch 래퍼 함수 - 공통 에러 처리
 */
async function fetchWithErrorHandling<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: getHeaders(options.headers),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiClientError(
        response.status,
        response.statusText,
        errorText || `HTTP error ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new Error(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Workflows API
 */
export const workflowsApi = {
  /**
   * 모든 워크플로우 조회
   */
  list: () => fetchWithErrorHandling(`${API_URL}/api/workflows`),

  /**
   * 특정 워크플로우 조회
   */
  get: (id: string) => fetchWithErrorHandling(`${API_URL}/api/workflows/${id}`),

  /**
   * 워크플로우 실행
   */
  execute: (id: string, inputData: any = {}, options: any = {}) =>
    fetchWithErrorHandling(`${API_URL}/api/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ inputData, options }),
    }),

  /**
   * 워크플로우 실행 기록 조회
   */
  executions: (id: string, limit: number = 10) =>
    fetchWithErrorHandling(
      `${API_URL}/api/workflows/${id}/executions?limit=${limit}`
    ),
};

/**
 * Executions API
 */
export const executionsApi = {
  /**
   * 특정 실행 기록 조회
   */
  get: (id: string) => fetchWithErrorHandling(`${API_URL}/api/executions/${id}`),

  /**
   * 워크플로우별 실행 기록 조회
   */
  listByWorkflow: (workflowId: string, limit: number = 10) =>
    fetchWithErrorHandling(
      `${API_URL}/api/workflows/${workflowId}/executions?limit=${limit}`
    ),
};

/**
 * System API (모니터링 등)
 */
export const systemApi = {
  /**
   * 시스템 상태 조회
   */
  status: () => fetchWithErrorHandling(`${API_URL}/api/system/status`),

  /**
   * 시스템 메트릭 조회
   */
  metrics: () => fetchWithErrorHandling(`${API_URL}/api/system/metrics`),
};

/**
 * 전체 API 클라이언트 export
 */
export const apiClient = {
  workflows: workflowsApi,
  executions: executionsApi,
  system: systemApi,
};

export default apiClient;
