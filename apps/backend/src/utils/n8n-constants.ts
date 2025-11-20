/**
 * n8n Constants
 *
 * @description n8n 관련 공통 상수 정의
 */

/**
 * AI 노드 타입 목록
 * n8n에서 AI 기능을 제공하는 노드 타입들
 */
export const AI_NODE_TYPES = [
  'n8n-nodes-base.openAi',
  'n8n-nodes-base.openAiChat',
  '@n8n/n8n-nodes-langchain.chatOpenAi',
  '@n8n/n8n-nodes-langchain.chatAnthropic',
  '@n8n/n8n-nodes-langchain.agent',
  'n8n-nodes-base.httpRequest', // AI API 호출용
] as const;

/**
 * AI 노드 타입 (타입 정의)
 */
export type AINodeType = (typeof AI_NODE_TYPES)[number];

/**
 * 실행 상태
 */
export const EXECUTION_STATUS = {
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  WAITING: 'waiting',
} as const;

/**
 * 실행 모드
 */
export const EXECUTION_MODE = {
  MANUAL: 'manual',
  WEBHOOK: 'webhook',
  TRIGGER: 'trigger',
} as const;

/**
 * 기본 페이지네이션 설정
 */
export const DEFAULT_PAGINATION = {
  EXECUTIONS_LIMIT: 20,
  WORKFLOWS_LIMIT: 100,
  MAX_EXECUTIONS_LIMIT: 250,
} as const;

/**
 * 시간 범위 (밀리초)
 */
export const TIME_RANGES = {
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;
