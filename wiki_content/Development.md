# 개발 가이드 (Development Guide)

gonsai2 프로젝트의 개발 프로세스와 컨벤션에 대한 가이드입니다.

## 개발 워크플로우

이 프로젝트는 GitFlow와 유사한 브랜치 전략을 따릅니다.

- **`main`**: 프로덕션 배포용 브랜치 (Protected)
- **`develop`**: 개발 통합 브랜치
- **`feature/*`**: 새로운 기능 개발
- **`fix/*`**: 버그 수정
- **`docs/*`**: 문서 작업

### 작업 순서

1. `develop` 브랜치에서 새로운 feature 브랜치 생성
   ```bash
   git checkout develop
   git checkout -b feature/my-new-feature
   ```
2. 작업 수행 및 커밋
3. `develop` 브랜치로 Pull Request 생성

## 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 사양을 준수합니다.

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (로직 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드 추가/수정
- `chore`: 빌드 태스크, 패키지 매니저 설정 등

**예시:**

```
feat: add new AI agent for data processing
fix: resolve connection timeout in n8n client
```

## 테스트 (Testing)

모든 주요 기능은 테스트 코드를 포함해야 합니다.

### 테스트 실행

```bash
# 전체 테스트 실행
npm test

# 특정 기능 테스트
npm run test:connection  # n8n 연결
npm run test:workflow    # 워크플로우 실행
npm run test:agent       # Agent Manager
```

### 테스트 작성 원칙

- **단위 테스트 (Unit Tests)**: 개별 함수나 클래스의 동작 검증
- **통합 테스트 (Integration Tests)**: n8n, MongoDB 등 외부 서비스와의 연동 검증

## AI 협업 가이드

AI(Claude, ChatGPT 등)와 협업할 때는 다음 사항을 유의하세요.

1. **컨텍스트 제공**: 작업을 요청할 때 관련 파일이나 문서를 함께 제공하세요.
2. **작은 단위 요청**: 한 번에 너무 큰 작업을 요청하기보다 단계별로 나누어 요청하세요.
3. **코드 리뷰**: AI가 생성한 코드는 반드시 사람이 검토하고 테스트해야 합니다.
