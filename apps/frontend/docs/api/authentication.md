---
sidebar_position: 2
title: 인증
---

# API 인증

API 접근을 위한 인증 방법을 설명합니다.

## 인증 방식 개요

본 시스템은 두 가지 주요 인증 방식을 사용합니다:

1. **n8n API 키 인증** - n8n REST API 접근
2. **JWT 토큰 인증** (선택) - Frontend API 접근

## n8n API 키 인증

### API 키 생성

n8n 웹 UI에서 API 키를 생성합니다:

1. n8n에 로그인 (`http://localhost:5678`)
2. 우측 상단 프로필 아이콘 클릭
3. **Settings** → **API** 선택
4. **Create API Key** 버튼 클릭
5. API 키 이름 입력 (예: "Frontend App")
6. **Create** 클릭
7. 생성된 API 키 복사

**API 키 형식:**

```
n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### API 키 사용

**HTTP 헤더에 포함:**

```http
GET /api/v1/workflows HTTP/1.1
Host: localhost:5678
X-N8N-API-KEY: n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

**cURL 예시:**

```bash
curl -X GET \
  -H "X-N8N-API-KEY: n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  http://localhost:5678/api/v1/workflows
```

**TypeScript 클라이언트:**

```typescript
import { N8nApiClient } from '@/lib/n8n/client';

const client = new N8nApiClient({
  baseUrl: process.env.NEXT_PUBLIC_N8N_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
});

// 자동으로 헤더에 API 키 포함
const workflows = await client.getWorkflows();
```

### API 키 보안

**환경 변수로 관리:**

```bash
# .env.local
NEXT_PUBLIC_N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**코드에서 사용:**

```typescript
// ✅ 올바른 방법 - 환경 변수 사용
const apiKey = process.env.NEXT_PUBLIC_N8N_API_KEY;

// ❌ 잘못된 방법 - 하드코딩
const apiKey = 'n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

**API 키 권한 관리:**

- 최소 권한 원칙 적용
- 정기적인 키 로테이션 (90일 권장)
- 사용하지 않는 키는 즉시 삭제

### API 키 테스트

```bash
# API 키 유효성 확인
curl -X GET \
  -H "X-N8N-API-KEY: your-api-key" \
  http://localhost:5678/api/v1/workflows

# 200 OK - API 키 유효
# 401 Unauthorized - API 키 무효 또는 만료
```

## JWT 토큰 인증 (선택)

Frontend API에서 사용자 인증이 필요한 경우 JWT를 사용할 수 있습니다.

### JWT 토큰 발급

**로그인 엔드포인트:**

```typescript
// POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### JWT 토큰 사용

**HTTP 헤더에 포함:**

```http
GET /api/workflows HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**JavaScript/TypeScript:**

```typescript
const response = await fetch('/api/workflows', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

**React Query와 통합:**

```typescript
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const token = localStorage.getItem('accessToken');

        const response = await fetch(queryKey[0] as string, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        return response.json();
      },
    },
  },
});
```

### 토큰 갱신

**Refresh Token 사용:**

```typescript
// POST /api/auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**자동 토큰 갱신:**

```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // 401 에러 시 토큰 갱신 시도
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');

    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshResponse.ok) {
      const { accessToken } = await refreshResponse.json();
      localStorage.setItem('accessToken', accessToken);

      // 원래 요청 재시도
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }
  }

  return response;
}
```

## Webhook 인증

Webhook 엔드포인트 보안을 위한 인증 방법입니다.

### Webhook 시크릿 설정

**환경 변수:**

```bash
# .env.local
WEBHOOK_SECRET=your-webhook-secret-here
```

**시크릿 생성:**

```bash
# 안전한 랜덤 문자열 생성
openssl rand -base64 32
```

### Webhook 요청 검증

**n8n 워크플로우 설정:**

n8n Webhook 노드에서 커스텀 헤더 추가:

```json
{
  "X-Webhook-Secret": "your-webhook-secret-here"
}
```

**Frontend에서 검증:**

```typescript
// app/api/webhooks/n8n/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('X-Webhook-Secret');

  // 시크릿 검증
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Webhook 처리
  const payload = await request.json();
  // ...

  return NextResponse.json({ success: true });
}
```

### HMAC 서명 검증 (고급)

더 강력한 보안을 위해 HMAC 서명을 사용할 수 있습니다:

**n8n에서 서명 생성:**

```javascript
// n8n Function 노드
const crypto = require('crypto');

const payload = JSON.stringify($input.all());
const secret = 'your-webhook-secret';

const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

return {
  json: {
    payload: $input.all(),
    signature,
  },
};
```

**Frontend에서 서명 검증:**

```typescript
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const receivedSignature = request.headers.get('X-Webhook-Signature');

  // 서명 생성
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  // 서명 비교
  if (receivedSignature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 검증 통과
  const payload = JSON.parse(body);
  // ...
}
```

## Basic 인증 (n8n)

n8n에서 Basic 인증이 활성화된 경우:

### 설정 확인

**n8n docker-compose.yml:**

```yaml
environment:
  - N8N_BASIC_AUTH_ACTIVE=true
  - N8N_BASIC_AUTH_USER=admin
  - N8N_BASIC_AUTH_PASSWORD=password
```

### API 호출 시 인증

**cURL:**

```bash
curl -X GET \
  -u admin:password \
  -H "X-N8N-API-KEY: your-api-key" \
  http://localhost:5678/api/v1/workflows
```

**JavaScript/TypeScript:**

```typescript
const username = 'admin';
const password = 'password';
const credentials = btoa(`${username}:${password}`);

const response = await fetch('http://localhost:5678/api/v1/workflows', {
  headers: {
    Authorization: `Basic ${credentials}`,
    'X-N8N-API-KEY': 'your-api-key',
  },
});
```

**N8nApiClient 설정:**

```typescript
const client = new N8nApiClient({
  baseUrl: 'http://localhost:5678/api/v1',
  apiKey: 'your-api-key',
  basicAuth: {
    username: 'admin',
    password: 'password',
  },
});
```

## 인증 에러 처리

### 401 Unauthorized

**원인:**

- API 키 누락 또는 잘못됨
- JWT 토큰 만료
- Basic 인증 실패

**해결:**

```typescript
try {
  const response = await fetch('/api/workflows', {
    headers: {
      'X-N8N-API-KEY': apiKey,
    },
  });

  if (response.status === 401) {
    // 인증 실패 처리
    console.error('Authentication failed');
    // 로그인 페이지로 리디렉션 또는 토큰 갱신
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

### 403 Forbidden

**원인:**

- API 키는 유효하지만 권한 부족
- 리소스 접근 권한 없음

**해결:**

```typescript
if (response.status === 403) {
  console.error('Insufficient permissions');
  // 사용자에게 권한 부족 메시지 표시
}
```

## 보안 모범 사례

### 1. API 키 보호

```typescript
// ✅ 올바른 방법
const apiKey = process.env.NEXT_PUBLIC_N8N_API_KEY;

// ❌ 잘못된 방법
const apiKey = 'n8n_api_1234567890'; // 하드코딩 금지
```

### 2. HTTPS 사용

프로덕션 환경에서는 항상 HTTPS를 사용하세요:

```bash
# ✅ 올바른 방법
NEXT_PUBLIC_N8N_API_URL=https://n8n.yourdomain.com/api/v1

# ❌ 잘못된 방법 (프로덕션)
NEXT_PUBLIC_N8N_API_URL=http://n8n.yourdomain.com/api/v1
```

### 3. 토큰 저장

**localStorage vs sessionStorage vs Cookie:**

```typescript
// 보안 수준: Cookie > sessionStorage > localStorage

// ✅ 권장: HttpOnly Cookie (서버 사이드)
// 중간: sessionStorage (브라우저 세션)
sessionStorage.setItem('accessToken', token);

// 낮음: localStorage (지속적 저장)
localStorage.setItem('accessToken', token);
```

### 4. CORS 설정

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGIN || 'https://yourdomain.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-N8N-API-KEY',
          },
        ],
      },
    ];
  },
};
```

### 5. Rate Limiting

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const now = Date.now();

  const limit = rateLimit.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + 60000 }); // 1분
  } else if (limit.count >= 60) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  } else {
    limit.count++;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

## 테스트

### 인증 테스트 스크립트

```bash
#!/bin/bash

# 변수 설정
API_URL="http://localhost:5678/api/v1"
API_KEY="your-api-key"

# API 키 테스트
echo "Testing API key authentication..."
response=$(curl -s -w "%{http_code}" -o /dev/null \
  -H "X-N8N-API-KEY: $API_KEY" \
  "$API_URL/workflows")

if [ "$response" = "200" ]; then
  echo "✅ API key authentication successful"
else
  echo "❌ API key authentication failed (HTTP $response)"
fi

# Webhook 시크릿 테스트
echo "Testing webhook authentication..."
response=$(curl -s -w "%{http_code}" -o /dev/null \
  -X POST \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  "http://localhost:3000/api/webhooks/n8n")

if [ "$response" = "200" ]; then
  echo "✅ Webhook authentication successful"
else
  echo "❌ Webhook authentication failed (HTTP $response)"
fi
```

## 다음 단계

1. [워크플로우 API](./workflows) - 워크플로우 관리 API
2. [실행 API](./executions) - 워크플로우 실행 API
3. [Webhook 가이드](./webhooks) - Webhook 설정 및 사용
4. [에러 코드](./error-codes) - 인증 관련 에러 코드

## 참고 자료

- [n8n API 인증](https://docs.n8n.io/api/authentication/)
- [JWT 공식 사이트](https://jwt.io/)
- [OAuth 2.0 RFC](https://oauth.net/2/)
