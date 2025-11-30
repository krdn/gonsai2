# gonsai2 위키에 오신 것을 환영합니다!

**gonsai2**는 n8n 워크플로우 자동화와 MongoDB를 활용한 AI 기반 프로젝트입니다. Kent Beck의 Augmented Coding 원칙에 따라 AI와 인간 개발자가 효과적으로 협업할 수 있도록 설계되었습니다.

## 📚 문서 목차

이 위키는 다음과 같은 섹션으로 구성되어 있습니다:

---

### 🚀 시작하기

- **[시작하기](Getting-Started)** - 설치 및 환경 설정
  - [설치 및 설정](Getting-Started#설치-및-설정): 필수 요구 사항 및 설치 방법
  - [환경 변수](Getting-Started#환경-변수-설정): `.env` 파일 설정 가이드
  - [데이터베이스 초기화](Getting-Started#데이터베이스-초기화): MongoDB 설정

- **[사용자 가이드](User-Guide)** - 애플리케이션 실행 및 사용법
  - [애플리케이션 실행](User-Guide#애플리케이션-실행): 개발 및 프로덕션 모드 실행
  - [n8n 워크플로우](User-Guide#n8n-워크플로우): 워크플로우 관리 및 실행
  - [AI Agent](User-Guide#ai-agent-orchestration): Agent 작업 조율 및 모니터링

---

### 🖥️ 프론트엔드

- **[프론트엔드 사용자 메뉴얼](Frontend-User-Manual)** - 상세 UI 사용법
  - 로그인 및 회원가입
  - 워크플로우 관리
  - 실행 내역 조회
  - 실시간 모니터링
  - AI 에이전트 관리
  - 프로필 관리
  - 문제 해결

- **[프론트엔드 서비스 현황](Frontend-서비스-현황)** - 현재 서비스 상태

---

### 📊 분석 & 보고서

- **[시스템 종합 분석 보고서](System-Analysis-Report)** - 프로젝트 심층 분석 (2025-11-30)
  - [아키텍처 분석](System-Analysis-Report#아키텍처-분석): 백엔드/프론트엔드 구조
  - [보안 분석](System-Analysis-Report#보안-분석): 취약점 및 개선사항
  - [성능 최적화](System-Analysis-Report#성능-최적화-포인트): 최적화 포인트
  - [DevOps 분석](System-Analysis-Report#devops-분석): Docker, CI/CD
  - [누락된 기능](System-Analysis-Report#누락된-기능-및-개선사항): 개선 로드맵

---

### 🏗️ 아키텍처 & 개발

- **[아키텍처](Architecture)** - 시스템 구조 및 기술 스택
  - [시스템 개요](Architecture#시스템-개요): 전체 시스템 구조도
  - [디렉토리 구조](Architecture#디렉토리-구조): 프로젝트 폴더 구조 설명
  - [기술 스택](Architecture#기술-스택): 사용된 주요 기술 및 라이브러리

- **[개발 가이드](Development)** - 개발 워크플로우 및 컨벤션
  - [개발 워크플로우](Development#개발-워크플로우): 브랜치 전략 및 커밋 컨벤션
  - [테스트](Development#테스트): 테스트 실행 및 작성 방법
  - [AI 협업](Development#ai-협업-가이드): AI와 함께 코딩하는 방법

- **[개발 명칭 가이드](Development-Naming-Guide)** - 명명 규칙
  - 페이지(화면) 명칭
  - 컴포넌트 명칭
  - API 엔드포인트
  - 서비스 및 기능
  - 타입 및 인터페이스
  - WebSocket 이벤트
  - 용어 사전

---

### 🔄 CI/CD

- **[CI/CD 파이프라인](CI-CD-파이프라인)** - 파이프라인 개요
  - 파이프라인 흐름
  - 주요 기능
  - 워크플로우 구조

- **[CI/CD 설정 가이드](CI-CD-설정-가이드)** - GitHub 설정
  - GitHub Secrets 설정
  - GitHub Variables 설정
  - GitHub Environments 설정
  - Branch Protection Rules

- **[CI/CD 워크플로우 상세](CI-CD-워크플로우-상세)** - 워크플로우 설명
  - Lint, Security, Test, Build
  - Deploy, Performance, Release

- **[CI/CD 트러블슈팅](CI-CD-트러블슈팅)** - CI/CD 문제 해결
  - 워크플로우 실행 문제
  - 빌드/테스트/배포 문제
  - 디버깅 방법
  - 긴급 대응

---

### 🔧 도구 & 설정

- **[포트 설정 가이드](PORT_CONFIGURATION)** - 개발/운영 환경 포트 설정
  - 포트 구조 개요
  - 개발 환경 설정
  - 운영 환경 (Docker) 설정
  - CORS 설정

- **[Chrome DevTools MCP 설정](Chrome-DevTools-MCP-Setup)** - MCP 도구 설정
  - Playwright MCP vs Chrome DevTools MCP 비교
  - 설정 방법 (Headless, Xvfb, Docker)
  - MCP 설정 파일

---

### ❓ 문제 해결

- **[문제 해결](Troubleshooting)** - FAQ 및 오류 해결
  - [자주 묻는 질문 (FAQ)](Troubleshooting#faq)
  - [일반적인 오류](Troubleshooting#일반적인-오류-해결)

---

### 📝 기타

- **[Wiki 배포 방법](PUBLISH_WIKI)** - Wiki 배포 가이드

---

## 🎯 프로젝트 목표

- **AI 최적화 구조**: Claude Code와 같은 AI 도구가 쉽게 이해하고 수정할 수 있는 코드베이스
- **명확한 문맥**: 각 모듈과 함수는 자체 문서화되어 AI가 즉시 이해 가능
- **점진적 복잡도**: 단순한 구조에서 시작하여 필요에 따라 확장
- **테스트 가능성**: 모든 기능은 독립적으로 테스트 가능

---

## 📅 최종 업데이트

- **날짜**: 2025-11-30
- **버전**: 1.0.0
