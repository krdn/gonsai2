# n8n Workflow JSON 구조 가이드

이 문서는 n8n API의 `GET /workflows/{id}` 응답 JSON 구조를 분석하여 Frontend UI 개발에 활용할 수 있도록 정리한 가이드입니다.

## 📋 목차

1. [최상위 구조](#최상위-구조)
2. [노드(Nodes) 구조](#노드nodes-구조)
3. [연결(Connections) 구조](#연결connections-구조)
4. [Sticky Note에서 설명 추출](#sticky-note에서-설명-추출)
5. [Frontend UI 활용 가이드](#frontend-ui-활용-가이드)
6. [TypeScript 타입 정의](#typescript-타입-정의)

---

## 최상위 구조

```typescript
interface WorkflowResponse {
  // 기본 메타데이터
  id: string; // 워크플로우 고유 ID (예: "d4TxgdnhEc1IKaEG")
  name: string; // 워크플로우 이름 (예: "학습 방법 생성")
  description: string | null; // 워크플로우 설명 (보통 null, Sticky Note 활용)
  active: boolean; // 활성화 상태
  isArchived: boolean; // 보관 여부

  // 타임스탬프
  createdAt: string; // 생성일 (ISO 8601)
  updatedAt: string; // 수정일 (ISO 8601)

  // 핵심 데이터
  nodes: Node[]; // 노드 배열
  connections: Connections; // 노드 간 연결 정보

  // 부가 정보
  settings: WorkflowSettings;
  staticData: any | null;
  meta: WorkflowMeta;
  versionId: string;
  versionCounter: number;
  triggerCount: number;

  // 공유 및 태그
  shared: SharedInfo[];
  tags: Tag[];
}
```

### 주요 필드 용도

| 필드        | Frontend 활용                          |
| ----------- | -------------------------------------- |
| `name`      | 워크플로우 목록 표시, 상세 페이지 제목 |
| `active`    | 활성/비활성 상태 표시 배지             |
| `updatedAt` | "마지막 수정" 표시                     |
| `nodes`     | 워크플로우 구조 시각화, 설명 추출      |
| `tags`      | 태그 필터링, 분류 표시                 |

---

## 노드(Nodes) 구조

### 기본 노드 구조

```typescript
interface Node {
  id: string; // 노드 고유 ID
  name: string; // 노드 표시 이름
  type: string; // 노드 타입 (중요!)
  typeVersion: number; // 노드 타입 버전
  position: [number, number]; // 캔버스 위치 [x, y]
  parameters: NodeParameters; // 노드별 파라미터
  credentials?: NodeCredentials; // 인증 정보 (선택적)
  disabled?: boolean; // 비활성화 여부
  notes?: string; // 노드 메모
  webhookId?: string; // 웹훅 노드의 경우 웹훅 ID
}
```

### 주요 노드 타입

#### 1. Trigger 노드 (입력)

```typescript
// Webhook 트리거
{
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "httpMethod": "POST",
    "path": "knowledge",
    "responseMode": "responseNode"
  }
}

// Form 트리거
{
  "type": "n8n-nodes-base.formTrigger",
  "parameters": {
    "formTitle": "$InputForm",
    "formDescription": "설명...",
    "formFields": { "values": [...] }
  }
}
```

#### 2. AI/LLM 노드

```typescript
// Google Gemini
{
  "type": "@n8n/n8n-nodes-langchain.googleGemini",
  "parameters": {
    "modelId": { "value": "={{ $json.body.aimodel }}" },
    "messages": { "values": [...] }
  }
}

// OpenRouter LLM
{
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
  "parameters": {
    "model": "moonshotai/kimi-k2:free"
  }
}

// Basic LLM Chain
{
  "type": "@n8n/n8n-nodes-langchain.chainLlm",
  "parameters": {
    "promptType": "define",
    "text": "...",
    "messages": { "messageValues": [...] }
  }
}
```

#### 3. 로직 노드

```typescript
// Switch (조건 분기)
{
  "type": "n8n-nodes-base.switch",
  "parameters": {
    "rules": {
      "values": [
        {
          "conditions": {
            "conditions": [
              {
                "leftValue": "={{ $json.body.aimodel }}",
                "rightValue": "models/gemini",
                "operator": { "type": "string", "operation": "contains" }
              }
            ]
          }
        }
      ]
    }
  }
}
```

#### 4. 출력 노드

```typescript
// Gmail 전송
{
  "type": "n8n-nodes-base.gmail",
  "parameters": {
    "sendTo": "={{ $('Webhook').item.json.body.email }}",
    "subject": "={{ $('Webhook').item.json.body.title }}",
    "message": "={{ $json.data }}"
  }
}

// Webhook 응답
{
  "type": "n8n-nodes-base.respondToWebhook",
  "parameters": {
    "respondWith": "text",
    "responseBody": "={{ $json.data }}"
  }
}
```

#### 5. 변환 노드

```typescript
// Markdown 변환
{
  "type": "n8n-nodes-base.markdown",
  "parameters": {
    "mode": "markdownToHtml",
    "markdown": "={{ $json.content.parts[0].text }}"
  }
}

// Crypto (해시)
{
  "type": "n8n-nodes-base.crypto",
  "parameters": {
    "value": "={{ $json.body['내가배우고싶은것'] }}",
    "dataPropertyName": "hash"
  }
}
```

#### 6. ⭐ Sticky Note (설명 노드)

```typescript
{
  "type": "n8n-nodes-base.stickyNote",
  "parameters": {
    "content": "## 학습 방법 생성\n### 설명\n학습할 주제...\n\n### 상세내역\n- 제목, 상세 내역\n- AI Model\n- 학습 시간\n",
    "height": 272,
    "width": 528
  }
}
```

---

## 연결(Connections) 구조

노드 간의 데이터 흐름을 정의합니다.

```typescript
interface Connections {
  [sourceNodeName: string]: {
    main?: Connection[][]; // 일반 데이터 연결
    ai_languageModel?: Connection[][]; // AI 모델 연결
  };
}

interface Connection {
  node: string; // 대상 노드 이름
  type: string; // 연결 타입 ("main", "ai_languageModel")
  index: number; // 입력 포트 인덱스
}
```

### 연결 예시

```json
{
  "Webhook": {
    "main": [[{ "node": "Crypto", "type": "main", "index": 0 }]]
  },
  "Switch": {
    "main": [
      [{ "node": "Message a model", "type": "main", "index": 0 }],
      [],
      [{ "node": "Basic LLM Chain", "type": "main", "index": 0 }]
    ]
  },
  "OpenRouter Chat Model1": {
    "ai_languageModel": [[{ "node": "Basic LLM Chain", "type": "ai_languageModel", "index": 0 }]]
  }
}
```

### 연결 해석

- **단일 출력**: `[[connection]]` - 하나의 출력 → 하나의 대상
- **다중 분기**: `[[conn1], [], [conn2]]` - Switch의 경우 조건별 분기
- **AI 연결**: `ai_languageModel` - LLM 노드와 Chain 노드 연결

---

## Sticky Note에서 설명 추출

### 추출 알고리즘

```typescript
interface WorkflowDescription {
  title: string; // ## 이후 텍스트
  description: string; // ### 설명 섹션 내용
  details: string[]; // ### 상세내역 섹션 항목들
}

function extractDescriptionFromStickyNote(workflow: WorkflowResponse): WorkflowDescription | null {
  // 1. stickyNote 타입 노드 찾기
  const stickyNote = workflow.nodes.find((node) => node.type === 'n8n-nodes-base.stickyNote');

  if (!stickyNote || !stickyNote.parameters.content) {
    return null;
  }

  const content = stickyNote.parameters.content;

  // 2. Markdown 파싱
  const result: WorkflowDescription = {
    title: '',
    description: '',
    details: [],
  };

  // ## 제목 추출
  const titleMatch = content.match(/^##\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // ### 설명 섹션 추출
  const descMatch = content.match(/###\s+설명\s*\n([\s\S]*?)(?=###|$)/);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // ### 상세내역 섹션 추출
  const detailMatch = content.match(/###\s+상세내역\s*\n([\s\S]*?)(?=###|$)/);
  if (detailMatch) {
    result.details = detailMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());
  }

  return result;
}
```

### 실제 예시

**입력 (Sticky Note content)**:

```markdown
## 학습 방법 생성

### 설명

학습할 주제, 상세 내역 등록하면 선택된 AI Model을 통해 체계적인 학습 시나리오를 생성하여 제공한다.

### 상세내역

- 제목, 상세 내역
- AI Model
- 학습 시간
```

**출력**:

```json
{
  "title": "학습 방법 생성",
  "description": "학습할 주제, 상세 내역 등록하면 선택된 AI Model을 통해 체계적인 학습 시나리오를 생성하여 제공한다.",
  "details": ["제목, 상세 내역", "AI Model", "학습 시간"]
}
```

---

## Frontend UI 활용 가이드

### 워크플로우 목록 페이지

```typescript
// 워크플로우 카드에 표시할 정보 추출
interface WorkflowCard {
  id: string;
  name: string;
  description: string; // Sticky Note에서 추출
  isActive: boolean;
  lastUpdated: string;
  tags: string[];
  nodeCount: number;
  triggerType: string; // webhook, form 등
}

function mapToWorkflowCard(workflow: WorkflowResponse): WorkflowCard {
  const stickyContent = extractDescriptionFromStickyNote(workflow);
  const triggerNode = workflow.nodes.find(
    (n) => n.type.includes('webhook') || n.type.includes('formTrigger')
  );

  return {
    id: workflow.id,
    name: workflow.name,
    description: stickyContent?.description || '설명 없음',
    isActive: workflow.active,
    lastUpdated: workflow.updatedAt,
    tags: workflow.tags.map((t) => t.name),
    nodeCount: workflow.nodes.length,
    triggerType: triggerNode?.type.split('.').pop() || 'unknown',
  };
}
```

### 워크플로우 상세 페이지

```typescript
// 상세 페이지에 표시할 정보
interface WorkflowDetail {
  // 기본 정보
  id: string;
  name: string;

  // Sticky Note 기반 설명
  title: string;
  description: string;
  details: string[];

  // 노드 분석
  aiModels: string[]; // 사용된 AI 모델
  inputFields: FormField[]; // Form 입력 필드
  outputs: string[]; // 출력 타입 (email, webhook 등)

  // 메타데이터
  createdAt: string;
  updatedAt: string;
  tags: string[];
  version: number;
}

// AI 모델 추출
function extractAIModels(nodes: Node[]): string[] {
  return nodes
    .filter((n) => n.type.includes('langchain') || n.type.includes('gemini'))
    .map((n) => {
      if (n.parameters.model) return n.parameters.model;
      if (n.parameters.modelId?.value) return n.parameters.modelId.value;
      return n.type.split('.').pop();
    });
}

// Form 필드 추출
function extractFormFields(nodes: Node[]): FormField[] {
  const formTrigger = nodes.find((n) => n.type === 'n8n-nodes-base.formTrigger');
  if (!formTrigger) return [];

  return formTrigger.parameters.formFields.values.map((field) => ({
    label: field.fieldLabel,
    type: field.fieldType || 'text',
    placeholder: field.placeholder,
    required: field.requiredField,
    options: field.fieldOptions?.values?.map((v) => v.option),
  }));
}
```

### UI 컴포넌트 예시

```tsx
// WorkflowCard.tsx
export function WorkflowCard({ workflow }: { workflow: WorkflowCard }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>{workflow.name}</h3>
        <Badge variant={workflow.isActive ? 'success' : 'secondary'}>
          {workflow.isActive ? '활성' : '비활성'}
        </Badge>
      </div>

      <p className="description">{workflow.description}</p>

      <div className="meta">
        <span>노드 {workflow.nodeCount}개</span>
        <span>트리거: {workflow.triggerType}</span>
        <span>수정: {formatDate(workflow.lastUpdated)}</span>
      </div>

      <div className="tags">
        {workflow.tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
    </div>
  );
}

// WorkflowDetail.tsx
export function WorkflowDetail({ detail }: { detail: WorkflowDetail }) {
  return (
    <div className="workflow-detail">
      <h1>{detail.title || detail.name}</h1>

      <section className="description">
        <h2>설명</h2>
        <p>{detail.description}</p>
      </section>

      {detail.details.length > 0 && (
        <section className="details">
          <h2>상세내역</h2>
          <ul>
            {detail.details.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="ai-models">
        <h2>사용 AI 모델</h2>
        {detail.aiModels.map((model) => (
          <Badge key={model}>{model}</Badge>
        ))}
      </section>
    </div>
  );
}
```

---

## TypeScript 타입 정의

전체 타입 정의는 `types.ts` 파일을 참조하세요. 주요 타입:

```typescript
// features/n8n-integration/types.ts 에 추가할 타입들

export interface StickyNoteContent {
  title: string;
  description: string;
  details: string[];
}

export interface WorkflowUIData {
  id: string;
  name: string;
  stickyNote: StickyNoteContent | null;
  isActive: boolean;
  updatedAt: string;
  tags: string[];

  // 노드 분석 결과
  analysis: {
    nodeCount: number;
    triggerType: string;
    aiModels: string[];
    hasFormInput: boolean;
    outputTypes: string[];
  };
}

export interface FormFieldInfo {
  label: string;
  type: 'text' | 'textarea' | 'dropdown' | 'number';
  placeholder?: string;
  required: boolean;
  options?: string[];
}
```

---

## 참고 사항

### 노드 타입 패턴

- **기본 노드**: `n8n-nodes-base.<nodeName>`
- **AI/LangChain 노드**: `@n8n/n8n-nodes-langchain.<nodeName>`
- **커뮤니티 노드**: `n8n-nodes-<community>.<nodeName>`

### Expression 문법

n8n은 자체 표현식 문법을 사용합니다:

- `={{ expression }}` - JavaScript 표현식
- `$json` - 현재 아이템의 JSON 데이터
- `$('NodeName').item.json` - 특정 노드의 출력 참조

### 버전 관리

- `versionId`: 워크플로우 특정 버전의 고유 ID
- `versionCounter`: 총 수정 횟수 (401번 = 401번 저장됨)

---

## 관련 파일

- **예시 JSON**: `examples/learning-method-generator.json`
- **타입 정의**: `types.ts`
- **API 클라이언트**: `api-client.ts`

---

## 업데이트 이력

- **2025-11-24**: 초기 문서 작성 (Issue #83 기반)
