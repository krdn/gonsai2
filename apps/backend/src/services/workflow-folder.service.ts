/**
 * Workflow Folder Service
 *
 * @description 워크플로우-폴더 매핑 비즈니스 로직
 */

import { folderRepository } from '../repositories/folder.repository';
import { folderPermissionService } from './folder-permission.service';
import { workflowFolderRepository } from '../repositories/workflow-folder.repository';
import { IWorkflowFolderResponse, toWorkflowFolderResponse } from '../models/workflow-folder.model';
import { PermissionAction } from '../models/folder-permission.model';
import { log } from '../utils/logger';

class WorkflowFolderService {
  /**
   * 워크플로우를 폴더에 할당
   */
  async assignWorkflowToFolder(
    workflowId: string,
    folderId: string,
    assignedBy: string
  ): Promise<IWorkflowFolderResponse> {
    // 폴더 존재 확인
    const folderExists = await folderRepository.folderExists(folderId);
    if (!folderExists) {
      throw new Error('Folder not found');
    }

    const mapping = await workflowFolderRepository.assignWorkflow(workflowId, folderId, assignedBy);

    log.info('Workflow assigned to folder', { workflowId, folderId, assignedBy });
    return toWorkflowFolderResponse(mapping);
  }

  /**
   * 워크플로우 폴더 할당 해제
   */
  async unassignWorkflowFromFolder(workflowId: string): Promise<void> {
    await workflowFolderRepository.unassignWorkflow(workflowId);
    log.info('Workflow unassigned from folder', { workflowId });
  }

  /**
   * 여러 워크플로우를 폴더에 일괄 할당
   */
  async assignWorkflowsToFolder(
    workflowIds: string[],
    folderId: string,
    assignedBy: string
  ): Promise<IWorkflowFolderResponse[]> {
    // 폴더 존재 확인
    const folderExists = await folderRepository.folderExists(folderId);
    if (!folderExists) {
      throw new Error('Folder not found');
    }

    const mappings = await workflowFolderRepository.assignWorkflows(
      workflowIds,
      folderId,
      assignedBy
    );

    log.info('Workflows assigned to folder', {
      workflowIds,
      folderId,
      assignedBy,
      count: workflowIds.length,
    });

    return mappings.map((m) => toWorkflowFolderResponse(m));
  }

  /**
   * 폴더 내 워크플로우 ID 목록 조회
   */
  async getWorkflowsInFolder(folderId: string): Promise<string[]> {
    return workflowFolderRepository.getWorkflowIdsInFolder(folderId);
  }

  /**
   * 워크플로우의 폴더 정보 조회
   */
  async getFolderForWorkflow(workflowId: string): Promise<string | null> {
    const mapping = await workflowFolderRepository.findByWorkflowId(workflowId);
    return mapping ? mapping.folderId.toString() : null;
  }

  /**
   * 사용자가 접근 가능한 워크플로우 ID 목록 조회
   */
  async getAccessibleWorkflowIds(userId: string, isAdmin: boolean): Promise<string[]> {
    if (isAdmin) {
      // admin은 모든 워크플로우 접근 가능 (할당되지 않은 것 포함)
      return []; // 빈 배열은 "모든 워크플로우"를 의미 (호출자가 처리)
    }

    // 접근 가능한 폴더 ID 조회
    const accessibleFolderIds = await folderPermissionService.getAccessibleFolderIds(userId);

    if (accessibleFolderIds.length === 0) {
      return []; // 접근 가능한 폴더 없음
    }

    // 해당 폴더들의 워크플로우 ID 조회
    return workflowFolderRepository.getWorkflowIdsInFolders(accessibleFolderIds);
  }

  /**
   * 사용자가 특정 워크플로우에 접근 가능한지 확인
   */
  async checkWorkflowAccess(
    userId: string,
    workflowId: string,
    action: PermissionAction,
    isAdmin: boolean
  ): Promise<boolean> {
    // admin은 모든 워크플로우 접근 가능
    if (isAdmin) {
      return true;
    }

    // 워크플로우의 폴더 확인
    const folderId = await this.getFolderForWorkflow(workflowId);

    // 폴더에 할당되지 않은 워크플로우는 admin만 접근 가능
    if (!folderId) {
      return false;
    }

    // 해당 폴더에 대한 권한 확인
    return folderPermissionService.checkPermission(userId, folderId, action);
  }

  /**
   * 워크플로우 ID -> 폴더 ID 매핑 맵 조회
   */
  async getWorkflowToFolderMap(): Promise<Map<string, string>> {
    return workflowFolderRepository.getWorkflowToFolderMap();
  }

  /**
   * 폴더별 워크플로우 개수 조회
   */
  async getWorkflowCountByFolders(): Promise<Map<string, number>> {
    return workflowFolderRepository.getWorkflowCountByFolders();
  }

  /**
   * 할당되지 않은 워크플로우 ID 필터링
   */
  async filterUnassignedWorkflows(workflowIds: string[]): Promise<string[]> {
    return workflowFolderRepository.filterUnassignedWorkflows(workflowIds);
  }

  /**
   * 워크플로우가 폴더에 할당되어 있는지 확인
   */
  async isWorkflowAssigned(workflowId: string): Promise<boolean> {
    return workflowFolderRepository.isWorkflowAssigned(workflowId);
  }
}

export const workflowFolderService = new WorkflowFolderService();
