# .ai/ - AI Context Directory

> **Purpose**: Provide structured, machine-readable context for AI-assisted development

이 디렉토리는 Kent Beck의 Augmented Coding 원칙에 따라 AI(Claude Code 등)가 프로젝트를 이해하고 효과적으로 작업할 수 있도록 설계되었습니다.

## 📂 디렉토리 구조

```
.ai/
├── context-map.json        # n8n 워크플로우 컨텍스트 맵
├── error-patterns.json      # 오류 패턴 지식 베이스
├── n8n-templates/           # 재사용 가능한 워크플로우 템플릿
├── workflow-docs/           # 워크플로우별 상세 문서
└── README.md               # 이 파일
```

## 🎯 각 파일의 역할

### context-map.json

**목적**: n8n 워크플로우의 구조, 의존성, 실행 패턴을 AI가 이해할 수 있도록 구조화

**사용 시나리오**:

- 워크플로우 수정 전 의존성 확인
- 새로운 워크플로우 설계 시 패턴 참조
- 오류 발생 시 컨텍스트 파악

**주요 정보**:

- 워크플로우 입출력 스키마
- 노드 간 데이터 흐름
- 외부 서비스 의존성
- 실행 메트릭 및 성공률

**AI 활용 예시**:

```typescript
// AI가 context-map.json을 읽고 자동으로 생성한 타입
interface WorkflowInput {
  userId: string;
  action: string;
  timestamp?: string;
}

interface WorkflowOutput {
  success: boolean;
  recordId?: string;
  message: string;
}
```

### error-patterns.json

**목적**: 발생 가능한 오류를 분류하고 자동 치유(auto-healing) 전략 제공

**사용 시나리오**:

- 오류 발생 시 자동 진단
- 알려진 오류에 대한 자동 복구
- 새로운 오류 패턴 학습

**주요 정보**:

- 오류 시그니처 (정규표현식)
- 심각도 및 영향도
- 진단 단계
- 자동 치유 액션
- 수동 해결 가이드

**AI 활용 예시**:

```typescript
// AI가 error-patterns.json을 기반으로 자동 치유 시도
async function autoHealError(error: Error) {
  const pattern = findMatchingPattern(error.message);

  if (pattern.autoHealingActions.length > 0) {
    for (const action of pattern.autoHealingActions) {
      if (!action.requiresApproval) {
        await executeHealingAction(action);
        return;
      }
    }
  }

  // 자동 치유 불가능 - 수동 해결 가이드 제공
  return pattern.manualResolution;
}
```

### n8n-templates/

**목적**: 검증된 워크플로우 템플릿을 JSON 형식으로 저장

**파일 구조**:

```
n8n-templates/
├── webhook-to-mongodb.json      # 웹훅 → MongoDB 저장
├── scheduled-data-sync.json     # 스케줄 기반 데이터 동기화
├── error-notification.json      # 오류 알림 워크플로우
└── ai-agent-executor.json       # AI Agent 실행 워크플로우
```

**템플릿 사용법**:

1. n8n UI에서 Import Workflow
2. 환경 변수 및 자격증명 설정
3. 활성화 및 테스트

**AI 활용**:

- 유사한 요구사항에 대한 템플릿 추천
- 템플릿 기반 커스터마이징

### workflow-docs/

**목적**: 각 워크플로우의 상세 문서 (Markdown 형식)

**파일 명명 규칙**: `{workflow-id}.md`

**문서 구조**:

```markdown
# Workflow Name

## 개요

워크플로우의 목적과 사용 사례

## 트리거

언제, 어떻게 실행되는가

## 데이터 흐름

입력 → 처리 → 출력 과정 설명

## 의존성

- 외부 서비스
- 다른 워크플로우

## 오류 처리

예상되는 오류와 대응 방법

## 테스트

테스트 방법과 샘플 데이터

## 수정 이력

변경 사항 기록
```

## 🤖 AI 협업 패턴

### 1. 컨텍스트 우선 읽기

AI가 작업을 시작하기 전:

```bash
# AI가 자동으로 실행할 명령
cat .ai/context-map.json | jq '.workflows["target-workflow-id"]'
```

### 2. 오류 자동 진단

```typescript
// features/error-healing/n8n-error-analyzer.ts에서 사용
import errorPatterns from '../../.ai/error-patterns.json';

function diagnoseError(error: Error): DiagnosisResult {
  for (const category in errorPatterns.errorCategories) {
    for (const pattern of errorPatterns.errorCategories[category].patterns) {
      if (new RegExp(pattern.signature).test(error.message)) {
        return {
          patternId: pattern.id,
          severity: pattern.severity,
          diagnosticSteps: pattern.diagnosticSteps,
          autoHealable: pattern.autoHealingActions.length > 0,
        };
      }
    }
  }
  return { patternId: 'unknown', severity: 'unknown', autoHealable: false };
}
```

### 3. 템플릿 기반 생성

```typescript
// AI가 n8n-templates/를 참조하여 새 워크플로우 생성
async function createWorkflowFromTemplate(
  templateName: string,
  customization: WorkflowCustomization
): Promise<Workflow> {
  const template = await loadTemplate(templateName);
  const customized = applyCustomization(template, customization);
  return await n8nClient.workflows.create(customized);
}
```

## 📊 유지보수 가이드

### 컨텍스트 맵 업데이트

**언제**: 새 워크플로우 추가 또는 기존 워크플로우 수정 시

```bash
# 자동 업데이트 스크립트 (향후 구현)
npm run ai:update-context

# 수동 업데이트
# 1. .ai/context-map.json 편집
# 2. 스키마 검증: npm run ai:validate-context
# 3. Git 커밋
```

### 오류 패턴 추가

**언제**: 새로운 오류 발견 시

```bash
# 1. .ai/error-patterns.json에 패턴 추가
# 2. 자동 치유 액션 구현 (features/error-healing/)
# 3. 테스트: npm run test:error-healing
# 4. Git 커밋
```

### 템플릿 추가

**언제**: 재사용 가능한 워크플로우 검증 완료 시

```bash
# 1. n8n UI에서 워크플로우 Export (JSON)
# 2. .ai/n8n-templates/에 저장
# 3. 민감 정보 제거 (API 키, 비밀번호 등)
# 4. README에 템플릿 사용법 추가
# 5. Git 커밋
```

## 🔒 보안 고려사항

### 민감 정보 제외

**절대 포함하지 말 것**:

- ❌ API 키
- ❌ 비밀번호
- ❌ 개인 식별 정보 (PII)
- ❌ 프로덕션 데이터

**대신 사용**:

- ✅ 환경 변수 참조 (`${N8N_API_KEY}`)
- ✅ 샘플 데이터
- ✅ 구조적 정보만 포함

### Git 커밋 전 검증

```bash
# 민감 정보 검사
git diff --cached | grep -E '(password|api[_-]?key|secret|token).*[:=].*["\']'

# 결과가 있으면 커밋 중단하고 수정
```

## 📈 메트릭 및 개선

### AI 활용 효과 측정

**추적할 메트릭**:

- 자동 치유 성공률
- 오류 진단 정확도
- 컨텍스트 맵 참조 빈도
- AI 생성 코드의 정확도

### 지속적 개선

```bash
# 월간 리뷰 체크리스트
- [ ] context-map.json 정확성 검증
- [ ] 새로운 오류 패턴 추가
- [ ] 사용되지 않는 템플릿 정리
- [ ] 문서 업데이트
- [ ] AI 협업 패턴 개선 사항 반영
```

## 🎓 Best Practices

### 1. 명확한 의도 표현

```json
// ❌ Bad: AI가 이해하기 어려움
{
  "w1": { "n": "proc" }
}

// ✅ Good: 명확한 의도
{
  "workflow-data-processor": {
    "name": "Data Processing Workflow",
    "purpose": "Validates and stores incoming webhook data"
  }
}
```

### 2. 구조화된 정보

```json
// ✅ AI가 쉽게 파싱할 수 있는 구조
{
  "inputs": {
    "schema": { "type": "object", "properties": {...} }
  },
  "outputs": {
    "schema": { "type": "object", "properties": {...} }
  }
}
```

### 3. 실행 가능한 진단 단계

```json
// ✅ AI가 자동으로 실행할 수 있는 명령
{
  "diagnosticSteps": ["docker ps | grep mongodb", "docker logs my-mongodb-container --tail 50"]
}
```

---

**Built for AI-Human Collaboration** 🤖🤝👨‍💻

이 디렉토리는 AI가 프로젝트를 깊이 이해하고 효과적으로 기여할 수 있도록 설계되었습니다.
