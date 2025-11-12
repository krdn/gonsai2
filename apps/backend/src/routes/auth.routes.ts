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
 * POST /api/auth/signup
 * 사용자 회원가입
 */
router.post(
  '/signup',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
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
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
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

      const { email, name, password } = req.body;

      // 회원가입 처리
      const result = await authService.signup(email, name, password);

      // 쿠키에 토큰 저장 (HttpOnly, Secure 옵션 설정)
      res.cookie('token', result.token, {
        httpOnly: true, // JavaScript로 접근 불가
        secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
        sameSite: 'lax', // CSRF 방어
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
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
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .exists()
      .notEmpty()
      .withMessage('Password is required'),
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
  // 쿠키 삭제
  res.clearCookie('token');

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
