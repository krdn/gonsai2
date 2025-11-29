/**
 * Workflow Folder Repository
 *
 * @description 워크플로우-폴더 매핑 데이터 접근 레이어
 */

import { BaseRepository } from './base.repository';
import { IWorkflowFolder, WORKFLOW_FOLDER_COLLECTION } from '../models/workflow-folder.model';
import { ObjectId, WithId } from 'mongodb';
import { Cacheable, CacheEvict } from '../decorators/cache.decorator';

export class WorkflowFolderRepository extends BaseRepository<IWorkflowFolder> {
  protected collectionName = WORKFLOW_FOLDER_COLLECTION;

  /**
   * 워크플로우 ID로 폴더 매핑 조회
   */
  @Cacheable({
    ttl: 300, // 5분
    prefix: 'workflow-folder',
    keyGenerator: (workflowId: string) => `workflow:${workflowId}`,
  })
  async findByWorkflowId(workflowId: string): Promise<WithId<IWorkflowFolder> | null> {
    return this.findOne({ workflowId });
  }

  /**
   * 폴더 ID로 워크플로우 매핑 목록 조회
   */
  @Cacheable({
    ttl: 300, // 5분
    prefix: 'workflow-folder',
    keyGenerator: (folderId: string) => `folder:${folderId}`,
  })
  async findByFolderId(folderId: string): Promise<WithId<IWorkflowFolder>[]> {
    return this.find({ folderId: new ObjectId(folderId) }, { sort: { assignedAt: -1 } });
  }

  /**
   * 폴더 내 워크플로우 ID 목록 조회
   */
  async getWorkflowIdsInFolder(folderId: string): Promise<string[]> {
    const mappings = await this.findByFolderId(folderId);
    return mappings.map((m) => m.workflowId);
  }

  /**
   * 여러 폴더의 워크플로우 ID 목록 조회
   */
  async getWorkflowIdsInFolders(folderIds: string[]): Promise<string[]> {
    const mappings = await this.find({
      folderId: { $in: folderIds.map((id) => new ObjectId(id)) },
    });
    return mappings.map((m) => m.workflowId);
  }

  /**
   * 워크플로우를 폴더에 할당 (캐시 무효화)
   */
  @CacheEvict(['workflow-folder:*'])
  async assignWorkflow(
    workflowId: string,
    folderId: string,
    assignedBy: string
  ): Promise<WithId<IWorkflowFolder>> {
    // 기존 매핑이 있으면 삭제
    await this.unassignWorkflow(workflowId);

    const mapping: IWorkflowFolder = {
      workflowId,
      folderId: new ObjectId(folderId),
      assignedBy: new ObjectId(assignedBy),
      assignedAt: new Date(),
    };

    return this.create(mapping);
  }

  /**
   * 워크플로우 폴더 할당 해제 (캐시 무효화)
   */
  @CacheEvict(['workflow-folder:*'])
  async unassignWorkflow(workflowId: string): Promise<void> {
    await this.delete({ workflowId });
  }

  /**
   * 폴더의 모든 워크플로우 할당 해제 (폴더 삭제 시)
   */
  @CacheEvict(['workflow-folder:*'])
  async unassignAllFromFolder(folderId: string): Promise<void> {
    await this.deleteMany({ folderId: new ObjectId(folderId) });
  }

  /**
   * 여러 워크플로우를 폴더에 일괄 할당 (캐시 무효화)
   */
  @CacheEvict(['workflow-folder:*'])
  async assignWorkflows(
    workflowIds: string[],
    folderId: string,
    assignedBy: string
  ): Promise<WithId<IWorkflowFolder>[]> {
    // 기존 매핑 삭제
    await this.deleteMany({ workflowId: { $in: workflowIds } });

    const now = new Date();
    const mappings: IWorkflowFolder[] = workflowIds.map((workflowId) => ({
      workflowId,
      folderId: new ObjectId(folderId),
      assignedBy: new ObjectId(assignedBy),
      assignedAt: now,
    }));

    return this.createMany(mappings);
  }

  /**
   * 워크플로우-폴더 매핑 존재 여부 확인
   */
  async isWorkflowAssigned(workflowId: string): Promise<boolean> {
    return this.exists({ workflowId });
  }

  /**
   * 폴더 내 워크플로우 개수 조회
   */
  async getWorkflowCountInFolder(folderId: string): Promise<number> {
    return this.count({ folderId: new ObjectId(folderId) });
  }

  /**
   * 폴더별 워크플로우 개수 일괄 조회
   */
  async getWorkflowCountByFolders(): Promise<Map<string, number>> {
    const pipeline = [
      {
        $group: {
          _id: '$folderId',
          count: { $sum: 1 },
        },
      },
    ];

    const result = await this.aggregate<{ _id: ObjectId; count: number }>(pipeline);

    const countMap = new Map<string, number>();
    for (const item of result) {
      countMap.set(item._id.toString(), item.count);
    }

    return countMap;
  }

  /**
   * 할당되지 않은 워크플로우 ID 필터링
   * 주어진 워크플로우 ID 목록 중 폴더에 할당되지 않은 것만 반환
   */
  async filterUnassignedWorkflows(workflowIds: string[]): Promise<string[]> {
    const assigned = await this.find({
      workflowId: { $in: workflowIds },
    });

    const assignedIds = new Set(assigned.map((m) => m.workflowId));
    return workflowIds.filter((id) => !assignedIds.has(id));
  }

  /**
   * 모든 매핑 조회 (캐싱)
   */
  @Cacheable({
    ttl: 60, // 1분
    prefix: 'workflow-folder',
    keyGenerator: () => 'all',
  })
  async findAllMappings(): Promise<WithId<IWorkflowFolder>[]> {
    return this.find({});
  }

  /**
   * 워크플로우 ID -> 폴더 ID 매핑 맵 조회
   */
  async getWorkflowToFolderMap(): Promise<Map<string, string>> {
    const mappings = await this.findAllMappings();
    const map = new Map<string, string>();

    for (const mapping of mappings) {
      map.set(mapping.workflowId, mapping.folderId.toString());
    }

    return map;
  }
}

// Singleton 인스턴스
export const workflowFolderRepository = new WorkflowFolderRepository();
