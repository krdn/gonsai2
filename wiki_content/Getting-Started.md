# 시작하기 (Getting Started)

gonsai2 프로젝트를 시작하기 위한 가이드입니다.

## 필수 요구 사항 (Prerequisites)

이 프로젝트를 실행하기 위해서는 다음 도구들이 설치되어 있어야 합니다:

- **Node.js**: v18.0.0 이상
- **Docker**: n8n, MongoDB, Redis 컨테이너 실행을 위해 필요
- **Git**: 버전 관리

## 설치 및 설정

### 1. 저장소 클론

```bash
git clone https://github.com/yourusername/gonsai2.git
cd gonsai2
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 값을 입력합니다.

```bash
cp .env.example .env
```

`.env` 파일을 열어 다음 필수 변수들을 설정해주세요:

- `N8N_BASE_URL`: n8n 서버 주소 (기본값: `http://localhost:5678`)
- `N8N_API_KEY`: n8n UI에서 생성한 API 키 (Settings > API)
- `MONGODB_URI`: MongoDB 연결 문자열
- `REDIS_URL`: Redis 서버 주소

### 4. Docker 서비스 실행

기존에 구성된 Docker 환경이 실행 중인지 확인합니다.

```bash
docker ps | grep -E 'n8n|mongodb|redis'
```

만약 실행 중이 아니라면, 별도의 Docker Compose 설정(예: `~/docker-n8n`, `~/docker-mongo-ubuntu`)을 통해 서비스를 시작해야 합니다.

## 데이터베이스 초기화

MongoDB 스키마와 인덱스를 초기화합니다. 이 명령은 `infrastructure/mongodb/schemas`에 정의된 스키마를 기반으로 컬렉션을 설정합니다.

```bash
npm run init:mongodb
```

## 다음 단계

이제 설치가 완료되었습니다! [사용자 가이드](User-Guide)로 이동하여 애플리케이션을 실행하고 사용하는 방법을 알아보세요.
