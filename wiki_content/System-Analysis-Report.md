# gonsai2 프로젝트 종합 심층 분석 보고서

> **분석일**: 2025-11-30
> **분석 범위**: 백엔드, 프론트엔드, DevOps, 보안, 성능, 데이터 아키텍처
> **분석 깊이**: 코드 레벨 심층 분석

---

## 📋 Executive Summary

gonsai2는 **n8n 워크플로우 자동화 플랫폼**을 위한 엔터프라이즈급 관리 대시보드 시스템입니다. Next.js 15 기반 프론트엔드와 Express 5 백엔드로 구성되어 있으며, 폴더 기반 RBAC 권한 시스템, 실시간 모니터링, AI 에이전트 관리 기능을 제공합니다.

### 전체 평가 점수

| 영역            | 점수   | 비고                                 |
| --------------- | ------ | ------------------------------------ |
| **아키텍처**    | 8/10   | 계층화된 설계, 관심사 분리 우수      |
| **보안**        | 6/10   | 환경변수 노출, 토큰 무효화 없음      |
| **코드 품질**   | 7.5/10 | TypeScript strict, 일관된 패턴       |
| **권한 시스템** | 9/10   | 폴더 기반 상속 RBAC 잘 설계됨        |
| **DevOps**      | 7/10   | CI에 테스트/린트 단계 누락           |
| **문서화**      | 6/10   | README, Swagger 있으나 API 문서 부족 |
| **테스트**      | 3/10   | 테스트 커버리지 매우 낮음            |
| **실시간 통신** | 8/10   | Socket.io 메모리 누수 방지 구현      |

---

## 🏗️ 아키텍처 심층 분석

### 1. 백엔드 계층 구조 (Express + TypeScript)

```
┌─────────────────────────────────────────────────────────────┐
│                       API Layer (Routes)                     │
│  auth.routes.ts │ workflows.routes.ts │ folders.routes.ts   │
├─────────────────────────────────────────────────────────────┤
│                    Middleware Layer                          │
│  auth.middleware │ rbac.middleware │ error.middleware        │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│  auth.service │ folder-permission.service │ cache.service    │
├─────────────────────────────────────────────────────────────┤
│                    Repository Layer                          │
│  folder.repository │ folder-permission.repository           │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer (MongoDB)                      │
│  users │ folders │ folder_permissions │ workflow_folders    │
└─────────────────────────────────────────────────────────────┘
```

#### 1.1 인증 서비스 분석 (`auth.service.ts`)

**구현된 기능:**

- JWT 토큰 생성/검증 (32자 이상 시크릿 강제)
- bcrypt 비밀번호 해싱 (salt rounds: 10)
- 비밀번호 재설정 토큰 (SHA256 해싱, 1시간 만료)
- 이메일 기반 비밀번호 재설정 플로우

**코드 분석 (auth.service.ts:77-118):**

```typescript
// JWT Secret 검증 - 32자 미만이면 서버 시작 거부
if (!JWT_SECRET_ENV || JWT_SECRET_ENV.length < 32) {
  throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters');
}

// 비밀번호 재설정 토큰 생성
const resetToken = crypto.randomBytes(32).toString('hex'); // 안전한 난수
const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
```

**⚠️ 개선 필요:**

- 토큰 블랙리스트 미구현 → 로그아웃 후에도 토큰 유효
- Refresh Token 패턴 미적용 → 토큰 탈취 시 위험

#### 1.2 RBAC 미들웨어 분석 (`rbac.middleware.ts`)

**계층적 권한 시스템:**

```typescript
// 권한 계층 (folder-permission.model.ts)
export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  viewer: 1, // 조회만
  executor: 2, // 조회 + 실행
  editor: 3, // 조회 + 실행 + 편집
  admin: 4, // 모든 권한 + 관리
};

// 권한별 허용 액션
export const PERMISSION_ACTIONS = {
  viewer: ['view'],
  executor: ['view', 'execute'],
  editor: ['view', 'execute', 'edit'],
  admin: ['view', 'execute', 'edit', 'manage'],
};
```

**미들웨어 구성:**
| 미들웨어 | 파일:라인 | 용도 |
|----------|-----------|------|
| `requireRole()` | `rbac.middleware.ts:27` | 역할 기반 접근 제어 |
| `requireAdmin()` | `rbac.middleware.ts:74` | 관리자 전용 |
| `requireSelfOrAdmin()` | `rbac.middleware.ts:92` | 본인 또는 관리자 |
| `requireFolderPermission()` | `rbac.middleware.ts:146` | 폴더 권한 검증 |
| `requireWorkflowAccess()` | `rbac.middleware.ts:242` | 워크플로우 접근 검증 |

#### 1.3 폴더 권한 상속 시스템 (`folder-permission.service.ts`)

**핵심 로직 (getEffectivePermission):**

```typescript
async getEffectivePermission(userId: string, folderId: string): Promise<PermissionLevel | null> {
  // 1. 직접 부여된 권한 확인
  const directPermission = await folderPermissionRepository.findPermission(folderId, userId);

  // 2. 상위 폴더에서 상속받은 권한 확인
  const ancestorIds = await folderRepository.getAncestorIds(folderId);
  const ancestorPermissions = await folderPermissionRepository.findPermissionsForFolders(ancestorIds, userId);

  // 3. 모든 권한 중 가장 높은 권한 선택
  let highestPermission = directPermission?.permission || null;
  for (const [, permission] of ancestorPermissions) {
    highestPermission = getHigherPermission(highestPermission, permission);
  }
  return highestPermission;
}
```

**✅ 장점:**

- 폴더 계층 구조에서 권한 상속 자동 처리
- 직접 권한과 상속 권한 중 높은 것 적용
- 워크플로우-폴더 매핑으로 세분화된 접근 제어

**⚠️ 성능 고려사항:**

- 깊은 폴더 계층에서 다수의 DB 쿼리 발생 가능
- 권한 캐싱 미적용 → Redis 캐싱 권장

### 2. 프론트엔드 아키텍처 (Next.js 15 + React 19)

#### 2.1 인증 흐름 분석

```
┌────────────────┐    ┌─────────────────┐    ┌───────────────────┐
│  Login Page    │───>│ /api/auth/login │───>│ Backend /api/auth │
│  (AuthContext) │    │  (Next.js API)  │    │  (Express)        │
└────────────────┘    └─────────────────┘    └───────────────────┘
        │                     │                       │
        │                     │                       │
        ▼                     ▼                       ▼
   localStorage          Set-Cookie              JWT + Cookie
   (user, token)         헤더 전달              HttpOnly 설정
```

**AuthContext 분석 (`contexts/AuthContext.tsx`):**

```typescript
// 이중 토큰 저장 방식 (보안 vs 편의성 균형)
// 1. HttpOnly Cookie (백엔드 설정) - XSS 방어
// 2. localStorage (프론트엔드) - API 요청용

const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', { ... });
  const data: LoginResponse = await response.json();

  setUser(data.user);
  localStorage.setItem('user', JSON.stringify(data.user));
  if (data.token) {
    localStorage.setItem('authToken', data.token); // API 요청용
  }
};
```

**⚠️ 보안 고려사항:**

- `localStorage`에 토큰 저장 → XSS 공격 시 탈취 가능
- HttpOnly Cookie가 있으므로 localStorage 토큰 제거 권장

#### 2.2 상태 관리 구조

| 유형            | 라이브러리     | 용도            | 파일                       |
| --------------- | -------------- | --------------- | -------------------------- |
| 서버 상태       | TanStack Query | API 데이터 캐싱 | `lib/query-client.ts`      |
| 클라이언트 상태 | Zustand        | UI 상태, 필터   | `stores/workflow-store.ts` |
| 인증 상태       | React Context  | 사용자 정보     | `contexts/AuthContext.tsx` |
| 실시간 상태     | Socket.io      | 이벤트 기반     | `lib/socket-client.ts`     |

**Zustand Store 분석:**

```typescript
// workflow-store.ts - persist 미들웨어로 localStorage 동기화
export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set) => ({
      selectedWorkflow: null,
      filters: { status: undefined, folder: undefined },
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
    }),
    { name: 'workflow-storage' }
  )
);
```

#### 2.3 Socket.io 클라이언트 메모리 누수 방지

**핵심 패턴 (`socket-client.ts`):**

```typescript
class SocketClient {
  private handlerRegistry = new Map<string, Set<(...args: unknown[]) => void>>();

  // 핸들러 등록 시 레지스트리에 추가
  on(event: string, handler: (...args: unknown[]) => void) {
    if (!this.handlerRegistry.has(event)) {
      this.handlerRegistry.set(event, new Set());
    }
    this.handlerRegistry.get(event)!.add(handler);
    this.socket?.on(event, handler);
  }

  // 정리 시 모든 핸들러 제거
  destroy() {
    this.handlerRegistry.forEach((handlers, event) => {
      handlers.forEach((h) => this.socket?.off(event, h));
    });
    this.handlerRegistry.clear();
    this.disconnect();
  }
}
```

**✅ 우수한 구현:**

- SSR 환경 고려 (typeof window 체크)
- 싱글톤 패턴으로 연결 관리
- React 컴포넌트 언마운트 시 정리 보장

---

## 🗃️ 데이터베이스 스키마 분석

### MongoDB 컬렉션 구조

```
┌─────────────────────────────────────────────────────────────┐
│  users                                                       │
│  ├── _id: ObjectId                                          │
│  ├── email: string (unique, indexed)                        │
│  ├── password: string (bcrypt hashed)                       │
│  ├── role: 'admin' | 'user'                                 │
│  ├── organizationType, organizationName                     │
│  ├── aiExperienceLevel, aiInterests, aiUsagePurpose        │
│  └── createdAt, updatedAt                                   │
├─────────────────────────────────────────────────────────────┤
│  folders                                                     │
│  ├── _id: ObjectId                                          │
│  ├── name: string                                           │
│  ├── parentId: ObjectId | null (상위 폴더)                  │
│  ├── path: string[] (조상 경로 배열)                        │
│  └── createdBy, createdAt, updatedAt                        │
├─────────────────────────────────────────────────────────────┤
│  folder_permissions                                          │
│  ├── _id: ObjectId                                          │
│  ├── folderId: ObjectId (indexed)                           │
│  ├── userId: ObjectId (indexed)                             │
│  ├── permission: 'viewer'|'executor'|'editor'|'admin'       │
│  └── grantedBy, createdAt                                   │
├─────────────────────────────────────────────────────────────┤
│  workflow_folders                                            │
│  ├── _id: ObjectId                                          │
│  ├── workflowId: string (n8n workflow ID, unique)           │
│  ├── folderId: ObjectId                                     │
│  └── assignedBy, createdAt                                  │
└─────────────────────────────────────────────────────────────┘
```

### 인덱스 분석

**현재 설정된 인덱스:**

```typescript
// database.service.ts:58
await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
```

**⚠️ 누락된 권장 인덱스:**

```javascript
// folder_permissions - 복합 인덱스 권장
db.folder_permissions.createIndex({ folderId: 1, userId: 1 }, { unique: true });
db.folder_permissions.createIndex({ userId: 1 }); // 사용자별 권한 조회

// workflow_folders
db.workflow_folders.createIndex({ folderId: 1 }); // 폴더 내 워크플로우 조회

// folders - 계층 쿼리 최적화
db.folders.createIndex({ parentId: 1 });
db.folders.createIndex({ path: 1 });
```

---

## 🔒 보안 심층 분석

### 인증 보안 평가

| 항목          | 상태         | 분석                         |
| ------------- | ------------ | ---------------------------- |
| JWT Secret    | 🟢 강제 검증 | 32자 미만 시 서버 시작 거부  |
| 비밀번호 해싱 | 🟢 bcrypt    | salt rounds 10 (적절)        |
| 토큰 저장     | 🟡 이중 저장 | HttpOnly 쿠키 + localStorage |
| 토큰 무효화   | 🔴 미구현    | 로그아웃 시 블랙리스트 없음  |
| Refresh Token | 🔴 미구현    | 단일 토큰만 사용             |
| 세션 관리     | 🔴 없음      | Stateless JWT만 사용         |

### 웹훅 보안

**HMAC 시그니처 검증 (`auth.middleware.ts:103-121`):**

```typescript
function generateHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

// 타이밍 공격 방지
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

**✅ 우수한 구현:**

- HMAC-SHA256 사용
- 타이밍-안전 비교 (timing attack 방지)
- 시그니처 형식 유연성 (sha256= 접두사 처리)

### 환경 변수 보안 문제

**🔴 Critical Issues:**

1. **JWT Secret 하드코딩** (`apps/backend/.env:24`):

```
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this-in-production
```

→ 기본값이 커밋됨, 프로덕션에서 동일 시크릿 사용 위험

2. **API Key 노출** (`apps/frontend/.env.local:19-22`):

```
NEXT_PUBLIC_N8N_API_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_BACKEND_API_KEY=eyJhbGciOiJIUzI1NiIs...
```

→ `NEXT_PUBLIC_` 접두사로 클라이언트에 노출됨

3. **MongoDB 자격증명** (`apps/backend/.env:12-14`):

```
MONGODB_URI=mongodb://gonsai2:gonsai2_prod_password@localhost:27018
```

→ 비밀번호가 소스 코드에 포함됨

### 보안 개선 체크리스트

- [ ] `.env` 파일들을 `.gitignore`에 추가
- [ ] GitHub Secrets 또는 Vault로 시크릿 관리 이전
- [ ] JWT Refresh Token 패턴 도입
- [ ] Redis 기반 토큰 블랙리스트 구현
- [ ] `NEXT_PUBLIC_` API 키를 서버사이드로 이동
- [ ] Rate Limiting 강화 (IP 기반 + 사용자 기반)

---

## ⚡ 성능 분석

### 캐싱 전략

**현재 구현 (`cache.service.ts`):**

```typescript
// 캐시 통계 추적
private stats = { hits: 0, misses: 0 };

// Cache-Aside 패턴
async wrap<T>(key: string, fn: () => Promise<T>, options?: CacheOptions): Promise<T> {
  const cached = await this.get<T>(key);
  if (cached !== null) {
    this.stats.hits++;
    return cached;
  }
  this.stats.misses++;
  const result = await fn();
  await this.set(key, result, options);
  return result;
}
```

**API 캐싱 적용 현황 (`workflows.routes.ts`):**
| 엔드포인트 | TTL | 캐시 키 |
|-----------|-----|---------|
| GET /workflows | 30s | `workflows:list:{userId}:{isAdmin}` |
| GET /workflows/:id | 60s | `workflows:${workflowId}` |
| GET /workflows/:id/executions | 10s | `executions:${workflowId}:${limit}` |

**⚠️ 캐싱 개선점:**

- 사용자 권한 캐싱 없음 → 폴더 권한 조회마다 DB 쿼리
- 폴더 계층 캐싱 없음 → `getAncestorIds` 반복 조회

### MongoDB 연결 풀 설정

```typescript
// database.service.ts
this.client = new MongoClient(envConfig.MONGODB_URI!, {
  maxPoolSize: 10, // 최대 연결 수
  minPoolSize: 2, // 최소 유지 연결
  maxIdleTimeMS: 30000, // 유휴 연결 타임아웃
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  monitorCommands: true, // 쿼리 모니터링
});
```

**✅ 적절한 설정**, 다만 프로덕션에서는:

- `maxPoolSize`를 20-50으로 증가 고려
- 커넥션 모니터링 이벤트 로깅 추가 권장

### 실행 큐 시스템 (`execution-queue.service.ts`)

**Bull Queue 구성:**

```typescript
const executionQueue = new Bull('workflow-execution', {
  redis: { host: 'localhost', port: 6379 },
  defaultJobOptions: {
    removeOnComplete: 100, // 완료된 작업 100개만 유지
    removeOnFail: 50, // 실패한 작업 50개만 유지
  },
});

// 우선순위 레벨
const PRIORITY_LEVELS = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};
```

---

## 🧪 테스트 인프라 분석

### 현재 테스트 구성

**Jest 멀티-프로젝트 설정 (`jest.config.js`):**

```javascript
module.exports = {
  projects: ['<rootDir>/apps/backend/jest.config.js', '<rootDir>/apps/frontend/jest.config.js'],
  coverageDirectory: 'coverage',
};
```

### 테스트 파일 현황

| 디렉토리                               | 파일 수 | 주요 테스트                                 |
| -------------------------------------- | ------- | ------------------------------------------- |
| `apps/backend/src/services/__tests__/` | 2       | auth.service.test.ts, cache.service.test.ts |
| `apps/frontend/`                       | 0       | 테스트 없음                                 |
| `features/`                            | 0       | 테스트 없음                                 |

**auth.service.test.ts 분석:**

```typescript
describe('verifyToken', () => {
  it('유효한 토큰을 검증해야 함', () => {
    const token = authService.generateToken(userId, email, 'user');
    const payload = authService.verifyToken(token);
    expect(payload.userId).toBe(userId);
  });

  it('만료된 토큰을 거부해야 함', () => {
    const expiredToken = jwt.sign({ userId, email }, secret, { expiresIn: '-1s' });
    expect(() => authService.verifyToken(expiredToken)).toThrow('Invalid or expired token');
  });
});
```

### 테스트 커버리지 개선 계획

**우선순위 1 - 핵심 서비스:**

- [ ] `folder-permission.service.ts` - 권한 상속 로직
- [ ] `workflow-folder.service.ts` - 워크플로우 접근 제어
- [ ] `auth.middleware.ts` - JWT 검증

**우선순위 2 - API 라우트:**

- [ ] `auth.routes.ts` - 로그인/회원가입
- [ ] `workflows.routes.ts` - 워크플로우 CRUD
- [ ] `folders.routes.ts` - 폴더 관리

**우선순위 3 - 프론트엔드:**

- [ ] `AuthContext` - 인증 상태 관리
- [ ] `socket-client` - 연결/이벤트 처리
- [ ] 주요 페이지 컴포넌트

---

## 🐳 DevOps 심층 분석

### CI/CD 파이프라인 (`deploy.yml`)

```yaml
# 현재 흐름
Checkout → Docker Buildx → GHCR Login → Build Backend → Build Frontend → SSH Deploy

# 누락된 단계
                        ↓
              ❌ npm test (테스트)
              ❌ npm run lint (린트)
              ❌ Security Scan
```

**개선된 파이프라인 권장:**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4

  build:
    needs: test # 테스트 통과 후 빌드
    runs-on: ubuntu-latest
    # ... 기존 빌드 로직
```

### Docker 구성 문제

**루트 Dockerfile 문제:**

```dockerfile
# 현재 (잘못됨)
CMD ["node", "index.js"]  # index.js 없음!

# 권장 (Multi-stage 빌드)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig*.json ./
COPY apps/backend ./apps/backend
RUN npm ci && npm run build --workspace=apps/backend

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 환경별 설정 분리

| 환경     | 설정 파일                     | 용도        |
| -------- | ----------------------------- | ----------- |
| 개발     | `.env`, `.env.local`          | 로컬 개발   |
| 스테이징 | (없음) ❌                     | 테스트 배포 |
| 프로덕션 | `docker-compose.prod.yml` env | 운영 환경   |

**권장: 환경별 파일 구조**

```
config/
├── .env.development
├── .env.staging  ← 추가 필요
├── .env.production
└── .env.example
```

---

## 📦 누락된 기능 및 로드맵

### Phase 1: 즉시 필요 (1-2주)

| 기능            | 설명                         | 우선순위    | 예상 공수 |
| --------------- | ---------------------------- | ----------- | --------- |
| 토큰 블랙리스트 | Redis 기반 JWT 무효화        | 🔴 Critical | 1일       |
| 테스트 추가     | 핵심 서비스 유닛 테스트      | 🔴 Critical | 3일       |
| CI 테스트 단계  | GitHub Actions에 테스트 추가 | 🔴 Critical | 0.5일     |
| 시크릿 분리     | .env에서 민감 정보 제거      | 🔴 Critical | 0.5일     |
| 권한 캐싱       | 폴더 권한 Redis 캐싱         | 🟠 High     | 1일       |

### Phase 2: 권장 사항 (1개월)

| 기능             | 설명               | 우선순위  | 예상 공수 |
| ---------------- | ------------------ | --------- | --------- |
| Refresh Token    | JWT 갱신 메커니즘  | 🟠 High   | 2일       |
| 감사 로그        | 사용자 활동 기록   | 🟠 High   | 3일       |
| API 버저닝       | /api/v1/ 도입      | 🟡 Medium | 1일       |
| 이메일 인증      | 회원가입 확인      | 🟡 Medium | 2일       |
| DB 인덱스 최적화 | 누락된 인덱스 추가 | 🟡 Medium | 0.5일     |

### Phase 3: 장기 로드맵 (3개월+)

| 기능               | 설명                     |
| ------------------ | ------------------------ |
| 2FA                | TOTP 기반 2단계 인증     |
| SSO                | SAML/OIDC 연동           |
| Error Healing 완성 | Claude AI 기반 자동 수정 |
| 멀티테넌시         | 조직별 격리된 환경       |
| 워크플로우 버저닝  | 변경 이력 관리           |

---

## 🔧 즉시 적용 권장 코드

### 1. 토큰 블랙리스트 서비스

```typescript
// services/token-blacklist.service.ts
import { cacheService } from './cache.service';

class TokenBlacklistService {
  private readonly PREFIX = 'blacklist:';

  async add(token: string, expiresInSeconds: number): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await cacheService.set(`${this.PREFIX}${tokenHash}`, '1', { ttl: expiresInSeconds });
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await cacheService.get(`${this.PREFIX}${tokenHash}`);
    return result !== null;
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
```

### 2. 권한 캐싱 래퍼

```typescript
// folder-permission.service.ts 수정
async getEffectivePermission(userId: string, folderId: string): Promise<PermissionLevel | null> {
  const cacheKey = `permission:${userId}:${folderId}`;

  return cacheService.wrap(cacheKey, async () => {
    // 기존 로직...
  }, { ttl: 300 }); // 5분 캐시
}
```

### 3. CI 테스트 단계 추가

```yaml
# .github/workflows/deploy.yml 수정
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage --watchAll=false
      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  deploy:
    needs: test
    # ... 기존 배포 로직
```

---

## 📊 기술 스택 상세

### 백엔드

| 카테고리   | 기술              | 버전         |
| ---------- | ----------------- | ------------ |
| Runtime    | Node.js           | 18+          |
| Framework  | Express           | 5.1.0        |
| Language   | TypeScript        | 5.0+         |
| Database   | MongoDB           | 7.0          |
| Cache      | Redis (ioredis)   | 5.8.2        |
| Queue      | Bull              | 4.16.5       |
| Real-time  | Socket.io         | 4.8.1        |
| Auth       | JWT, bcrypt       | 9.0.2, 3.0.3 |
| Validation | express-validator | 7.3.0        |
| Security   | Helmet, CORS      | 8.1.0, 2.8.5 |

### 프론트엔드

| 카테고리       | 기술             | 버전   |
| -------------- | ---------------- | ------ |
| Framework      | Next.js          | 15.5.6 |
| React          | React            | 19.2.0 |
| Language       | TypeScript       | 5.9    |
| Styling        | Tailwind CSS     | 4.0    |
| UI Library     | shadcn/ui        | -      |
| State (Server) | TanStack Query   | 5.x    |
| State (Client) | Zustand          | 5.x    |
| Real-time      | Socket.io Client | 4.x    |

### DevOps

| 카테고리        | 기술                      |
| --------------- | ------------------------- |
| Container       | Docker, Docker Compose    |
| CI/CD           | GitHub Actions            |
| Registry        | GitHub Container Registry |
| Proxy           | Nginx                     |
| Process Manager | PM2 (옵션)                |

---

## 📝 관련 문서

- [아키텍처](Architecture) - 시스템 구조 상세
- [개발 가이드](Development) - 개발 워크플로우
- [시작하기](Getting-Started) - 설치 및 설정
- [문제 해결](Troubleshooting) - FAQ 및 오류 해결
- [모니터링 아키텍처](Monitoring-Architecture) - 모니터링 시스템 상세
- [프론트엔드 아키텍처](Frontend-Architecture) - 프론트엔드 구조 상세

---

**작성일**: 2025-11-30
**작성자**: Claude Code (AI Assistant)
**마지막 업데이트**: 2025-11-30 (심층 분석 추가)
