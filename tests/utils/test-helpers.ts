/**
 * Test Helper Utilities
 *
 * @description 테스트용 유틸리티 함수 모음
 */

import { MongoClient, Db, Collection } from 'mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

/**
 * 테스트용 JWT 토큰 생성
 */
export function generateTestToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
}

/**
 * 테스트용 MongoDB 컬렉션 초기화
 */
export async function cleanDatabase(db: Db): Promise<void> {
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

/**
 * 테스트용 랜덤 이메일 생성
 */
export function generateRandomEmail(): string {
  const randomString = Math.random().toString(36).substring(7);
  return `test-${randomString}@example.com`;
}

/**
 * 테스트용 강력한 비밀번호 생성
 */
export function generateStrongPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * 비동기 작업 대기 헬퍼
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 테스트용 ObjectId 생성
 */
export function createTestObjectId(): ObjectId {
  return new ObjectId();
}

/**
 * Mock Response 객체 생성
 */
export function createMockResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Mock Request 객체 생성
 */
export function createMockRequest(overrides?: any) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    ...overrides,
  };
}

/**
 * Mock Express Next 함수 생성
 */
export function createMockNext() {
  return jest.fn();
}

/**
 * 테스트용 날짜 생성 (고정된 날짜)
 */
export function createFixedDate(): Date {
  return new Date('2025-01-01T00:00:00.000Z');
}

/**
 * 배열에서 랜덤 요소 선택
 */
export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 테스트용 지연 실행
 */
export async function delayExecution<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  await wait(ms);
  return fn();
}

/**
 * 에러 발생 기대 헬퍼
 */
export async function expectToThrow<T>(
  fn: () => Promise<T>,
  errorMessage?: string | RegExp
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error: any) {
    if (errorMessage) {
      if (typeof errorMessage === 'string') {
        expect(error.message).toContain(errorMessage);
      } else {
        expect(error.message).toMatch(errorMessage);
      }
    }
  }
}
