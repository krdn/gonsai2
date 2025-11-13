/**
 * User Test Fixtures
 *
 * 테스트용 사용자 데이터 팩토리
 */

import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export interface TestUser {
  _id?: ObjectId;
  email: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 기본 테스트 사용자 생성
 */
export const createTestUser = async (overrides?: Partial<TestUser>): Promise<TestUser> => {
  const hashedPassword = await bcrypt.hash('Test@1234', 10);

  return {
    _id: new ObjectId(),
    email: 'test@example.com',
    username: 'testuser',
    password: hashedPassword,
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * 관리자 사용자 생성
 */
export const createAdminUser = async (overrides?: Partial<TestUser>): Promise<TestUser> => {
  return createTestUser({
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    ...overrides,
  });
};

/**
 * 다수의 테스트 사용자 생성
 */
export const createTestUsers = async (count: number): Promise<TestUser[]> => {
  const users: TestUser[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `user${i}@example.com`,
      username: `user${i}`,
    });
    users.push(user);
  }

  return users;
};

/**
 * 비활성화된 사용자 생성
 */
export const createInactiveUser = async (overrides?: Partial<TestUser>): Promise<TestUser> => {
  return createTestUser({
    email: 'inactive@example.com',
    username: 'inactiveuser',
    isActive: false,
    ...overrides,
  });
};
