/**
 * Auto Healing Service
 *
 * @description 자동 오류 감지 및 복구 시스템
 */

import { CronJob } from 'cron';
import { MongoClient } from 'mongodb';
import { envConfig } from '../../../apps/backend/src/utils/env-validator';
import { log } from '../../../apps/backend/src/utils/logger';
import { socketIOService } from '../../../apps/backend/src/services/socketio.service';
import { errorAnalyzer } from './error-analyzer.service';
import { workflowFixer } from './workflow-fixer.service';
import {
  AutoHealingConfig,
  HealingHistory,
  AnalyzedError,
  WorkflowFixResult,
} from '../types/error.types';

/**
 * 기본 자동 복구 설정
 */
const DEFAULT_CONFIG: AutoHealingConfig = {
  enabled: true,
  cronSchedule: '*/5 * * * *', // 5분마다
  maxRetries: 3,
  retryDelay: 300, // 5분 (초)
  autoFixSeverity: ['medium', 'low'],
  requireApprovalFor: ['authentication', 'credential_missing'],
  notifyOnFailure: true,
  notifyChannels: ['websocket'],
};

/**
 * Auto Healing Service 클래스
 */
export class AutoHealingService {
  private mongoClient: MongoClient;
  private config: AutoHealingConfig;
  private cronJob: CronJob | null = null;
  private isRunning: boolean = false;

  constructor(config?: Partial<AutoHealingConfig>) {
    this.mongoClient = new MongoClient(envConfig.MONGODB_URI);
    this.config = { ...DEFAULT_CONFIG, ...config };
    log.info('Auto Healing Service initialized', { config: this.config });
  }

  /**
   * 자동 복구 시작
   */
  start(): void {
    if (this.cronJob) {
      log.warn('Auto healing already started');
      return;
    }

    if (!this.config.enabled) {
      log.info('Auto healing is disabled');
      return;
    }

    this.cronJob = new CronJob(
      this.config.cronSchedule,
      async () => {
        await this.healingCycle();
      },
      null,
      true, // start immediately
      'UTC'
    );

    log.info('Auto healing started', { schedule: this.config.cronSchedule });
  }

  /**
   * 자동 복구 중지
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      log.info('Auto healing stopped');
    }
  }

  /**
   * 복구 사이클 실행
   */
  private async healingCycle(): Promise<void> {
    if (this.isRunning) {
      log.warn('Healing cycle already running');
      return;
    }

    this.isRunning = true;
    const cycleStart = Date.now();

    log.info('Starting healing cycle');

    try {
      // 1. 최근 오류 조회
      const recentErrors = await errorAnalyzer.getRecentErrors(20);

      if (recentErrors.length === 0) {
        log.info('No recent errors found');
        return;
      }

      log.info(`Found ${recentErrors.length} recent errors`);

      // 2. 오류 분석
      const analyzedErrors = await errorAnalyzer.analyzeMultipleErrors(recentErrors);

      // 3. 자동 수정 가능한 오류 필터링
      const fixableErrors = analyzedErrors.filter((error) => {
        // 자동 수정 불가능
        if (!error.autoFixable) return false;

        // 심각도 체크
        if (!this.config.autoFixSeverity.includes(error.severity)) return false;

        // 승인 필요 여부 체크
        if (this.config.requireApprovalFor.includes(error.errorType)) return false;

        return true;
      });

      log.info(`${fixableErrors.length} errors are auto-fixable`);

      // 4. 각 오류에 대해 수정 시도
      for (const analyzedError of fixableErrors) {
        try {
          await this.attemptFix(analyzedError);
        } catch (error) {
          log.error('Failed to fix error', error, {
            errorId: analyzedError.errorId,
          });
        }
      }

      const cycleDuration = Date.now() - cycleStart;
      log.info('Healing cycle completed', {
        duration: cycleDuration,
        totalErrors: recentErrors.length,
        fixableErrors: fixableErrors.length,
      });
    } catch (error) {
      log.error('Healing cycle failed', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 수정 시도
   */
  private async attemptFix(analyzedError: AnalyzedError): Promise<void> {
    log.info('Attempting to fix error', {
      errorId: analyzedError.errorId,
      errorType: analyzedError.errorType,
    });

    // 수정 전략 조회
    const fixStrategy = workflowFixer.getFixStrategy(analyzedError.errorType);

    if (!fixStrategy) {
      log.warn('No fix strategy found', { errorType: analyzedError.errorType });
      return;
    }

    // 재시도 이력 확인
    const retryCount = await this.getRetryCount(analyzedError.executionError.workflowId);

    if (retryCount >= this.config.maxRetries) {
      log.warn('Max retries reached', {
        workflowId: analyzedError.executionError.workflowId,
        retryCount,
      });
      await this.notifyMaxRetriesReached(analyzedError);
      return;
    }

    try {
      // 수정 실행
      const fixResult = await workflowFixer.fixWorkflow({
        workflowId: analyzedError.executionError.workflowId,
        analyzedError,
        fixStrategy,
      });

      // 이력 저장
      await this.saveHealingHistory(analyzedError, fixResult, false);

      // 성공 알림
      if (fixResult.status === 'fixed') {
        await this.notifyFixSuccess(analyzedError, fixResult);
      } else {
        await this.notifyFixFailure(analyzedError, fixResult);
      }
    } catch (error) {
      log.error('Fix attempt failed', error, {
        errorId: analyzedError.errorId,
      });

      // 실패 알림
      if (this.config.notifyOnFailure) {
        await this.notifyFixFailure(analyzedError, null, error);
      }
    }
  }

  /**
   * 재시도 횟수 조회
   */
  private async getRetryCount(workflowId: string): Promise<number> {
    try {
      await this.mongoClient.connect();

      const since = new Date();
      since.setSeconds(since.getSeconds() - this.config.retryDelay);

      const count = await this.mongoClient
        .db()
        .collection('healing_history')
        .countDocuments({
          workflowId,
          createdAt: { $gte: since },
        });

      return count;
    } catch (error) {
      log.error('Failed to get retry count', error);
      return 0;
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 복구 이력 저장
   */
  private async saveHealingHistory(
    analyzedError: AnalyzedError,
    fixResult: WorkflowFixResult,
    approved: boolean
  ): Promise<void> {
    try {
      await this.mongoClient.connect();

      const history: HealingHistory = {
        historyId: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowId: analyzedError.executionError.workflowId,
        analyzedError,
        fixResult,
        approved,
        createdAt: new Date(),
      };

      await this.mongoClient.db().collection('healing_history').insertOne(history);

      log.info('Healing history saved', { historyId: history.historyId });
    } catch (error) {
      log.error('Failed to save healing history', error);
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 수정 성공 알림
   */
  private async notifyFixSuccess(
    analyzedError: AnalyzedError,
    fixResult: WorkflowFixResult
  ): Promise<void> {
    log.info('Workflow fixed successfully', {
      workflowId: fixResult.workflowId,
      errorType: analyzedError.errorType,
    });

    // WebSocket 알림
    if (this.config.notifyChannels.includes('websocket')) {
      socketIOService.broadcast('healing.success', {
        workflowId: fixResult.workflowId,
        errorType: analyzedError.errorType,
        fixStrategy: fixResult.fixStrategy.name,
        duration: fixResult.duration,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 수정 실패 알림
   */
  private async notifyFixFailure(
    analyzedError: AnalyzedError,
    fixResult: WorkflowFixResult | null,
    error?: unknown
  ): Promise<void> {
    log.warn('Workflow fix failed', {
      workflowId: analyzedError.executionError.workflowId,
      errorType: analyzedError.errorType,
    });

    // WebSocket 알림
    if (this.config.notifyChannels.includes('websocket')) {
      socketIOService.broadcast('healing.failure', {
        workflowId: analyzedError.executionError.workflowId,
        errorType: analyzedError.errorType,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 최대 재시도 도달 알림
   */
  private async notifyMaxRetriesReached(analyzedError: AnalyzedError): Promise<void> {
    log.warn('Max retries reached', {
      workflowId: analyzedError.executionError.workflowId,
    });

    // WebSocket 알림
    if (this.config.notifyChannels.includes('websocket')) {
      socketIOService.broadcast('healing.max_retries', {
        workflowId: analyzedError.executionError.workflowId,
        errorType: analyzedError.errorType,
        maxRetries: this.config.maxRetries,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 복구 이력 조회
   */
  async getHealingHistory(workflowId?: string, limit: number = 50): Promise<HealingHistory[]> {
    try {
      await this.mongoClient.connect();

      const query = workflowId ? { workflowId } : {};

      const history = await this.mongoClient
        .db()
        .collection('healing_history')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return history as unknown as HealingHistory[];
    } catch (error) {
      log.error('Failed to get healing history', error);
      throw error;
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 복구 통계
   */
  async getHealingStatistics(days: number = 7): Promise<Record<string, unknown>> {
    try {
      await this.mongoClient.connect();

      const since = new Date();
      since.setDate(since.getDate() - days);

      const stats = await this.mongoClient
        .db()
        .collection('healing_history')
        .aggregate([
          {
            $match: {
              createdAt: { $gte: since },
            },
          },
          {
            $group: {
              _id: '$fixResult.status',
              count: { $sum: 1 },
              avgDuration: { $avg: '$fixResult.duration' },
            },
          },
        ])
        .toArray();

      return {
        period: `Last ${days} days`,
        byStatus: stats,
      };
    } catch (error) {
      log.error('Failed to get healing statistics', error);
      throw error;
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<AutoHealingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    log.info('Auto healing config updated', { config: this.config });

    // 크론 스케줄 변경 시 재시작
    if (newConfig.cronSchedule && this.cronJob) {
      this.stop();
      this.start();
    }
  }

  /**
   * 현재 설정 조회
   */
  getConfig(): AutoHealingConfig {
    return { ...this.config };
  }
}

/**
 * 싱글톤 인스턴스
 */
export const autoHealing = new AutoHealingService();
