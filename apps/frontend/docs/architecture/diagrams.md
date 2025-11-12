# Architecture Diagrams

이 페이지는 시스템의 주요 아키텍처 다이어그램을 제공합니다. 각 다이어그램은 시스템의 다른 측면을 시각화합니다.

## 목차

- [전체 시스템 아키텍처](#전체-시스템-아키텍처)
- [애플리케이션 레이어](#애플리케이션-레이어)
- [n8n 통합 아키텍처](#n8n-통합-아키텍처)
- [데이터 흐름](#데이터-흐름)
- [인증 흐름](#인증-흐름)
- [실시간 업데이트](#실시간-업데이트)
- [캐싱 전략](#캐싱-전략)
- [배포 아키텍처](#배포-아키텍처)

---

## 전체 시스템 아키텍처

전체 시스템의 high-level 아키텍처를 보여줍니다.

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
    end

    subgraph "CDN & Edge"
        CDN[Cloudflare CDN]
        Edge[Edge Functions]
    end

    subgraph "Frontend (Next.js 15)"
        NextApp[Next.js App]
        SSR[Server-Side Rendering]
        API[API Routes]
        WS[WebSocket Server]
    end

    subgraph "Backend Services"
        N8N[n8n Server]
        Workers[n8n Workers]
        Queue[Bull Queue<br/>Redis]
    end

    subgraph "Databases"
        MongoDB[(MongoDB)]
        RedisCache[(Redis Cache)]
        Postgres[(PostgreSQL<br/>n8n DB)]
    end

    subgraph "Monitoring"
        Prometheus[Prometheus]
        Grafana[Grafana]
        Logs[Winston Logs]
    end

    Browser --> CDN
    CDN --> Edge
    Edge --> NextApp
    NextApp --> SSR
    NextApp --> API
    NextApp --> WS

    API --> N8N
    API --> MongoDB
    API --> RedisCache

    WS --> RedisCache

    N8N --> Queue
    N8N --> Postgres
    Queue --> Workers
    Workers --> MongoDB

    NextApp --> Prometheus
    N8N --> Prometheus
    Prometheus --> Grafana
    NextApp --> Logs

    style Browser fill:#e3f2fd
    style NextApp fill:#fff3e0
    style N8N fill:#f3e5f5
    style MongoDB fill:#e8f5e9
    style Prometheus fill:#fce4ec
```

---

## 애플리케이션 레이어

Next.js 애플리케이션의 계층 구조를 보여줍니다.

```mermaid
graph TB
    subgraph "Presentation Layer"
        Pages[Pages<br/>App Router]
        Components[React Components]
        UI[UI Components<br/>Atomic Design]
    end

    subgraph "Business Logic Layer"
        Hooks[Custom Hooks]
        Services[Service Layer]
        Utils[Utility Functions]
    end

    subgraph "Data Access Layer"
        N8nClient[N8nApiClient]
        MongoClient[MongoDB Client]
        RedisClient[Redis Client]
    end

    subgraph "External Services"
        N8nAPI[n8n API]
        Database[(MongoDB)]
        Cache[(Redis)]
    end

    Pages --> Components
    Components --> UI
    Components --> Hooks
    Hooks --> Services
    Services --> Utils
    Services --> N8nClient
    Services --> MongoClient
    Services --> RedisClient

    N8nClient --> N8nAPI
    MongoClient --> Database
    RedisClient --> Cache

    style Pages fill:#e3f2fd
    style Hooks fill:#fff3e0
    style N8nClient fill:#f3e5f5
    style N8nAPI fill:#e8f5e9
```

---

## n8n 통합 아키텍처

n8n과의 통합 구조를 상세히 보여줍니다.

```mermaid
graph LR
    subgraph "Frontend Application"
        UI[React UI]
        QueryHooks[React Query Hooks]
        N8nClient[N8nApiClient]
    end

    subgraph "n8n Server"
        API[REST API]
        WebhookHandler[Webhook Handler]
        WorkflowEngine[Workflow Engine]
    end

    subgraph "Queue System"
        Queue[Bull Queue]
        Workers[Worker Pool]
    end

    subgraph "Storage"
        Postgres[(PostgreSQL)]
        Files[/File Storage/]
    end

    UI --> QueryHooks
    QueryHooks --> N8nClient
    N8nClient --> |HTTP/REST| API

    API --> WorkflowEngine
    API --> WebhookHandler

    WorkflowEngine --> Queue
    Queue --> Workers

    Workers --> Postgres
    WorkflowEngine --> Postgres
    WorkflowEngine --> Files

    style UI fill:#e3f2fd
    style N8nClient fill:#fff3e0
    style API fill:#f3e5f5
    style Queue fill:#e8f5e9
```

---

## 데이터 흐름

워크플로우 실행 데이터의 흐름을 보여줍니다.

### 워크플로우 생성 흐름

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant ReactQuery
    participant N8nClient
    participant N8nAPI
    participant MongoDB

    User->>UI: Create Workflow
    UI->>ReactQuery: useMutation
    ReactQuery->>N8nClient: createWorkflow()
    N8nClient->>N8nAPI: POST /workflows
    N8nAPI-->>N8nClient: Workflow Created
    N8nClient->>MongoDB: Save Metadata
    MongoDB-->>N8nClient: Saved
    N8nClient-->>ReactQuery: Success
    ReactQuery-->>UI: Update Cache
    UI-->>User: Show Success
```

### 워크플로우 실행 흐름

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant N8nClient
    participant N8nAPI
    participant Queue
    participant Worker
    participant MongoDB

    User->>UI: Execute Workflow
    UI->>N8nClient: executeWorkflow(id)
    N8nClient->>N8nAPI: POST /workflows/:id/execute
    N8nAPI->>Queue: Enqueue Execution
    Queue-->>N8nAPI: Execution ID
    N8nAPI-->>N8nClient: Execution Started
    N8nClient-->>UI: Show "Running"

    Queue->>Worker: Dequeue Execution
    Worker->>Worker: Execute Nodes
    Worker->>MongoDB: Save Progress
    Worker->>MongoDB: Save Results
    Worker-->>Queue: Complete

    UI->>N8nClient: Poll Status
    N8nClient->>N8nAPI: GET /executions/:id
    N8nAPI-->>N8nClient: Status Update
    N8nClient-->>UI: Update UI
```

---

## 인증 흐름

JWT 기반 인증 시스템의 흐름입니다.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextAPI
    participant MongoDB
    participant Redis

    User->>Browser: Enter Credentials
    Browser->>NextAPI: POST /api/auth/login
    NextAPI->>MongoDB: Verify User
    MongoDB-->>NextAPI: User Found
    NextAPI->>NextAPI: Generate JWT
    NextAPI->>Redis: Store Refresh Token
    NextAPI-->>Browser: Access + Refresh Tokens
    Browser->>Browser: Store Tokens

    Note over Browser,NextAPI: Authenticated Requests

    Browser->>NextAPI: GET /api/workflows<br/>Authorization: Bearer [token]
    NextAPI->>NextAPI: Verify JWT
    NextAPI->>MongoDB: Fetch Workflows
    MongoDB-->>NextAPI: Workflows
    NextAPI-->>Browser: 200 OK

    Note over Browser,NextAPI: Token Refresh

    Browser->>NextAPI: POST /api/auth/refresh<br/>Refresh Token
    NextAPI->>Redis: Validate Refresh Token
    Redis-->>NextAPI: Valid
    NextAPI->>NextAPI: Generate New Access Token
    NextAPI-->>Browser: New Access Token
```

---

## 실시간 업데이트

WebSocket을 통한 실시간 데이터 동기화입니다.

```mermaid
sequenceDiagram
    participant Browser
    participant WebSocket
    participant Redis PubSub
    participant Worker
    participant MongoDB

    Browser->>WebSocket: Connect
    WebSocket->>Redis PubSub: Subscribe to Channels

    Note over Worker,MongoDB: Execution Progress

    Worker->>MongoDB: Update Execution Status
    Worker->>Redis PubSub: Publish Event
    Redis PubSub->>WebSocket: Forward Event
    WebSocket->>Browser: Send Update
    Browser->>Browser: Update UI

    Note over Browser,WebSocket: Client Initiates Action

    Browser->>WebSocket: Execute Workflow
    WebSocket->>MongoDB: Create Execution
    WebSocket->>Redis PubSub: Publish Start Event
    Redis PubSub->>Browser: Broadcast to All Clients
```

---

## 캐싱 전략

다층 캐싱 시스템의 구조입니다.

```mermaid
graph TB
    subgraph "Client Side"
        ReactQuery[React Query Cache<br/>5분 TTL]
        LocalStorage[LocalStorage<br/>영구 저장]
    end

    subgraph "Server Side"
        L1[L1 Cache<br/>In-Memory LRU<br/>30초 TTL]
        L2[L2 Cache<br/>Redis<br/>5분 TTL]
    end

    subgraph "Data Source"
        N8nAPI[n8n API]
        MongoDB[(MongoDB)]
    end

    ReactQuery -->|Cache Miss| L1
    L1 -->|Cache Miss| L2
    L2 -->|Cache Miss| N8nAPI
    L2 -->|Cache Miss| MongoDB

    N8nAPI -->|Populate| L2
    MongoDB -->|Populate| L2
    L2 -->|Populate| L1
    L1 -->|Populate| ReactQuery

    LocalStorage -.->|Persist| ReactQuery

    style ReactQuery fill:#e3f2fd
    style L1 fill:#fff3e0
    style L2 fill:#f3e5f5
    style N8nAPI fill:#e8f5e9
```

### 캐시 무효화 전략

```mermaid
graph LR
    subgraph "Mutation Triggers"
        Create[Create Workflow]
        Update[Update Workflow]
        Delete[Delete Workflow]
        Execute[Execute Workflow]
    end

    subgraph "Invalidation"
        InvalidateQueries[Invalidate Queries]
        ClearL1[Clear L1 Cache]
        ClearL2[Clear L2 Cache]
    end

    subgraph "Refetch"
        RefetchActive[Refetch Active Queries]
        UpdateUI[Update UI]
    end

    Create --> InvalidateQueries
    Update --> InvalidateQueries
    Delete --> InvalidateQueries
    Execute --> InvalidateQueries

    InvalidateQueries --> ClearL1
    InvalidateQueries --> ClearL2

    ClearL1 --> RefetchActive
    ClearL2 --> RefetchActive

    RefetchActive --> UpdateUI

    style Create fill:#ffcdd2
    style InvalidateQueries fill:#fff3e0
    style RefetchActive fill:#e8f5e9
```

---

## 배포 아키텍처

Kubernetes 기반 배포 구조입니다.

```mermaid
graph TB
    subgraph "Ingress"
        LB[Load Balancer<br/>Nginx Ingress]
        SSL[SSL Termination]
    end

    subgraph "Frontend Pods"
        NextPod1[Next.js Pod 1]
        NextPod2[Next.js Pod 2]
        NextPod3[Next.js Pod 3]
    end

    subgraph "Backend Pods"
        N8nPod1[n8n Pod 1]
        N8nPod2[n8n Pod 2]
        WorkerPod1[Worker Pod 1]
        WorkerPod2[Worker Pod 2]
    end

    subgraph "Stateful Services"
        MongoDB[(MongoDB<br/>StatefulSet)]
        Redis[(Redis<br/>StatefulSet)]
        Postgres[(PostgreSQL<br/>StatefulSet)]
    end

    subgraph "Monitoring"
        Prometheus[Prometheus]
        Grafana[Grafana]
    end

    Internet((Internet))

    Internet --> LB
    LB --> SSL
    SSL --> NextPod1
    SSL --> NextPod2
    SSL --> NextPod3

    NextPod1 --> N8nPod1
    NextPod2 --> N8nPod2
    NextPod3 --> N8nPod1

    N8nPod1 --> Redis
    N8nPod2 --> Redis
    N8nPod1 --> Postgres
    N8nPod2 --> Postgres

    Redis --> WorkerPod1
    Redis --> WorkerPod2

    WorkerPod1 --> MongoDB
    WorkerPod2 --> MongoDB

    NextPod1 --> Prometheus
    N8nPod1 --> Prometheus
    Prometheus --> Grafana

    style Internet fill:#e3f2fd
    style LB fill:#fff3e0
    style NextPod1 fill:#f3e5f5
    style MongoDB fill:#e8f5e9
```

### Horizontal Pod Autoscaling (HPA)

```mermaid
graph LR
    subgraph "Metrics"
        CPU[CPU Usage]
        Memory[Memory Usage]
        Custom[Custom Metrics<br/>Queue Length]
    end

    subgraph "HPA Controller"
        Monitor[Monitor Metrics]
        Decide[Scale Decision]
    end

    subgraph "Scaling Actions"
        ScaleUp[Scale Up<br/>Add Pods]
        ScaleDown[Scale Down<br/>Remove Pods]
        Maintain[Maintain<br/>No Change]
    end

    CPU --> Monitor
    Memory --> Monitor
    Custom --> Monitor

    Monitor --> Decide

    Decide -->|>70% CPU| ScaleUp
    Decide -->|<30% CPU| ScaleDown
    Decide -->|30-70% CPU| Maintain

    ScaleUp --> |Create| Pods[Pod Replicas]
    ScaleDown --> |Delete| Pods
    Maintain --> Pods

    style Monitor fill:#e3f2fd
    style Decide fill:#fff3e0
    style ScaleUp fill:#c8e6c9
    style ScaleDown fill:#ffccbc
```

---

## 에러 처리 흐름

시스템 전반의 에러 처리 패턴입니다.

```mermaid
graph TB
    Error[Error Occurs]

    Error --> Type{Error Type?}

    Type -->|Network Error| Retry[Exponential Backoff Retry]
    Type -->|Validation Error| UserMessage[Show User-Friendly Message]
    Type -->|Auth Error| Redirect[Redirect to Login]
    Type -->|Rate Limit| Wait[Wait for Reset]
    Type -->|Server Error| Log[Log & Report]

    Retry --> Success{Success?}
    Success -->|Yes| Complete[Complete Request]
    Success -->|No| MaxRetries{Max Retries?}
    MaxRetries -->|Yes| Fail[Show Error]
    MaxRetries -->|No| Retry

    UserMessage --> Toast[Toast Notification]
    Redirect --> LoginPage[/login]
    Wait --> Schedule[Schedule Retry]
    Log --> Sentry[Send to Sentry]

    Fail --> Log

    Schedule --> Retry

    style Error fill:#ffcdd2
    style Complete fill:#c8e6c9
    style Sentry fill:#fff3e0
```

---

## 성능 최적화

성능 최적화 전략의 구조입니다.

```mermaid
graph TB
    subgraph "Frontend Optimization"
        CodeSplit[Code Splitting]
        LazyLoad[Lazy Loading]
        ImageOpt[Image Optimization]
        Prefetch[Prefetch/Preload]
    end

    subgraph "API Optimization"
        Batching[Request Batching]
        Debounce[Debouncing]
        Throttle[Throttling]
    end

    subgraph "Caching Strategy"
        Browser[Browser Cache]
        CDN[CDN Cache]
        Server[Server Cache]
    end

    subgraph "Database Optimization"
        Indexes[Compound Indexes]
        ConnectionPool[Connection Pooling]
        QueryOpt[Query Optimization]
    end

    subgraph "Result"
        FasterLoad[Faster Page Load]
        LessRequests[Fewer Requests]
        BetterUX[Better User Experience]
    end

    CodeSplit --> FasterLoad
    LazyLoad --> FasterLoad
    ImageOpt --> FasterLoad
    Prefetch --> FasterLoad

    Batching --> LessRequests
    Debounce --> LessRequests
    Throttle --> LessRequests

    Browser --> BetterUX
    CDN --> BetterUX
    Server --> BetterUX

    Indexes --> BetterUX
    ConnectionPool --> BetterUX
    QueryOpt --> BetterUX

    style FasterLoad fill:#c8e6c9
    style LessRequests fill:#c8e6c9
    style BetterUX fill:#c8e6c9
```

---

## 보안 아키텍처

시스템 보안 계층의 구조입니다.

```mermaid
graph TB
    subgraph "Network Security"
        Firewall[Firewall Rules]
        DDoS[DDoS Protection]
        WAF[Web Application Firewall]
    end

    subgraph "Application Security"
        HTTPS[HTTPS/TLS]
        CORS[CORS Policy]
        CSP[Content Security Policy]
        RateLimit[Rate Limiting]
    end

    subgraph "Authentication & Authorization"
        JWT[JWT Tokens]
        OAuth[OAuth 2.0]
        RBAC[Role-Based Access Control]
    end

    subgraph "Data Security"
        Encryption[AES-256-GCM Encryption]
        Hashing[bcrypt Password Hashing]
        Sanitization[Input Sanitization]
    end

    subgraph "Monitoring"
        AuditLog[Audit Logging]
        SecurityScan[Security Scanning]
        Alerts[Security Alerts]
    end

    Internet((Internet))

    Internet --> Firewall
    Firewall --> DDoS
    DDoS --> WAF
    WAF --> HTTPS

    HTTPS --> CORS
    CORS --> CSP
    CSP --> RateLimit

    RateLimit --> JWT
    JWT --> OAuth
    OAuth --> RBAC

    RBAC --> Encryption
    Encryption --> Hashing
    Hashing --> Sanitization

    Sanitization --> AuditLog
    AuditLog --> SecurityScan
    SecurityScan --> Alerts

    style Internet fill:#e3f2fd
    style WAF fill:#fff3e0
    style JWT fill:#f3e5f5
    style Encryption fill:#e8f5e9
    style Alerts fill:#ffccbc
```

---

## 데이터베이스 스키마

MongoDB 컬렉션 관계도입니다.

```mermaid
erDiagram
    USERS ||--o{ WORKFLOW_METADATA : creates
    USERS ||--o{ API_KEYS : owns
    WORKFLOW_METADATA ||--o{ EXECUTION_HISTORY : executes
    WORKFLOW_METADATA }o--|| N8N_WORKFLOWS : references
    EXECUTION_HISTORY }o--|| N8N_EXECUTIONS : references
    USERS ||--o{ AUDIT_LOGS : generates

    USERS {
        ObjectId _id PK
        string email UK
        string passwordHash
        string name
        string role
        date createdAt
        date updatedAt
    }

    WORKFLOW_METADATA {
        ObjectId _id PK
        ObjectId userId FK
        string n8nWorkflowId UK
        string name
        string description
        array tags
        boolean favorite
        date lastExecutedAt
        int executionCount
        float successRate
        date createdAt
        date updatedAt
    }

    EXECUTION_HISTORY {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId workflowMetadataId FK
        string n8nExecutionId UK
        string status
        date startedAt
        date finishedAt
        int duration
        object error
        date createdAt
    }

    API_KEYS {
        ObjectId _id PK
        ObjectId userId FK
        string key UK
        string name
        array permissions
        date lastUsedAt
        date expiresAt
        date createdAt
    }

    AUDIT_LOGS {
        ObjectId _id PK
        ObjectId userId FK
        string action
        string resource
        object changes
        string ipAddress
        string userAgent
        date timestamp
    }

    N8N_WORKFLOWS {
        string id PK
        string name
        boolean active
        array nodes
        object connections
        date createdAt
    }

    N8N_EXECUTIONS {
        string id PK
        string workflowId FK
        string status
        date startedAt
        date stoppedAt
        object data
    }
```

---

## 배포 파이프라인

CI/CD 파이프라인 구조입니다.

```mermaid
graph LR
    subgraph "Source Control"
        Git[Git Push]
    end

    subgraph "CI Pipeline"
        Lint[Lint & Type Check]
        Test[Run Tests]
        Build[Build Application]
        Security[Security Scan]
    end

    subgraph "CD Pipeline"
        BuildImage[Build Docker Image]
        PushRegistry[Push to Registry]
        Deploy[Deploy to K8s]
    end

    subgraph "Verification"
        HealthCheck[Health Checks]
        SmokeTest[Smoke Tests]
        Monitor[Monitor Metrics]
    end

    Git --> Lint
    Lint --> Test
    Test --> Build
    Build --> Security

    Security -->|Pass| BuildImage
    Security -->|Fail| Alert[Alert Team]

    BuildImage --> PushRegistry
    PushRegistry --> Deploy

    Deploy --> HealthCheck
    HealthCheck --> SmokeTest
    SmokeTest --> Monitor

    Monitor -->|Issues| Rollback[Rollback]
    Monitor -->|Success| Complete[Deployment Complete]

    style Git fill:#e3f2fd
    style Test fill:#fff3e0
    style Deploy fill:#f3e5f5
    style Complete fill:#c8e6c9
    style Alert fill:#ffcdd2
    style Rollback fill:#ffccbc
```

---

## 다음 단계

- [Architecture Documentation](../developers/architecture.md) - 상세한 아키텍처 설명
- [API Documentation](../api/overview.md) - API 레퍼런스
- [Operations Guide](../operations/monitoring.md) - 운영 가이드

---

## 참고 자료

- [Mermaid Documentation](https://mermaid.js.org/)
- [C4 Model](https://c4model.com/)
- [System Design Primer](https://github.com/donnemartin/system-design-primer)
