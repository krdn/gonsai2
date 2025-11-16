/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * @description 역할 기반 권한 관리 미들웨어
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user.model';
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
