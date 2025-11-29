/**
 * Folder Permission Repository
 *
 * @description 폴더 권한 데이터 접근 레이어
 */

import { BaseRepository } from './base.repository';
import {
  IFolderPermission,
  FOLDER_PERMISSION_COLLECTION,
  PermissionLevel,
} from '../models/folder-permission.model';
import { ObjectId, WithId } from 'mongodb';
import { Cacheable, CacheEvict } from '../decorators/cache.decorator';

export class FolderPermissionRepository extends BaseRepository<IFolderPermission> {
  protected collectionName = FOLDER_PERMISSION_COLLECTION;

  /**
   * 특정 폴더-사용자의 권한 조회
   */
  @Cacheable({
    ttl: 300, // 5분
    prefix: 'folder-permission',
    keyGenerator: (folderId: string, userId: string) => `folder:${folderId}:user:${userId}`,
  })
  async findPermission(
    folderId: string,
    userId: string
  ): Promise<WithId<IFolderPermission> | null> {
    return this.findOne({
      folderId: new ObjectId(folderId),
      userId: new ObjectId(userId),
    });
  }

  /**
   * 폴더의 모든 권한 조회
   */
  async findByFolderId(folderId: string): Promise<WithId<IFolderPermission>[]> {
    return this.find({ folderId: new ObjectId(folderId) }, { sort: { grantedAt: -1 } });
  }

  /**
   * 사용자의 모든 폴더 권한 조회
   */
  @Cacheable({
    ttl: 300, // 5분
    prefix: 'folder-permission',
    keyGenerator: (userId: string) => `user:${userId}:all`,
  })
  async findByUserId(userId: string): Promise<WithId<IFolderPermission>[]> {
    return this.find({ userId: new ObjectId(userId) }, { sort: { grantedAt: -1 } });
  }

  /**
   * 사용자가 접근 가능한 폴더 ID 목록 조회
   */
  async getAccessibleFolderIds(userId: string): Promise<string[]> {
    const permissions = await this.findByUserId(userId);
    return permissions.map((p) => p.folderId.toString());
  }

  /**
   * 권한 부여 (캐시 무효화)
   */
  @CacheEvict(['folder-permission:*'])
  async grantPermission(
    folderId: string,
    userId: string,
    permission: PermissionLevel,
    grantedBy: string
  ): Promise<WithId<IFolderPermission>> {
    const now = new Date();

    // 기존 권한이 있으면 업데이트
    const existing = await this.findPermission(folderId, userId);
    if (existing) {
      await this.update(
        { _id: existing._id },
        {
          $set: {
            permission,
            grantedBy: new ObjectId(grantedBy),
            updatedAt: now,
          },
        }
      );
      return {
        ...existing,
        permission,
        grantedBy: new ObjectId(grantedBy),
        updatedAt: now,
      };
    }

    // 새 권한 생성
    const permissionData: IFolderPermission = {
      folderId: new ObjectId(folderId),
      userId: new ObjectId(userId),
      permission,
      grantedBy: new ObjectId(grantedBy),
      grantedAt: now,
      updatedAt: now,
    };

    return this.create(permissionData);
  }

  /**
   * 권한 수정 (캐시 무효화)
   */
  @CacheEvict(['folder-permission:*'])
  async updatePermission(
    folderId: string,
    userId: string,
    newPermission: PermissionLevel
  ): Promise<void> {
    await this.update(
      {
        folderId: new ObjectId(folderId),
        userId: new ObjectId(userId),
      },
      {
        $set: {
          permission: newPermission,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * 권한 삭제 (캐시 무효화)
   */
  @CacheEvict(['folder-permission:*'])
  async revokePermission(folderId: string, userId: string): Promise<void> {
    await this.delete({
      folderId: new ObjectId(folderId),
      userId: new ObjectId(userId),
    });
  }

  /**
   * 폴더의 모든 권한 삭제 (폴더 삭제 시)
   */
  @CacheEvict(['folder-permission:*'])
  async revokeAllFolderPermissions(folderId: string): Promise<void> {
    await this.deleteMany({ folderId: new ObjectId(folderId) });
  }

  /**
   * 사용자의 모든 권한 삭제 (사용자 삭제 시)
   */
  @CacheEvict(['folder-permission:*'])
  async revokeAllUserPermissions(userId: string): Promise<void> {
    await this.deleteMany({ userId: new ObjectId(userId) });
  }

  /**
   * 여러 폴더에 대한 사용자의 권한 일괄 조회
   */
  async findPermissionsForFolders(
    folderIds: string[],
    userId: string
  ): Promise<Map<string, PermissionLevel>> {
    const permissions = await this.find({
      folderId: { $in: folderIds.map((id) => new ObjectId(id)) },
      userId: new ObjectId(userId),
    });

    const permissionMap = new Map<string, PermissionLevel>();
    for (const perm of permissions) {
      permissionMap.set(perm.folderId.toString(), perm.permission);
    }

    return permissionMap;
  }

  /**
   * 폴더 권한 통계
   */
  @Cacheable({
    ttl: 60, // 1분
    prefix: 'folder-permission',
    keyGenerator: (folderId: string) => `stats:${folderId}`,
  })
  async getPermissionStats(folderId: string): Promise<{
    total: number;
    byLevel: Record<PermissionLevel, number>;
  }> {
    const pipeline = [
      { $match: { folderId: new ObjectId(folderId) } },
      {
        $group: {
          _id: '$permission',
          count: { $sum: 1 },
        },
      },
    ];

    const result = await this.aggregate<{ _id: PermissionLevel; count: number }>(pipeline);

    const byLevel: Record<PermissionLevel, number> = {
      viewer: 0,
      executor: 0,
      editor: 0,
      admin: 0,
    };

    let total = 0;
    for (const item of result) {
      byLevel[item._id] = item.count;
      total += item.count;
    }

    return { total, byLevel };
  }

  /**
   * 권한과 함께 사용자 정보 조회 (조인)
   */
  async findPermissionsWithUserInfo(folderId: string): Promise<
    Array<
      WithId<IFolderPermission> & {
        user: { name: string; email: string } | null;
      }
    >
  > {
    const pipeline = [
      { $match: { folderId: new ObjectId(folderId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $addFields: {
          user: {
            $cond: {
              if: { $gt: [{ $size: '$userInfo' }, 0] },
              then: {
                name: { $arrayElemAt: ['$userInfo.name', 0] },
                email: { $arrayElemAt: ['$userInfo.email', 0] },
              },
              else: null,
            },
          },
        },
      },
      { $project: { userInfo: 0 } },
      { $sort: { grantedAt: -1 } },
    ];

    return this.aggregate(pipeline);
  }
}

// Singleton 인스턴스
export const folderPermissionRepository = new FolderPermissionRepository();
