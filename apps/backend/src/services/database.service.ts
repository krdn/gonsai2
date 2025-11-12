/**
 * Database Service
 *
 * @description MongoDB 연결 및 관리
 */

import { MongoClient, Db, Collection, Document } from 'mongodb';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import { USER_COLLECTION, IUser } from '../models/user.model';

class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  /**
   * MongoDB 연결
   */
  async connect(): Promise<void> {
    try {
      if (this.client) {
        log.warn('MongoDB client already exists');
        return;
      }

      log.info('Connecting to MongoDB...', {
        uri: envConfig.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@'), // 비밀번호 마스킹
      });

      this.client = new MongoClient(envConfig.MONGODB_URI!);
      await this.client.connect();

      // 데이터베이스 선택 (URI에서 자동으로 선택)
      this.db = this.client.db();

      log.info('MongoDB connected successfully', {
        database: this.db.databaseName,
      });

      // 인덱스 생성
      await this.createIndexes();

    } catch (error) {
      log.error('MongoDB connection failed', error);
      throw error;
    }
  }

  /**
   * MongoDB 연결 해제
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        log.info('MongoDB disconnected');
      }
    } catch (error) {
      log.error('MongoDB disconnection failed', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 인스턴스 가져오기
   */
  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  /**
   * 컬렉션 가져오기
   */
  getCollection<T extends Document = Document>(name: string): Collection<T> {
    return this.getDb().collection<T>(name);
  }

  /**
   * Users 컬렉션 가져오기
   */
  getUsersCollection(): Collection<IUser> {
    return this.getCollection<IUser>(USER_COLLECTION);
  }

  /**
   * 인덱스 생성
   */
  private async createIndexes(): Promise<void> {
    try {
      const usersCollection = this.getUsersCollection();

      // 이메일 유니크 인덱스
      await usersCollection.createIndex(
        { email: 1 },
        { unique: true, name: 'email_unique' }
      );

      log.info('Database indexes created successfully');
    } catch (error) {
      log.error('Failed to create indexes', error);
      throw error;
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }
}

// Singleton 인스턴스
export const databaseService = new DatabaseService();
