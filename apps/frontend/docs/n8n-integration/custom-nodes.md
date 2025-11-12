---
sidebar_position: 4
title: 커스텀 노드 개발
---

# 커스텀 노드 개발

n8n에서 사용자 정의 노드를 개발하여 기능을 확장하는 방법을 설명합니다.

## 커스텀 노드 개요

커스텀 노드는 다음과 같은 경우에 필요합니다:

- 기본 제공되지 않는 API 통합
- 복잡한 비즈니스 로직 캡슐화
- 재사용 가능한 기능 모듈화
- 성능 최적화가 필요한 작업

## 개발 환경 설정

### 필요한 도구

```bash
# Node.js 18+ 설치 확인
node --version

# n8n CLI 설치
npm install -g n8n

# 커스텀 노드 생성 도구
npm install -g n8n-node-dev
```

### 노드 프로젝트 생성

```bash
# 새 노드 프로젝트 생성
n8n-node-dev new

# 프롬프트에 따라 입력
# Node name: MyCustomNode
# Description: My custom n8n node
# Node type: Regular node
```

**생성된 구조:**

```
n8n-nodes-mycustom/
├── credentials/
│   └── MyCustomNodeApi.credentials.ts
├── nodes/
│   └── MyCustomNode/
│       ├── MyCustomNode.node.ts
│       ├── MyCustomNode.node.json
│       └── icon.svg
├── package.json
└── tsconfig.json
```

## 기본 노드 구조

### 노드 클래스 정의

`nodes/MyCustomNode/MyCustomNode.node.ts`:

```typescript
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class MyCustomNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Custom Node',
    name: 'myCustomNode',
    icon: 'file:icon.svg',
    group: ['transform'],
    version: 1,
    description: 'Custom node for specific functionality',
    defaults: {
      name: 'My Custom Node',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'myCustomNodeApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Get Data',
            value: 'getData',
            description: 'Retrieve data from API',
            action: 'Get data from API',
          },
          {
            name: 'Send Data',
            value: 'sendData',
            description: 'Send data to API',
            action: 'Send data to API',
          },
        ],
        default: 'getData',
      },
      {
        displayName: 'Resource ID',
        name: 'resourceId',
        type: 'string',
        default: '',
        required: true,
        description: 'The ID of the resource',
        displayOptions: {
          show: {
            operation: ['getData'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        if (operation === 'getData') {
          const resourceId = this.getNodeParameter('resourceId', i) as string;

          // API 호출 로직
          const credentials = await this.getCredentials('myCustomNodeApi');
          const apiUrl = credentials.url as string;
          const apiKey = credentials.apiKey as string;

          const response = await this.helpers.request({
            method: 'GET',
            url: `${apiUrl}/resource/${resourceId}`,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
            json: true,
          });

          returnData.push({
            json: response,
            pairedItem: i,
          });
        } else if (operation === 'sendData') {
          // Send data logic
          const data = items[i].json;

          const response = await this.helpers.request({
            method: 'POST',
            url: '...',
            body: data,
            json: true,
          });

          returnData.push({
            json: response,
            pairedItem: i,
          });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
            pairedItem: i,
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
```

### 자격 증명 정의

`credentials/MyCustomNodeApi.credentials.ts`:

```typescript
import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class MyCustomNodeApi implements ICredentialType {
  name = 'myCustomNodeApi';
  displayName = 'My Custom Node API';
  documentationUrl = 'https://docs.example.com';
  properties: INodeProperties[] = [
    {
      displayName: 'API URL',
      name: 'url',
      type: 'string',
      default: 'https://api.example.com',
      required: true,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.url}}',
      url: '/health',
    },
  };
}
```

## 고급 기능

### 동적 파라미터 로딩

```typescript
{
  displayName: 'Project',
  name: 'projectId',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getProjects',
  },
  default: '',
  required: true,
  description: 'Select a project',
}

// 노드 클래스에 메서드 추가
methods = {
  loadOptions: {
    async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
      const credentials = await this.getCredentials('myCustomNodeApi');

      const response = await this.helpers.request({
        method: 'GET',
        url: `${credentials.url}/projects`,
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
        },
        json: true,
      });

      return response.projects.map((project: any) => ({
        name: project.name,
        value: project.id,
      }));
    },
  },
};
```

### 다중 출력

```typescript
description: INodeTypeDescription = {
  // ...
  outputs: ['main', 'error'],
  outputNames: ['success', 'error'],
};

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const successItems: INodeExecutionData[] = [];
  const errorItems: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      // Process item
      successItems.push({ json: result, pairedItem: i });
    } catch (error) {
      errorItems.push({
        json: {
          error: error.message,
          originalData: items[i].json,
        },
        pairedItem: i,
      });
    }
  }

  return [successItems, errorItems];
}
```

### Webhook 노드

```typescript
export class MyWebhookNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Webhook',
    name: 'myWebhook',
    group: ['trigger'],
    version: 1,
    description: 'Receives webhook data',
    defaults: {
      name: 'My Webhook',
    },
    inputs: [],
    outputs: ['main'],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'my-webhook',
      },
    ],
    properties: [
      {
        displayName: 'Path',
        name: 'path',
        type: 'string',
        default: 'my-webhook',
        required: true,
        description: 'The URL path for this webhook',
      },
    ],
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = this.getBodyData();
    const headerData = this.getHeaderData();
    const queryData = this.getQueryData();

    // 데이터 검증
    if (!bodyData.userId) {
      return {
        webhookResponse: {
          status: 400,
          body: { error: 'userId is required' },
        },
      };
    }

    // 데이터 처리
    const processedData = {
      ...bodyData,
      headers: headerData,
      query: queryData,
      receivedAt: new Date().toISOString(),
    };

    return {
      workflowData: [[{ json: processedData }]],
    };
  }
}
```

### Polling Trigger 노드

```typescript
export class MyPollingTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Polling Trigger',
    name: 'myPollingTrigger',
    icon: 'file:icon.svg',
    group: ['trigger'],
    version: 1,
    description: 'Polls for new data',
    defaults: {
      name: 'My Polling Trigger',
    },
    inputs: [],
    outputs: ['main'],
    polling: true,
    properties: [
      {
        displayName: 'Trigger On',
        name: 'triggerOn',
        type: 'options',
        options: [
          {
            name: 'New Items',
            value: 'newItems',
          },
          {
            name: 'Updated Items',
            value: 'updatedItems',
          },
        ],
        default: 'newItems',
      },
    ],
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const triggerOn = this.getNodeParameter('triggerOn') as string;
    const credentials = await this.getCredentials('myCustomNodeApi');

    // 마지막 폴링 시간 가져오기
    const workflowStaticData = this.getWorkflowStaticData('node');
    const lastPollTime = workflowStaticData.lastPollTime as number || 0;

    // API에서 새 데이터 가져오기
    const response = await this.helpers.request({
      method: 'GET',
      url: `${credentials.url}/items`,
      qs: {
        since: lastPollTime,
        type: triggerOn,
      },
      json: true,
    });

    // 현재 시간 저장
    workflowStaticData.lastPollTime = Date.now();

    // 새 데이터가 없으면 null 반환
    if (!response.items || response.items.length === 0) {
      return null;
    }

    // 새 데이터 반환
    return [
      response.items.map((item: any) => ({
        json: item,
      })),
    ];
  }
}
```

## 노드 테스트

### Unit 테스트

`nodes/MyCustomNode/MyCustomNode.node.test.ts`:

```typescript
import { IExecuteFunctions } from 'n8n-workflow';
import { MyCustomNode } from './MyCustomNode.node';

describe('MyCustomNode', () => {
  let node: MyCustomNode;
  let mockExecuteFunctions: IExecuteFunctions;

  beforeEach(() => {
    node = new MyCustomNode();

    mockExecuteFunctions = {
      getInputData: jest.fn(() => [
        {
          json: {
            id: '123',
            name: 'Test Item',
          },
        },
      ]),
      getNodeParameter: jest.fn((parameterName: string) => {
        if (parameterName === 'operation') return 'getData';
        if (parameterName === 'resourceId') return '123';
        return '';
      }),
      getCredentials: jest.fn(async () => ({
        url: 'https://api.example.com',
        apiKey: 'test-api-key',
      })),
      helpers: {
        request: jest.fn(async () => ({
          id: '123',
          name: 'Test Item',
          data: 'Test data',
        })),
      },
      continueOnFail: jest.fn(() => false),
    } as unknown as IExecuteFunctions;
  });

  test('should fetch data successfully', async () => {
    const result = await node.execute.call(mockExecuteFunctions);

    expect(result[0]).toHaveLength(1);
    expect(result[0][0].json).toHaveProperty('id', '123');
    expect(result[0][0].json).toHaveProperty('name', 'Test Item');
  });

  test('should handle errors', async () => {
    (mockExecuteFunctions.helpers.request as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
      'API Error'
    );
  });
});
```

## 노드 패키징 및 배포

### package.json 설정

```json
{
  "name": "n8n-nodes-mycustom",
  "version": "1.0.0",
  "description": "My custom n8n nodes",
  "license": "MIT",
  "homepage": "https://github.com/username/n8n-nodes-mycustom",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/username/n8n-nodes-mycustom.git"
  },
  "main": "index.js",
  "scripts": {
    "build": "tsc && gulp build:icons",
    "dev": "tsc --watch",
    "format": "prettier nodes credentials --write",
    "lint": "eslint nodes credentials",
    "lintfix": "eslint nodes credentials --fix",
    "prepublishOnly": "npm run build"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/MyCustomNodeApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/MyCustomNode/MyCustomNode.node.js"
    ]
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "gulp": "^4.0.2",
    "n8n-workflow": "^1.0.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "n8n-workflow": "*"
  }
}
```

### 빌드 및 퍼블리시

```bash
# 빌드
npm run build

# npm에 퍼블리시
npm publish

# 또는 private registry에 퍼블리시
npm publish --registry=https://npm.yourcompany.com
```

### Docker n8n에 설치

```yaml
# docker-compose.yml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    environment:
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
    volumes:
      - ./custom-nodes:/home/node/.n8n/custom
```

```bash
# 커스텀 노드 설치
cd custom-nodes
npm install n8n-nodes-mycustom
```

## 베스트 프랙티스

### 1. 에러 처리

```typescript
try {
  const response = await this.helpers.request(options);
  return response;
} catch (error) {
  if (error.statusCode === 404) {
    throw new Error(`Resource not found: ${resourceId}`);
  } else if (error.statusCode === 401) {
    throw new Error('Invalid credentials');
  } else {
    throw new Error(`API Error: ${error.message}`);
  }
}
```

### 2. 재시도 로직

```typescript
async retryRequest(
  this: IExecuteFunctions,
  options: IRequestOptions,
  maxRetries = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.helpers.request(options);
    } catch (error) {
      if (attempt === maxRetries || error.statusCode < 500) {
        throw error;
      }

      // 지수 백오프
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 3. 페이지네이션 처리

```typescript
async getAllItems(
  this: IExecuteFunctions,
  endpoint: string
): Promise<any[]> {
  const items: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await this.helpers.request({
      method: 'GET',
      url: endpoint,
      qs: {
        page,
        limit: 100,
      },
      json: true,
    });

    items.push(...response.data);

    hasMore = response.data.length === 100;
    page++;
  }

  return items;
}
```

### 4. 데이터 검증

```typescript
function validateInput(data: any): void {
  if (!data.email || typeof data.email !== 'string') {
    throw new Error('Email is required and must be a string');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error('Invalid email format');
  }

  if (!data.age || typeof data.age !== 'number' || data.age < 0) {
    throw new Error('Age must be a positive number');
  }
}
```

## 다음 단계

1. [성능 최적화](./performance-optimization) - 노드 성능 튜닝
2. [베스트 프랙티스](./best-practices) - 커스텀 노드 권장 사항
3. [개발자 가이드](/developers/architecture) - 전체 아키텍처 이해

## 참고 자료

- [n8n 노드 개발 가이드](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [n8n GitHub](https://github.com/n8n-io/n8n)
- [TypeScript 문서](https://www.typescriptlang.org/docs/)
