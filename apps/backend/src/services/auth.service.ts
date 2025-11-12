/**
 * Authentication Service
 *
 * @description 사용자 인증, JWT 토큰 관리, 비밀번호 해싱
 */

import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { databaseService } from './database.service';
import { IUser, IUserResponse, toUserResponse } from '../models/user.model';
import { log } from '../utils/logger';

/**
 * JWT 시크릿 키 (환경 변수에서 가져옴)
 */
const JWT_SECRET = process.env.JWT_SECRET || 'gonsai2-default-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7일

/**
 * JWT 페이로드 인터페이스
 */
export interface IJwtPayload {
  userId: string;
  email: string;
}

/**
 * 로그인 응답 인터페이스
 */
export interface IAuthResponse {
  user: IUserResponse;
  token: string;
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
  generateToken(userId: string, email: string): string {
    const payload: IJwtPayload = {
      userId,
      email,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * JWT 토큰 검증
   */
  verifyToken(token: string): IJwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as IJwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * 사용자 회원가입
   */
  async signup(email: string, name: string, password: string): Promise<IAuthResponse> {
    try {
      const usersCollection = databaseService.getUsersCollection();

      // 이메일 중복 체크
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // 비밀번호 해싱
      const hashedPassword = await this.hashPassword(password);

      // 새 사용자 생성
      const newUser: Omit<IUser, '_id'> = {
        email,
        name,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser as IUser);
      const userId = result.insertedId.toString();

      // JWT 토큰 생성
      const token = this.generateToken(userId, email);

      // 사용자 정보 조회 (비밀번호 제외)
      const user = await usersCollection.findOne({ _id: result.insertedId });
      if (!user) {
        throw new Error('Failed to create user');
      }

      log.info('User signed up successfully', { email, userId });

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
        throw new Error('Invalid email or password');
      }

      // 비밀번호 검증
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // JWT 토큰 생성
      const token = this.generateToken(user._id!.toString(), email);

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
        _id: new (require('mongodb').ObjectId)(payload.userId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      return toUserResponse(user);
    } catch (error) {
      log.error('Failed to get user from token', error);
      throw error;
    }
  }
}

// Singleton 인스턴스
export const authService = new AuthService();
