# gonsai2

> AI-Optimized Project Structure following Kent Beck's Augmented Coding Principles

gonsai2는 n8n 워크플로우 자동화와 MongoDB를 활용한 AI 기반 프로젝트입니다. Kent Beck의 Augmented Coding 원칙에 따라 AI와 개발자가 효과적으로 협업할 수 있도록 설계되었습니다.

## 🎯 프로젝트 목표

- **AI 최적화 구조**: Claude Code와 같은 AI 도구가 쉽게 이해하고 수정할 수 있는 코드베이스
- **명확한 문맥**: 각 모듈과 함수는 자체 문서화되어 AI가 즉시 이해 가능
- **점진적 복잡도**: 단순한 구조에서 시작하여 필요에 따라 확장
- **테스트 가능성**: 모든 기능은 독립적으로 테스트 가능

## 🏗️ 아키텍처

```
gonsai2/
├── packages/              # Monorepo 패키지
│   ├── core/             # 핵심 비즈니스 로직
│   ├── n8n-client/       # n8n API 클라이언트
│   ├── database/         # MongoDB 스키마 및 모델
│   └── api/              # REST API 서버
├── docs/                 # 프로젝트 문서화
│   ├── architecture/     # 아키텍처 다이어그램
│   ├── api/              # API 명세
│   └── ai-context/       # AI 협업 컨텍스트
├── scripts/              # 유틸리티 스크립트
├── .github/              # GitHub Actions 워크플로우
└── docker/               # Docker 관련 설정
```

## 🔧 기술 스택

### 핵심 인프라
- **n8n**: 워크플로우 자동화 플랫폼 (큐 기반 아키텍처)
- **MongoDB 7.0**: 데이터 영속성
- **PostgreSQL 16**: n8n 내부 데이터베이스
- **Redis 7**: Bull Queue (워크플로우 작업 큐)

### 개발 환경
- **Node.js**: 런타임
- **TypeScript**: 타입 안정성
- **Docker**: 컨테이너화
- **Git**: 버전 관리

## 🚀 빠른 시작

### 1. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 필수 값 입력
nano .env
```

**필수 환경 변수:**
- `N8N_API_KEY`: n8n UI에서 생성 (Settings > API)
- `MONGODB_PASSWORD`: MongoDB superadmin 비밀번호
- `JWT_SECRET`: 인증용 시크릿 키 생성

```bash
# JWT_SECRET 생성
openssl rand -base64 32
```

### 2. Docker 서비스 확인

기존 Docker 컨테이너가 실행 중인지 확인:

```bash
docker ps | grep -E 'n8n|mongodb'
```

**실행 중이어야 하는 컨테이너:**
- ✅ `n8n` - 메인 서비스 (localhost:5678)
- ✅ `n8n-worker` - 워크플로우 실행 워커
- ✅ `my-mongodb-container` - MongoDB (localhost:27017)
- ✅ `n8n-postgres` - PostgreSQL (내부용)
- ✅ `n8n-redis` - Redis 큐 (내부용)

### 3. 프로젝트 설치

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

## 📦 Docker 연동

### n8n 연동

gonsai2는 기존 n8n Docker 컨테이너와 연동됩니다:

**n8n 설정 위치:**
- Docker Compose: `/home/gon/docker-n8n/docker-compose.yml`
- 환경 변수: `/home/gon/docker-n8n/.env`
- 데이터 볼륨: `/home/gon/docker-n8n/data/`

**API 접근:**
```typescript
// n8n API 클라이언트 사용 예시
import { N8nClient } from '@gonsai2/n8n-client';

const client = new N8nClient({
  baseUrl: process.env.N8N_API_URL,
  apiKey: process.env.N8N_API_KEY
});

// 워크플로우 목록 조회
const workflows = await client.workflows.getAll();
```

### MongoDB 연동

**MongoDB 설정 위치:**
- Docker Compose: `/home/gon/docker-mongo-ubuntu/docker-compose.yml`
- 환경 변수: `/home/gon/docker-mongo-ubuntu/.env`

**연결 문자열:**
```bash
# 로컬 개발
mongodb://superadmin:password@localhost:27017/gonsai2

# Docker 네트워크 내부
mongodb://superadmin:password@my-mongodb-container:27017/gonsai2
```

### 네트워크 구성

gonsai2는 `docker-compose.override.yml`을 통해 기존 Docker 네트워크와 연결됩니다:

```yaml
# docker-compose.override.yml (생성 예정)
services:
  app:
    networks:
      - docker-n8n_default
      - docker-mongo-ubuntu_default
```

## 🤖 AI 협업 원칙

Kent Beck의 Augmented Coding 원칙에 따른 AI 최적화:

### 1. 명확한 의도 (Clear Intent)
```typescript
// ❌ Bad: AI가 이해하기 어려움
function proc(d: any) { /* ... */ }

// ✅ Good: 명확한 의도 표현
function processWorkflowExecution(execution: WorkflowExecution) {
  // AI가 즉시 이해할 수 있는 명확한 이름과 타입
}
```

### 2. 작은 단계 (Small Steps)
- 각 함수는 하나의 명확한 작업만 수행
- 복잡한 로직은 작은 함수로 분해
- AI가 각 단계를 독립적으로 이해 가능

### 3. 풍부한 컨텍스트 (Rich Context)
```typescript
/**
 * n8n 워크플로우를 실행하고 결과를 반환합니다.
 *
 * @context 이 함수는 n8n API를 통해 워크플로우를 트리거하며,
 *          비동기 실행 후 완료 상태를 폴링합니다.
 *
 * @param workflowId - n8n 워크플로우 ID
 * @param data - 워크플로우에 전달할 입력 데이터
 * @returns 워크플로우 실행 결과
 *
 * @example
 * const result = await executeWorkflow('workflow-123', {
 *   input: 'test data'
 * });
 */
```

### 4. AI 세션 지속성
- `ai-sessions/` 디렉토리에 AI 협업 기록 저장
- 이전 결정사항과 컨텍스트 참조 가능
- `.gitignore`에서 제외하여 민감정보 보호

## 📚 문서화

### 프로젝트 문서
- [아키텍처 개요](docs/architecture/README.md)
- [API 명세](docs/api/README.md)
- [개발 가이드](docs/development/README.md)

### Docker 관련 문서
- [n8n 설정 가이드](/home/gon/docker-n8n/README.md)
- [MongoDB 설정 가이드](/home/gon/docker-mongo-ubuntu/CLAUDE.md)
- [연결 테스트 결과](connection-test.log)

## 🔐 보안

### 환경 변수 관리
- ⚠️ **절대 커밋하지 말 것**: `.env` 파일
- ✅ 템플릿만 커밋: `.env.example`
- GitHub Secrets 사용: CI/CD 파이프라인

### API 키 관리
- n8n API Key는 n8n UI에서만 생성
- 로컬 개발: `.env` 파일
- 프로덕션: GitHub Secrets 또는 환경 변수

### MongoDB 인증
- superadmin 계정: 전체 권한
- 애플리케이션별 계정: 최소 권한 원칙

## 🧪 테스트

```bash
# 단위 테스트
npm test

# 통합 테스트
npm run test:integration

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:coverage
```

## 📈 개발 워크플로우

### 브랜치 전략
```bash
main          # 프로덕션 (보호됨)
├── develop   # 개발 통합
├── feature/* # 기능 개발
├── fix/*     # 버그 수정
└── docs/*    # 문서 업데이트
```

### 커밋 컨벤션
```bash
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드, 설정 변경
```

## 🤝 기여 가이드

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 라이선스

MIT License

## 🙋 지원

- **이슈**: [GitHub Issues](https://github.com/yourusername/gonsai2/issues)
- **문서**: [프로젝트 위키](https://github.com/yourusername/gonsai2/wiki)

---

**Built with ❤️ using AI-Augmented Development**

gonsai2는 Claude Code와 함께 개발되었으며, AI와 인간 개발자의 효과적인 협업을 위해 최적화되었습니다.
