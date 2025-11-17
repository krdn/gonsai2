/**
 * 워크플로우 폼 컴포넌트 공통 인터페이스
 * 모든 워크플로우별 폼은 이 인터페이스를 구현해야 합니다.
 */

export interface WorkflowFormProps {
  /** 워크플로우 ID */
  workflowId: string;
  /** 워크플로우 이름 */
  workflowName: string;
  /** 폼 제출 핸들러 */
  onSubmit: (data: Record<string, any>) => void;
  /** 취소 핸들러 */
  onCancel: () => void;
  /** 데이터 없이 바로 실행 핸들러 */
  onExecuteWithoutData?: () => void;
  /** 로딩 상태 */
  isSubmitting?: boolean;
}

/**
 * 워크플로우 폼 검증 에러
 */
export type FormErrors = Record<string, string | undefined>;

/**
 * 워크플로우 폼 컴포넌트 타입
 */
export type WorkflowFormComponent = React.ComponentType<WorkflowFormProps>;
