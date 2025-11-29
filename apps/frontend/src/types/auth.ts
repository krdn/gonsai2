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
