/**
 * 기본 API 클라이언트
 *
 * 모든 백엔드 API 요청을 위한 기본 fetch 래퍼
 */

/**
 * 동적으로 API URL 결정 (원격 접속 대응)
 */
export function getApiUrl(): string {
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

  // 외부 도메인 접속
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return window.location.origin;
  }
  return `${window.location.protocol}//${hostname}:3000`;
}

/**
 * Backend API Key
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
 */
function getHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return {
    ...headers,
    ...customHeaders,
  };
}

const isDev = process.env.NODE_ENV === 'development';

/**
 * Fetch 래퍼 함수 - 공통 에러 처리
 */
export async function fetchWithErrorHandling<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
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

    // Content-Type 검증
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
