/**
 * Folder Repository
 *
 * @description 폴더 데이터 접근 레이어
 */

import { BaseRepository } from './base.repository';
import { IFolder, FOLDER_COLLECTION } from '../models/folder.model';
import { ObjectId, WithId } from 'mongodb';
import { Cacheable, CacheEvict } from '../decorators/cache.decorator';

export class FolderRepository extends BaseRepository<IFolder> {
  protected collectionName = FOLDER_COLLECTION;

  /**
   * ID로 폴더 조회 (캐싱)
   */
  @Cacheable({
    ttl: 300, // 5분
    prefix: 'folder',
    keyGenerator: (id: string) => `id:${id}`,
  })
  async findFolderById(id: string): Promise<WithId<IFolder> | null> {
    return this.findOne({ _id: new ObjectId(id) });
  }

  /**
   * 이름으로 폴더 조회
   */
  async findByName(name: string): Promise<WithId<IFolder> | null> {
    return this.findOne({ name });
  }

  /**
   * 상위 폴더 ID로 하위 폴더 조회
   */
  async findByParentId(parentId: string | null): Promise<WithId<IFolder>[]> {
    if (parentId === null) {
      // 최상위 폴더 (parentId가 없는 폴더)
      return this.find({ parentId: { $exists: false } }, { sort: { name: 1 } });
    }
    return this.find({ parentId: new ObjectId(parentId) }, { sort: { name: 1 } });
  }

  /**
   * 모든 최상위 폴더 조회
   */
  async findRootFolders(): Promise<WithId<IFolder>[]> {
    return this.find(
      {
        $or: [{ parentId: { $exists: false } }, { parentId: null as unknown as undefined }],
      },
      { sort: { name: 1 } }
    );
  }

  /**
   * 모든 폴더 조회
   */
  @Cacheable({
    ttl: 60, // 1분
    prefix: 'folder',
    keyGenerator: () => 'all',
  })
  async findAllFolders(): Promise<WithId<IFolder>[]> {
    return this.find({}, { sort: { name: 1 } });
  }

  /**
   * 폴더 생성 (캐시 무효화)
   */
  @CacheEvict(['folder:*'])
  async createFolder(
    folderData: Omit<IFolder, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<WithId<IFolder>> {
    const folder: IFolder = {
      ...folderData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.create(folder);
  }

  /**
   * 폴더 업데이트 (캐시 무효화)
   */
  @CacheEvict(['folder:*'])
  async updateFolder(folderId: string, updates: Partial<IFolder>): Promise<void> {
    await this.update(
      { _id: new ObjectId(folderId) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * 폴더 삭제 (캐시 무효화)
   */
  @CacheEvict(['folder:*'])
  async deleteFolder(folderId: string): Promise<void> {
    await this.delete({ _id: new ObjectId(folderId) });
  }

  /**
   * 하위 폴더 모두 삭제 (캐시 무효화)
   */
  @CacheEvict(['folder:*'])
  async deleteDescendants(parentId: string): Promise<void> {
    await this.deleteMany({ parentId: new ObjectId(parentId) });
  }

  /**
   * 폴더의 모든 조상 폴더 ID 조회 (권한 상속용)
   * 주어진 폴더에서 루트까지의 모든 상위 폴더 ID 반환
   */
  async getAncestorIds(folderId: string): Promise<string[]> {
    const ancestors: string[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = await this.findFolderById(currentId);
      if (!folder || !folder.parentId) {
        break;
      }
      ancestors.push(folder.parentId.toString());
      currentId = folder.parentId.toString();
    }

    return ancestors;
  }

  /**
   * 폴더의 모든 자손 폴더 ID 조회
   */
  async getDescendantIds(folderId: string): Promise<string[]> {
    const descendants: string[] = [];
    const queue: string[] = [folderId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.findByParentId(currentId);

      for (const child of children) {
        const childId = child._id.toString();
        descendants.push(childId);
        queue.push(childId);
      }
    }

    return descendants;
  }

  /**
   * 폴더 존재 여부 확인
   */
  async folderExists(folderId: string): Promise<boolean> {
    return this.exists({ _id: new ObjectId(folderId) });
  }

  /**
   * 폴더 통계
   */
  @Cacheable({
    ttl: 60, // 1분
    prefix: 'folder',
    keyGenerator: () => 'stats',
  })
  async getFolderStats(): Promise<{
    total: number;
    rootFolders: number;
    subFolders: number;
  }> {
    const pipeline = [
      {
        $facet: {
          total: [{ $count: 'count' }],
          rootFolders: [
            {
              $match: {
                $or: [{ parentId: { $exists: false } }, { parentId: null }],
              },
            },
            { $count: 'count' },
          ],
          subFolders: [
            {
              $match: {
                parentId: { $exists: true, $ne: null },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ];

    const result = await this.aggregate<{
      total: Array<{ count: number }>;
      rootFolders: Array<{ count: number }>;
      subFolders: Array<{ count: number }>;
    }>(pipeline);

    return {
      total: result[0]?.total[0]?.count || 0,
      rootFolders: result[0]?.rootFolders[0]?.count || 0,
      subFolders: result[0]?.subFolders[0]?.count || 0,
    };
  }
}

// Singleton 인스턴스
export const folderRepository = new FolderRepository();
