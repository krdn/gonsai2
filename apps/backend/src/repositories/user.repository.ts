/**
 * User Repository
 *
 * @description 사용자 데이터 접근 레이어
 */

import { BaseRepository } from './base.repository';
import { IUser, USER_COLLECTION } from '../models/user.model';
import { WithId } from 'mongodb';
import { Cacheable, CacheEvict } from '../decorators/cache.decorator';
import { AggregateStatsResult } from '../types/n8n.types';

export class UserRepository extends BaseRepository<IUser> {
  protected collectionName = USER_COLLECTION;

  /**
   * 이메일로 사용자 조회 (캐싱)
   */
  @Cacheable({
    ttl: 300, // 5분
    prefix: 'user',
    keyGenerator: (email: string) => `email:${email}`,
  })
  async findByEmail(email: string): Promise<WithId<IUser> | null> {
    return this.findOne({ email });
  }

  /**
   * 사용자 생성 (캐시 무효화)
   */
  @CacheEvict(['user:*'])
  async createUser(userData: Omit<IUser, 'createdAt' | 'updatedAt'>): Promise<WithId<IUser>> {
    const user: IUser = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.create(user);
  }

  /**
   * 사용자 업데이트 (캐시 무효화)
   */
  @CacheEvict(['user:*'])
  async updateUser(userId: string, updates: Partial<IUser>): Promise<void> {
    await this.updateById(userId, {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 활성 사용자 조회
   */
  async findActiveUsers(): Promise<WithId<IUser>[]> {
    return this.find(
      { isActive: true },
      {
        projection: { password: 0 }, // 비밀번호 필드 제외
        sort: { createdAt: -1 },
      }
    );
  }

  /**
   * 사용자 통계
   */
  @Cacheable({
    ttl: 60, // 1분
    prefix: 'user',
    keyGenerator: () => 'stats',
  })
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const pipeline = [
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { isActive: true } }, { $count: 'count' }],
          inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
        },
      },
    ];

    const result = await this.aggregate<AggregateStatsResult>(pipeline);

    return {
      total: result[0]?.total[0]?.count || 0,
      active: result[0]?.active?.[0]?.count || 0,
      inactive: result[0]?.inactive?.[0]?.count || 0,
    };
  }
}

// Singleton 인스턴스
export const userRepository = new UserRepository();
