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
    // 소속 정보
    body('organizationType')
      .optional()
      .isIn(['school', 'company', 'other'])
      .withMessage('Organization type must be school, company, or other'),
    body('organizationName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Organization name must be 100 characters or less'),
    // AI 관련 정보
    body('aiExperienceLevel')
      .optional()
      .isIn(['beginner', 'elementary', 'intermediate', 'advanced'])
      .withMessage('AI experience level must be beginner, elementary, intermediate, or advanced'),
    body('aiInterests').optional().isArray().withMessage('AI interests must be an array'),
    body('aiInterests.*')
      .optional()
      .isIn([
        'chatbot',
        'automation',
        'data_analysis',
        'image_generation',
        'text_generation',
        'voice_recognition',
        'recommendation',
        'other',
      ])
      .withMessage('Invalid AI interest value'),
    body('aiUsagePurpose')
      .optional()
      .isIn([
        'personal_learning',
        'work_productivity',
        'business_automation',
        'research',
        'development',
        'other',
      ])
      .withMessage('Invalid AI usage purpose'),
    // 아바타
    body('avatar').optional().isString().withMessage('Avatar must be a string'),
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
      const {
        name,
        email,
        currentPassword,
        newPassword,
        organizationType,
        organizationName,
        aiExperienceLevel,
        aiInterests,
        aiUsagePurpose,
        avatar,
      } = req.body;

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

      // 소속 정보 업데이트
      if (organizationType !== undefined) {
        updateData.organizationType = organizationType;
      }
      if (organizationName !== undefined) {
        updateData.organizationName = organizationName;
      }

      // AI 관련 정보 업데이트
      if (aiExperienceLevel !== undefined) {
        updateData.aiExperienceLevel = aiExperienceLevel;
      }
      if (aiInterests !== undefined) {
        updateData.aiInterests = aiInterests;
      }
      if (aiUsagePurpose !== undefined) {
        updateData.aiUsagePurpose = aiUsagePurpose;
      }

      // 아바타 업데이트
      if (avatar !== undefined) {
        updateData.avatar = avatar;
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

/**
 * GET /api/users/:id
 * 특정 사용자 정보 조회 (admin 전용)
 */
router.get(
  '/:id',
  authenticateJWT,
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID format',
        });
        return;
      }

      const db = databaseService.getDb();
      const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

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
        data: {
          ...userWithoutPassword,
          id: user._id.toString(),
          _id: undefined,
        },
      });
    } catch (error) {
      log.error('Get user by ID error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user',
      });
    }
  }
);

/**
 * POST /api/users
 * 새 사용자 생성 (admin 전용)
 */
router.post(
  '/',
  [
    authenticateJWT,
    requireAdmin(),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { email, password, name, role = 'user' } = req.body;

      const db = databaseService.getDb();

      // 이메일 중복 확인
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'Email already exists',
        });
        return;
      }

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, 10);

      const now = new Date();
      const newUser = {
        email,
        password: hashedPassword,
        name,
        role,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection('users').insertOne(newUser);

      log.info('User created by admin', {
        userId: result.insertedId,
        email,
        createdBy: req.userId,
      });

      res.status(201).json({
        success: true,
        data: {
          id: result.insertedId.toString(),
          email,
          name,
          role,
          isActive: true,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        message: 'User created successfully',
      });
    } catch (error) {
      log.error('Create user error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * 사용자 정보 수정 (admin 전용)
 */
router.put(
  '/:id',
  [
    authenticateJWT,
    requireAdmin(),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const { name, email, role, isActive, password } = req.body;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID format',
        });
        return;
      }

      const db = databaseService.getDb();
      const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      // 이름 업데이트
      if (name !== undefined) {
        updateData.name = name;
      }

      // 이메일 업데이트 (중복 확인)
      if (email !== undefined && email !== user.email) {
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

      // 역할 업데이트
      if (role !== undefined) {
        // 자기 자신의 역할은 변경 불가 (실수 방지)
        if (id === req.userId) {
          res.status(400).json({
            success: false,
            error: 'Cannot change your own role',
          });
          return;
        }
        updateData.role = role;
      }

      // 활성화 상태 업데이트
      if (isActive !== undefined) {
        // 자기 자신을 비활성화 불가
        if (id === req.userId && !isActive) {
          res.status(400).json({
            success: false,
            error: 'Cannot deactivate your own account',
          });
          return;
        }
        updateData.isActive = isActive;
      }

      // 비밀번호 업데이트
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

      const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
      const { password: _password, ...userWithoutPassword } = updatedUser!;

      log.info('User updated by admin', {
        userId: id,
        updatedBy: req.userId,
        fields: Object.keys(updateData),
      });

      res.status(200).json({
        success: true,
        data: {
          ...userWithoutPassword,
          id: updatedUser!._id.toString(),
          _id: undefined,
        },
        message: 'User updated successfully',
      });
    } catch (error) {
      log.error('Update user error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * 사용자 삭제 (admin 전용)
 */
router.delete(
  '/:id',
  authenticateJWT,
  requireAdmin(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID format',
        });
        return;
      }

      // 자기 자신 삭제 불가
      if (id === req.userId) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete your own account',
        });
        return;
      }

      const db = databaseService.getDb();
      const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      await db.collection('users').deleteOne({ _id: new ObjectId(id) });

      // 관련 폴더 권한도 삭제
      await db.collection('folder_permissions').deleteMany({ userId: new ObjectId(id) });

      log.info('User deleted by admin', { userId: id, email: user.email, deletedBy: req.userId });

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      log.error('Delete user error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
      });
    }
  }
);

/**
 * PATCH /api/users/:id/role
 * 사용자 역할 변경 (admin 전용)
 */
router.patch(
  '/:id/role',
  [
    authenticateJWT,
    requireAdmin(),
    body('role').isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const { role } = req.body;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID format',
        });
        return;
      }

      // 자기 자신의 역할 변경 불가
      if (id === req.userId) {
        res.status(400).json({
          success: false,
          error: 'Cannot change your own role',
        });
        return;
      }

      const db = databaseService.getDb();
      const result = await db
        .collection('users')
        .updateOne({ _id: new ObjectId(id) }, { $set: { role, updatedAt: new Date() } });

      if (result.matchedCount === 0) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      log.info('User role changed', { userId: id, newRole: role, changedBy: req.userId });

      res.status(200).json({
        success: true,
        message: `User role changed to ${role}`,
      });
    } catch (error) {
      log.error('Change user role error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change user role',
      });
    }
  }
);

/**
 * PATCH /api/users/:id/status
 * 사용자 활성화/비활성화 (admin 전용)
 */
router.patch(
  '/:id/status',
  [
    authenticateJWT,
    requireAdmin(),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const { isActive } = req.body;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID format',
        });
        return;
      }

      // 자기 자신을 비활성화 불가
      if (id === req.userId && !isActive) {
        res.status(400).json({
          success: false,
          error: 'Cannot deactivate your own account',
        });
        return;
      }

      const db = databaseService.getDb();
      const result = await db
        .collection('users')
        .updateOne({ _id: new ObjectId(id) }, { $set: { isActive, updatedAt: new Date() } });

      if (result.matchedCount === 0) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      log.info('User status changed', { userId: id, isActive, changedBy: req.userId });

      res.status(200).json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      log.error('Change user status error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change user status',
      });
    }
  }
);

/**
 * PATCH /api/users/:id/password
 * 사용자 비밀번호 재설정 (admin 전용)
 */
router.patch(
  '/:id/password',
  [
    authenticateJWT,
    requireAdmin(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const { password } = req.body;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID format',
        });
        return;
      }

      const db = databaseService.getDb();
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db
        .collection('users')
        .updateOne(
          { _id: new ObjectId(id) },
          { $set: { password: hashedPassword, updatedAt: new Date() } }
        );

      if (result.matchedCount === 0) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      log.info('User password reset by admin', { userId: id, resetBy: req.userId });

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      log.error('Reset user password error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      });
    }
  }
);

export default router;
