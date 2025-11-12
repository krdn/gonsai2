/**
 * Error Healing Types
 *
 * @description n8n 오류 분석 및 자동 수정 시스템 타입 정의
 */

/**
 * n8n 오류 유형
 */
export type ErrorType =
  | 'node_connection'      // 노드 연결 오류
  | 'authentication'       // 인증 실패
  | 'timeout'              // 타임아웃
  | 'data_format'          // 데이터 형식 오류
  | 'api_error'            // API 호출 오류
  | 'credential_missing'   // 인증 정보 누락
  | 'invalid_expression'   // 잘못된 표현식
  | 'workflow_structure'   // 워크플로우 구조 오류
  | 'unknown';             // 알 수 없는 오류

/**
 * 오류 심각도
 */
export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * 수정 상태
 */
export type FixStatus = 'pending' | 'in_progress' | 'fixed' | 'failed' | 'needs_manual';

/**
 * n8n 실행 오류 정보
 */
export interface N8nExecutionError {
  executionId: string;
  workflowId: string;
  workflowName: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  errorMessage: string;
  errorStack?: string;
  errorData?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * 분석된 오류 정보
 */
export interface AnalyzedError {
  errorId: string;
  executionError: N8nExecutionError;
  errorType: ErrorType;
  severity: ErrorSeverity;
  patterns: string[];              // 매칭된 오류 패턴
  rootCause: string;               // 근본 원인
  suggestedFixes: string[];        // 제안된 수정 방법
  autoFixable: boolean;            // 자동 수정 가능 여부
  confidence: number;              // 분석 신뢰도 (0-1)
  analyzedAt: Date;
}

/**
 * 오류 패턴 정의
 */
export interface ErrorPattern {
  id: string;
  name: string;
  errorType: ErrorType;
  pattern: RegExp | string;        // 오류 메시지 패턴
  severity: ErrorSeverity;
  autoFixable: boolean;
  fixStrategy: string;             // 수정 전략 ID
  description: string;
}

/**
 * 워크플로우 수정 요청
 */
export interface WorkflowFixRequest {
  workflowId: string;
  analyzedError: AnalyzedError;
  fixStrategy: FixStrategy;
  dryRun?: boolean;                // 실제 적용 없이 시뮬레이션
}

/**
 * 수정 전략
 */
export interface FixStrategy {
  id: string;
  name: string;
  errorType: ErrorType;
  description: string;
  steps: FixStep[];
  requiresApproval: boolean;       // 수동 승인 필요 여부
  estimatedTime: number;           // 예상 소요 시간 (초)
}

/**
 * 수정 단계
 */
export interface FixStep {
  order: number;
  action: FixAction;
  parameters: Record<string, unknown>;
  rollbackable: boolean;           // 롤백 가능 여부
  description: string;
}

/**
 * 수정 액션 타입
 */
export type FixAction =
  | 'update_node_parameter'        // 노드 파라미터 업데이트
  | 'reconnect_nodes'              // 노드 재연결
  | 'update_credential'            // 인증 정보 업데이트
  | 'add_error_handler'            // 에러 핸들러 추가
  | 'adjust_timeout'               // 타임아웃 조정
  | 'add_data_transformation'      // 데이터 변환 추가
  | 'update_expression'            // 표현식 수정
  | 'reorder_nodes'                // 노드 순서 변경
  | 'add_conditional_logic';       // 조건부 로직 추가

/**
 * 워크플로우 수정 결과
 */
export interface WorkflowFixResult {
  fixId: string;
  workflowId: string;
  analyzedError: AnalyzedError;
  fixStrategy: FixStrategy;
  status: FixStatus;
  appliedSteps: FixStep[];
  failedStep?: FixStep;
  backupWorkflow?: Record<string, unknown>;  // 원본 워크플로우 백업
  testResult?: WorkflowTestResult;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
}

/**
 * 워크플로우 테스트 결과
 */
export interface WorkflowTestResult {
  executionId: string;
  success: boolean;
  errorOccurred: boolean;
  sameErrorType: boolean;          // 같은 오류 재발 여부
  executionTime: number;
  outputData?: Record<string, unknown>;
  error?: N8nExecutionError;
}

/**
 * 자동 복구 설정
 */
export interface AutoHealingConfig {
  enabled: boolean;
  cronSchedule: string;            // 크론 표현식 (기본: */5 * * * *)
  maxRetries: number;              // 최대 재시도 횟수
  retryDelay: number;              // 재시도 간격 (초)
  autoFixSeverity: ErrorSeverity[];// 자동 수정할 심각도 레벨
  requireApprovalFor: ErrorType[]; // 승인 필요한 오류 유형
  notifyOnFailure: boolean;
  notifyChannels: string[];        // 알림 채널 (email, slack, webhook)
}

/**
 * 복구 이력
 */
export interface HealingHistory {
  historyId: string;
  workflowId: string;
  analyzedError: AnalyzedError;
  fixResult: WorkflowFixResult;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
}

/**
 * Claude API 분석 요청
 */
export interface ClaudeAnalysisRequest {
  errorContext: N8nExecutionError;
  workflowDefinition: Record<string, unknown>;
  recentExecutions?: N8nExecutionError[];
  additionalContext?: string;
}

/**
 * Claude API 분석 응답
 */
export interface ClaudeAnalysisResponse {
  rootCause: string;
  detailedExplanation: string;
  suggestedFixes: ClaudeSuggestedFix[];
  codeSnippets?: string[];
  optimizationSuggestions?: string[];
  confidence: number;
}

/**
 * Claude 제안 수정
 */
export interface ClaudeSuggestedFix {
  description: string;
  steps: string[];
  code?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  risks: string[];
}

/**
 * 헬스 체크 결과
 */
export interface HealthCheckResult {
  timestamp: Date;
  healthy: boolean;
  checks: {
    n8nApi: boolean;
    redis: boolean;
    mongodb: boolean;
    recentErrors: number;
    pendingFixes: number;
  };
  issues: string[];
  recommendations: string[];
}
