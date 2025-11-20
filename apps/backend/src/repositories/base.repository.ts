/**
 * Base Repository
 *
 * @description 데이터베이스 작업을 위한 기본 Repository 클래스
 */

import {
  Collection,
  Document,
  Filter,
  FindOptions,
  OptionalId,
  OptionalUnlessRequiredId,
  UpdateFilter,
  DeleteResult,
  UpdateResult,
  WithId,
} from 'mongodb';
import { databaseService } from '../services/database.service';
import { DatabaseError } from '../utils/errors';
import { log } from '../utils/logger';

/**
 * 페이지네이션 옵션
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

/**
 * 페이지네이션 결과
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Base Repository 클래스
 */
export abstract class BaseRepository<T extends Document> {
  protected abstract collectionName: string;

  /**
   * 컬렉션 가져오기
   */
  protected getCollection(): Collection<T> {
    try {
      return databaseService.getCollection<T>(this.collectionName);
    } catch (error) {
      log.error(`Failed to get collection: ${this.collectionName}`, error);
      throw new DatabaseError(
        `Failed to access collection: ${this.collectionName}`,
        error as Error
      );
    }
  }

  /**
   * 단일 문서 조회
   */
  async findOne(filter: Filter<T>, options?: FindOptions): Promise<WithId<T> | null> {
    try {
      return await this.getCollection().findOne(filter, options);
    } catch (error) {
      log.error('Database findOne failed', error, { collection: this.collectionName, filter });
      throw new DatabaseError('Failed to find document', error as Error);
    }
  }

  /**
   * ID로 문서 조회
   */
  async findById(id: string): Promise<WithId<T> | null> {
    try {
      return await this.findOne({ _id: id } as Filter<T>);
    } catch (error) {
      log.error('Database findById failed', error, { collection: this.collectionName, id });
      throw new DatabaseError(`Failed to find document by ID: ${id}`, error as Error);
    }
  }

  /**
   * 여러 문서 조회
   */
  async find(filter: Filter<T> = {}, options?: FindOptions): Promise<WithId<T>[]> {
    try {
      return await this.getCollection().find(filter, options).toArray();
    } catch (error) {
      log.error('Database find failed', error, { collection: this.collectionName, filter });
      throw new DatabaseError('Failed to find documents', error as Error);
    }
  }

  /**
   * 페이지네이션 조회
   */
  async findWithPagination(
    filter: Filter<T> = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<WithId<T>>> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const collection = this.getCollection();

      // 총 개수 조회 (동시 실행)
      const [data, total] = await Promise.all([
        collection
          .find(filter)
          .sort(options.sort || { _id: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      log.error('Database pagination failed', error, { collection: this.collectionName, filter });
      throw new DatabaseError('Failed to paginate documents', error as Error);
    }
  }

  /**
   * 문서 개수 조회
   */
  async count(filter: Filter<T> = {}): Promise<number> {
    try {
      return await this.getCollection().countDocuments(filter);
    } catch (error) {
      log.error('Database count failed', error, { collection: this.collectionName, filter });
      throw new DatabaseError('Failed to count documents', error as Error);
    }
  }

  /**
   * 문서 존재 여부 확인
   */
  async exists(filter: Filter<T>): Promise<boolean> {
    try {
      const count = await this.getCollection().countDocuments(filter, { limit: 1 });
      return count > 0;
    } catch (error) {
      log.error('Database exists check failed', error, { collection: this.collectionName, filter });
      throw new DatabaseError('Failed to check document existence', error as Error);
    }
  }

  /**
   * 문서 생성
   */
  async create(document: OptionalId<T>): Promise<WithId<T>> {
    try {
      const result = await this.getCollection().insertOne(document as OptionalUnlessRequiredId<T>);

      if (!result.acknowledged) {
        throw new DatabaseError('Insert operation was not acknowledged');
      }

      return { ...document, _id: result.insertedId } as WithId<T>;
    } catch (error) {
      log.error('Database create failed', error, { collection: this.collectionName });
      throw new DatabaseError('Failed to create document', error as Error);
    }
  }

  /**
   * 여러 문서 생성
   */
  async createMany(documents: OptionalId<T>[]): Promise<WithId<T>[]> {
    try {
      const result = await this.getCollection().insertMany(
        documents as OptionalUnlessRequiredId<T>[]
      );

      if (!result.acknowledged) {
        throw new DatabaseError('Insert many operation was not acknowledged');
      }

      return documents.map((doc, index) => ({
        ...doc,
        _id: result.insertedIds[index],
      })) as WithId<T>[];
    } catch (error) {
      log.error('Database createMany failed', error, {
        collection: this.collectionName,
        count: documents.length,
      });
      throw new DatabaseError('Failed to create multiple documents', error as Error);
    }
  }

  /**
   * 문서 업데이트
   */
  async update(filter: Filter<T>, update: UpdateFilter<T>): Promise<UpdateResult> {
    try {
      const result = await this.getCollection().updateOne(filter, update);

      if (!result.acknowledged) {
        throw new DatabaseError('Update operation was not acknowledged');
      }

      return result;
    } catch (error) {
      log.error('Database update failed', error, { collection: this.collectionName, filter });
      throw new DatabaseError('Failed to update document', error as Error);
    }
  }

  /**
   * ID로 문서 업데이트
   */
  async updateById(id: string, update: UpdateFilter<T>): Promise<UpdateResult> {
    return this.update({ _id: id } as Filter<T>, update);
  }

  /**
   * 여러 문서 업데이트
   */
  async updateMany(filter: Filter<T>, update: UpdateFilter<T>): Promise<UpdateResult> {
    try {
      const result = await this.getCollection().updateMany(filter, update);

      if (!result.acknowledged) {
        throw new DatabaseError('Update many operation was not acknowledged');
      }

      return result;
    } catch (error) {
      log.error('Database updateMany failed', error, { collection: this.collectionName, filter });
      throw new DatabaseError('Failed to update multiple documents', error as Error);
    }
  }

  /**
   * 문서 삭제
   */
  async delete(filter: Filter<T>): Promise<DeleteResult> {
    try {
      const result = await this.getCollection().deleteOne(filter);

      if (!result.acknowledged) {
        throw new DatabaseError('Delete operation was not acknowledged');
      }

      return result;
    } catch (error) {
      log.error('Database delete failed', error, { collection: this.collectionName, filter });
      throw new DatabaseError('Failed to delete document', error as Error);
    }
  }

  /**
   * ID로 문서 삭제
   */
  async deleteById(id: string): Promise<DeleteResult> {
    return this.delete({ _id: id } as Filter<T>);
  }

  /**
   * 여러 문서 삭제
   */
  async deleteMany(filter: Filter<T>): Promise<DeleteResult> {
    try {
      const result = await this.getCollection().deleteMany(filter);

      if (!result.acknowledged) {
        throw new DatabaseError('Delete many operation was not acknowledged');
      }

      return result;
    } catch (error) {
      log.error('Database deleteMany failed', error, { collection: this.collectionName, filter });
      throw new DatabaseError('Failed to delete multiple documents', error as Error);
    }
  }

  /**
   * 집계 파이프라인 실행
   */
  async aggregate<R extends Document = Document>(pipeline: Document[]): Promise<R[]> {
    try {
      return await this.getCollection().aggregate<R>(pipeline).toArray();
    } catch (error) {
      log.error('Database aggregate failed', error, { collection: this.collectionName, pipeline });
      throw new DatabaseError('Failed to execute aggregation pipeline', error as Error);
    }
  }

  /**
   * 트랜잭션 내에서 작업 실행
   */
  async withTransaction<R>(fn: () => Promise<R>): Promise<R> {
    const session = databaseService.getDb().client.startSession();

    try {
      session.startTransaction();
      const result = await fn();
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      log.error('Transaction failed', error, { collection: this.collectionName });
      throw new DatabaseError('Transaction failed', error as Error);
    } finally {
      await session.endSession();
    }
  }
}
