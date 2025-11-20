/**
 * n8n API 관련 헬퍼 함수들
 */

import { N8nApiError } from './errors';
import { log } from './logger';

/**
 * n8n API 응답을 안전하게 JSON으로 파싱
 * HTML이나 다른 형식의 응답이 올 경우 명확한 오류 메시지 제공
 */
export async function parseN8nResponse<T = any>(
  response: Response,
  context: {
    correlationId?: string;
    workflowId?: string;
    operation?: string;
  }
): Promise<T> {
  // Content-Type 확인
  const contentType = response.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await response.text();

    log.error('n8n returned non-JSON response', undefined, {
      ...context,
      contentType,
      responsePreview: responseText.substring(0, 200),
    });

    throw new N8nApiError(
      `n8n returned unexpected response format (expected JSON, got ${contentType || 'unknown'}). ` +
        `This usually indicates a configuration issue or n8n error. ` +
        `Response preview: ${responseText.substring(0, 100)}...`,
      {
        ...context,
        contentType,
      }
    );
  }

  // JSON 파싱
  try {
    return (await response.json()) as T;
  } catch (error) {
    log.error('Failed to parse n8n JSON response', error, context);
    throw new N8nApiError('Failed to parse n8n response as JSON', {
      ...context,
      parseError: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * n8n API 응답 상태 확인 및 오류 처리
 */
export async function checkN8nResponse(
  response: Response,
  context: {
    correlationId?: string;
    workflowId?: string;
    operation?: string;
  }
): Promise<void> {
  if (!response.ok) {
    const errorText = await response.text();

    log.error('n8n API request failed', undefined, {
      ...context,
      status: response.status,
      statusText: response.statusText,
      errorPreview: errorText.substring(0, 200),
    });

    throw new N8nApiError(
      `n8n API request failed (${response.status} ${response.statusText}): ${errorText}`,
      {
        ...context,
        status: response.status,
      }
    );
  }
}
