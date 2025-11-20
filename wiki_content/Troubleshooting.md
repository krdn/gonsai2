# 문제 해결 (Troubleshooting)

자주 발생하는 문제와 해결 방법을 정리했습니다.

## 일반적인 오류 해결

### 1. n8n 연결 실패

**증상**: `ECONNREFUSED` 또는 `Connection timed out` 오류 발생

**해결 방법**:

1. Docker 컨테이너가 실행 중인지 확인하세요.
   ```bash
   docker ps
   ```
2. `.env` 파일의 `N8N_BASE_URL`이 올바른지 확인하세요.
3. n8n 서버 로그를 확인하세요.
   ```bash
   docker logs n8n
   ```

### 2. MongoDB 인증 오류

**증상**: `Authentication failed` 오류 발생

**해결 방법**:

1. `.env` 파일의 `MONGODB_URI`에 포함된 사용자 이름과 비밀번호가 정확한지 확인하세요.
2. MongoDB 컨테이너의 초기화 스크립트가 정상적으로 실행되었는지 확인하세요.

### 3. 워크플로우 실행 멈춤

**증상**: 워크플로우 실행 상태가 오랫동안 변경되지 않음

**해결 방법**:

1. Redis 큐 상태를 확인하세요.
2. n8n 워커(Worker) 컨테이너가 정상 작동 중인지 확인하세요.

## FAQ (자주 묻는 질문)

### Q: n8n API 키는 어디서 찾나요?

A: n8n 대시보드에 접속하여 **Settings > API** 메뉴에서 새로운 API 키를 생성할 수 있습니다.

### Q: 새로운 AI Agent는 어떻게 추가하나요?

A: `features/agent-orchestration/agents` 디렉토리에 새로운 Agent 클래스를 정의하고 `AgentManager`에 등록하면 됩니다.

### Q: 테스트 데이터베이스는 어떻게 초기화하나요?

A: `npm run init:mongodb` 명령어를 실행하면 스키마가 초기화됩니다. 기존 데이터는 유지되지만, 인덱스는 재생성됩니다.
