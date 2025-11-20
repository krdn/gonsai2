# gonsai2 위키에 오신 것을 환영합니다!

**gonsai2**는 n8n 워크플로우 자동화와 MongoDB를 활용한 AI 기반 프로젝트입니다. Kent Beck의 Augmented Coding 원칙에 따라 AI와 인간 개발자가 효과적으로 협업할 수 있도록 설계되었습니다.

## 📚 문서 목차

이 위키는 다음과 같은 섹션으로 구성되어 있습니다:

### 🚀 [시작하기](Getting-Started)

- **[설치 및 설정](Getting-Started#설치-및-설정)**: 필수 요구 사항 및 설치 방법
- **[환경 변수](Getting-Started#환경-변수-설정)**: `.env` 파일 설정 가이드
- **[데이터베이스 초기화](Getting-Started#데이터베이스-초기화)**: MongoDB 설정

### 📖 [사용자 가이드](User-Guide)

- **[애플리케이션 실행](User-Guide#애플리케이션-실행)**: 개발 및 프로덕션 모드 실행
- **[n8n 워크플로우](User-Guide#n8n-워크플로우)**: 워크플로우 관리 및 실행
- **[AI Agent](User-Guide#ai-agent-orchestration)**: Agent 작업 조율 및 모니터링

### 🏗️ [아키텍처](Architecture)

- **[시스템 개요](Architecture#시스템-개요)**: 전체 시스템 구조도
- **[디렉토리 구조](Architecture#디렉토리-구조)**: 프로젝트 폴더 구조 설명
- **[기술 스택](Architecture#기술-스택)**: 사용된 주요 기술 및 라이브러리

### 💻 [개발 가이드](Development)

- **[개발 워크플로우](Development#개발-워크플로우)**: 브랜치 전략 및 커밋 컨벤션
- **[테스트](Development#테스트)**: 테스트 실행 및 작성 방법
- **[AI 협업](Development#ai-협업-가이드)**: AI와 함께 코딩하는 방법

### ❓ [문제 해결](Troubleshooting)

- **[자주 묻는 질문 (FAQ)](Troubleshooting#faq)**
- **[일반적인 오류](Troubleshooting#일반적인-오류-해결)**

---

## 🎯 프로젝트 목표

- **AI 최적화 구조**: Claude Code와 같은 AI 도구가 쉽게 이해하고 수정할 수 있는 코드베이스
- **명확한 문맥**: 각 모듈과 함수는 자체 문서화되어 AI가 즉시 이해 가능
- **점진적 복잡도**: 단순한 구조에서 시작하여 필요에 따라 확장
- **테스트 가능성**: 모든 기능은 독립적으로 테스트 가능
