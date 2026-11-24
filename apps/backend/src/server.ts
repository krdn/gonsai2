/**
 * Express Server Main Entry Point
 *
 * @description Express + WebSocket 통합 서버
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createServer, Server as HTTPServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { envConfig, printConfig } from './utils/env-validator';
import { log } from './utils/logger';
import {
  requestLogger,
  errorHandler,
  notFoundHandler,
  correlationIdMiddleware,
} from './middleware';
import { socketIOService } from './services/socketio.service';
import { databaseService } from './services/database.service';
import { cacheService } from './services/cache.service';
import { swaggerSpec } from './config/swagger.config';

// Routes
import healthRoutes from './routes/health.routes';
import webhookRoutes from './routes/webhook.routes';
import workflowsRoutes from './routes/workflows.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import agentsRoutes from './routes/agents.routes';
import monitoringRoutes from './routes/monitoring.routes';
import tagsRoutes from './routes/tags.routes';
import foldersRoutes from './routes/folders.routes';
import adminRoutes from './routes/admin.routes';
import dashboardRoutes from './routes/dashboard.routes';

/**
 * Express 애플리케이션 생성
 */
function createApp(): Application {
  const app = express();

  // 호스트 Nginx → gonsai2-nginx 2홉 프록시 뒤에서 실제 클라이언트 IP를 식별하여
  // rate-limit 버킷이 프록시 단일 IP로 합쳐지는 문제를 방지한다.
  app.set('trust proxy', 2);

  // CORS 설정 (가장 먼저 적용)
  app.use(
    cors({
      origin: envConfig.ALLOWED_ORIGINS,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'], // 커스텀 헤더 허용
      exposedHeaders: ['X-API-Key', 'Access-Control-Allow-Private-Network'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })
  );

  // Private Network Access 헤더 추가 (CORS 이후)
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
  });

  // 보안 헤더 (강화 설정) - CORS 이후 적용
  app.use(
    helmet({
      crossOriginResourcePolicy: false, // CORS와 충돌 방지
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // Rate Limiting (DDoS 방어) - 개발 환경에서는 비활성화
  if (envConfig.NODE_ENV === 'production') {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15분
      max: 1000, // 15분당 1000회로 상향 (기존 100회)
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // health check와 일부 엔드포인트는 rate limit에서 제외
        // OPTIONS 요청(preflight)도 제외
        // 인증된 사용자의 API 요청은 별도로 관리
        return (
          req.method === 'OPTIONS' ||
          req.path === '/health' ||
          req.path === '/api/health' ||
          req.path === '/' ||
          req.path.startsWith('/api-docs') ||
          req.path.startsWith('/api/workflows') ||
          req.path.startsWith('/api/monitoring') ||
          req.path.startsWith('/api/dashboard') ||
          req.path.startsWith('/api/agents') ||
          req.path.startsWith('/api/tags') ||
          req.path.startsWith('/api/folders')
        );
      },
    });
    app.use(limiter);
  }

  // 로그인 실패 전용 rate limit (실패 시에만 카운트, 성공 시 리셋)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 5, // 최대 5회 실패 허용
    message: {
      success: false,
      error: '너무 많은 로그인 실패가 있었습니다. 잠시 후 다시 시도해주세요.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // 로그인 엔드포인트만 적용 (signup, logout 등은 제외)
    skip: (req) => {
      return req.path !== '/login';
    },
    // 성공한 요청은 카운트하지 않음 (2xx 응답)
    skipSuccessfulRequests: true,
    // 커스텀 키 생성 (IPv6 서브넷 정규화 헬퍼를 통해 ERR_ERL_KEY_GEN_IPV6 우회 방지)
    keyGenerator: (req) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      return ip === 'unknown' ? ip : ipKeyGenerator(ip);
    },
  });

  // 로그인 성공 시 rate limit 리셋을 위한 미들웨어 (authRoutes에서 사용)
  app.set('resetLoginRateLimit', (ip: string) => {
    // express-rate-limit의 내부 store에서 해당 IP 제거
    // 이 기능은 로그인 성공 시 auth.routes.ts에서 호출됨
    log.info(`Login rate limit reset for IP: ${ip}`);
  });

  // Body 파싱 (크기 제한)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Correlation ID 미들웨어 (로깅 전에 적용)
  app.use(correlationIdMiddleware);
  app.use(requestLogger);

  // Swagger UI (개발 환경에서만)
  if (envConfig.NODE_ENV !== 'production') {
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customSiteTitle: 'Gonsai2 API Documentation',
      })
    );

    // JSON 형태의 OpenAPI spec 제공
    app.get('/api-docs.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  }

  // API 라우트
  app.get('/', healthRoutes);
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes); // GitHub Actions health check용
  app.use('/webhooks', webhookRoutes);
  app.use('/api/workflows', workflowsRoutes);
  app.use('/api/monitoring', monitoringRoutes); // 모니터링 라우트
  app.use('/api/agents', agentsRoutes); // AI 에이전트 라우트
  app.use('/api/tags', tagsRoutes); // 태그 라우트
  app.use('/api/folders', foldersRoutes); // 폴더 관리 라우트
  app.use('/api/auth', authLimiter, authRoutes); // 인증 라우트 (rate limit 적용)
  app.use('/api/users', userRoutes); // 사용자 프로필 라우트
  app.use('/api/admin', adminRoutes); // 관리자 대시보드 라우트
  app.use('/api/dashboard', dashboardRoutes); // 사용자 대시보드 라우트

  // 404 처리
  app.use(notFoundHandler);

  // 에러 핸들러 (마지막에 위치)
  app.use(errorHandler);

  return app;
}

/**
 * 서버 시작
 */
async function startServer(): Promise<void> {
  try {
    // 환경 변수 출력
    printConfig();

    // MongoDB 연결
    await databaseService.connect();

    // Redis 연결 (선택사항)
    await cacheService.connect();

    // Express 앱 생성
    const app = createApp();

    // HTTP 서버 생성
    const httpServer: HTTPServer = createServer(app);

    // Socket.io 서버 초기화 (실시간 통신 통합)
    socketIOService.initialize(httpServer);

    // 서버 시작
    httpServer.listen(envConfig.PORT, envConfig.HOST, () => {
      log.info('🚀 Server started successfully', {
        environment: envConfig.NODE_ENV,
        host: envConfig.HOST,
        port: envConfig.PORT,
        wsPort: envConfig.WS_PORT,
      });

      log.info('📚 API Endpoints:', {
        health: `http://${envConfig.HOST}:${envConfig.PORT}/health`,
        auth: `http://${envConfig.HOST}:${envConfig.PORT}/api/auth/login`,
        webhooks: `http://${envConfig.HOST}:${envConfig.PORT}/webhooks/n8n`,
        workflows: `http://${envConfig.HOST}:${envConfig.PORT}/api/workflows`,
        websocket: `ws://${envConfig.HOST}:${envConfig.PORT}/ws`,
        apiDocs:
          envConfig.NODE_ENV !== 'production'
            ? `http://${envConfig.HOST}:${envConfig.PORT}/api-docs`
            : 'disabled in production',
      });
    });

    // Graceful shutdown
    setupGracefulShutdown(httpServer);
  } catch (error) {
    log.error('Failed to start server', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown 설정
 */
function setupGracefulShutdown(server: HTTPServer): void {
  const shutdown = async (signal: string) => {
    log.info(`${signal} received, shutting down gracefully...`);

    // 새로운 연결 거부
    server.close(() => {
      log.info('HTTP server closed');
    });

    // Socket.io 서버 종료
    socketIOService.shutdown();

    // Redis 연결 종료
    await cacheService.disconnect();

    // MongoDB 연결 종료
    await databaseService.disconnect();

    // 기타 정리 작업
    setTimeout(() => {
      log.info('Shutdown complete');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 예외 처리
  process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection', reason, { promise });
    process.exit(1);
  });
}

// 서버 시작
if (require.main === module) {
  startServer();
}

export { createApp, startServer };
