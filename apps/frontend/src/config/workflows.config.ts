/**
 * n8n 워크플로우 ID 설정
 *
 * @description
 * 이 파일에서 n8n 워크플로우 ID를 중앙에서 관리합니다.
 * 실제 n8n 워크플로우 ID로 교체하여 사용하세요.
 *
 * n8n에서 워크플로우 ID 확인 방법:
 * 1. n8n UI에서 워크플로우 열기
 * 2. URL에서 ID 확인: http://localhost:5678/workflow/[ID]
 */

export const WORKFLOW_IDS = {
  /**
   * 지식 습득 프로세스 워크플로우
   *
   * 이 워크플로우는 다음 입력을 받습니다:
   * - topic: 배우고 싶은 내용
   * - goal: 학습 최종 목표
   * - llmModel: 사용할 LLM 모델
   * - learningHours: 학습 시간 (1-24시간)
   * - outputFormat: 출력 형식 (HTML, PDF, Markdown)
   * - email: 결과를 받을 이메일 주소
   */
  LEARNING_PROCESS: 'd4TxgdnhEc1IKaEG', // TODO: 실제 워크플로우 ID로 교체

  // 추가 워크플로우 ID는 여기에 추가
  // ANOTHER_WORKFLOW: 'workflow_id_here',
} as const;

/**
 * 워크플로우 ID 타입
 */
export type WorkflowId = (typeof WORKFLOW_IDS)[keyof typeof WORKFLOW_IDS];
