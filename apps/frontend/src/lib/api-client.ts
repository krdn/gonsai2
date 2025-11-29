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
  // eslint-disable-next-line no-undef
  const hostname = window.location.hostname;

  // localhost 접속: 기본 URL 사용
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  // 외부 도메인 접속: 같은 hostname에 포트 3000 사용 (백엔드 직접 호출)
  // 개발환경: krdn.iptime.org:3002 → http://krdn.iptime.org:3000
  // 운영환경(Nginx): Nginx가 /api를 백엔드로 프록시하므로 origin 사용
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return window.location.origin;
  }
  return `${window.location.protocol}//${hostname}:3000`;
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
 * JWT 토큰 조회 (클라이언트 사이드에서만)
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('authToken');
}

/**
 * HTTP 헤더 생성
 * X-API-Key 헤더를 포함하여 백엔드 인증 처리
 * JWT 토큰이 있으면 Authorization 헤더에 포함
 */
function getHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };

  // JWT 토큰이 있으면 Authorization 헤더 추가
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return {
    ...headers,
    ...customHeaders,
  };
}

/**
 * 개발 환경에서만 로깅
 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * Fetch 래퍼 함수 - 공통 에러 처리
 */
async function fetchWithErrorHandling<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // 쿠키 포함 (JWT 토큰 전송)
      headers: getHeaders(options.headers),
    }).catch((fetchError) => {
      if (isDev) {
        console.error('[API Client] Fetch failed:', fetchError.message);
      }
      throw fetchError;
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (isDev) {
        console.error('[API Client] Error response:', response.status, errorText);
      }
      throw new ApiClientError(
        response.status,
        response.statusText,
        errorText || `HTTP error ${response.status}`
      );
    }

    // Content-Type 검증 - HTML 응답을 JSON으로 파싱하려는 시도 방지
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      if (isDev) {
        console.error('[API Client] Non-JSON response:', {
          url,
          contentType,
          responsePreview: responseText.substring(0, 200),
        });
      }
      throw new ApiClientError(
        response.status,
        'Invalid Content-Type',
        `Expected JSON response but received ${contentType || 'unknown'}. ` +
          `This usually indicates a server error or configuration issue. ` +
          `Response preview: ${responseText.substring(0, 100)}...`
      );
    }

    return await response.json();
  } catch (error) {
    if (isDev && !(error instanceof ApiClientError)) {
      console.error('[API Client] Fetch error:', error);
    }
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
   * @param options.includeNodes - true로 설정하면 nodes 정보 포함 (Sticky Note 설명 추출용)
   */
  list: (options?: { includeNodes?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.includeNodes) {
      params.set('includeNodes', 'true');
    }
    const queryString = params.toString();
    const url = `${getApiUrl()}/api/workflows${queryString ? `?${queryString}` : ''}`;
    return fetchWithErrorHandling(url);
  },

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
 * 폴더 권한 레벨 타입
 */
export type PermissionLevel = 'viewer' | 'executor' | 'editor' | 'admin';

/**
 * 폴더 응답 타입
 */
export interface FolderResponse {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 폴더 트리 노드 타입
 */
export interface FolderTreeNode extends FolderResponse {
  children: FolderTreeNode[];
  workflowCount?: number;
}

/**
 * 폴더 권한 응답 타입
 */
export interface FolderPermissionResponse {
  id: string;
  folderId: string;
  userId: string;
  permission: PermissionLevel;
  grantedBy: string;
  grantedAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  inherited?: boolean;
}

/**
 * Folders API
 */
export const foldersApi = {
  /**
   * 사용자가 접근 가능한 폴더 목록 조회
   */
  list: (options?: { tree?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.tree) {
      params.set('tree', 'true');
    }
    const queryString = params.toString();
    return fetchWithErrorHandling<{ success: boolean; data: FolderResponse[] | FolderTreeNode[] }>(
      `${getApiUrl()}/api/folders${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * 폴더 트리 구조 조회
   */
  tree: () =>
    fetchWithErrorHandling<{ success: boolean; data: FolderTreeNode[] }>(
      `${getApiUrl()}/api/folders?tree=true`
    ),

  /**
   * 특정 폴더 조회
   */
  get: (id: string) =>
    fetchWithErrorHandling<{ success: boolean; data: FolderResponse }>(
      `${getApiUrl()}/api/folders/${id}`
    ),

  /**
   * 폴더 생성 (admin 전용)
   */
  create: (data: { name: string; description?: string; parentId?: string }) =>
    fetchWithErrorHandling<{ success: boolean; data: FolderResponse }>(
      `${getApiUrl()}/api/folders`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  /**
   * 폴더 수정
   */
  update: (id: string, data: { name?: string; description?: string; parentId?: string | null }) =>
    fetchWithErrorHandling<{ success: boolean; data: FolderResponse }>(
      `${getApiUrl()}/api/folders/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),

  /**
   * 폴더 삭제 (admin 전용)
   */
  delete: (id: string, options?: { deleteChildren?: boolean }) =>
    fetchWithErrorHandling(
      `${getApiUrl()}/api/folders/${id}${options?.deleteChildren ? '?deleteChildren=true' : ''}`,
      {
        method: 'DELETE',
      }
    ),

  /**
   * 폴더 내 워크플로우 ID 목록 조회
   */
  getWorkflows: (id: string) =>
    fetchWithErrorHandling<{ success: boolean; data: string[] }>(
      `${getApiUrl()}/api/folders/${id}/workflows`
    ),

  /**
   * 워크플로우를 폴더에 할당
   */
  assignWorkflow: (folderId: string, workflowId: string) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/workflows`, {
      method: 'POST',
      body: JSON.stringify({ workflowId }),
    }),

  /**
   * 여러 워크플로우를 폴더에 일괄 할당
   */
  assignWorkflows: (folderId: string, workflowIds: string[]) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/workflows/bulk`, {
      method: 'POST',
      body: JSON.stringify({ workflowIds }),
    }),

  /**
   * 워크플로우 폴더 할당 해제
   */
  unassignWorkflow: (folderId: string, workflowId: string) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/workflows/${workflowId}`, {
      method: 'DELETE',
    }),

  /**
   * 폴더 권한 목록 조회
   */
  getPermissions: (id: string) =>
    fetchWithErrorHandling<{ success: boolean; data: FolderPermissionResponse[] }>(
      `${getApiUrl()}/api/folders/${id}/permissions`
    ),

  /**
   * 사용자에게 폴더 권한 부여
   */
  addPermission: (folderId: string, userId: string, permission: PermissionLevel) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ userId, permission }),
    }),

  /**
   * 폴더 권한 수정
   */
  updatePermission: (folderId: string, userId: string, permission: PermissionLevel) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/permissions/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ permission }),
    }),

  /**
   * 폴더 권한 삭제
   */
  removePermission: (folderId: string, userId: string) =>
    fetchWithErrorHandling(`${getApiUrl()}/api/folders/${folderId}/permissions/${userId}`, {
      method: 'DELETE',
    }),

  /**
   * 현재 사용자의 모든 폴더 권한 조회
   */
  getMyPermissions: () => fetchWithErrorHandling(`${getApiUrl()}/api/folders/my-permissions`),
};

/**
 * 사용자 응답 타입
 */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

/**
 * Users API
 */
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
  folders: foldersApi,
  users: usersApi,
};

export default apiClient;
