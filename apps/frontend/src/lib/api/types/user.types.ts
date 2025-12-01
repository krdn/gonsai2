/**
 * 사용자 관련 타입 정의
 */

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
  password?: string;
}
