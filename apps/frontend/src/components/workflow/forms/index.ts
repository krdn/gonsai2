/**
 * 워크플로우 폼 라우팅
 * 워크플로우 ID 또는 이름에 따라 적절한 폼 컴포넌트를 반환합니다.
 */

import { WorkflowFormComponent } from './WorkflowFormProps';
import DynamicWorkflowForm from './DynamicWorkflowForm';

/**
 * 워크플로우별 폼 매핑 (특수한 워크플로우만 등록)
 * 주의: 일반적인 키워드는 사용하지 말 것 (예: "지식", "학습" 등)
 * DynamicWorkflowForm이 우선 사용되므로, 정말 특별한 경우만 여기에 등록
 */
const WORKFLOW_FORM_MAP: Record<string, WorkflowFormComponent> = {
  // 특수 워크플로우만 등록 (정확한 워크플로우 이름 사용)
  // 예: 'my-special-workflow-exact-name': CustomForm,
  // 일반적인 키워드는 제거됨 - DynamicWorkflowForm이 대신 처리
};

/**
 * 워크플로우 ID 또는 이름에 기반하여 적절한 폼 컴포넌트를 반환
 *
 * @param workflowId - 워크플로우 ID
 * @param workflowName - 워크플로우 이름
 * @returns 해당하는 폼 컴포넌트 (기본: DynamicWorkflowForm)
 *
 * 우선순위:
 * 1. DynamicWorkflowForm (기본) - formFields가 있으면 동적 폼 생성
 * 2. formFields가 없으면 DefaultWorkflowForm으로 자동 폴백
 * 3. 특수 케이스만 WORKFLOW_FORM_MAP에 등록하여 커스텀 폼 사용
 */
export function getWorkflowForm(workflowId: string, workflowName: string): WorkflowFormComponent {
  // 특수 워크플로우 확인 (정확한 이름 매칭만)
  const normalizedName = workflowName.toLowerCase();
  const normalizedId = workflowId.toLowerCase();

  for (const [keyword, FormComponent] of Object.entries(WORKFLOW_FORM_MAP)) {
    const normalizedKeyword = keyword.toLowerCase();
    // 정확한 매칭 또는 전체 이름 매칭
    if (normalizedName === normalizedKeyword || normalizedId === normalizedKeyword) {
      console.log(`[getWorkflowForm] Using custom form for: ${workflowName}`);
      return FormComponent;
    }
  }

  // 기본적으로 DynamicWorkflowForm 반환
  // DynamicWorkflowForm은 내부에서:
  // 1. formFields가 있으면 → 동적 폼 생성
  // 2. formFields가 없으면 → DefaultWorkflowForm으로 폴백
  console.log(`[getWorkflowForm] Using DynamicWorkflowForm for: ${workflowName}`);
  return DynamicWorkflowForm;
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
export { default as DynamicWorkflowForm } from './DynamicWorkflowForm';
export { default as DynamicFormField } from './DynamicFormField';
