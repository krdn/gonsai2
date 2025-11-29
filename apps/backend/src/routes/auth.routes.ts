/**
 * Authentication Routes
 *
 * @description 사용자 인증 API 엔드포인트
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/auth.service';
import { log } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 사용자 회원가입
 *     description: 새로운 사용자 계정을 생성합니다
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John Doe
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Must contain uppercase, lowercase, number, and special character
 *                 example: Password123!
 *               organizationType:
 *                 type: string
 *                 enum: [school, company, other]
 *                 description: 소속 타입 (학교/회사/기타)
 *               organizationName:
 *                 type: string
 *                 maxLength: 100
 *                 description: 소속명
 *               aiExperienceLevel:
 *                 type: string
 *                 enum: [beginner, elementary, intermediate, advanced]
 *                 description: AI 활용 경험 수준
 *               aiInterests:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [chatbot, automation, data_analysis, image_generation, text_generation, voice_recognition, recommendation, other]
 *                 description: AI 관심 분야 (복수 선택)
 *               aiUsagePurpose:
 *                 type: string
 *                 enum: [personal_learning, work_productivity, business_automation, research, development, other]
 *                 description: AI 활용 목적
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: 이미 존재하는 이메일
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/signup',
  [
    body('email')
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage('Valid email is required'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z0-9가-힣\s]+$/)
      .withMessage('Name can only contain letters, numbers, and spaces'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    // 선택적 필드 유효성 검사
    body('organizationType')
      .optional()
      .isIn(['school', 'company', 'other'])
      .withMessage('organizationType must be one of: school, company, other'),
    body('organizationName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('organizationName must be at most 100 characters'),
    body('aiExperienceLevel')
      .optional()
      .isIn(['beginner', 'elementary', 'intermediate', 'advanced'])
      .withMessage(
        'aiExperienceLevel must be one of: beginner, elementary, intermediate, advanced'
      ),
    body('aiInterests').optional().isArray().withMessage('aiInterests must be an array'),
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
      .withMessage('Invalid aiInterest value'),
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
      .withMessage('Invalid aiUsagePurpose value'),
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

      const {
        email,
        name,
        password,
        organizationType,
        organizationName,
        aiExperienceLevel,
        aiInterests,
        aiUsagePurpose,
      } = req.body;

      // 회원가입 처리
      const result = await authService.signup({
        email,
        name,
        password,
        organizationType,
        organizationName,
        aiExperienceLevel,
        aiInterests,
        aiUsagePurpose,
      });

      // 쿠키에 토큰 저장 (HttpOnly, Secure 옵션 설정)
      res.cookie('token', result.token, {
        httpOnly: true, // JavaScript로 접근 불가
        secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
        sameSite: 'lax', // CSRF 방어
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
        path: '/', // 모든 경로에서 쿠키 접근 가능
      });

      res.status(201).json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      log.error('Signup error', error);

      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      const statusCode = errorMessage.includes('already exists') ? 409 : 500;

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
      });
    }
  }
);

/**
 * POST /api/auth/login
 * 사용자 로그인
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage('Valid email is required'),
    body('password').exists().notEmpty().withMessage('Password is required'),
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

      const { email, password } = req.body;

      // 로그인 처리
      const result = await authService.login(email, password);

      // 쿠키에 토큰 저장
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
        path: '/', // 모든 경로에서 쿠키 접근 가능
      });

      res.status(200).json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      log.error('Login error', error);

      const errorMessage = error instanceof Error ? error.message : 'Login failed';

      res.status(401).json({
        success: false,
        error: errorMessage,
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * 사용자 로그아웃
 */
router.post('/logout', (_req: Request, res: Response): void => {
  // 쿠키 삭제 (설정 시와 동일한 옵션 필요)
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * POST /api/auth/forgot-password
 * 비밀번호 재설정 요청
 */
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage('Valid email is required'),
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

      const { email } = req.body;

      // 비밀번호 재설정 요청 처리
      await authService.requestPasswordReset(email);

      // 보안상 이유로 항상 성공 응답 (이메일 존재 여부 노출 방지)
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      log.error('Forgot password error', error);

      res.status(500).json({
        success: false,
        error: 'Failed to process password reset request',
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * 비밀번호 재설정
 */
router.post(
  '/reset-password',
  [
    body('token').exists().notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
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

      const { token, password } = req.body;

      // 비밀번호 재설정 처리
      await authService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      log.error('Reset password error', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';

      res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
  }
);

export default router;
