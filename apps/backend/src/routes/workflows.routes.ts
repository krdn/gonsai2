/**
 * Workflows Routes
 *
 * @description n8n 워크플로우 관리 및 실행 API
 */

import { Router, Request, Response } from 'express';
import { MongoClient } from 'mongodb';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import { ApiResponse, ExecuteWorkflowRequest, ExecuteWorkflowResponse } from '../types/api.types';
import { asyncHandler, authenticateN8nApiKey } from '../middleware';
import { COLLECTIONS } from '../../../../infrastructure/mongodb/schemas/types';

const router = Router();

// 모든 워크플로우 라우트는 인증 필요
router.use(authenticateN8nApiKey);

/**
 * GET /api/workflows
 * 모든 워크플로우 조회
 */
router.get('/', asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const client = new MongoClient(envConfig.MONGODB_URI);
  await client.connect();

  try {
    const workflows = await client
      .db()
      .collection(COLLECTIONS.WORKFLOWS)
      .find()
      .sort({ updatedAt: -1 })
      .toArray();

    const response: ApiResponse = {
      success: true,
      data: workflows,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } finally {
    await client.close();
  }
}));

/**
 * GET /api/workflows/:id
 * 특정 워크플로우 조회
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const client = new MongoClient(envConfig.MONGODB_URI);
  await client.connect();

  try {
    const workflow = await client
      .db()
      .collection(COLLECTIONS.WORKFLOWS)
      .findOne({ n8nWorkflowId: id });

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
        message: `Workflow with ID ${id} does not exist`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: workflow,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } finally {
    await client.close();
  }
}));

/**
 * POST /api/workflows/:id/execute
 * 워크플로우 실행
 */
router.post('/:id/execute', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const body = req.body as ExecuteWorkflowRequest;

  log.info('Executing workflow', { workflowId: id, waitForExecution: body.options?.waitForExecution });

  // n8n API를 통해 워크플로우 실행
  const response = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/workflows/${id}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': envConfig.N8N_API_KEY,
    },
    body: JSON.stringify({
      data: body.inputData || {},
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Workflow execution failed', undefined, {
      workflowId: id,
      status: response.status,
      error: errorText,
    });

    res.status(response.status).json({
      success: false,
      error: 'Workflow execution failed',
      message: errorText,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const n8nResponse = await response.json();

  // MongoDB에 실행 기록 저장
  const client = new MongoClient(envConfig.MONGODB_URI);
  await client.connect();

  try {
    const executionRecord = {
      n8nExecutionId: n8nResponse.data.executionId,
      workflowId: id,
      n8nWorkflowId: id,
      status: 'running' as const,
      mode: 'manual' as const,
      startedAt: new Date(),
      inputData: body.inputData,
      createdAt: new Date(),
    };

    await client
      .db()
      .collection(COLLECTIONS.EXECUTIONS)
      .insertOne(executionRecord);

    log.info('Workflow execution started', {
      executionId: n8nResponse.data.executionId,
      workflowId: id,
    });

    const apiResponse: ApiResponse<ExecuteWorkflowResponse> = {
      success: true,
      data: {
        executionId: n8nResponse.data.executionId,
        workflowId: id,
        status: 'running',
        startedAt: executionRecord.startedAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(202).json(apiResponse);
  } finally {
    await client.close();
  }
}));

/**
 * GET /api/workflows/:id/executions
 * 워크플로우 실행 기록 조회
 */
router.get('/:id/executions', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { limit = 10, skip = 0 } = req.query;

  const client = new MongoClient(envConfig.MONGODB_URI);
  await client.connect();

  try {
    const executions = await client
      .db()
      .collection(COLLECTIONS.EXECUTIONS)
      .find({ n8nWorkflowId: id })
      .sort({ startedAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .toArray();

    const total = await client
      .db()
      .collection(COLLECTIONS.EXECUTIONS)
      .countDocuments({ n8nWorkflowId: id });

    const response: ApiResponse = {
      success: true,
      data: {
        executions,
        pagination: {
          total,
          limit: Number(limit),
          skip: Number(skip),
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } finally {
    await client.close();
  }
}));

export default router;
