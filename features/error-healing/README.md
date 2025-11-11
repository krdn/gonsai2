# Error Healing Module

> Automated error diagnosis and healing for n8n workflows

이 모듈은 n8n 워크플로우 오류를 자동으로 진단하고 치유합니다.

## 주요 기능

- **Error Pattern Matching**: .ai/error-patterns.json 기반 오류 인식
- **Automatic Diagnosis**: 오류 원인 자동 분석
- **Auto-Healing**: 안전한 자동 복구 시도
- **Approval Workflow**: 위험한 작업은 승인 필요

## 사용 예시

\`\`\`typescript
import { N8nErrorAnalyzer, WorkflowFixer } from './error-healing';

const analyzer = new N8nErrorAnalyzer();
const fixer = new WorkflowFixer();

try {
  // ... workflow execution
} catch (error) {
  const diagnosis = analyzer.analyze(error as Error);
  
  if (diagnosis.autoHealable) {
    // Attempt automatic fix
    console.log('Attempting auto-healing...');
  } else {
    // Manual intervention required
    console.log('Manual fix required:', diagnosis.recommendations);
  }
}
\`\`\`

## 오류 패턴 추가

새로운 오류 발견 시 `.ai/error-patterns.json`에 추가:

\`\`\`json
{
  "id": "new-error-pattern",
  "signature": "Error.*pattern.*regex",
  "severity": "medium",
  "autoHealingActions": [...]
}
\`\`\`
