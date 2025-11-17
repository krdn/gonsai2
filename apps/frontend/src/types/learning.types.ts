/**
 * 지식 습득 프로세스 타입 정의
 */

export interface LearningFormData {
  topic: string; // 내가 배우고 싶은 것
  goal: string; // 학습 최종 요청(목표)
  llmModel: string; // LLM 모델선택
  learningHours: number; // 학습 시간 (1-24시간)
  outputFormat: string; // 출력 형식 (HTML 고정)
  email: string; // 발송 Email
}

export interface LearningFormErrors {
  topic?: string;
  goal?: string;
  llmModel?: string;
  learningHours?: string;
  outputFormat?: string;
  email?: string;
}

export interface LearningExecutionResult {
  executionId?: string;
  message?: string;
  error?: string;
}

export type LearningExecutionStatus = 'idle' | 'submitting' | 'success' | 'error';

export const LLM_MODELS = [
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'gemini-ultra', label: 'Gemini Ultra' },
] as const;

export const OUTPUT_FORMATS = [
  { value: 'HTML', label: 'HTML' },
  { value: 'PDF', label: 'PDF' },
  { value: 'MARKDOWN', label: 'Markdown' },
] as const;
