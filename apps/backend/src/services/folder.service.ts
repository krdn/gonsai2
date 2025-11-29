/**
 * Folder Service
 *
 * @description 폴더 비즈니스 로직
 */

import { ObjectId } from 'mongodb';
import { folderRepository } from '../repositories/folder.repository';
import { folderPermissionRepository } from '../repositories/folder-permission.repository';
import { workflowFolderRepository } from '../repositories/workflow-folder.repository';
import {
  IFolder,
  IFolderResponse,
  ICreateFolderDto,
  IUpdateFolderDto,
  IFolderTreeNode,
  toFolderResponse,
} from '../models/folder.model';
import { log } from '../utils/logger';

class FolderService {
  /**
   * 폴더 생성
   */
  async createFolder(data: ICreateFolderDto, createdBy: string): Promise<IFolderResponse> {
    // 상위 폴더 존재 여부 확인
    if (data.parentId) {
      const parentExists = await folderRepository.folderExists(data.parentId);
      if (!parentExists) {
        throw new Error('Parent folder not found');
      }
    }

    // 동일 이름 폴더 중복 체크 (같은 상위 폴더 내에서)
    const existingFolders = data.parentId
      ? await folderRepository.findByParentId(data.parentId)
      : await folderRepository.findRootFolders();

    if (existingFolders.some((f) => f.name === data.name)) {
      throw new Error('Folder with this name already exists');
    }

    const folderData: Omit<IFolder, '_id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      description: data.description,
      parentId: data.parentId ? new ObjectId(data.parentId) : undefined,
      createdBy: new ObjectId(createdBy),
    };

    const folder = await folderRepository.createFolder(folderData);
    log.info('Folder created', { folderId: folder._id.toString(), name: data.name });

    return toFolderResponse(folder);
  }

  /**
   * 폴더 조회
   */
  async getFolderById(id: string): Promise<IFolderResponse | null> {
    const folder = await folderRepository.findFolderById(id);
    return folder ? toFolderResponse(folder) : null;
  }

  /**
   * 모든 폴더 조회 (관리자용)
   */
  async getAllFolders(): Promise<IFolderResponse[]> {
    const folders = await folderRepository.findAllFolders();
    return folders.map(toFolderResponse);
  }

  /**
   * 사용자가 접근 가능한 폴더 목록 조회
   */
  async getFoldersForUser(userId: string, isAdmin: boolean): Promise<IFolderResponse[]> {
    if (isAdmin) {
      return this.getAllFolders();
    }

    // 사용자에게 직접 부여된 권한이 있는 폴더 조회
    const directPermissions = await folderPermissionRepository.findByUserId(userId);
    const directFolderIds = directPermissions.map((p) => p.folderId.toString());

    // 권한이 있는 폴더의 하위 폴더들도 포함 (권한 상속)
    const allAccessibleIds = new Set<string>(directFolderIds);

    for (const folderId of directFolderIds) {
      const descendantIds = await folderRepository.getDescendantIds(folderId);
      descendantIds.forEach((id) => allAccessibleIds.add(id));
    }

    // 접근 가능한 폴더들 조회
    const allFolders = await folderRepository.findAllFolders();
    const accessibleFolders = allFolders.filter((f) => allAccessibleIds.has(f._id.toString()));

    return accessibleFolders.map(toFolderResponse);
  }

  /**
   * 폴더 트리 구조 조회
   */
  async getFolderTree(userId: string, isAdmin: boolean): Promise<IFolderTreeNode[]> {
    const folders = await this.getFoldersForUser(userId, isAdmin);
    const workflowCounts = await workflowFolderRepository.getWorkflowCountByFolders();

    // 폴더 ID -> 노드 맵 생성
    const nodeMap = new Map<string, IFolderTreeNode>();
    for (const folder of folders) {
      nodeMap.set(folder.id, {
        ...folder,
        children: [],
        workflowCount: workflowCounts.get(folder.id) || 0,
      });
    }

    // 트리 구조 구축
    const rootNodes: IFolderTreeNode[] = [];
    for (const folder of folders) {
      const node = nodeMap.get(folder.id)!;
      if (folder.parentId && nodeMap.has(folder.parentId)) {
        nodeMap.get(folder.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    // 각 레벨에서 이름순 정렬
    const sortChildren = (nodes: IFolderTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((node) => sortChildren(node.children));
    };
    sortChildren(rootNodes);

    return rootNodes;
  }

  /**
   * 폴더 수정
   */
  async updateFolder(id: string, data: IUpdateFolderDto): Promise<IFolderResponse> {
    const folder = await folderRepository.findFolderById(id);
    if (!folder) {
      throw new Error('Folder not found');
    }

    // 상위 폴더 변경 시 순환 참조 체크
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new Error('Folder cannot be its own parent');
      }

      if (data.parentId !== null) {
        // 새 상위 폴더가 현재 폴더의 하위 폴더인지 확인
        const descendantIds = await folderRepository.getDescendantIds(id);
        if (descendantIds.includes(data.parentId)) {
          throw new Error('Cannot move folder to its own descendant');
        }
      }
    }

    const updates: Partial<IFolder> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.parentId !== undefined) {
      updates.parentId = data.parentId ? new ObjectId(data.parentId) : undefined;
    }

    await folderRepository.updateFolder(id, updates);
    log.info('Folder updated', { folderId: id });

    const updatedFolder = await folderRepository.findFolderById(id);
    return toFolderResponse(updatedFolder!);
  }

  /**
   * 폴더 삭제
   */
  async deleteFolder(id: string, deleteChildren: boolean = false): Promise<void> {
    const folder = await folderRepository.findFolderById(id);
    if (!folder) {
      throw new Error('Folder not found');
    }

    if (deleteChildren) {
      // 하위 폴더 및 관련 데이터 모두 삭제
      const descendantIds = await folderRepository.getDescendantIds(id);
      for (const descendantId of descendantIds) {
        await this.deleteFolderData(descendantId);
      }
    } else {
      // 하위 폴더가 있으면 삭제 불가
      const children = await folderRepository.findByParentId(id);
      if (children.length > 0) {
        throw new Error(
          'Cannot delete folder with children. Use deleteChildren=true to delete all.'
        );
      }
    }

    // 현재 폴더 삭제
    await this.deleteFolderData(id);
    log.info('Folder deleted', { folderId: id, deleteChildren });
  }

  /**
   * 폴더 데이터 삭제 (권한, 워크플로우 매핑 포함)
   */
  private async deleteFolderData(folderId: string): Promise<void> {
    // 폴더 권한 삭제
    await folderPermissionRepository.revokeAllFolderPermissions(folderId);

    // 워크플로우 매핑 삭제
    await workflowFolderRepository.unassignAllFromFolder(folderId);

    // 폴더 삭제
    await folderRepository.deleteFolder(folderId);
  }

  /**
   * 하위 폴더 조회
   */
  async getChildFolders(parentId: string | null): Promise<IFolderResponse[]> {
    const children = await folderRepository.findByParentId(parentId);
    return children.map(toFolderResponse);
  }

  /**
   * 폴더 통계 조회
   */
  async getFolderStats() {
    return folderRepository.getFolderStats();
  }

  /**
   * 폴더 존재 여부 확인
   */
  async folderExists(id: string): Promise<boolean> {
    return folderRepository.folderExists(id);
  }
}

export const folderService = new FolderService();
