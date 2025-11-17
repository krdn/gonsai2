/**
 * 워크플로우 폼 라우팅
 * 워크플로우 ID 또는 이름에 따라 적절한 폼 컴포넌트를 반환합니다.
 */

import { WorkflowFormComponent } from './WorkflowFormProps';
import KnowledgeLearningForm from './KnowledgeLearningForm';
import DefaultWorkflowForm from './DefaultWorkflowForm';

/**
 * 워크플로우별 폼 매핑
 * 워크플로우 이름 또는 ID의 일부를 키로 사용
 */
const WORKFLOW_FORM_MAP: Record<string, WorkflowFormComponent> = {
  // 지식 습득 워크플로우
  knowledge: KnowledgeLearningForm,
  learning: KnowledgeLearningForm,
  지식: KnowledgeLearningForm,
  학습: KnowledgeLearningForm,

  // 추가 워크플로우는 여기에 등록
  // 예: 'error-healing': ErrorHealingForm,
  //     'monitoring': MonitoringForm,
};

/**
 * 워크플로우 ID 또는 이름에 기반하여 적절한 폼 컴포넌트를 반환
 *
 * @param workflowId - 워크플로우 ID
 * @param workflowName - 워크플로우 이름
 * @returns 해당하는 폼 컴포넌트 또는 기본 폼
 */
export function getWorkflowForm(workflowId: string, workflowName: string): WorkflowFormComponent {
  // 워크플로우 이름에서 키워드 검색
  const normalizedName = workflowName.toLowerCase();

  for (const [keyword, FormComponent] of Object.entries(WORKFLOW_FORM_MAP)) {
    if (normalizedName.includes(keyword.toLowerCase())) {
      return FormComponent;
    }
  }

  // 워크플로우 ID에서 키워드 검색
  const normalizedId = workflowId.toLowerCase();

  for (const [keyword, FormComponent] of Object.entries(WORKFLOW_FORM_MAP)) {
    if (normalizedId.includes(keyword.toLowerCase())) {
      return FormComponent;
    }
  }

  // 매칭되는 폼이 없으면 기본 폼 반환
  return DefaultWorkflowForm;
}

/**
 * 새로운 워크플로우 폼 등록
 *
 * @param keyword - 워크플로우를 식별할 키워드
 * @param FormComponent - 사용할 폼 컴포넌트
 */
export function registerWorkflowForm(keyword: string, FormComponent: WorkflowFormComponent): void {
  WORKFLOW_FORM_MAP[keyword] = FormComponent;
}

// 내보내기
export type { WorkflowFormComponent, WorkflowFormProps } from './WorkflowFormProps';
export { default as KnowledgeLearningForm } from './KnowledgeLearningForm';
export { default as DefaultWorkflowForm } from './DefaultWorkflowForm';
