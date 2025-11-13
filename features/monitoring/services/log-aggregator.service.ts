/**
 * Log Aggregator Service
 *
 * @description 다양한 로그 소스를 집계하고 통합 대시보드 데이터 제공
 */

import fs from 'fs/promises';
import path from 'path';
import { MongoClient, Db, Collection } from 'mongodb';
import { CronJob } from 'cron';
import { log } from '../../../apps/backend/src/utils/logger';
import {
  LogAggregationConfig,
  LogSource,
  AggregatedLog,
} from '../types/monitoring.types';

/**
 * 기본 로그 집계 설정
 */
const DEFAULT_CONFIG: LogAggregationConfig = {
  enabled: true,
  sources: [
    {
      name: 'application',
      type: 'file',
      path: 'logs/combined.log',
      pattern: '*.log',
      parser: 'json',
    },
    {
      name: 'error',
      type: 'file',
      path: 'logs/error.log',
      pattern: 'error*.log',
      parser: 'json',
    },
    {
      name: 'n8n',
      type: 'database',
      parser: 'json',
    },
  ],
  retention: {
    days: 30,
    maxSize: 1000, // MB
  },
  aggregation: {
    interval: 5, // minutes
    metrics: ['count', 'level', 'source', 'timestamp'],
  },
};

/**
 * Log Aggregator 클래스
 */
export class LogAggregatorService {
  private db: Db | null = null;
  private logsCollection: Collection<AggregatedLog> | null = null;
  private client: MongoClient | null = null;
  private cronJob: CronJob | null = null;
  private config: LogAggregationConfig;

  constructor(config?: Partial<LogAggregationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    log.info('Log Aggregator Service initialized');
  }

  /**
   * 초기화
   */
  async initialize(): Promise<void> {
    try {
      // MongoDB 연결
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gonsai2';
      this.client = new MongoClient(mongoUri);
      await this.client.connect();

      this.db = this.client.db();
      this.logsCollection = this.db.collection<AggregatedLog>('aggregated_logs');

      // 인덱스 생성
      await this.createIndexes();

      log.info('Log Aggregator initialized');
    } catch (error) {
      log.error('Failed to initialize Log Aggregator', error);
      throw error;
    }
  }

  /**
   * 인덱스 생성
   */
  private async createIndexes(): Promise<void> {
    if (!this.logsCollection) return;

    await this.logsCollection.createIndex({ timestamp: -1 });
    await this.logsCollection.createIndex({ source: 1, timestamp: -1 });
    await this.logsCollection.createIndex({ level: 1, timestamp: -1 });
    await this.logsCollection.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: this.config.retention.days * 24 * 60 * 60 }
    );

    log.info('Aggregated logs indexes created');
  }

  /**
   * 집계 시작
   */
  start(): void {
    if (!this.config.enabled) {
      log.info('Log aggregation is disabled');
      return;
    }

    if (this.cronJob) {
      log.warn('Log aggregation already started');
      return;
    }

    const cronPattern = `*/${this.config.aggregation.interval} * * * *`;

    this.cronJob = new CronJob(
      cronPattern,
      async () => {
        await this.aggregate();
      },
      null,
      true,
      'UTC'
    );

    log.info('Log aggregation started', {
      interval: this.config.aggregation.interval,
    });
  }

  /**
   * 집계 중지
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      log.info('Log aggregation stopped');
    }
  }

  /**
   * 로그 집계 실행
   */
  private async aggregate(): Promise<void> {
    try {
      for (const source of this.config.sources) {
        await this.aggregateSource(source);
      }

      // 오래된 로그 정리
      await this.cleanupOldLogs();
    } catch (error) {
      log.error('Failed to aggregate logs', error);
    }
  }

  /**
   * 소스별 로그 집계
   */
  private async aggregateSource(source: LogSource): Promise<void> {
    try {
      switch (source.type) {
        case 'file':
          await this.aggregateFileSource(source);
          break;
        case 'database':
          await this.aggregateDatabaseSource(source);
          break;
        case 'stream':
          // 스트림 소스는 실시간 처리
          break;
      }
    } catch (error) {
      log.error('Failed to aggregate source', error, { source: source.name });
    }
  }

  /**
   * 파일 소스 집계
   */
  private async aggregateFileSource(source: LogSource): Promise<void> {
    if (!source.path) return;

    try {
      const logPath = path.resolve(process.cwd(), source.path);
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      const recentLines = lines.slice(-100); // 최근 100줄만 처리

      for (const line of recentLines) {
        const parsedLog = this.parseLog(line, source.parser || 'json');
        if (parsedLog) {
          await this.saveAggregatedLog(source.name, parsedLog);
        }
      }

      log.debug('File source aggregated', {
        source: source.name,
        linesProcessed: recentLines.length,
      });
    } catch (error) {
      // 파일이 없을 수도 있음 (로그가 아직 생성되지 않음)
      if ((error as any).code !== 'ENOENT') {
        log.error('Failed to aggregate file source', error, { source: source.name });
      }
    }
  }

  /**
   * 데이터베이스 소스 집계
   */
  private async aggregateDatabaseSource(source: LogSource): Promise<void> {
    // 실제로는 n8n execution logs 등을 조회
    // 여기서는 간단한 구현
    log.debug('Database source aggregation (not implemented)', { source: source.name });
  }

  /**
   * 로그 파싱
   */
  private parseLog(
    line: string,
    parser: 'json' | 'text' | 'custom'
  ): {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    metadata: Record<string, any>;
    timestamp: Date;
  } | null {
    try {
      if (parser === 'json') {
        const parsed = JSON.parse(line);

        return {
          level: parsed.level || 'info',
          message: parsed.message || '',
          metadata: parsed.metadata || parsed,
          timestamp: new Date(parsed.timestamp || Date.now()),
        };
      } else if (parser === 'text') {
        // 간단한 텍스트 파싱
        return {
          level: 'info',
          message: line,
          metadata: {},
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 집계된 로그 저장
   */
  private async saveAggregatedLog(
    source: string,
    parsedLog: {
      level: 'debug' | 'info' | 'warn' | 'error';
      message: string;
      metadata: Record<string, any>;
      timestamp: Date;
    }
  ): Promise<void> {
    if (!this.logsCollection) return;

    try {
      // 중복 체크 (같은 메시지와 타임스탬프)
      const existing = await this.logsCollection.findOne({
        source,
        message: parsedLog.message,
        timestamp: parsedLog.timestamp,
      });

      if (existing) {
        // 카운트 증가
        await this.logsCollection.updateOne(
          { _id: existing._id },
          { $inc: { count: 1 } }
        );
      } else {
        // 새 로그 추가
        const aggregatedLog: AggregatedLog = {
          timestamp: parsedLog.timestamp,
          source,
          level: parsedLog.level,
          message: parsedLog.message,
          metadata: parsedLog.metadata,
          count: 1,
        };

        await this.logsCollection.insertOne(aggregatedLog);
      }
    } catch (error) {
      log.error('Failed to save aggregated log', error);
    }
  }

  /**
   * 로그 조회
   */
  async getLogs(
    source?: string,
    level?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<AggregatedLog[]> {
    try {
      if (!this.logsCollection) {
        throw new Error('Logs collection not initialized');
      }

      const query: any = {};

      if (source) {
        query.source = source;
      }

      if (level) {
        query.level = level;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = startDate;
        }
        if (endDate) {
          query.timestamp.$lte = endDate;
        }
      }

      return await this.logsCollection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      log.error('Failed to get logs', error);
      throw error;
    }
  }

  /**
   * 로그 통계
   */
  async getLogStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    try {
      if (!this.logsCollection) {
        throw new Error('Logs collection not initialized');
      }

      const query: any = {};

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = startDate;
        }
        if (endDate) {
          query.timestamp.$lte = endDate;
        }
      }

      const [total, byLevel, bySource] = await Promise.all([
        this.logsCollection.countDocuments(query),
        this.logsCollection
          .aggregate([
            { $match: query },
            { $group: { _id: '$level', count: { $sum: '$count' } } },
          ])
          .toArray(),
        this.logsCollection
          .aggregate([
            { $match: query },
            { $group: { _id: '$source', count: { $sum: '$count' } } },
          ])
          .toArray(),
      ]);

      const byLevelMap: Record<string, number> = {};
      byLevel.forEach((item) => {
        byLevelMap[item._id] = item.count;
      });

      const bySourceMap: Record<string, number> = {};
      bySource.forEach((item) => {
        bySourceMap[item._id] = item.count;
      });

      return {
        total,
        byLevel: byLevelMap,
        bySource: bySourceMap,
      };
    } catch (error) {
      log.error('Failed to get log statistics', error);
      throw error;
    }
  }

  /**
   * 오래된 로그 정리
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      if (!this.logsCollection) return;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retention.days);

      const result = await this.logsCollection.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      if (result.deletedCount > 0) {
        log.info('Old logs cleaned up', { deletedCount: result.deletedCount });
      }
    } catch (error) {
      log.error('Failed to cleanup old logs', error);
    }
  }

  /**
   * 로그 소스 추가
   */
  addSource(source: LogSource): void {
    if (!this.config.sources.find((s) => s.name === source.name)) {
      this.config.sources.push(source);
      log.info('Log source added', { source: source.name });
    }
  }

  /**
   * 로그 소스 제거
   */
  removeSource(sourceName: string): void {
    this.config.sources = this.config.sources.filter((s) => s.name !== sourceName);
    log.info('Log source removed', { source: sourceName });
  }

  /**
   * 설정 조회
   */
  getConfig(): LogAggregationConfig {
    return { ...this.config };
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    this.stop();

    if (this.client) {
      await this.client.close();
      log.info('Log Aggregator disconnected from MongoDB');
    }
  }
}

/**
 * 싱글톤 인스턴스
 */
export const logAggregator = new LogAggregatorService();
