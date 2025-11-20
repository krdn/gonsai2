/**
 * Webhook Routes
 *
 * @description n8n 웹훅 처리 라우터
 */

import { Router, Request, Response } from 'express';
import { Db } from 'mongodb';
import { log } from '../utils/logger';
import { N8nWebhookPayload, ApiResponse } from '../types/api.types';
import { asyncHandler, verifyWebhookSignature } from '../middleware';
import { COLLECTIONS } from '../../../../infrastructure/mongodb/schemas/types';
import { databaseService } from '../services/database.service';

const router = Router();

/**
 * POST /webhooks/n8n
 * n8n 웹훅 콜백 처리
 */
router.post(
  '/n8n',
  verifyWebhookSignature,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const payload = req.body as N8nWebhookPayload;

    log.info('Received n8n webhook', {
      event: payload.event,
      workflowId: payload.workflowId,
      executionId: payload.executionId,
    });

    // 싱글톤 DatabaseService에서 DB 인스턴스 가져오기 (연결 풀링 사용)
    const db = databaseService.getDb();

    switch (payload.event) {
      case 'workflow.execute.success':
        await handleWorkflowSuccess(db, payload);
        break;

      case 'workflow.execute.failed':
        await handleWorkflowFailure(db, payload);
        break;

      case 'node.execute.start':
        await handleNodeExecuteStart(db, payload);
        break;

      case 'node.execute.end':
        await handleNodeExecuteEnd(db, payload);
        break;

      default:
        log.warn('Unknown webhook event', { event: payload.event });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

/**
 * 워크플로우 성공 처리
 */
async function handleWorkflowSuccess(db: Db, payload: N8nWebhookPayload): Promise<void> {
  log.info('Workflow execution succeeded', {
    workflowId: payload.workflowId,
    executionId: payload.executionId,
  });

  // Execution 문서 업데이트
  await db.collection(COLLECTIONS.EXECUTIONS).updateOne(
    { n8nExecutionId: payload.executionId },
    {
      $set: {
        status: 'success',
        finishedAt: new Date(payload.timestamp),
        outputData: payload.data,
        executionTime: calculateExecutionTime(payload),
      },
    },
    { upsert: true }
  );
}

/**
 * 워크플로우 실패 처리
 */
async function handleWorkflowFailure(db: Db, payload: N8nWebhookPayload): Promise<void> {
  log.error('Workflow execution failed', undefined, {
    workflowId: payload.workflowId,
    executionId: payload.executionId,
    error: payload.error,
  });

  // Execution 문서 업데이트
  await db.collection(COLLECTIONS.EXECUTIONS).updateOne(
    { n8nExecutionId: payload.executionId },
    {
      $set: {
        status: 'failed',
        finishedAt: new Date(payload.timestamp),
        errorDetails: payload.error,
        executionTime: calculateExecutionTime(payload),
      },
    },
    { upsert: true }
  );

  // 에러 패턴 매칭 및 빈도 업데이트
  if (payload.error?.message) {
    await updateErrorPattern(db, payload.error.message, payload.workflowId);
  }
}

/**
 * 노드 실행 시작 처리
 */
async function handleNodeExecuteStart(db: Db, payload: N8nWebhookPayload): Promise<void> {
  log.debug('Node execution started', {
    workflowId: payload.workflowId,
    executionId: payload.executionId,
  });

  // Agent Log 생성
  await db.collection(COLLECTIONS.AGENT_LOGS).insertOne({
    agentType: 'n8n-node',
    executionId: payload.executionId,
    n8nExecutionId: payload.executionId,
    timestamp: new Date(payload.timestamp),
    action: 'node_execute_start',
    result: 'success',
    metadata: payload.data,
    createdAt: new Date(),
  });
}

/**
 * 노드 실행 종료 처리
 */
async function handleNodeExecuteEnd(db: Db, payload: N8nWebhookPayload): Promise<void> {
  log.debug('Node execution ended', {
    workflowId: payload.workflowId,
    executionId: payload.executionId,
  });

  // Agent Log 업데이트
  await db.collection(COLLECTIONS.AGENT_LOGS).insertOne({
    agentType: 'n8n-node',
    executionId: payload.executionId,
    n8nExecutionId: payload.executionId,
    timestamp: new Date(payload.timestamp),
    action: 'node_execute_end',
    result: payload.error ? 'failed' : 'success',
    metadata: payload.data,
    createdAt: new Date(),
  });
}

/**
 * 실행 시간 계산 (헬퍼)
 */
function calculateExecutionTime(_payload: N8nWebhookPayload): number | undefined {
  // 실제로는 startedAt과 finishedAt을 비교해야 함
  // 현재는 간단히 payload에서 계산
  return undefined;
}

/**
 * 에러 패턴 매칭 및 업데이트
 */
async function updateErrorPattern(db: Db, errorMessage: string, workflowId: string): Promise<void> {
  // 모든 에러 패턴 조회
  const patterns = await db.collection(COLLECTIONS.ERROR_PATTERNS).find().toArray();

  // 정규식 매칭
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.pattern, 'i');
      if (regex.test(errorMessage)) {
        // 빈도 증가 및 lastOccurred 업데이트
        await db.collection(COLLECTIONS.ERROR_PATTERNS).updateOne(
          { _id: pattern._id },
          {
            $inc: { frequency: 1 },
            $set: { lastOccurred: new Date() },
            $addToSet: { affectedWorkflows: workflowId },
          }
        );

        log.info('Error pattern matched', {
          errorType: pattern.errorType,
          workflowId,
        });

        break; // 첫 번째 매칭만 처리
      }
    } catch (error) {
      log.warn('Invalid regex pattern', { pattern: pattern.pattern });
    }
  }
}

export default router;
