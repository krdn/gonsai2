/**
 * Folder Permission Service
 *
 * @description 폴더 권한 비즈니스 로직 (권한 상속 포함)
 */

import { folderRepository } from '../repositories/folder.repository';
import { folderPermissionRepository } from '../repositories/folder-permission.repository';
import {
  IFolderPermission,
  IFolderPermissionResponse,
  PermissionLevel,
  PermissionAction,
  IEffectivePermission,
  toFolderPermissionResponse,
  canPerformAction,
  getHigherPermission,
  PERMISSION_HIERARCHY,
} from '../models/folder-permission.model';
import { log } from '../utils/logger';

class FolderPermissionService {
  /**
   * 폴더에 대한 사용자의 유효 권한 조회 (상속 포함)
   * 상위 폴더에서 상속받은 권한과 직접 부여된 권한 중 더 높은 권한 반환
   */
  async getEffectivePermission(userId: string, folderId: string): Promise<PermissionLevel | null> {
    // 1. 직접 부여된 권한 확인
    const directPermission = await folderPermissionRepository.findPermission(folderId, userId);

    // 2. 상위 폴더에서 상속받은 권한 확인
    const ancestorIds = await folderRepository.getAncestorIds(folderId);
    const ancestorPermissions = await folderPermissionRepository.findPermissionsForFolders(
      ancestorIds,
      userId
    );

    // 3. 모든 권한 중 가장 높은 권한 선택
    let highestPermission: PermissionLevel | null = directPermission?.permission || null;

    for (const [, permission] of ancestorPermissions) {
      if (!highestPermission) {
        highestPermission = permission;
      } else {
        highestPermission = getHigherPermission(highestPermission, permission);
      }
    }

    return highestPermission;
  }

  /**
   * 사용자가 폴더에 대해 특정 작업을 수행할 수 있는지 확인
   */
  async checkPermission(
    userId: string,
    folderId: string,
    requiredAction: PermissionAction
  ): Promise<boolean> {
    const permission = await this.getEffectivePermission(userId, folderId);
    if (!permission) {
      return false;
    }
    return canPerformAction(permission, requiredAction);
  }

  /**
   * 사용자가 최소 특정 레벨 이상의 권한을 가지고 있는지 확인
   */
  async hasMinimumPermission(
    userId: string,
    folderId: string,
    minimumLevel: PermissionLevel
  ): Promise<boolean> {
    const permission = await this.getEffectivePermission(userId, folderId);
    if (!permission) {
      return false;
    }
    return PERMISSION_HIERARCHY[permission] >= PERMISSION_HIERARCHY[minimumLevel];
  }

  /**
   * 권한 부여
   */
  async grantPermission(
    folderId: string,
    userId: string,
    permission: PermissionLevel,
    grantedBy: string
  ): Promise<IFolderPermissionResponse> {
    // 폴더 존재 확인
    const folderExists = await folderRepository.folderExists(folderId);
    if (!folderExists) {
      throw new Error('Folder not found');
    }

    // 자기 자신에게 권한 부여 불가 (선택적)
    if (userId === grantedBy) {
      throw new Error('Cannot grant permission to yourself');
    }

    const result = await folderPermissionRepository.grantPermission(
      folderId,
      userId,
      permission,
      grantedBy
    );

    log.info('Permission granted', { folderId, userId, permission, grantedBy });
    return toFolderPermissionResponse(result);
  }

  /**
   * 권한 수정
   */
  async updatePermission(
    folderId: string,
    userId: string,
    newPermission: PermissionLevel,
    updatedBy: string
  ): Promise<void> {
    // 기존 권한 확인
    const existing = await folderPermissionRepository.findPermission(folderId, userId);
    if (!existing) {
      throw new Error('Permission not found');
    }

    // 자기 자신 권한 수정 불가
    if (userId === updatedBy) {
      throw new Error('Cannot modify your own permission');
    }

    await folderPermissionRepository.updatePermission(folderId, userId, newPermission);
    log.info('Permission updated', { folderId, userId, newPermission, updatedBy });
  }

  /**
   * 권한 삭제
   */
  async revokePermission(folderId: string, userId: string, revokedBy: string): Promise<void> {
    // 자기 자신 권한 삭제 불가
    if (userId === revokedBy) {
      throw new Error('Cannot revoke your own permission');
    }

    await folderPermissionRepository.revokePermission(folderId, userId);
    log.info('Permission revoked', { folderId, userId, revokedBy });
  }

  /**
   * 폴더의 권한 목록 조회 (사용자 정보 포함)
   */
  async getFolderPermissions(folderId: string): Promise<IFolderPermissionResponse[]> {
    const permissions = await folderPermissionRepository.findPermissionsWithUserInfo(folderId);

    return permissions.map((p) =>
      toFolderPermissionResponse(p as IFolderPermission, {
        userName: p.user?.name,
        userEmail: p.user?.email,
      })
    );
  }

  /**
   * 사용자의 모든 폴더 권한 조회 (유효 권한 포함)
   */
  async getUserPermissions(userId: string): Promise<IEffectivePermission[]> {
    const allFolders = await folderRepository.findAllFolders();
    const effectivePermissions: IEffectivePermission[] = [];

    for (const folder of allFolders) {
      const folderId = folder._id.toString();
      const directPermission = await folderPermissionRepository.findPermission(folderId, userId);

      if (directPermission) {
        effectivePermissions.push({
          folderId,
          folderName: folder.name,
          permission: directPermission.permission,
          inherited: false,
        });
      } else {
        // 상속 권한 확인
        const ancestorIds = await folderRepository.getAncestorIds(folderId);
        for (const ancestorId of ancestorIds) {
          const ancestorPermission = await folderPermissionRepository.findPermission(
            ancestorId,
            userId
          );
          if (ancestorPermission) {
            effectivePermissions.push({
              folderId,
              folderName: folder.name,
              permission: ancestorPermission.permission,
              inherited: true,
              inheritedFrom: ancestorId,
            });
            break;
          }
        }
      }
    }

    return effectivePermissions;
  }

  /**
   * 사용자가 접근 가능한 폴더 ID 목록 조회
   */
  async getAccessibleFolderIds(userId: string): Promise<string[]> {
    // 직접 권한이 있는 폴더
    const directFolderIds = await folderPermissionRepository.getAccessibleFolderIds(userId);

    // 하위 폴더까지 포함
    const allAccessibleIds = new Set<string>(directFolderIds);

    for (const folderId of directFolderIds) {
      const descendantIds = await folderRepository.getDescendantIds(folderId);
      descendantIds.forEach((id) => allAccessibleIds.add(id));
    }

    return Array.from(allAccessibleIds);
  }

  /**
   * 폴더 권한 통계 조회
   */
  async getPermissionStats(folderId: string) {
    return folderPermissionRepository.getPermissionStats(folderId);
  }
}

export const folderPermissionService = new FolderPermissionService();
