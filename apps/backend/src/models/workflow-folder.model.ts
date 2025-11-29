/**
 * Workflow Folder Model
 *
 * @description 워크플로우-폴더 매핑 데이터 모델
 * n8n 워크플로우와 폴더 간의 연결을 관리
 */

import { ObjectId } from 'mongodb';

/**
 * 워크플로우-폴더 매핑 인터페이스
 */
export interface IWorkflowFolder {
  _id?: ObjectId;
  workflowId: string; // n8n 워크플로우 ID (문자열)
  folderId: ObjectId; // 폴더 ID
  assignedBy: ObjectId; // 할당자
  assignedAt: Date;
}

/**
 * 워크플로우-폴더 매핑 응답 인터페이스
 */
export interface IWorkflowFolderResponse {
  id: string;
  workflowId: string;
  folderId: string;
  assignedBy: string;
  assignedAt: string;
  // 조인된 정보 (선택적)
  folderName?: string;
  workflowName?: string;
}

/**
 * 워크플로우 할당 DTO
 */
export interface IAssignWorkflowDto {
  workflowId: string;
}

/**
 * 일괄 할당 DTO
 */
export interface IBulkAssignWorkflowsDto {
  workflowIds: string[];
}

/**
 * WorkflowFolder 모델을 WorkflowFolderResponse로 변환
 */
export function toWorkflowFolderResponse(
  mapping: IWorkflowFolder,
  extra?: {
    folderName?: string;
    workflowName?: string;
  }
): IWorkflowFolderResponse {
  return {
    id: mapping._id?.toString() || '',
    workflowId: mapping.workflowId,
    folderId: mapping.folderId.toString(),
    assignedBy: mapping.assignedBy.toString(),
    assignedAt: mapping.assignedAt.toISOString(),
    folderName: extra?.folderName,
    workflowName: extra?.workflowName,
  };
}

/**
 * MongoDB Collection 이름
 */
export const WORKFLOW_FOLDER_COLLECTION = 'workflow_folders';
