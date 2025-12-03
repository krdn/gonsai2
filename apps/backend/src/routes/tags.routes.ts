/**
 * Tags Routes
 *
 * @description n8n 태그 관리 API
 */

import { Router, Request, Response } from 'express';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import { getCorrelationId } from '../middleware/correlation-id.middleware';
import { asyncHandler, authenticateJWT } from '../middleware';
import { N8nApiError } from '../utils/errors';

const router = Router();

// 모든 태그 라우트는 JWT 인증 필요 (다른 라우트와 일관성 유지)
router.use(authenticateJWT);

/**
 * GET /api/tags
 * 모든 태그 조회 (n8n API 프록시)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);

    log.info('[Tags Routes] Fetching all tags from n8n', { correlationId });

    // n8n API에서 직접 태그 조회
    const n8nResponse = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/tags`, {
      headers: {
        'X-N8N-API-KEY': envConfig.N8N_API_KEY,
      },
    });

    if (!n8nResponse.ok) {
      throw new N8nApiError(`Failed to fetch tags from n8n: ${n8nResponse.status}`, {
        correlationId,
        status: n8nResponse.status,
      });
    }

    const data = await n8nResponse.json();

    log.info('[Tags Routes] Successfully fetched tags from n8n', {
      correlationId,
      count: data.data?.length || 0,
    });

    res.json(data);
  })
);

/**
 * GET /api/tags/:id
 * 특정 태그 조회 (n8n API 프록시)
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const correlationId = getCorrelationId(req);

    log.info('[Tags Routes] Fetching tag by ID from n8n', { correlationId, tagId: id });

    // n8n API에서 특정 태그 조회
    const n8nResponse = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/tags/${id}`, {
      headers: {
        'X-N8N-API-KEY': envConfig.N8N_API_KEY,
      },
    });

    if (!n8nResponse.ok) {
      throw new N8nApiError(`Failed to fetch tag ${id} from n8n: ${n8nResponse.status}`, {
        correlationId,
        status: n8nResponse.status,
      });
    }

    const data = await n8nResponse.json();

    log.info('[Tags Routes] Successfully fetched tag from n8n', {
      correlationId,
      tagId: id,
    });

    res.json(data);
  })
);

/**
 * POST /api/tags
 * 새로운 태그 생성 (n8n API 프록시)
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);
    const tagData = req.body;

    log.info('[Tags Routes] Creating new tag in n8n', {
      correlationId,
      tagName: tagData.name,
    });

    // n8n API로 태그 생성
    const n8nResponse = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/tags`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': envConfig.N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tagData),
    });

    if (!n8nResponse.ok) {
      throw new N8nApiError(`Failed to create tag in n8n: ${n8nResponse.status}`, {
        correlationId,
        status: n8nResponse.status,
      });
    }

    const data = await n8nResponse.json();

    log.info('[Tags Routes] Successfully created tag in n8n', {
      correlationId,
      tagId: data.id,
      tagName: data.name,
    });

    res.status(201).json(data);
  })
);

/**
 * DELETE /api/tags/:id
 * 태그 삭제 (n8n API 프록시)
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const correlationId = getCorrelationId(req);

    log.info('[Tags Routes] Deleting tag from n8n', { correlationId, tagId: id });

    // n8n API로 태그 삭제
    const n8nResponse = await fetch(`${envConfig.N8N_BASE_URL}/api/v1/tags/${id}`, {
      method: 'DELETE',
      headers: {
        'X-N8N-API-KEY': envConfig.N8N_API_KEY,
      },
    });

    if (!n8nResponse.ok) {
      throw new N8nApiError(`Failed to delete tag ${id} from n8n: ${n8nResponse.status}`, {
        correlationId,
        status: n8nResponse.status,
      });
    }

    log.info('[Tags Routes] Successfully deleted tag from n8n', {
      correlationId,
      tagId: id,
    });

    res.status(204).send();
  })
);

export default router;
