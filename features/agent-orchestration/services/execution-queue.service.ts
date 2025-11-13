/**
 * Execution Queue Service
 *
 * @description Bull 큐 기반 워크플로우 실행 스케줄링
 */

import Bull, { Queue, Job, JobOptions } from 'bull';
import { envConfig } from '../../../apps/backend/src/utils/env-validator';
import { log } from '../../../apps/backend/src/utils/logger';
import { MongoClient } from 'mongodb';
import { COLLECTIONS } from '../../../infrastructure/mongodb/schemas/types';
import {
  QueueJobData,
  QueueJobResult,
  ExecutionPriority,
  QueueStats,
  ExecutionStatus,
} from '../types/agent.types';
import { n8nClient } from './n8n-client.service';
import { websocketService } from '../../../apps/backend/src/services/websocket.service';

/**
 * 우선순위별 작업 옵션
 */
const PRIORITY_OPTIONS: Record<ExecutionPriority, JobOptions> = {
  urgent: {
    priority: 1,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  high: {
    priority: 2,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
  normal: {
    priority: 5,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 10000,
    },
  },
  low: {
    priority: 10,
    attempts: 1,
  },
};

/**
 * Execution Queue Service 클래스
 */
export class ExecutionQueueService {
  private queue: Queue<QueueJobData, QueueJobResult>;
  private mongoClient: MongoClient;

  constructor() {
    // Redis 연결 설정
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Bull 큐 생성
    this.queue = new Bull<QueueJobData, QueueJobResult>('workflow-executions', redisUrl, {
      defaultJobOptions: {
        removeOnComplete: 100, // 완료된 작업 100개까지 보관
        removeOnFail: 500,     // 실패한 작업 500개까지 보관
      },
      settings: {
        maxStalledCount: 3,    // 최대 stalled 횟수
        stalledInterval: 30000, // Stalled 체크 간격 (30초)
      },
    });

    // MongoDB 클라이언트
    this.mongoClient = new MongoClient(envConfig.MONGODB_URI);

    // 큐 프로세서 등록
    this.registerProcessor();

    // 이벤트 핸들러 등록
    this.registerEventHandlers();

    log.info('Execution queue service initialized');
  }

  /**
   * 작업 추가 (워크플로우 실행 요청)
   */
  async addJob(jobData: QueueJobData, priority: ExecutionPriority = 'normal'): Promise<Job<QueueJobData>> {
    const options = PRIORITY_OPTIONS[priority];

    const job = await this.queue.add(jobData, {
      ...options,
      jobId: jobData.executionId,
      timeout: jobData.options?.timeout || 300000, // 기본 5분
    });

    log.info('Job added to queue', {
      jobId: job.id,
      executionId: jobData.executionId,
      workflowId: jobData.workflowId,
      priority,
    });

    // MongoDB에 초기 실행 기록 저장
    await this.saveExecutionRecord(jobData, 'queued');

    // WebSocket으로 큐 추가 알림
    websocketService.broadcastExecutionUpdate({
      executionId: jobData.executionId,
      workflowId: jobData.workflowId,
      status: 'queued',
      progress: 0,
    });

    return job;
  }

  /**
   * 작업 프로세서 등록
   */
  private registerProcessor(): void {
    this.queue.process(async (job: Job<QueueJobData>) => {
      const { executionId, workflowId, inputData, options } = job.data;

      log.info('Processing workflow execution', {
        jobId: job.id,
        executionId,
        workflowId,
      });

      try {
        // 1. 실행 상태를 'running'으로 업데이트
        await this.updateExecutionStatus(executionId, 'running');

        websocketService.broadcastExecutionUpdate({
          executionId,
          workflowId,
          status: 'running',
          progress: 10,
        });

        // 2. n8n API를 통해 워크플로우 실행
        const { executionId: n8nExecutionId } = await n8nClient.executeWorkflow(
          workflowId,
          inputData
        );

        websocketService.broadcastExecutionUpdate({
          executionId,
          workflowId,
          status: 'running',
          progress: 30,
        });

        // 3. 실행 완료 대기 (옵션이 활성화된 경우)
        let result;
        if (options?.waitForExecution !== false) {
          result = await n8nClient.waitForExecution(
            n8nExecutionId,
            options?.timeout || 300000
          );

          websocketService.broadcastExecutionUpdate({
            executionId,
            workflowId,
            status: result.status,
            progress: 100,
          });
        } else {
          // 대기하지 않는 경우 즉시 pending 상태로 반환
          result = {
            executionId: n8nExecutionId,
            workflowId,
            status: 'pending' as ExecutionStatus,
            startedAt: new Date(),
          };
        }

        // 4. 결과를 MongoDB에 저장
        await this.saveExecutionResult(executionId, result);

        // 5. 성공 결과 반환
        const jobResult: QueueJobResult = {
          executionId: n8nExecutionId,
          status: result.status,
          startedAt: result.startedAt,
          finishedAt: result.finishedAt || new Date(),
          duration: result.duration || 0,
          outputData: result.outputData,
        };

        log.info('Workflow execution completed', {
          jobId: job.id,
          executionId,
          status: result.status,
        });

        return jobResult;

      } catch (error) {
        log.error('Workflow execution failed', error, {
          jobId: job.id,
          executionId,
          workflowId,
        });

        // 실행 실패 기록
        await this.updateExecutionStatus(executionId, 'failed', error);

        websocketService.broadcastExecutionUpdate({
          executionId,
          workflowId,
          status: 'failed',
          progress: 0,
        });

        throw error;
      }
    });
  }

  /**
   * 이벤트 핸들러 등록
   */
  private registerEventHandlers(): void {
    this.queue.on('completed', (job: Job<QueueJobData>, result: QueueJobResult) => {
      log.info('Job completed', {
        jobId: job.id,
        executionId: job.data.executionId,
        status: result.status,
        duration: result.duration,
      });
    });

    this.queue.on('failed', (job: Job<QueueJobData>, error: Error) => {
      log.error('Job failed', error, {
        jobId: job.id,
        executionId: job.data.executionId,
        attemptsMade: job.attemptsMade,
      });
    });

    this.queue.on('stalled', (job: Job<QueueJobData>) => {
      log.warn('Job stalled', {
        jobId: job.id,
        executionId: job.data.executionId,
      });
    });

    this.queue.on('progress', (job: Job<QueueJobData>, progress: number) => {
      websocketService.broadcastExecutionUpdate({
        executionId: job.data.executionId,
        workflowId: job.data.workflowId,
        status: 'running',
        progress,
      });
    });
  }

  /**
   * 작업 조회
   */
  async getJob(jobId: string): Promise<Job<QueueJobData> | null> {
    return this.queue.getJob(jobId);
  }

  /**
   * 작업 취소
   */
  async cancelJob(executionId: string): Promise<void> {
    const job = await this.queue.getJob(executionId);

    if (!job) {
      throw new Error(`Job not found: ${executionId}`);
    }

    await job.remove();
    await this.updateExecutionStatus(executionId, 'canceled');

    log.info('Job canceled', { executionId });
  }

  /**
   * 큐 통계 조회
   */
  async getQueueStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.queue.getPausedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * 큐 정리
   */
  async cleanQueue(grace: number = 5000): Promise<void> {
    await this.queue.clean(grace, 'completed');
    await this.queue.clean(grace, 'failed');
    log.info('Queue cleaned', { grace });
  }

  /**
   * 큐 종료
   */
  async shutdown(): Promise<void> {
    await this.queue.close();
    await this.mongoClient.close();
    log.info('Execution queue service shut down');
  }

  /**
   * MongoDB에 실행 기록 저장
   */
  private async saveExecutionRecord(jobData: QueueJobData, status: ExecutionStatus): Promise<void> {
    try {
      await this.mongoClient.connect();

      await this.mongoClient
        .db()
        .collection(COLLECTIONS.EXECUTIONS)
        .insertOne({
          n8nExecutionId: jobData.executionId,
          workflowId: jobData.workflowId,
          n8nWorkflowId: jobData.workflowId,
          status,
          mode: jobData.mode,
          startedAt: jobData.createdAt,
          inputData: jobData.inputData,
          createdAt: jobData.createdAt,
        });
    } catch (error) {
      log.error('Failed to save execution record', error);
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 실행 상태 업데이트
   */
  private async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    error?: unknown
  ): Promise<void> {
    try {
      await this.mongoClient.connect();

      const updateData: any = {
        status,
      };

      if (error) {
        updateData.errorDetails = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        };
      }

      if (status === 'success' || status === 'failed' || status === 'canceled') {
        updateData.finishedAt = new Date();
      }

      await this.mongoClient
        .db()
        .collection(COLLECTIONS.EXECUTIONS)
        .updateOne({ n8nExecutionId: executionId }, { $set: updateData });
    } catch (error) {
      log.error('Failed to update execution status', error);
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 실행 결과 저장
   */
  private async saveExecutionResult(executionId: string, result: any): Promise<void> {
    try {
      await this.mongoClient.connect();

      await this.mongoClient
        .db()
        .collection(COLLECTIONS.EXECUTIONS)
        .updateOne(
          { n8nExecutionId: executionId },
          {
            $set: {
              status: result.status,
              finishedAt: result.finishedAt,
              executionTime: result.duration,
              outputData: result.outputData,
              errorDetails: result.error,
            },
          }
        );
    } catch (error) {
      log.error('Failed to save execution result', error);
    } finally {
      await this.mongoClient.close();
    }
  }
}

/**
 * 싱글톤 인스턴스
 */
export const executionQueue = new ExecutionQueueService();
