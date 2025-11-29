/**
 * Folders Routes
 *
 * @description 폴더 관리 및 권한 관리 API
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { log } from '../utils/logger';
import { getCorrelationId } from '../middleware/correlation-id.middleware';
import { asyncHandler, authenticateJWT, requireRole, requireFolderPermission } from '../middleware';
import { folderService } from '../services/folder.service';
import { folderPermissionService } from '../services/folder-permission.service';
import { workflowFolderService } from '../services/workflow-folder.service';
import { PermissionLevel } from '../models/folder-permission.model';

const router = Router();

// 모든 폴더 라우트는 JWT 인증 필요
router.use(authenticateJWT);

/**
 * 유효성 검사 에러 처리
 */
const handleValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors.array(),
    });
    return true;
  }
  return false;
};

// ============================================
// 폴더 CRUD
// ============================================

/**
 * GET /api/folders
 * 사용자가 접근 가능한 폴더 목록 조회
 */
router.get(
  '/',
  query('tree').optional().isBoolean(),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);
    const isTree = req.query.tree === 'true';
    const isAdmin = req.userRole === 'admin';

    log.info('[Folders Routes] Fetching folders for user', {
      correlationId,
      userId: req.userId,
      isAdmin,
      isTree,
    });

    if (isTree) {
      const tree = await folderService.getFolderTree(req.userId!, isAdmin);
      res.json({ success: true, data: tree });
    } else {
      const folders = await folderService.getFoldersForUser(req.userId!, isAdmin);
      res.json({ success: true, data: folders });
    }
  })
);

/**
 * GET /api/folders/:id
 * 폴더 상세 조회
 */
router.get(
  '/:id',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  requireFolderPermission('viewer'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Fetching folder by ID', { correlationId, folderId: id });

    const folder = await folderService.getFolderById(id);
    if (!folder) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Folder not found',
      });
      return;
    }

    res.json({ success: true, data: folder });
  })
);

/**
 * POST /api/folders
 * 폴더 생성 (admin 역할만)
 */
router.post(
  '/',
  requireRole(['admin']),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (1-100 chars)'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('parentId').optional().isMongoId().withMessage('Invalid parent folder ID'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const correlationId = getCorrelationId(req);
    const { name, description, parentId } = req.body;

    log.info('[Folders Routes] Creating new folder', {
      correlationId,
      name,
      parentId,
      createdBy: req.userId,
    });

    try {
      const folder = await folderService.createFolder({ name, description, parentId }, req.userId!);

      log.info('[Folders Routes] Folder created successfully', {
        correlationId,
        folderId: folder.id,
      });

      res.status(201).json({ success: true, data: folder });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folder';
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message,
      });
    }
  })
);

/**
 * PUT /api/folders/:id
 * 폴더 수정 (폴더 admin 권한)
 */
router.put(
  '/:id',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  requireFolderPermission('admin'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('parentId')
    .optional()
    .custom((value) => {
      if (value === null) return true;
      return /^[a-f\d]{24}$/i.test(value);
    })
    .withMessage('Invalid parent folder ID'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const correlationId = getCorrelationId(req);
    const { name, description, parentId } = req.body;

    log.info('[Folders Routes] Updating folder', {
      correlationId,
      folderId: id,
      updates: { name, description, parentId },
    });

    try {
      const folder = await folderService.updateFolder(id, { name, description, parentId });

      log.info('[Folders Routes] Folder updated successfully', {
        correlationId,
        folderId: id,
      });

      res.json({ success: true, data: folder });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update folder';
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message,
      });
    }
  })
);

/**
 * DELETE /api/folders/:id
 * 폴더 삭제 (admin 역할만)
 */
router.delete(
  '/:id',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  requireRole(['admin']),
  query('deleteChildren').optional().isBoolean(),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const deleteChildren = req.query.deleteChildren === 'true';
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Deleting folder', {
      correlationId,
      folderId: id,
      deleteChildren,
    });

    try {
      await folderService.deleteFolder(id, deleteChildren);

      log.info('[Folders Routes] Folder deleted successfully', {
        correlationId,
        folderId: id,
      });

      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete folder';
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message,
      });
    }
  })
);

// ============================================
// 폴더-워크플로우 관리
// ============================================

/**
 * GET /api/folders/:id/workflows
 * 폴더 내 워크플로우 ID 목록 조회
 */
router.get(
  '/:id/workflows',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  requireFolderPermission('viewer'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Fetching workflows in folder', {
      correlationId,
      folderId: id,
    });

    const workflowIds = await workflowFolderService.getWorkflowsInFolder(id);

    res.json({ success: true, data: workflowIds });
  })
);

/**
 * POST /api/folders/:id/workflows
 * 워크플로우를 폴더에 할당 (폴더 admin 권한)
 */
router.post(
  '/:id/workflows',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  requireFolderPermission('admin'),
  body('workflowId').notEmpty().withMessage('Workflow ID is required'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const { workflowId } = req.body;
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Assigning workflow to folder', {
      correlationId,
      folderId: id,
      workflowId,
      assignedBy: req.userId,
    });

    const mapping = await workflowFolderService.assignWorkflowToFolder(workflowId, id, req.userId!);

    log.info('[Folders Routes] Workflow assigned successfully', {
      correlationId,
      folderId: id,
      workflowId,
    });

    res.status(201).json({ success: true, data: mapping });
  })
);

/**
 * POST /api/folders/:id/workflows/bulk
 * 여러 워크플로우를 폴더에 일괄 할당 (폴더 admin 권한)
 */
router.post(
  '/:id/workflows/bulk',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  requireFolderPermission('admin'),
  body('workflowIds').isArray({ min: 1 }).withMessage('workflowIds must be a non-empty array'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const { workflowIds } = req.body;
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Bulk assigning workflows to folder', {
      correlationId,
      folderId: id,
      workflowCount: workflowIds.length,
      assignedBy: req.userId,
    });

    const mappings = await workflowFolderService.assignWorkflowsToFolder(
      workflowIds,
      id,
      req.userId!
    );

    log.info('[Folders Routes] Workflows assigned successfully', {
      correlationId,
      folderId: id,
      count: mappings.length,
    });

    res.status(201).json({ success: true, data: mappings });
  })
);

/**
 * DELETE /api/folders/:id/workflows/:workflowId
 * 워크플로우 폴더 할당 해제 (폴더 admin 권한)
 */
router.delete(
  '/:id/workflows/:workflowId',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  param('workflowId').notEmpty().withMessage('Workflow ID is required'),
  requireFolderPermission('admin'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id, workflowId } = req.params;
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Unassigning workflow from folder', {
      correlationId,
      folderId: id,
      workflowId,
    });

    await workflowFolderService.unassignWorkflowFromFolder(workflowId);

    log.info('[Folders Routes] Workflow unassigned successfully', {
      correlationId,
      folderId: id,
      workflowId,
    });

    res.status(204).send();
  })
);

// ============================================
// 폴더 권한 관리
// ============================================

/**
 * GET /api/folders/:id/permissions
 * 폴더의 권한 목록 조회 (폴더 admin 권한)
 */
router.get(
  '/:id/permissions',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  requireFolderPermission('admin'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Fetching folder permissions', {
      correlationId,
      folderId: id,
    });

    const permissions = await folderPermissionService.getFolderPermissions(id);

    res.json({ success: true, data: permissions });
  })
);

/**
 * POST /api/folders/:id/permissions
 * 사용자에게 폴더 권한 부여 (폴더 admin 권한)
 */
router.post(
  '/:id/permissions',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  requireFolderPermission('admin'),
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('permission')
    .isIn(['viewer', 'executor', 'editor', 'admin'])
    .withMessage('Invalid permission level'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const { userId, permission } = req.body as { userId: string; permission: PermissionLevel };
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Granting folder permission', {
      correlationId,
      folderId: id,
      userId,
      permission,
      grantedBy: req.userId,
    });

    try {
      const result = await folderPermissionService.grantPermission(
        id,
        userId,
        permission,
        req.userId!
      );

      log.info('[Folders Routes] Permission granted successfully', {
        correlationId,
        folderId: id,
        userId,
        permission,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to grant permission';
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message,
      });
    }
  })
);

/**
 * PUT /api/folders/:id/permissions/:userId
 * 폴더 권한 수정 (폴더 admin 권한)
 */
router.put(
  '/:id/permissions/:userId',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  param('userId').isMongoId().withMessage('Invalid user ID'),
  requireFolderPermission('admin'),
  body('permission')
    .isIn(['viewer', 'executor', 'editor', 'admin'])
    .withMessage('Invalid permission level'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id, userId } = req.params;
    const { permission } = req.body as { permission: PermissionLevel };
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Updating folder permission', {
      correlationId,
      folderId: id,
      userId,
      newPermission: permission,
      updatedBy: req.userId,
    });

    try {
      await folderPermissionService.updatePermission(id, userId, permission, req.userId!);

      log.info('[Folders Routes] Permission updated successfully', {
        correlationId,
        folderId: id,
        userId,
        newPermission: permission,
      });

      res.json({ success: true, message: 'Permission updated successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update permission';
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message,
      });
    }
  })
);

/**
 * DELETE /api/folders/:id/permissions/:userId
 * 폴더 권한 삭제 (폴더 admin 권한)
 */
router.delete(
  '/:id/permissions/:userId',
  param('id').isMongoId().withMessage('Invalid folder ID'),
  param('userId').isMongoId().withMessage('Invalid user ID'),
  requireFolderPermission('admin'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { id, userId } = req.params;
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Revoking folder permission', {
      correlationId,
      folderId: id,
      userId,
      revokedBy: req.userId,
    });

    try {
      await folderPermissionService.revokePermission(id, userId, req.userId!);

      log.info('[Folders Routes] Permission revoked successfully', {
        correlationId,
        folderId: id,
        userId,
      });

      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke permission';
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message,
      });
    }
  })
);

// ============================================
// 사용자 권한 조회
// ============================================

/**
 * GET /api/folders/my-permissions
 * 현재 사용자의 모든 폴더 권한 조회
 */
router.get(
  '/my-permissions',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = getCorrelationId(req);

    log.info('[Folders Routes] Fetching user folder permissions', {
      correlationId,
      userId: req.userId,
    });

    const permissions = await folderPermissionService.getUserPermissions(req.userId!);

    res.json({ success: true, data: permissions });
  })
);

export default router;
