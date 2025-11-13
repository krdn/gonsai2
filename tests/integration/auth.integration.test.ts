/**
 * Auth API Integration Tests
 *
 * @description 인증 API 엔드포인트 통합 테스트 (Supertest 사용)
 */

import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../apps/backend/src/server';
import { databaseService } from '../../apps/backend/src/services/database.service';

describe('Auth API Integration Tests', () => {
  let app: Application;

  beforeAll(async () => {
    await databaseService.connect();
    app = createApp();
  });

  afterAll(async () => {
    await databaseService.disconnect();
  });

  beforeEach(async () => {
    // 각 테스트 전 데이터베이스 초기화
    const usersCollection = databaseService.getUsersCollection();
    await usersCollection.deleteMany({});
  });

  describe('POST /api/auth/signup', () => {
    it('새 사용자를 생성해야 함 (201)', async () => {
      const newUser = {
        email: 'integration@example.com',
        name: 'Integration Test User',
        password: 'StrongPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(newUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: newUser.email,
            name: newUser.name,
          },
          token: expect.any(String),
        },
      });

      // 비밀번호는 응답에 포함되지 않아야 함
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('필수 필드 누락 시 오류를 반환해야 함 (400)', async () => {
      const invalidUser = {
        email: 'test@example.com',
        // name과 password 누락
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('유효하지 않은 이메일 형식을 거부해야 함 (400)', async () => {
      const invalidUser = {
        email: 'not-an-email',
        name: 'Test User',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('약한 비밀번호를 거부해야 함 (400)', async () => {
      const weakPasswordUser = {
        email: 'weak@example.com',
        name: 'Weak Password User',
        password: '123', // 너무 짧음
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(weakPasswordUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('중복된 이메일을 거부해야 함 (409)', async () => {
      const user = {
        email: 'duplicate@example.com',
        name: 'Duplicate User',
        password: 'Password123!',
      };

      // 첫 번째 사용자 생성
      await request(app).post('/api/auth/signup').send(user).expect(201);

      // 동일한 이메일로 두 번째 사용자 생성 시도
      const response = await request(app)
        .post('/api/auth/signup')
        .send(user)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'login@example.com',
      name: 'Login Test User',
      password: 'LoginPassword123!',
    };

    beforeEach(async () => {
      // 테스트용 사용자 생성
      await request(app).post('/api/auth/signup').send(testUser);
    });

    it('올바른 자격 증명으로 로그인해야 함 (200)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: testUser.email,
            name: testUser.name,
          },
          token: expect.any(String),
        },
      });
    });

    it('잘못된 이메일로 로그인을 거부해야 함 (401)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('잘못된 비밀번호로 로그인을 거부해야 함 (401)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('필수 필드 누락 시 오류를 반환해야 함 (400)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          // password 누락
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // 테스트용 사용자 생성 및 로그인
      const user = {
        email: 'me@example.com',
        name: 'Me Test User',
        password: 'MePassword123!',
      };

      const signupResponse = await request(app).post('/api/auth/signup').send(user);
      authToken = signupResponse.body.data.token;
    });

    it('인증된 사용자 정보를 반환해야 함 (200)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: 'me@example.com',
            name: 'Me Test User',
          },
        },
      });
    });

    it('인증 토큰 없이 요청을 거부해야 함 (401)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('유효하지 않은 토큰을 거부해야 함 (401)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('만료된 토큰을 거부해야 함 (401)', async () => {
      // 만료된 토큰 생성 (실제로는 JWT 라이브러리 사용)
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('인증 엔드포인트에 rate limit을 적용해야 함', async () => {
      const loginAttempt = {
        email: 'ratelimit@example.com',
        password: 'Password123!',
      };

      // rate limit: 15분에 5번 (설정에 따라 다를 수 있음)
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send(loginAttempt);
      }

      // 6번째 요청은 거부되어야 함
      const response = await request(app).post('/api/auth/login').send(loginAttempt).expect(429); // Too Many Requests

      expect(response.body.error).toMatch(/too many/i);
    }, 30000); // 30초 타임아웃
  });

  describe('Security Headers', () => {
    it('보안 헤더가 설정되어야 함', async () => {
      const response = await request(app).get('/health');

      // Helmet 헤더 검증
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });
});
