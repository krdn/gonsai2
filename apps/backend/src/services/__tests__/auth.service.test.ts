/**
 * Auth Service Unit Tests
 *
 * @description 인증 서비스 단위 테스트 (비밀번호 해싱, JWT, 로그인/회원가입)
 */

import { authService } from '../auth.service';
import { databaseService } from '../database.service';
import { createTestUser } from '../../../../../tests/fixtures/users.fixture';
import { ObjectId } from 'mongodb';
import * as jwt from 'jsonwebtoken';

// 테스트용 환경 변수 설정
process.env.JWT_SECRET = 'test_jwt_secret_key_for_unit_testing_only_minimum_32_chars';
process.env.JWT_EXPIRES_IN = '1h';

describe('AuthService', () => {
  beforeAll(async () => {
    await databaseService.connect();
  });

  afterAll(async () => {
    await databaseService.disconnect();
  });

  beforeEach(async () => {
    // 각 테스트 전 users 컬렉션 초기화
    const usersCollection = databaseService.getUsersCollection();
    await usersCollection.deleteMany({});
  });

  describe('hashPassword', () => {
    it('비밀번호를 해싱해야 함', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await authService.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hash length
    });

    it('동일한 비밀번호라도 다른 해시를 생성해야 함 (salt)', async () => {
      const password = 'TestPassword123!';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('올바른 비밀번호를 검증해야 함', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await authService.hashPassword(password);

      const isValid = await authService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('잘못된 비밀번호를 거부해야 함', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hashedPassword = await authService.hashPassword(password);

      const isValid = await authService.verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('유효한 JWT 토큰을 생성해야 함', () => {
      const userId = new ObjectId().toString();
      const email = 'test@example.com';

      const token = authService.generateToken(userId, email, 'user');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT 구조: header.payload.signature
    });

    it('생성된 토큰에 올바른 페이로드가 포함되어야 함', () => {
      const userId = new ObjectId().toString();
      const email = 'test@example.com';

      const token = authService.generateToken(userId, email, 'user');
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.exp).toBeDefined(); // expiration
    });
  });

  describe('verifyToken', () => {
    it('유효한 토큰을 검증해야 함', () => {
      const userId = new ObjectId().toString();
      const email = 'test@example.com';
      const token = authService.generateToken(userId, email, 'user');

      const payload = authService.verifyToken(token);

      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
    });

    it('잘못된 토큰을 거부해야 함', () => {
      const invalidToken = 'invalid.jwt.token';

      expect(() => authService.verifyToken(invalidToken)).toThrow('Invalid or expired token');
    });

    it('만료된 토큰을 거부해야 함', () => {
      const userId = new ObjectId().toString();
      const email = 'test@example.com';

      // 이미 만료된 토큰 생성 (expiresIn: -1s)
      const expiredToken = jwt.sign({ userId, email }, process.env.JWT_SECRET!, {
        expiresIn: '-1s',
      });

      expect(() => authService.verifyToken(expiredToken)).toThrow('Invalid or expired token');
    });
  });

  describe('signup', () => {
    it('새 사용자를 생성하고 토큰을 반환해야 함', async () => {
      const email = 'newuser@example.com';
      const name = 'New User';
      const password = 'NewPassword123!';

      const result = await authService.signup(email, name, password);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.name).toBe(name);
      expect((result.user as any).password).toBeUndefined(); // 비밀번호는 응답에 포함되지 않아야 함
      expect(result.token).toBeDefined();

      // 토큰 검증
      const payload = authService.verifyToken(result.token);
      expect(payload.email).toBe(email);
    });

    it('중복된 이메일로 회원가입을 거부해야 함', async () => {
      const email = 'duplicate@example.com';
      const name = 'Duplicate User';
      const password = 'Password123!';

      // 첫 번째 사용자 생성
      await authService.signup(email, name, password);

      // 동일한 이메일로 두 번째 사용자 생성 시도
      await expect(authService.signup(email, name, password)).rejects.toThrow(
        'Email already exists'
      );
    });

    it('사용자를 데이터베이스에 저장해야 함', async () => {
      const email = 'dbuser@example.com';
      const name = 'DB User';
      const password = 'Password123!';

      await authService.signup(email, name, password);

      const usersCollection = databaseService.getUsersCollection();
      const user = await usersCollection.findOne({ email });

      expect(user).toBeDefined();
      expect(user!.email).toBe(email);
      expect(user!.name).toBe(name);
      expect(user!.password).not.toBe(password); // 해싱되어야 함
    });
  });

  describe('login', () => {
    it('올바른 자격 증명으로 로그인해야 함', async () => {
      const email = 'loginuser@example.com';
      const name = 'Login User';
      const password = 'LoginPassword123!';

      // 사용자 생성
      await authService.signup(email, name, password);

      // 로그인 시도
      const result = await authService.login(email, password);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.token).toBeDefined();
    });

    it('잘못된 이메일로 로그인을 거부해야 함', async () => {
      const email = 'nonexistent@example.com';
      const password = 'Password123!';

      await expect(authService.login(email, password)).rejects.toThrow('Invalid email or password');
    });

    it('잘못된 비밀번호로 로그인을 거부해야 함', async () => {
      const email = 'wrongpassword@example.com';
      const name = 'Wrong Password User';
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';

      // 사용자 생성
      await authService.signup(email, name, password);

      // 잘못된 비밀번호로 로그인 시도
      await expect(authService.login(email, wrongPassword)).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('getUserFromToken', () => {
    it('토큰으로 사용자 정보를 조회해야 함', async () => {
      const email = 'tokenuser@example.com';
      const name = 'Token User';
      const password = 'TokenPassword123!';

      // 사용자 생성
      const { token } = await authService.signup(email, name, password);

      // 토큰으로 사용자 조회
      const user = await authService.getUserFromToken(token);

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.name).toBe(name);
      expect((user as any).password).toBeUndefined();
    });

    it('유효하지 않은 토큰으로 조회를 거부해야 함', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(authService.getUserFromToken(invalidToken)).rejects.toThrow();
    });

    it('존재하지 않는 사용자의 토큰을 거부해야 함', async () => {
      const nonExistentUserId = new ObjectId().toString();
      const token = authService.generateToken(nonExistentUserId, 'ghost@example.com', 'user');

      await expect(authService.getUserFromToken(token)).rejects.toThrow('User not found');
    });
  });
});
