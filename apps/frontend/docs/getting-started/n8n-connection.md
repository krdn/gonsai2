---
sidebar_position: 3
title: n8n 연동
---

# n8n 연동

Frontend 애플리케이션에서 n8n 인스턴스에 연결하는 방법을 설명합니다.

## n8n API 인증

### API 키 생성

n8n 웹 UI에서 API 키를 생성합니다:

1. n8n에 로그인 (`http://localhost:5678`)
2. 우측 상단 프로필 아이콘 클릭
3. **Settings** → **API** 선택
4. **Create API Key** 버튼 클릭
5. API 키 복사 및 안전하게 보관

![n8n API Key Generation](../assets/n8n-api-key.png)

### 환경 변수 설정

Frontend 프로젝트의 `.env.local` 파일에 n8n 연결 정보를 추가합니다:

```bash
# n8n Connection
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your-api-key-here
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# WebSocket Connection
N8N_WEBSOCKET_URL=ws://localhost:5678

# Optional: Basic Auth (if enabled in n8n)
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=password
```

**프로덕션 환경:**

```bash
# Production n8n Connection
N8N_API_URL=https://n8n.yourdomain.com/api/v1
N8N_API_KEY=your-production-api-key
N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook
N8N_WEBSOCKET_URL=wss://n8n.yourdomain.com
```

## API 클라이언트 설정

### N8nApiClient 초기화

`lib/n8n/client.ts`를 사용하여 n8n API에 연결합니다:

```typescript
import { N8nApiClient } from '@/lib/n8n/client';

// 기본 설정으로 클라이언트 생성
const n8nClient = new N8nApiClient({
  baseUrl: process.env.N8N_API_URL!,
  apiKey: process.env.N8N_API_KEY!,
  timeout: 30000,
  retries: 3,
});

// 커스텀 설정
const customClient = new N8nApiClient({
  baseUrl: 'https://n8n.yourdomain.com/api/v1',
  apiKey: 'your-api-key',
  timeout: 60000,  // 60초
  retries: 5,       // 5회 재시도
});
```

### API 호출 예제

#### 워크플로우 목록 조회

```typescript
try {
  const workflows = await n8nClient.getWorkflows();
  console.log(`Total workflows: ${workflows.length}`);

  workflows.forEach(workflow => {
    console.log(`- ${workflow.name} (${workflow.active ? 'Active' : 'Inactive'})`);
  });
} catch (error) {
  console.error('Failed to fetch workflows:', error);
}
```

#### 워크플로우 실행

```typescript
try {
  const execution = await n8nClient.executeWorkflow('workflow-id-here');
  console.log(`Execution started: ${execution.executionId}`);

  // 실행 상태 확인
  const status = await n8nClient.getExecution(execution.executionId);
  console.log(`Status: ${status.status}`);
} catch (error) {
  console.error('Failed to execute workflow:', error);
}
```

#### 워크플로우 생성

```typescript
const newWorkflow = {
  name: 'My First Workflow',
  active: false,
  nodes: [
    {
      id: 'start-node',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [250, 300],
      parameters: {},
    },
    {
      id: 'http-request',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 1,
      position: [450, 300],
      parameters: {
        url: 'https://api.example.com/data',
        method: 'GET',
      },
    },
  ],
  connections: {
    'start-node': {
      main: [[{ node: 'http-request', type: 'main', index: 0 }]],
    },
  },
};

try {
  const created = await n8nClient.createWorkflow(newWorkflow);
  console.log(`Workflow created: ${created.id}`);
} catch (error) {
  console.error('Failed to create workflow:', error);
}
```

## React 컴포넌트에서 사용

### React Query와 통합

`hooks/useN8nWorkflows.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { N8nApiClient } from '@/lib/n8n/client';

const n8nClient = new N8nApiClient({
  baseUrl: process.env.NEXT_PUBLIC_N8N_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
});

// 워크플로우 목록 조회 Hook
export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => n8nClient.getWorkflows(),
    staleTime: 30000, // 30초
    refetchInterval: 60000, // 1분마다 자동 갱신
  });
}

// 워크플로우 실행 Hook
export function useExecuteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workflowId: string) => n8nClient.executeWorkflow(workflowId),
    onSuccess: () => {
      // 실행 후 실행 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
}

// 워크플로우 생성 Hook
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workflow: CreateWorkflowDto) => n8nClient.createWorkflow(workflow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
```

### 컴포넌트 사용 예제

```tsx
'use client';

import { useWorkflows, useExecuteWorkflow } from '@/hooks/useN8nWorkflows';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export function WorkflowList() {
  const { data: workflows, isLoading, error } = useWorkflows();
  const executeWorkflow = useExecuteWorkflow();

  const handleExecute = async (workflowId: string) => {
    try {
      const result = await executeWorkflow.mutateAsync(workflowId);
      toast({
        title: '워크플로우 실행됨',
        description: `실행 ID: ${result.executionId}`,
      });
    } catch (error) {
      toast({
        title: '실행 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>오류: {error.message}</div>;

  return (
    <div className="space-y-4">
      {workflows?.map(workflow => (
        <div key={workflow.id} className="border p-4 rounded-lg">
          <h3 className="font-semibold">{workflow.name}</h3>
          <p className="text-sm text-gray-500">
            {workflow.active ? '활성' : '비활성'}
          </p>
          <Button
            onClick={() => handleExecute(workflow.id)}
            disabled={executeWorkflow.isPending}
          >
            실행
          </Button>
        </div>
      ))}
    </div>
  );
}
```

## WebSocket 연결

### WebSocket 클라이언트 설정

실시간 워크플로우 실행 상태를 받기 위해 WebSocket을 연결합니다:

```typescript
import { useEffect, useState } from 'react';

export function useN8nWebSocket(executionId: string) {
  const [status, setStatus] = useState<string>('connecting');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_N8N_WEBSOCKET_URL}/execution/${executionId}`
    );

    ws.onopen = () => {
      console.log('WebSocket connected');
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'executionStatus') {
        setStatus(message.status);
        setData(message.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [executionId]);

  return { status, data };
}
```

### WebSocket 사용 예제

```tsx
'use client';

import { useN8nWebSocket } from '@/hooks/useN8nWebSocket';

export function ExecutionMonitor({ executionId }: { executionId: string }) {
  const { status, data } = useN8nWebSocket(executionId);

  return (
    <div className="border p-4 rounded-lg">
      <h3 className="font-semibold">실행 모니터</h3>
      <div className="mt-2">
        <p>상태: {status}</p>
        {data && (
          <pre className="mt-2 bg-gray-100 p-2 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
```

## Webhook 설정

### Webhook 엔드포인트 생성

Next.js API Route를 사용하여 n8n webhook을 수신합니다:

`app/api/webhooks/n8n/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log('Webhook received:', payload);

    // MongoDB에 webhook 데이터 저장
    await db.collection('webhook_events').insertOne({
      workflowId: payload.workflowId,
      executionId: payload.executionId,
      data: payload.data,
      timestamp: new Date(),
    });

    // 실시간 업데이트를 위한 처리 (옵션)
    // await notifyClients(payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Webhook 인증 (옵션)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (token === process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ message: 'Webhook endpoint active' });
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### n8n에서 Webhook 노드 설정

1. n8n 워크플로우에 **Webhook** 노드 추가
2. **Webhook URL**에 Frontend URL 입력:
   ```
   https://your-frontend.com/api/webhooks/n8n
   ```
3. **HTTP Method**: POST
4. **Response Mode**: Respond Immediately
5. 워크플로우 저장 및 활성화

## 연결 테스트

### 헬스 체크

```typescript
async function testN8nConnection() {
  try {
    const response = await fetch(`${process.env.N8N_API_URL}/../healthz`);

    if (response.ok) {
      console.log('✅ n8n is healthy');
      return true;
    } else {
      console.error('❌ n8n health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Cannot connect to n8n:', error);
    return false;
  }
}
```

### API 연결 테스트

```bash
# curl을 사용한 테스트
curl -X GET \
  -H "X-N8N-API-KEY: your-api-key" \
  http://localhost:5678/api/v1/workflows

# 응답 예시:
# {"data": [{"id": "1", "name": "My Workflow", ...}]}
```

## 트러블슈팅

### CORS 오류

n8n의 CORS 설정을 확인합니다:

```bash
# docker-compose.yml에 추가
environment:
  - N8N_CORS_ORIGIN=https://your-frontend.com
```

### API 키 인증 실패

1. API 키가 올바른지 확인
2. n8n에서 API 기능이 활성화되어 있는지 확인
3. 환경 변수가 올바르게 로드되었는지 확인

```typescript
console.log('API URL:', process.env.NEXT_PUBLIC_N8N_API_URL);
console.log('API Key:', process.env.NEXT_PUBLIC_N8N_API_KEY?.slice(0, 10) + '...');
```

### Webhook이 수신되지 않음

1. n8n에서 워크플로우가 활성화되어 있는지 확인
2. Webhook URL이 올바른지 확인
3. Frontend API Route가 정상 작동하는지 테스트

```bash
# Webhook 테스트
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  https://your-frontend.com/api/webhooks/n8n
```

### WebSocket 연결 실패

1. n8n WebSocket 엔드포인트 확인
2. Nginx/프록시 WebSocket 지원 확인
3. 방화벽 설정 확인

## 다음 단계

1. [환경 변수 설정](./environment-variables) - 상세 환경 변수 가이드
2. [첫 워크플로우 실행](./first-workflow) - 간단한 워크플로우 생성
3. [n8n 통합 가이드](/n8n-integration/overview) - 고급 통합 기능

## 참고 자료

- [n8n API 문서](https://docs.n8n.io/api/)
- [n8n Webhook 가이드](https://docs.n8n.io/integrations/core-nodes/n8n-nodes-base.webhook/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
