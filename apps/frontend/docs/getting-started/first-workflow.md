---
sidebar_position: 5
title: 첫 워크플로우 실행
---

# 첫 워크플로우 실행

간단한 워크플로우를 생성하고 실행하는 방법을 단계별로 설명합니다.

## 워크플로우 개요

이 가이드에서는 다음과 같은 간단한 워크플로우를 만들어 봅니다:

1. **Start 노드** - 워크플로우 시작
2. **HTTP Request 노드** - 외부 API 호출
3. **Set 노드** - 데이터 가공
4. **Webhook 노드** - 결과를 Frontend로 전송

## n8n에서 워크플로우 생성

### 1. n8n 웹 UI 접속

브라우저에서 n8n 인스턴스에 접속합니다:

```
http://localhost:5678
```

### 2. 새 워크플로우 생성

1. 좌측 사이드바에서 **Workflows** 클릭
2. 우측 상단의 **+ New Workflow** 버튼 클릭
3. 워크플로우 이름 입력: `My First Workflow`

### 3. Start 노드 추가

Start 노드는 기본적으로 추가되어 있습니다.

### 4. HTTP Request 노드 추가

1. 캔버스에서 **+** 버튼 클릭
2. 검색창에 "HTTP Request" 입력
3. **HTTP Request** 노드 선택

**설정:**

- **Method**: GET
- **URL**: `https://jsonplaceholder.typicode.com/todos/1`

![HTTP Request 노드 설정](../assets/http-request-node.png)

### 5. Set 노드 추가

1. HTTP Request 노드 우측의 **+** 버튼 클릭
2. "Set" 검색 후 선택

**설정:**

- **Keep Only Set**: 활성화
- **Values to Set**:
  - Name: `title`
  - Value: `{{ $json.title }}`
  - Name: `completed`
  - Value: `{{ $json.completed }}`
  - Name: `processed_at`
  - Value: `{{ $now.toISO() }}`

### 6. Webhook 노드 추가 (선택)

Frontend로 결과를 전송하려면 Webhook 노드를 추가합니다:

1. Set 노드 우측의 **+** 버튼 클릭
2. "Webhook" 검색 후 선택

**설정:**

- **HTTP Method**: POST
- **Path**: `my-first-workflow`
- **Response Mode**: Using 'Respond to Webhook' Node

### 7. 워크플로우 저장

1. 우측 상단의 **Save** 버튼 클릭
2. 워크플로우 ID 복사 (URL에서 확인 가능)

## Frontend에서 워크플로우 실행

### 방법 1: React 컴포넌트에서 실행

`components/FirstWorkflowDemo.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { N8nApiClient } from '@/lib/n8n/client';

const n8nClient = new N8nApiClient({
  baseUrl: process.env.NEXT_PUBLIC_N8N_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
});

export function FirstWorkflowDemo() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const executeWorkflow = async () => {
    setIsExecuting(true);
    setResult(null);

    try {
      // 워크플로우 ID를 실제 값으로 변경하세요
      const workflowId = 'your-workflow-id-here';

      // 워크플로우 실행
      const execution = await n8nClient.executeWorkflow(workflowId);

      toast({
        title: '워크플로우 실행됨',
        description: `실행 ID: ${execution.executionId}`,
      });

      // 실행 완료 대기 (폴링)
      const finalResult = await waitForCompletion(execution.executionId);
      setResult(finalResult);

      toast({
        title: '실행 완료',
        description: '워크플로우가 성공적으로 완료되었습니다.',
      });
    } catch (error: any) {
      console.error('Workflow execution failed:', error);

      toast({
        title: '실행 실패',
        description: error.message || '워크플로우 실행 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const waitForCompletion = async (executionId: string, maxAttempts = 20): Promise<any> => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 대기

      const status = await n8nClient.getExecution(executionId);

      if (status.status === 'success') {
        return status.data;
      } else if (status.status === 'error') {
        throw new Error('Workflow execution failed');
      }

      // 아직 실행 중인 경우 계속 대기
    }

    throw new Error('Workflow execution timeout');
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">첫 워크플로우 실행</h2>

      <Button onClick={executeWorkflow} disabled={isExecuting} className="mb-4">
        {isExecuting ? '실행 중...' : '워크플로우 실행'}
      </Button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">실행 결과:</h3>
          <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </Card>
  );
}
```

### 방법 2: API Route를 통한 실행

`app/api/workflows/execute/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { N8nApiClient } from '@/lib/n8n/client';

const n8nClient = new N8nApiClient({
  baseUrl: process.env.N8N_API_URL!,
  apiKey: process.env.N8N_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json();

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    // 워크플로우 실행
    const execution = await n8nClient.executeWorkflow(workflowId);

    // 완료 대기 (최대 30초)
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const status = await n8nClient.getExecution(execution.executionId);

      if (status.status === 'success') {
        return NextResponse.json({
          success: true,
          executionId: execution.executionId,
          data: status.data,
        });
      } else if (status.status === 'error') {
        return NextResponse.json(
          {
            success: false,
            executionId: execution.executionId,
            error: 'Workflow execution failed',
          },
          { status: 500 }
        );
      }

      attempts++;
    }

    // 타임아웃
    return NextResponse.json(
      {
        success: false,
        executionId: execution.executionId,
        error: 'Workflow execution timeout',
      },
      { status: 408 }
    );
  } catch (error: any) {
    console.error('Workflow execution error:', error);

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
```

**Frontend에서 호출:**

```typescript
const response = await fetch('/api/workflows/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ workflowId: 'your-workflow-id' }),
});

const result = await response.json();
console.log(result);
```

### 방법 3: 커맨드 라인에서 테스트

```bash
# curl을 사용한 직접 실행
curl -X POST \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  http://localhost:5678/api/v1/workflows/your-workflow-id/execute

# 결과 확인
curl -X GET \
  -H "X-N8N-API-KEY: your-api-key" \
  http://localhost:5678/api/v1/executions/execution-id-here
```

## 실시간 실행 모니터링

### WebSocket을 사용한 실시간 업데이트

```tsx
'use client';

import { useEffect, useState } from 'react';

export function WorkflowExecutionMonitor({ executionId }: { executionId: string }) {
  const [status, setStatus] = useState<string>('initializing');
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_N8N_WEBSOCKET_URL}/execution/${executionId}`
    );

    ws.onopen = () => {
      console.log('WebSocket connected');
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'executionStatus') {
        setStatus(data.status);
        setProgress(data.progress || 0);
      } else if (data.type === 'log') {
        setLogs((prev) => [...prev, data.message]);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="font-semibold">상태:</span>
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            status === 'success'
              ? 'bg-green-100 text-green-800'
              : status === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
          }`}
        >
          {status}
        </span>
      </div>

      {progress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {logs.length > 0 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-semibold mb-2">실행 로그:</h4>
          <div className="space-y-1 text-sm font-mono max-h-60 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 워크플로우 결과 활용

### MongoDB에 결과 저장

```typescript
import { db } from '@/lib/mongodb';

async function saveExecutionResult(workflowId: string, executionId: string, result: any) {
  await db.collection('workflow_executions').insertOne({
    workflowId,
    executionId,
    result,
    status: 'success',
    createdAt: new Date(),
  });
}
```

### Redis에 캐싱

```typescript
import { redis } from '@/lib/redis';

async function cacheExecutionResult(executionId: string, result: any, ttl = 3600) {
  await redis.setex(`execution:${executionId}`, ttl, JSON.stringify(result));
}

async function getCachedResult(executionId: string) {
  const cached = await redis.get(`execution:${executionId}`);
  return cached ? JSON.parse(cached) : null;
}
```

## 트러블슈팅

### 워크플로우가 실행되지 않음

1. **워크플로우가 활성화되어 있는지 확인**

   ```typescript
   const workflow = await n8nClient.getWorkflow(workflowId);
   console.log('Active:', workflow.active);
   ```

2. **API 키가 올바른지 확인**

   ```typescript
   console.log('API Key:', process.env.NEXT_PUBLIC_N8N_API_KEY?.slice(0, 10) + '...');
   ```

3. **n8n 서비스 상태 확인**
   ```bash
   curl http://localhost:5678/healthz
   ```

### 실행 결과를 받을 수 없음

1. **실행 ID 확인**

   ```typescript
   console.log('Execution ID:', execution.executionId);
   ```

2. **폴링 간격 조정**

   ```typescript
   // 2초 대신 5초로 변경
   await new Promise((resolve) => setTimeout(resolve, 5000));
   ```

3. **직접 n8n UI에서 확인**
   - n8n 웹 UI → Executions 메뉴
   - 실행 ID로 검색

### WebSocket 연결 실패

1. **WebSocket URL 확인**

   ```typescript
   console.log('WebSocket URL:', process.env.NEXT_PUBLIC_N8N_WEBSOCKET_URL);
   ```

2. **Nginx WebSocket 지원 확인**
   - `proxy_set_header Upgrade $http_upgrade;`
   - `proxy_set_header Connection "upgrade";`

3. **방화벽 설정 확인**

## 다음 단계

### 고급 기능 탐색

1. **[워크플로우 생성 가이드](/n8n-integration/workflow-creation)** - 복잡한 워크플로우 작성
2. **[AI 노드 사용법](/n8n-integration/ai-nodes)** - AI 기반 자동화
3. **[커스텀 노드 개발](/n8n-integration/custom-nodes)** - 사용자 정의 노드 만들기

### 운영 환경 준비

1. **[모니터링 설정](/operations/monitoring)** - 실행 모니터링 및 알림
2. **[백업/복구](/operations/backup-recovery)** - 데이터 보호
3. **[스케일링 전략](/operations/scaling)** - 성능 최적화

## 예제 워크플로우 템플릿

### 1. 이메일 알림 워크플로우

```json
{
  "name": "Email Notification",
  "nodes": [
    {
      "id": "start",
      "type": "n8n-nodes-base.start"
    },
    {
      "id": "http-request",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.example.com/status",
        "method": "GET"
      }
    },
    {
      "id": "if",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.status }}",
              "operation": "equal",
              "value2": "error"
            }
          ]
        }
      }
    },
    {
      "id": "send-email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "fromEmail": "alerts@example.com",
        "toEmail": "admin@example.com",
        "subject": "Service Error Detected",
        "text": "={{ $json.message }}"
      }
    }
  ]
}
```

### 2. 데이터 동기화 워크플로우

```json
{
  "name": "Data Sync",
  "nodes": [
    {
      "id": "schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "hours",
              "hoursInterval": 6
            }
          ]
        }
      }
    },
    {
      "id": "fetch-data",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.source.com/data",
        "method": "GET"
      }
    },
    {
      "id": "transform",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "return items.map(item => ({ ...item, synced_at: new Date() }));"
      }
    },
    {
      "id": "save-to-db",
      "type": "n8n-nodes-base.mongodb",
      "parameters": {
        "operation": "insertMany",
        "collection": "synced_data"
      }
    }
  ]
}
```

## 참고 자료

- [n8n 워크플로우 가이드](https://docs.n8n.io/workflows/)
- [n8n 노드 라이브러리](https://docs.n8n.io/integrations/)
- [API 문서](/api/overview)
- [개발자 가이드](/developers/architecture)
