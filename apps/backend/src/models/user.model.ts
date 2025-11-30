/**
 * User Model
 *
 * @description 사용자 데이터 모델 및 MongoDB 스키마
 */

import { ObjectId } from 'mongodb';

/**
 * 사용자 역할 타입
 */
export type UserRole = 'admin' | 'user';

/**
 * 소속 타입
 */
export type OrganizationType = 'school' | 'company' | 'other';

/**
 * AI 활용 경험 수준
 */
export type AIExperienceLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';

/**
 * AI 관심 분야
 */
export type AIInterest =
  | 'chatbot'
  | 'automation'
  | 'data_analysis'
  | 'image_generation'
  | 'text_generation'
  | 'voice_recognition'
  | 'recommendation'
  | 'other';

/**
 * AI 활용 목적
 */
export type AIUsagePurpose =
  | 'personal_learning'
  | 'work_productivity'
  | 'business_automation'
  | 'research'
  | 'development'
  | 'other';

/**
 * 선호 알림 채널
 */
export type PreferredNotificationChannel = 'email' | 'telegram' | 'kakao';

/**
 * 선호 언어
 */
export type PreferredLanguage = 'ko' | 'en' | 'ja' | 'zh';

/**
 * 사용자 인터페이스
 */
export interface IUser {
  _id?: ObjectId;
  email: string;
  name: string;
  password: string; // 해시된 비밀번호
  role: UserRole; // 사용자 역할
  avatar?: string;
  // 소속 정보
  organizationType?: OrganizationType; // 소속 타입 (학교/회사/기타)
  organizationName?: string; // 소속명
  // AI 관련 정보
  aiExperienceLevel?: AIExperienceLevel; // AI 활용 경험 수준
  aiInterests?: AIInterest[]; // AI 관심 분야 (복수 선택)
  aiUsagePurpose?: AIUsagePurpose; // AI 활용 목적
  // 연락처 정보
  phoneNumber?: string; // 휴대폰 번호
  telegramId?: string; // Telegram 아이디
  kakaoTalkId?: string; // KakaoTalk 아이디
  // 사용자 환경설정
  preferredNotificationChannel?: PreferredNotificationChannel; // 선호 알림 채널
  timezone?: string; // 타임존 (예: 'Asia/Seoul')
  preferredLanguage?: PreferredLanguage; // 선호 언어
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
  role: UserRole;
  avatar?: string;
  // 소속 정보
  organizationType?: OrganizationType;
  organizationName?: string;
  // AI 관련 정보
  aiExperienceLevel?: AIExperienceLevel;
  aiInterests?: AIInterest[];
  aiUsagePurpose?: AIUsagePurpose;
  // 연락처 정보
  phoneNumber?: string;
  telegramId?: string;
  kakaoTalkId?: string;
  // 사용자 환경설정
  preferredNotificationChannel?: PreferredNotificationChannel;
  timezone?: string;
  preferredLanguage?: PreferredLanguage;
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
    role: user.role,
    avatar: user.avatar,
    organizationType: user.organizationType,
    organizationName: user.organizationName,
    aiExperienceLevel: user.aiExperienceLevel,
    aiInterests: user.aiInterests,
    aiUsagePurpose: user.aiUsagePurpose,
    phoneNumber: user.phoneNumber,
    telegramId: user.telegramId,
    kakaoTalkId: user.kakaoTalkId,
    preferredNotificationChannel: user.preferredNotificationChannel,
    timezone: user.timezone,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * MongoDB Collection 이름
 */
export const USER_COLLECTION = 'users';
