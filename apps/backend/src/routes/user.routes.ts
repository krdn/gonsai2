/**
 * User Profile Routes
 *
 * @description 사용자 프로필 관리 API 엔드포인트
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateJWT, requireAdmin } from '../middleware';
import { databaseService } from '../services/database.service';
import bcrypt from 'bcryptjs';
import { log } from '../utils/logger';
import { ObjectId } from 'mongodb';

const router = Router();

/**
 * GET /api/users
 * 모든 사용자 목록 조회 (admin 전용)
 */
router.get(
  '/',
  authenticateJWT,
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = databaseService.getDb();
      const users = await db
        .collection('users')
        .find({})
        .project({ password: 0 }) // 비밀번호 제외
        .sort({ createdAt: -1 })
        .toArray();

      // ObjectId를 string으로 변환
      const formattedUsers = users.map((user) => ({
        ...user,
        id: user._id.toString(),
        _id: undefined,
      }));

      res.status(200).json({
        success: true,
        data: formattedUsers,
      });
    } catch (error) {
      log.error('Get users list error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users list',
      });
    }
  }
);

/**
 * GET /api/users/me
 * 현재 로그인한 사용자 정보 조회
 */
router.get('/me', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User ID not found in request',
      });
      return;
    }

    const db = databaseService.getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // 비밀번호 제외하고 반환
    const { password: _password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    log.error('Get user profile error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
    });
  }
});

/**
 * PATCH /api/users/me
 * 현재 로그인한 사용자 정보 수정
 */
router.patch(
  '/me',
  [
    authenticateJWT,
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('currentPassword').optional().isString(),
    body('newPassword')
      .optional()
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      // 유효성 검사 결과 확인
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const userId = req.userId;
      const { name, email, currentPassword, newPassword } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User ID not found in request',
        });
        return;
      }

      const db = databaseService.getDb();
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const updateData: Record<string, unknown> = {};

      // 이름 업데이트
      if (name) {
        updateData.name = name;
      }

      // 이메일 업데이트 (중복 확인)
      if (email && email !== user.email) {
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
          res.status(409).json({
            success: false,
            error: 'Email already exists',
          });
          return;
        }
        updateData.email = email;
      }

      // 비밀번호 변경
      if (currentPassword && newPassword) {
        // 현재 비밀번호 확인
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          res.status(401).json({
            success: false,
            error: 'Current password is incorrect',
          });
          return;
        }

        // 새 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateData.password = hashedPassword;
      }

      // 업데이트할 내용이 없으면 에러
      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
        return;
      }

      // 업데이트 수행
      updateData.updatedAt = new Date();
      await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: updateData });

      // 업데이트된 사용자 정보 조회
      const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      const { password: _password, ...userWithoutPassword } = updatedUser!;

      res.status(200).json({
        success: true,
        user: userWithoutPassword,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      log.error('Update user profile error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user profile',
      });
    }
  }
);

export default router;
