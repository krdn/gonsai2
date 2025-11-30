/**
 * 인증 관련 타입 정의
 */

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

export interface User {
  id: string;
  _id?: string; // MongoDB ObjectId (문자열 형태)
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user';
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
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  organizationType?: OrganizationType;
  organizationName?: string;
  aiExperienceLevel?: AIExperienceLevel;
  aiInterests?: AIInterest[];
  aiUsagePurpose?: AIUsagePurpose;
  phoneNumber?: string;
  telegramId?: string;
  kakaoTalkId?: string;
  preferredNotificationChannel?: PreferredNotificationChannel;
  timezone?: string;
  preferredLanguage?: PreferredLanguage;
}

export interface SignupResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
}
