/**
 * MongoDB Schema Type Definitions for n8n Integration
 *
 * @description MongoDB 컬렉션의 TypeScript 타입 정의
 */

import { ObjectId } from 'mongodb';

/**
 * WorkflowSchema - n8n 워크플로우 정보
 */
export interface WorkflowDocument {
  _id?: ObjectId;
  n8nWorkflowId: string;              // n8n 워크플로우 ID
  name: string;                        // 워크플로우 이름
  description?: string;                // 설명
  active: boolean;                     // 활성화 상태
  nodes: WorkflowNode[];              // 노드 정보 캐싱
  settings: WorkflowSettings;          // 실행 설정
  tags?: string[];                     // 태그
  lastSyncedAt: Date;                 // n8n과 마지막 동기화 시간
  createdAt: Date;                    // 생성 시간
  updatedAt: Date;                    // 수정 시간
}

export interface WorkflowNode {
  id: string;                         // 노드 ID
  name: string;                       // 노드 이름
  type: string;                       // 노드 타입 (n8n-nodes-base.*)
  typeVersion: number;                // 노드 타입 버전
  position: [number, number];         // UI 위치 [x, y]
  parameters?: Record<string, unknown>; // 노드 파라미터
}

export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';       // 실행 순서 버전
  saveManualExecutions?: boolean;     // 수동 실행 저장 여부
  callerPolicy?: string;              // 호출자 정책
  errorWorkflow?: string;             // 에러 발생 시 실행할 워크플로우
  timezone?: string;                  // 타임존
  executionTimeout?: number;          // 실행 타임아웃 (초)
}

/**
 * ExecutionSchema - 워크플로우 실행 기록
 */
export interface ExecutionDocument {
  _id?: ObjectId;
  n8nExecutionId: string;             // n8n 실행 ID
  workflowId: string;                 // 워크플로우 MongoDB ID
  n8nWorkflowId: string;              // n8n 워크플로우 ID (빠른 조회)
  status: ExecutionStatus;            // 실행 상태
  mode: ExecutionMode;                // 실행 모드
  startedAt: Date;                    // 시작 시간
  finishedAt?: Date;                  // 종료 시간
  executionTime?: number;             // 실행 시간 (ms)
  inputData?: Record<string, unknown>; // 입력 데이터
  outputData?: Record<string, unknown>; // 출력 데이터
  nodeExecutions?: NodeExecution[];   // 노드별 실행 정보
  errorDetails?: ExecutionError;      // 에러 상세
  retryCount?: number;                // 재시도 횟수
  retryOf?: string;                   // 재시도 대상 실행 ID
  createdAt: Date;                    // 생성 시간
}

export type ExecutionStatus =
  | 'pending'      // 대기 중
  | 'running'      // 실행 중
  | 'success'      // 성공
  | 'failed'       // 실패
  | 'waiting'      // 대기 (webhook 등)
  | 'canceled';    // 취소됨

export type ExecutionMode =
  | 'manual'       // 수동 실행
  | 'trigger'      // 트리거 실행
  | 'webhook'      // Webhook 실행
  | 'retry'        // 재시도
  | 'cli';         // CLI 실행

export interface NodeExecution {
  nodeName: string;                   // 노드 이름
  nodeType: string;                   // 노드 타입
  executionTime?: number;             // 실행 시간 (ms)
  startTime?: Date;                   // 시작 시간
  itemCount?: number;                 // 처리된 아이템 수
  error?: string;                     // 에러 메시지
}

export interface ExecutionError {
  message: string;                    // 에러 메시지
  node?: string;                      // 에러 발생 노드
  stack?: string;                     // 스택 트레이스
  errorType?: string;                 // 에러 타입
  causeChain?: string[];              // 원인 체인
}

/**
 * AgentLogSchema - AI 에이전트 실행 로그
 */
export interface AgentLogDocument {
  _id?: ObjectId;
  agentType: string;                  // n8n 노드 타입 또는 커스텀 에이전트
  executionId: string;                // 연결된 실행 ID
  n8nExecutionId?: string;            // n8n 실행 ID (있는 경우)
  timestamp: Date;                    // 로그 시간
  action: string;                     // 수행한 액션
  result: AgentResult;                // 실행 결과
  inputTokens?: number;               // 입력 토큰 수
  outputTokens?: number;              // 출력 토큰 수
  totalTokens?: number;               // 총 토큰 수
  cost?: number;                      // 비용 (USD)
  model?: string;                     // 사용한 모델
  duration?: number;                  // 실행 시간 (ms)
  metadata?: Record<string, unknown>; // 추가 메타데이터
  createdAt: Date;                    // 생성 시간
}

export type AgentResult =
  | 'success'      // 성공
  | 'failed'       // 실패
  | 'partial'      // 부분 성공
  | 'timeout'      // 타임아웃
  | 'canceled';    // 취소됨

/**
 * ErrorPatternSchema - 에러 패턴 및 자동 수정
 */
export interface ErrorPatternDocument {
  _id?: ObjectId;
  errorType: string;                  // n8n 오류 유형
  category: ErrorCategory;            // 에러 카테고리
  pattern: string;                    // 정규식 패턴
  description?: string;               // 설명
  frequency: number;                  // 발생 빈도
  lastOccurred?: Date;                // 마지막 발생 시간
  solutions: ErrorSolution[];         // 해결 방법
  autoFixEnabled: boolean;            // 자동 수정 활성화
  severity: ErrorSeverity;            // 심각도
  affectedWorkflows?: string[];       // 영향받는 워크플로우 ID들
  tags?: string[];                    // 태그
  createdAt: Date;                    // 생성 시간
  updatedAt: Date;                    // 수정 시간
}

export type ErrorCategory =
  | 'connection'     // 연결 오류
  | 'authentication' // 인증 오류
  | 'execution'      // 실행 오류
  | 'resource'       // 리소스 오류
  | 'configuration'  // 설정 오류
  | 'data'          // 데이터 오류
  | 'network'       // 네트워크 오류
  | 'timeout';      // 타임아웃

export type ErrorSeverity =
  | 'critical'      // 치명적
  | 'high'          // 높음
  | 'medium'        // 중간
  | 'low';          // 낮음

export interface ErrorSolution {
  title: string;                      // 해결 방법 제목
  description: string;                // 상세 설명
  action?: string;                    // 자동 실행 액션
  command?: string;                   // 실행할 명령어
  requiresApproval: boolean;          // 승인 필요 여부
  successRate?: number;               // 성공률 (0-1)
  averageFixTime?: number;            // 평균 수정 시간 (ms)
}

/**
 * Collection Names
 */
export const COLLECTIONS = {
  WORKFLOWS: 'workflows',
  EXECUTIONS: 'executions',
  AGENT_LOGS: 'agent_logs',
  ERROR_PATTERNS: 'error_patterns',
} as const;

/**
 * Index Definitions
 */
export interface IndexDefinition {
  keys: Record<string, 1 | -1 | 'text'>;  // 1: ascending, -1: descending, 'text': text index
  options?: {
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;      // TTL index
    name?: string;
    partialFilterExpression?: Record<string, unknown>;  // Partial index filter
    [key: string]: unknown;           // Allow additional index options
  };
}
