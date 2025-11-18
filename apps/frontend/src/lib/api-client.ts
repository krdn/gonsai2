/**
 * 중앙화된 API 클라이언트
 *
 * 모든 백엔드 API 요청을 관리하는 중앙 클라이언트
 * - 환경 변수에서 API URL과 인증 키를 가져옴
 * - 일관된 에러 처리
 * - 타입 안전성 제공
 */

// 동적으로 API URL 결정 (원격 접속 대응)
// 매 요청마다 호출되어 클라이언트의 hostname 기반으로 URL 결정
function getApiUrl(): string {
  // 서버 사이드 또는 빌드 타임: 환경 변수 사용
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  // 클라이언트 사이드: 현재 hostname 기반으로 결정
  const hostname = window.location.hostname;

  // localhost 접속: 기본 URL 사용
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  // 외부 도메인 접속: 같은 호스트의 포트 3000 사용
  // 예: krdn.iptime.org:3002 → krdn.iptime.org:3000
  return `http://${hostname}:3000`;
}

/**
 * Backend API Key (백엔드 인증용 - 백엔드의 N8N_API_KEY와 동일해야 함)
 * NEXT_PUBLIC_BACKEND_API_KEY를 우선 사용하고, 없으면 NEXT_PUBLIC_N8N_API_KEY를 폴백으로 사용
 */
const API_KEY =
  process.env.NEXT_PUBLIC_BACKEND_API_KEY || process.env.NEXT_PUBLIC_N8N_API_KEY || '';

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
 * HTTP 헤더 생성
 * X-API-Key 헤더를 포함하여 백엔드 인증 처리
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
async function fetchWithErrorHandling<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const apiUrl = getApiUrl(); // 매 요청마다 동적으로 URL 결정
    console.log('[API Client] Using API URL:', apiUrl);
    console.log('[API Client] Fetching:', url);
    console.log('[API Client] Options:', options);
    console.log('[API Client] Headers:', getHeaders(options.headers));

    const response = await fetch(url, {
      ...options,
      headers: getHeaders(options.headers),
    }).catch((fetchError) => {
      console.error('[API Client] Fetch failed with error:', fetchError);
      console.error('[API Client] Error type:', fetchError.constructor.name);
      console.error('[API Client] Error message:', fetchError.message);
      throw fetchError;
    });

    console.log('[API Client] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API Client] Error response:', errorText);
      throw new ApiClientError(
        response.status,
        response.statusText,
        errorText || `HTTP error ${response.status}`
      );
    }

    const data = await response.json();
    console.log('[API Client] Success:', url);
    return data;
  } catch (error) {
    console.error('[API Client] Fetch error:', error);
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

/**
 * Workflows API
 */
export const workflowsApi = {
  /**
   * 모든 워크플로우 조회
   */
  list: () => fetchWithErrorHandling(`${getApiUrl()}/api/workflows`),

  /**
   * 특정 워크플로우 조회
   */
  get: (id: string) => fetchWithErrorHandling(`${getApiUrl()}/api/workflows/${id}`),

  /**
   * 워크플로우 실행
   */
  execute: (id: string, inputData: any = {}, options: any = {}) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ inputData, options }),
    }),

  /**
   * 워크플로우 실행 기록 조회
   */
  executions: (id: string, limit: number = 10) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/workflows/${id}/executions?limit=${limit}`),
};

/**
 * Executions API
 */
export const executionsApi = {
  /**
   * 특정 실행 기록 조회
   */
  get: (id: string) => fetchWithErrorHandling(`${getApiUrl()}/api/executions/${id}`),

  /**
   * 워크플로우별 실행 기록 조회
   */
  listByWorkflow: (workflowId: string, limit: number = 10) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/workflows/${workflowId}/executions?limit=${limit}`),
};

/**
 * Monitoring API
 */
export const monitoringApi = {
  /**
   * 시스템 전체 통계 조회
   */
  stats: () => fetchWithErrorHandling(`${getApiUrl()}/api/monitoring/stats`),

  /**
   * 최근 실행 목록 조회
   */
  recentExecutions: (limit: number = 20) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/monitoring/executions/recent?limit=${limit}`),

  /**
   * 시간별 메트릭 조회 (차트용)
   */
  hourlyMetrics: (hours: number = 24) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/monitoring/metrics/hourly?hours=${hours}`),

  /**
   * 시스템 헬스 체크
   */
  systemHealth: () => fetchWithErrorHandling(`${getApiUrl()}/api/monitoring/system/health`),
};

/**
 * System API (모니터링 등)
 */
export const systemApi = {
  /**
   * 시스템 상태 조회
   */
  status: () => fetchWithErrorHandling(`${getApiUrl()}/api/system/status`),

  /**
   * 시스템 메트릭 조회
   */
  metrics: () => fetchWithErrorHandling(`${getApiUrl()}/api/system/metrics`),
};

/**
 * Agents API
 */
export const agentsApi = {
  /**
   * AI 에이전트 워크플로우 목록 조회
   */
  list: () => fetchWithErrorHandling(`${getApiUrl()}/api/agents`),

  /**
   * 특정 AI 에이전트 워크플로우 상세 조회
   */
  get: (workflowId: string) => fetchWithErrorHandling(`${getApiUrl()}/api/agents/${workflowId}`),

  /**
   * AI 에이전트 워크플로우 실행
   */
  execute: (workflowId: string, inputData: any = {}, waitForResult: boolean = false) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/agents/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ inputData, waitForResult }),
    }),

  /**
   * AI 에이전트 워크플로우 실행 기록 조회
   */
  executions: (workflowId: string, limit: number = 20) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/agents/${workflowId}/executions?limit=${limit}`),

  /**
   * 전체 AI 에이전트 통계 조회
   */
  statsOverview: () => fetchWithErrorHandling(`${getApiUrl()}/api/agents/stats/overview`),
};

/**
 * Tags API
 */
export const tagsApi = {
  /**
   * 모든 태그 조회
   */
  list: () => fetchWithErrorHandling(`${getApiUrl()}/api/tags`),

  /**
   * 특정 태그 조회
   */
  get: (id: string) => fetchWithErrorHandling(`${getApiUrl()}/api/tags/${id}`),

  /**
   * 새로운 태그 생성
   */
  create: (tagData: { name: string }) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/tags`, {
      method: 'POST',
      body: JSON.stringify(tagData),
    }),

  /**
   * 태그 삭제
   */
  delete: (id: string) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/tags/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * 전체 API 클라이언트 export
 */
export const apiClient = {
  workflows: workflowsApi,
  executions: executionsApi,
  monitoring: monitoringApi,
  system: systemApi,
  agents: agentsApi,
  tags: tagsApi,
};

export default apiClient;
