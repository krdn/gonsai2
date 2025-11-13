/**
 * User Model
 *
 * @description 사용자 데이터 모델 및 MongoDB 스키마
 */

import { ObjectId } from 'mongodb';

/**
 * 사용자 인터페이스
 */
export interface IUser {
  _id?: ObjectId;
  email: string;
  name: string;
  password: string; // 해시된 비밀번호
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 사용자 응답 인터페이스 (비밀번호 제외)
 */
export interface IUserResponse {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User 모델을 UserResponse로 변환
 */
export function toUserResponse(user: IUser): IUserResponse {
  return {
    id: user._id?.toString() || '',
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * MongoDB Collection 이름
 */
export const USER_COLLECTION = 'users';
