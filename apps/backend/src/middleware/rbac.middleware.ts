/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * @description 역할 기반 권한 관리 미들웨어 + 폴더/워크플로우 권한 관리
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user.model';
import { PermissionLevel, PermissionAction } from '../models/folder-permission.model';
import { folderPermissionService } from '../services/folder-permission.service';
import { workflowFolderService } from '../services/workflow-folder.service';
import { log } from '../utils/logger';

/**
 * 특정 역할을 요구하는 미들웨어 생성
 *
 * @param allowedRoles 허용된 역할 배열
 * @returns Express 미들웨어 함수
 *
 * @example
 * // 관리자만 접근 가능
 * router.delete('/users/:id', authenticateJWT, requireRole(['admin']), deleteUser);
 *
 * // 관리자 또는 매니저 접근 가능
 * router.post('/reports', authenticateJWT, requireRole(['admin', 'manager']), createReport);
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // authenticateJWT 미들웨어가 먼저 실행되어야 함
    if (!req.userRole) {
      log.warn('RBAC check failed: No user role in request', { path: req.path });
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first',
      });
      return;
    }

    // 역할 검증
    if (!allowedRoles.includes(req.userRole)) {
      log.warn('RBAC check failed: Insufficient permissions', {
        userId: req.userId,
        userRole: req.userRole,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    log.debug('RBAC check passed', {
      userId: req.userId,
      userRole: req.userRole,
      path: req.path,
    });
    next();
  };
}

/**
 * 관리자 전용 미들웨어
 *
 * @description requireRole(['admin'])의 간편한 별칭
 *
 * @example
 * router.delete('/users/:id', authenticateJWT, requireAdmin(), deleteUser);
 * router.put('/settings', authenticateJWT, requireAdmin(), updateSettings);
 */
export function requireAdmin() {
  return requireRole(['admin']);
}

/**
 * 본인 또는 관리자만 접근 가능한 미들웨어
 *
 * @param getUserIdFromRequest 요청에서 대상 사용자 ID를 추출하는 함수
 * @returns Express 미들웨어 함수
 *
 * @example
 * // URL 파라미터에서 사용자 ID 추출
 * router.get('/users/:id/profile',
 *   authenticateJWT,
 *   requireSelfOrAdmin(req => req.params.id),
 *   getProfile
 * );
 */
export function requireSelfOrAdmin(getUserIdFromRequest: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userId || !req.userRole) {
      log.warn('Self or Admin check failed: No user info in request', { path: req.path });
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first',
      });
      return;
    }

    const targetUserId = getUserIdFromRequest(req);

    // 본인이거나 관리자인 경우 허용
    if (req.userId === targetUserId || req.userRole === 'admin') {
      log.debug('Self or Admin check passed', {
        userId: req.userId,
        targetUserId,
        userRole: req.userRole,
        path: req.path,
      });
      next();
      return;
    }

    log.warn('Self or Admin check failed: Not owner and not admin', {
      userId: req.userId,
      targetUserId,
      userRole: req.userRole,
      path: req.path,
    });
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You can only access your own resources',
    });
  };
}

/**
 * 폴더 접근 권한 검증 미들웨어
 *
 * @param requiredPermission 필요한 최소 권한 레벨
 * @param getFolderIdFromRequest 요청에서 폴더 ID를 추출하는 함수 (기본: params.id 또는 params.folderId)
 * @returns Express 미들웨어 함수
 *
 * @example
 * // 폴더 조회 (viewer 이상)
 * router.get('/folders/:id', authenticateJWT, requireFolderPermission('viewer'), getFolderById);
 *
 * // 폴더 관리 (admin)
 * router.post('/folders/:id/permissions', authenticateJWT, requireFolderPermission('admin'), addPermission);
 */
export function requireFolderPermission(
  requiredPermission: PermissionLevel,
  getFolderIdFromRequest?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // authenticateJWT 미들웨어가 먼저 실행되어야 함
      if (!req.userId || !req.userRole) {
        log.warn('Folder permission check failed: No user info in request', { path: req.path });
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please authenticate first',
        });
        return;
      }

      // admin 역할은 모든 폴더 접근 가능
      if (req.userRole === 'admin') {
        log.debug('Folder permission check passed: Admin role', {
          userId: req.userId,
          path: req.path,
        });
        next();
        return;
      }

      // 폴더 ID 추출
      const folderId = getFolderIdFromRequest
        ? getFolderIdFromRequest(req)
        : req.params.id || req.params.folderId;

      if (!folderId) {
        log.warn('Folder permission check failed: No folder ID', { path: req.path });
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Folder ID is required',
        });
        return;
      }

      // 권한 확인
      const hasPermission = await folderPermissionService.hasMinimumPermission(
        req.userId,
        folderId,
        requiredPermission
      );

      if (!hasPermission) {
        log.warn('Folder permission check failed: Insufficient permissions', {
          userId: req.userId,
          folderId,
          requiredPermission,
          path: req.path,
        });
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Insufficient folder permissions. Required: ${requiredPermission}`,
        });
        return;
      }

      log.debug('Folder permission check passed', {
        userId: req.userId,
        folderId,
        requiredPermission,
        path: req.path,
      });
      next();
    } catch (error) {
      log.error('Folder permission check error', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to verify folder permissions',
      });
    }
  };
}

/**
 * 워크플로우 접근 권한 검증 미들웨어 (폴더 기반)
 *
 * @param requiredAction 필요한 작업 종류 (view, execute, edit, manage)
 * @param getWorkflowIdFromRequest 요청에서 워크플로우 ID를 추출하는 함수 (기본: params.id 또는 params.workflowId)
 * @returns Express 미들웨어 함수
 *
 * @example
 * // 워크플로우 조회
 * router.get('/workflows/:id', authenticateJWT, requireWorkflowAccess('view'), getWorkflowById);
 *
 * // 워크플로우 실행
 * router.post('/workflows/:id/execute', authenticateJWT, requireWorkflowAccess('execute'), executeWorkflow);
 */
export function requireWorkflowAccess(
  requiredAction: PermissionAction,
  getWorkflowIdFromRequest?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // authenticateJWT 미들웨어가 먼저 실행되어야 함
      if (!req.userId || !req.userRole) {
        log.warn('Workflow access check failed: No user info in request', { path: req.path });
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please authenticate first',
        });
        return;
      }

      // admin 역할은 모든 워크플로우 접근 가능
      if (req.userRole === 'admin') {
        log.debug('Workflow access check passed: Admin role', {
          userId: req.userId,
          path: req.path,
        });
        next();
        return;
      }

      // 워크플로우 ID 추출
      const workflowId = getWorkflowIdFromRequest
        ? getWorkflowIdFromRequest(req)
        : req.params.id || req.params.workflowId;

      if (!workflowId) {
        log.warn('Workflow access check failed: No workflow ID', { path: req.path });
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Workflow ID is required',
        });
        return;
      }

      // 권한 확인 (여기까지 도달하면 admin이 아님)
      const hasAccess = await workflowFolderService.checkWorkflowAccess(
        req.userId,
        workflowId,
        requiredAction,
        false // admin은 위에서 이미 early return했으므로 여기는 항상 false
      );

      if (!hasAccess) {
        log.warn('Workflow access check failed: Insufficient permissions', {
          userId: req.userId,
          workflowId,
          requiredAction,
          path: req.path,
        });
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Insufficient workflow access. Required action: ${requiredAction}`,
        });
        return;
      }

      log.debug('Workflow access check passed', {
        userId: req.userId,
        workflowId,
        requiredAction,
        path: req.path,
      });
      next();
    } catch (error) {
      log.error('Workflow access check error', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to verify workflow access',
      });
    }
  };
}
