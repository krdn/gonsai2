/**
 * Authentication Service
 *
 * @description 사용자 인증, JWT 토큰 관리, 비밀번호 해싱
 */

import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { databaseService } from './database.service';
import {
  IUser,
  IUserResponse,
  toUserResponse,
  UserRole,
  OrganizationType,
  AIExperienceLevel,
  AIInterest,
  AIUsagePurpose,
} from '../models/user.model';
import {
  IPasswordResetToken,
  PASSWORD_RESET_TOKEN_COLLECTION,
  TOKEN_EXPIRY_HOURS,
} from '../models/password-reset-token.model';
import { emailService } from './email.service';
import { log } from '../utils/logger';
import { ObjectId } from 'mongodb';
import { ErrorMessages } from '../utils/error-messages';

/**
 * JWT 시크릿 키 (환경 변수에서 가져옴)
 */
const JWT_SECRET_ENV = process.env.JWT_SECRET;

// JWT_SECRET 필수 검증
if (!JWT_SECRET_ENV || JWT_SECRET_ENV.length < 32) {
  throw new Error(
    'CRITICAL SECURITY ERROR: JWT_SECRET must be set in environment variables and be at least 32 characters long. ' +
      'Generate with: openssl rand -base64 32'
  );
}

// TypeScript를 위한 const assertion (validation 통과 후 string 타입 보장)
const JWT_SECRET: string = JWT_SECRET_ENV;

/**
 * JWT 페이로드 인터페이스
 */
export interface IJwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * 로그인 응답 인터페이스
 */
export interface IAuthResponse {
  user: IUserResponse;
  token: string;
}

/**
 * 회원가입 데이터 인터페이스
 */
export interface ISignupData {
  email: string;
  name: string;
  password: string;
  organizationType?: OrganizationType;
  organizationName?: string;
  aiExperienceLevel?: AIExperienceLevel;
  aiInterests?: AIInterest[];
  aiUsagePurpose?: AIUsagePurpose;
}

class AuthService {
  /**
   * 비밀번호 해싱
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * 비밀번호 검증
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * JWT 토큰 생성
   */
  generateToken(userId: string, email: string, role: UserRole): string {
    const payload: IJwtPayload = {
      userId,
      email,
      role,
    };

    // jsonwebtoken의 StringValue 브랜드 타입 이슈를 우회하기 위해 any 캐스팅 사용
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    } as any);
  }

  /**
   * JWT 토큰 검증
   */
  verifyToken(token: string): IJwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as IJwtPayload;
    } catch (error) {
      throw new Error(ErrorMessages.auth.tokenInvalid);
    }
  }

  /**
   * 사용자 회원가입
   */
  async signup(data: ISignupData): Promise<IAuthResponse> {
    try {
      const usersCollection = databaseService.getUsersCollection();

      // 이메일 중복 체크
      const existingUser = await usersCollection.findOne({ email: data.email });
      if (existingUser) {
        throw new Error(ErrorMessages.auth.emailExists);
      }

      // 비밀번호 해싱
      const hashedPassword = await this.hashPassword(data.password);

      // 새 사용자 생성 (기본 역할: user)
      const newUser: Omit<IUser, '_id'> = {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: 'user',
        // 소속 정보
        organizationType: data.organizationType,
        organizationName: data.organizationName,
        // AI 관련 정보
        aiExperienceLevel: data.aiExperienceLevel,
        aiInterests: data.aiInterests,
        aiUsagePurpose: data.aiUsagePurpose,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser as IUser);
      const userId = result.insertedId.toString();

      // JWT 토큰 생성
      const token = this.generateToken(userId, data.email, 'user');

      // 사용자 정보 조회 (비밀번호 제외)
      const user = await usersCollection.findOne({ _id: result.insertedId });
      if (!user) {
        throw new Error(ErrorMessages.auth.userCreationFailed);
      }

      log.info('User signed up successfully', { email: data.email, userId });

      return {
        user: toUserResponse(user),
        token,
      };
    } catch (error) {
      log.error('Signup failed', error);
      throw error;
    }
  }

  /**
   * 사용자 로그인
   */
  async login(email: string, password: string): Promise<IAuthResponse> {
    try {
      const usersCollection = databaseService.getUsersCollection();

      // 사용자 조회
      const user = await usersCollection.findOne({ email });
      if (!user) {
        throw new Error(ErrorMessages.auth.invalidCredentials);
      }

      // 비밀번호 검증
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error(ErrorMessages.auth.invalidCredentials);
      }

      // JWT 토큰 생성
      const token = this.generateToken(user._id!.toString(), email, user.role);

      log.info('User logged in successfully', { email, userId: user._id!.toString() });

      return {
        user: toUserResponse(user),
        token,
      };
    } catch (error) {
      log.error('Login failed', error);
      throw error;
    }
  }

  /**
   * 토큰으로 사용자 정보 조회
   */
  async getUserFromToken(token: string): Promise<IUserResponse> {
    try {
      const payload = this.verifyToken(token);
      const usersCollection = databaseService.getUsersCollection();

      const user = await usersCollection.findOne({
        _id: new ObjectId(payload.userId),
      });

      if (!user) {
        throw new Error(ErrorMessages.auth.userNotFound);
      }

      return toUserResponse(user);
    } catch (error) {
      log.error('Failed to get user from token', error);
      throw error;
    }
  }

  /**
   * 비밀번호 재설정 요청
   *
   * @param email 사용자 이메일
   * @description 비밀번호 재설정 토큰 생성 및 이메일 발송
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const usersCollection = databaseService.getUsersCollection();
      const db = databaseService.getDb();
      const resetTokensCollection = db.collection<IPasswordResetToken>(
        PASSWORD_RESET_TOKEN_COLLECTION
      );

      // 사용자 조회
      const user = await usersCollection.findOne({ email });
      if (!user) {
        // 보안상 이유로 사용자가 없어도 성공 메시지 반환
        log.warn('Password reset requested for non-existent email', { email });
        return;
      }

      // 안전한 랜덤 토큰 생성 (32바이트 = 64자 hex)
      const resetToken = crypto.randomBytes(32).toString('hex');

      // 토큰 해시 (DB에 저장)
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // 만료 시간 설정 (1시간)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

      // 기존 미사용 토큰 삭제
      await resetTokensCollection.deleteMany({
        userId: user._id,
        used: false,
      });

      // 새 토큰 저장
      const tokenData: Omit<IPasswordResetToken, '_id'> = {
        userId: user._id!,
        token: hashedToken,
        expiresAt,
        used: false,
        createdAt: new Date(),
      };

      await resetTokensCollection.insertOne(tokenData as IPasswordResetToken);

      // 비밀번호 재설정 이메일 발송
      await emailService.sendPasswordResetEmail(email, resetToken);

      log.info('Password reset email sent', { email, userId: user._id!.toString() });
    } catch (error) {
      log.error('Failed to request password reset', error);
      throw new Error(ErrorMessages.auth.passwordResetFailed);
    }
  }

  /**
   * 비밀번호 재설정
   *
   * @param token 재설정 토큰 (해시되지 않은 원본)
   * @param newPassword 새 비밀번호
   * @description 토큰 검증 및 비밀번호 변경
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const usersCollection = databaseService.getUsersCollection();
      const db = databaseService.getDb();
      const resetTokensCollection = db.collection<IPasswordResetToken>(
        PASSWORD_RESET_TOKEN_COLLECTION
      );

      // 토큰 해시
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // 토큰 조회
      const resetTokenDoc = await resetTokensCollection.findOne({
        token: hashedToken,
        used: false,
        expiresAt: { $gt: new Date() }, // 만료되지 않은 토큰
      });

      if (!resetTokenDoc) {
        throw new Error(ErrorMessages.auth.invalidResetToken);
      }

      // 비밀번호 해싱
      const hashedPassword = await this.hashPassword(newPassword);

      // 비밀번호 업데이트
      await usersCollection.updateOne(
        { _id: resetTokenDoc.userId },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        }
      );

      // 토큰 사용 처리
      await resetTokensCollection.updateOne(
        { _id: resetTokenDoc._id },
        {
          $set: {
            used: true,
          },
        }
      );

      log.info('Password reset successful', { userId: resetTokenDoc.userId.toString() });
    } catch (error) {
      log.error('Failed to reset password', error);
      throw error;
    }
  }
}

// Singleton 인스턴스
export const authService = new AuthService();
