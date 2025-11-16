/**
 * Password Reset Token Model
 *
 * @description 비밀번호 재설정 토큰 데이터 모델 및 MongoDB 스키마
 */

import { ObjectId } from 'mongodb';

/**
 * 비밀번호 재설정 토큰 인터페이스
 */
export interface IPasswordResetToken {
  _id?: ObjectId;
  userId: ObjectId; // 사용자 ID
  token: string; // 재설정 토큰 (해시됨)
  expiresAt: Date; // 토큰 만료 시간
  used: boolean; // 사용 여부
  createdAt: Date;
}

/**
 * MongoDB Collection 이름
 */
export const PASSWORD_RESET_TOKEN_COLLECTION = 'password_reset_tokens';

/**
 * 토큰 만료 시간 (1시간)
 */
export const TOKEN_EXPIRY_HOURS = 1;
