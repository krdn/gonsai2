# 보안 감사 보고서 (Security Audit Report)

gonsai2 프로덕션 환경 보안 검토 및 강화 조치

---

## 목차

1. [보안 개요](#보안-개요)
2. [인증 및 권한](#인증-및-권한)
3. [데이터 보호](#데이터-보호)
4. [네트워크 보안](#네트워크-보안)
5. [애플리케이션 보안](#애플리케이션-보안)
6. [인프라 보안](#인프라-보안)
7. [보안 체크리스트](#보안-체크리스트)

---

## 보안 개요

### 보안 원칙

1. **최소 권한 원칙** (Principle of Least Privilege)
2. **심층 방어** (Defense in Depth)
3. **암호화 우선** (Encryption First)
4. **보안 기본값** (Secure by Default)

### 위협 모델

| 위협 | 영향도 | 가능성 | 완화 조치 |
|------|--------|--------|-----------|
| SQL Injection | 높음 | 낮음 | Parameterized queries, ORM |
| XSS | 중간 | 중간 | CSP headers, 입력 검증 |
| CSRF | 중간 | 낮음 | CSRF tokens, SameSite cookies |
| 무차별 대입 공격 | 높음 | 높음 | Rate limiting, Account lockout |
| DDoS | 높음 | 중간 | Rate limiting, CDN |
| 데이터 유출 | 높음 | 낮음 | 암호화, 접근 제어 |

---

## 인증 및 권한

### n8n API 키 관리

**구현 상태**: ✅ 완료

```yaml
# docker-compose.yml
n8n:
  environment:
    - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}  # 자격증명 암호화
    - N8N_USER_MANAGEMENT_JWT_SECRET=${N8N_JWT_SECRET}
```

**보안 조치**:
1. **암호화 키 보호**:
   ```bash
   # .env.production에만 저장
   # git에 커밋하지 않음 (.gitignore)
   N8N_ENCRYPTION_KEY=<32-char-random-key>
   ```

2. **키 순환** (Key Rotation):
   - ⚠️ 주의: N8N_ENCRYPTION_KEY는 변경 불가 (자격증명 복호화 불가)
   - 새 배포 시에만 새 키 사용
   - 기존 키는 안전하게 백업

3. **API 키 검증**:
   ```typescript
   // Frontend API 호출
   headers: {
     'X-N8N-API-KEY': process.env.N8N_API_KEY
   }
   ```

### JWT 토큰 보안

**구현 상태**: ✅ 완료

```typescript
// JWT 설정
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

**보안 조치**:
1. **강력한 시크릿**:
   ```bash
   # 최소 32바이트 랜덤 생성
   openssl rand -hex 32
   ```

2. **토큰 검증**:
   - 서명 검증
   - 만료 시간 체크
   - Refresh token rotation

3. **저장 방식**:
   - Access token: HttpOnly cookie
   - Refresh token: Secure storage

### MongoDB 접근 제어

**구현 상태**: ✅ 완료

```yaml
mongodb:
  environment:
    - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER}
    - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
  command: mongod --auth --bind_ip_all
  ports:
    - "127.0.0.1:27017:27017"  # localhost만 바인딩
```

**보안 조치**:
1. **인증 활성화**: `--auth` 플래그
2. **네트워크 격리**: localhost 바인딩
3. **역할 기반 접근 제어** (RBAC):
   ```javascript
   // MongoDB 초기화 스크립트
   db.createUser({
     user: "gonsai2_app",
     pwd: "strong_password",
     roles: [
       { role: "readWrite", db: "gonsai2" }
     ]
   });
   ```

4. **연결 문자열 보호**:
   ```bash
   MONGODB_URI=mongodb://user:password@mongodb:27017/gonsai2?authSource=admin
   ```

### PostgreSQL 접근 제어

**구현 상태**: ✅ 완료

```yaml
postgres:
  environment:
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
  # 외부 포트 노출 없음 (컨테이너 네트워크만)
```

**보안 조치**:
1. **비밀번호 인증**: `scram-sha-256`
2. **네트워크 격리**: 내부 네트워크만
3. **최소 권한**: n8n 사용자는 n8n DB만 접근

---

## 데이터 보호

### 저장 데이터 암호화 (Encryption at Rest)

**구현 상태**: ✅ 완료

1. **n8n 자격증명**:
   ```yaml
   N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
   # 모든 자격증명은 AES-256-GCM으로 암호화
   ```

2. **민감 정보 암호화**:
   ```typescript
   // Frontend 암호화 유틸리티
   ENCRYPTION_KEY=${ENCRYPTION_KEY}
   // 사용자 정보, API 키 등 암호화
   ```

3. **데이터베이스 백업 암호화**:
   ```bash
   # backup.sh에 추가 권장
   openssl enc -aes-256-cbc -salt \
     -in backup.tar.gz \
     -out backup.tar.gz.enc \
     -k ${BACKUP_ENCRYPTION_PASSWORD}
   ```

### 전송 중 데이터 암호화 (Encryption in Transit)

**구현 상태**: ✅ 완료

1. **SSL/TLS**:
   ```nginx
   ssl_protocols TLSv1.2 TLSv1.3;
   ssl_prefer_server_ciphers on;
   ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:...';
   ```

2. **HSTS**:
   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
   ```

3. **컨테이너 간 통신**:
   - Docker 내부 네트워크 (암호화된 오버레이 네트워크 권장)

### 민감 정보 관리

**구현 상태**: ✅ 완료

```bash
# .env.production은 git에 포함되지 않음
.gitignore:
  .env*
  !.env.example
```

**권장 추가 조치**:

1. **HashiCorp Vault 통합**:
   ```bash
   # 환경 변수를 Vault에서 가져오기
   export VAULT_ADDR=https://vault.yourdomain.com
   vault login -method=token
   vault kv get secret/gonsai2/production
   ```

2. **AWS Secrets Manager**:
   ```bash
   # Docker Compose에서 시크릿 사용
   docker-compose.yml:
     secrets:
       postgres_password:
         external: true
   ```

---

## 네트워크 보안

### CORS 설정

**구현 상태**: ✅ 완료

```bash
# .env.production
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**프론트엔드 구현**:
```typescript
// Next.js API Route
export async function middleware(req: NextRequest) {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
  const origin = req.headers.get('origin');

  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('CORS not allowed', { status: 403 });
  }
}
```

**n8n CORS**:
```yaml
n8n:
  environment:
    - N8N_CORS_ORIGIN=${CORS_ORIGIN}
```

### Rate Limiting

**구현 상태**: ✅ 완료

**Nginx Level**:
```nginx
# nginx.conf
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=webhook:10m rate=100r/s;

# frontend.conf
location /api {
    limit_req zone=api burst=50 nodelay;
}

# n8n.conf
location /webhook {
    limit_req zone=webhook burst=200 nodelay;
}
```

**애플리케이션 Level** (권장 추가):
```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 방화벽 규칙

**권장 설정** (UFW 예시):
```bash
# 기본 정책
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (관리용)
sudo ufw allow 22/tcp

# HTTP/HTTPS (공개)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# UFW 활성화
sudo ufw enable
```

**Docker와 UFW 통합**:
```bash
# /etc/ufw/after.rules에 추가
# Docker 네트워크 허용
-A POSTROUTING ! -o docker0 -s 172.20.0.0/16 -j MASQUERADE
```

### IP 화이트리스트

**구현 예시**:
```nginx
# nginx/conf.d/n8n.conf
location /metrics {
    # Prometheus 서버만 허용
    allow 172.20.0.0/16;  # 내부 네트워크
    deny all;
}
```

---

## 애플리케이션 보안

### 입력 검증

**권장 구현**:

```typescript
// utils/validation.ts
import { z } from 'zod';

// 워크플로우 ID 검증
export const workflowIdSchema = z.string().uuid();

// API 요청 검증
export const executeWorkflowSchema = z.object({
  workflowId: z.string().uuid(),
  data: z.record(z.unknown()),
});

// 사용 예시
export async function executeWorkflow(req: Request) {
  const result = executeWorkflowSchema.safeParse(req.body);

  if (!result.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  // 검증된 데이터 사용
  const { workflowId, data } = result.data;
}
```

### XSS 방지

**구현 상태**: ✅ 완료

```nginx
# CSP 헤더
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: https:; frame-ancestors 'self';" always;
```

**React/Next.js 자동 보호**:
- JSX는 자동으로 이스케이프
- `dangerouslySetInnerHTML` 사용 금지

### SQL Injection 방지

**ORM 사용**:
```typescript
// Mongoose (MongoDB)
const workflow = await Workflow.findById(workflowId);
// Parameterized query 자동 사용

// TypeORM (PostgreSQL - n8n 내부)
const execution = await executionRepository.findOne({
  where: { id: executionId }
});
```

### CSRF 방지

**권장 구현**:
```typescript
// middleware/csrf.ts
import { csrf } from 'next-csrf';

const { csrfToken, csrfMiddleware } = csrf({
  secret: process.env.CSRF_SECRET,
});

// API Route에서 사용
export async function POST(req: Request) {
  await csrfMiddleware(req);
  // 검증된 요청 처리
}
```

**SameSite Cookies**:
```typescript
// Cookie 설정
res.setHeader('Set-Cookie', [
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`
]);
```

### 보안 헤더

**구현 상태**: ✅ 완료

```nginx
# nginx.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 인프라 보안

### Docker 보안

**구현 상태**: ✅ 부분 완료

**현재 설정**:
```yaml
# docker-compose.yml
services:
  gonsai2-app:
    user: "1000:1000"  # 권장 추가
    read_only: true    # 권장 추가
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

**권장 강화**:
1. **비root 실행**:
   ```dockerfile
   # Dockerfile
   USER node
   ```

2. **읽기 전용 파일시스템**:
   ```yaml
   read_only: true
   tmpfs:
     - /tmp
     - /var/run
   ```

3. **Capability 제한**:
   ```yaml
   cap_drop:
     - ALL
   cap_add:
     - NET_BIND_SERVICE  # 필요한 것만
   ```

### 시크릿 관리

**현재**: 환경 변수

**권장 개선**:
```yaml
# Docker Swarm Secrets
secrets:
  postgres_password:
    external: true
  mongo_password:
    external: true

services:
  postgres:
    secrets:
      - postgres_password
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
```

### 로깅 및 감사

**구현 상태**: ✅ 완료

```yaml
# Loki/Promtail로 모든 컨테이너 로그 수집
# 보안 이벤트 로깅
promtail:
  - job_name: security-events
    pipeline_stages:
      - match:
          selector: '{level="error"}'
          stages:
            - labels:
                severity: critical
```

**권장 추가**:
```bash
# 감사 로그 저장 및 분석
# - 인증 실패
# - 권한 상승 시도
# - 비정상 API 호출
```

### 취약점 스캔

**권장 도구**:
```bash
# Docker 이미지 스캔
docker scan gonsai2-app:latest

# Trivy 사용
trivy image gonsai2-app:latest

# OWASP Dependency Check
dependency-check --project gonsai2 --scan ./
```

---

## 보안 체크리스트

### 배포 전 필수 점검

- [x] **인증 및 권한**
  - [x] 모든 비밀번호 강력한가? (16자 이상, 복잡도)
  - [x] N8N_ENCRYPTION_KEY 안전하게 보관?
  - [x] JWT_SECRET 충분히 긴가? (32바이트+)
  - [x] API 키 암호화되어 저장?

- [x] **데이터 보호**
  - [x] .env 파일 git에 미포함?
  - [x] SSL/TLS 인증서 유효한가?
  - [x] 데이터베이스 인증 활성화?
  - [ ] 백업 암호화 설정? (권장)

- [x] **네트워크 보안**
  - [x] CORS 올바르게 설정?
  - [x] Rate limiting 활성화?
  - [ ] 방화벽 규칙 설정? (권장)
  - [x] 불필요한 포트 차단?

- [x] **애플리케이션 보안**
  - [x] CSP 헤더 설정?
  - [x] 보안 헤더 모두 적용?
  - [ ] 입력 검증 구현? (코드 레벨)
  - [ ] CSRF 토큰 사용? (권장)

- [x] **인프라 보안**
  - [x] Docker 이미지 최신 버전?
  - [ ] 이미지 취약점 스캔? (권장)
  - [x] 컨테이너 리소스 제한?
  - [ ] 읽기 전용 파일시스템? (권장)

### 운영 중 주기적 점검 (월간)

- [ ] 모든 패키지 업데이트
- [ ] SSL 인증서 만료일 확인
- [ ] 로그 보안 이벤트 검토
- [ ] 접근 권한 재검토
- [ ] 백업 복원 테스트
- [ ] 취약점 스캔 실행

---

## 보안 권고사항

### 즉시 조치 필요

1. **강력한 비밀번호 설정**:
   ```bash
   # 모든 .env 파일에서 'changeme', 'password' 등 제거
   # 최소 16자, 대소문자/숫자/특수문자 포함
   ```

2. **방화벽 활성화**:
   ```bash
   sudo ufw enable
   sudo ufw status
   ```

3. **자동 업데이트 설정**:
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

### 단기 개선 (1주일 내)

1. **Fail2Ban 설치**:
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

2. **입력 검증 라이브러리 추가**:
   ```bash
   npm install zod
   # 모든 API 엔드포인트에 검증 추가
   ```

3. **CSRF 토큰 구현**:
   ```bash
   npm install next-csrf
   ```

### 중기 개선 (1개월 내)

1. **WAF 도입**:
   - Cloudflare
   - AWS WAF
   - ModSecurity

2. **시크릿 관리 개선**:
   - HashiCorp Vault
   - AWS Secrets Manager
   - Docker Secrets

3. **보안 감사 로그**:
   - 중앙 집중식 로그 수집
   - SIEM 도구 도입

---

## 보안 연락처

### 보안 사고 대응

- **보고 이메일**: security@yourdomain.com
- **긴급 연락**: [전화번호]
- **대응 팀**: [팀 이름]

### 취약점 신고

책임감 있는 공개 (Responsible Disclosure):
1. security@yourdomain.com으로 이메일
2. 암호화 권장 (PGP 키: [URL])
3. 90일 이내 패치 약속

---

**문서 버전**: 1.0
**최종 감사**: 2024년 11월
**다음 감사**: 2024년 12월
