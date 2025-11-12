# 재해 복구 계획 (Disaster Recovery Plan)

gonsai2 시스템의 재해 복구 절차 및 전략

---

## 목차

1. [개요](#개요)
2. [백업 전략](#백업-전략)
3. [복구 시나리오](#복구-시나리오)
4. [복구 절차](#복구-절차)
5. [RTO/RPO](#rtorpo)
6. [테스트 계획](#테스트-계획)
7. [연락처](#연락처)

---

## 개요

### 목적

이 문서는 gonsai2 프로덕션 시스템의 재해 발생 시 신속한 복구를 위한 절차와 전략을 정의합니다.

### 적용 범위

- **시스템**: gonsai2 프로덕션 환경
- **구성 요소**:
  - Next.js Frontend (gonsai2-app)
  - n8n Workflow Engine (n8n + n8n-worker)
  - PostgreSQL Database (n8n 데이터)
  - MongoDB Database (애플리케이션 데이터)
  - Redis Cache & Queue
  - Monitoring Stack (Prometheus, Grafana, Loki)

### 재해 유형

1. **하드웨어 장애**: 서버, 디스크, 네트워크 장비 고장
2. **소프트웨어 장애**: 애플리케이션 버그, 설정 오류
3. **데이터 손실**: 데이터베이스 손상, 삭제 오류
4. **보안 침해**: 랜섬웨어, 해킹
5. **자연 재해**: 화재, 지진, 홍수
6. **인적 오류**: 잘못된 명령 실행, 설정 변경

---

## 백업 전략

### 백업 유형

#### 1. 자동 백업 (Automated Backup)

```bash
# Cron 설정 예시
0 2 * * * /path/to/deployment/production/scripts/backup.sh
```

**빈도**: 매일 02:00 AM KST
**보관 기간**: 30일
**대상**:
- n8n 워크플로우 및 자격증명
- PostgreSQL 데이터베이스 (전체 덤프)
- MongoDB 데이터베이스 (전체 덤프)
- 설정 파일 (환경 변수, Nginx, 모니터링)

#### 2. 수동 백업 (Manual Backup)

```bash
cd /path/to/deployment/production
./scripts/backup.sh
```

**시기**:
- 중요한 변경 전 (설정 변경, 업데이트)
- 프로덕션 배포 전
- 데이터 마이그레이션 전

#### 3. 오프사이트 백업 (Off-site Backup)

**S3 자동 업로드**:
```bash
# .env.production
BACKUP_S3_ENABLED=true
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=ap-northeast-2
```

**빈도**: 매일 백업과 동시
**보관 기간**: 90일

### 백업 검증

#### 자동 검증

백업 스크립트는 자동으로 다음을 검증합니다:
- 압축 파일 무결성 (tar 검증)
- 파일 크기 확인
- 메타데이터 생성

#### 월간 복구 테스트

```bash
# 테스트 환경에서 복구 테스트
# 매월 첫째 주 월요일
cd /path/to/test-environment
./scripts/restore.sh /backups/archives/latest_backup.tar.gz
```

---

## 복구 시나리오

### 시나리오 1: 단일 서비스 장애

**증상**: 특정 컨테이너(예: n8n)만 작동하지 않음

**영향**: 부분적 서비스 중단

**복구 절차**:
```bash
# 1. 문제 서비스 확인
docker-compose ps
docker-compose logs [service-name]

# 2. 서비스 재시작
docker-compose restart [service-name]

# 3. Health Check
curl http://localhost:[port]/health
```

**예상 복구 시간**: 5-10분

---

### 시나리오 2: 데이터베이스 손상

**증상**: PostgreSQL 또는 MongoDB 데이터 손상

**영향**: 전체 서비스 중단

**복구 절차**:
```bash
# 1. 서비스 중지
docker-compose down

# 2. 손상된 데이터 백업 (조사용)
mv data/postgres data/postgres_corrupted
mv data/mongodb data/mongodb_corrupted

# 3. 최신 백업에서 복원
./scripts/restore.sh /backups/archives/gonsai2_backup_YYYYMMDD_HHMMSS.tar.gz

# 4. 검증 후 서비스 시작
./scripts/start.sh
```

**예상 복구 시간**: 30-60분

---

### 시나리오 3: 전체 시스템 장애

**증상**: 서버 전체 다운, 모든 컨테이너 중단

**영향**: 전체 서비스 중단

**복구 절차**:

#### A. 동일 서버 복구

```bash
# 1. Docker 재시작
sudo systemctl restart docker

# 2. 서비스 재시작
cd /path/to/deployment/production
./scripts/start.sh
```

#### B. 새 서버로 복구

```bash
# 1. 새 서버 준비
# - OS 설치 (Ubuntu 22.04 LTS)
# - Docker 및 Docker Compose 설치
# - 네트워크 설정

# 2. 프로젝트 코드 복사
git clone <repository-url>
cd gonsai2/deployment/production

# 3. 백업 파일 다운로드 (S3)
aws s3 cp s3://your-backup-bucket/backups/latest_backup.tar.gz /tmp/

# 4. 복원 실행
./scripts/restore.sh /tmp/latest_backup.tar.gz

# 5. SSL 인증서 복구
# Let's Encrypt 재발급 또는 백업에서 복원

# 6. DNS 변경
# 새 서버 IP로 DNS A 레코드 업데이트

# 7. 서비스 시작
./scripts/start.sh
```

**예상 복구 시간**: 2-4시간

---

### 시나리오 4: 보안 침해

**증상**: 랜섬웨어, 해킹, 비정상 활동 탐지

**영향**: 전체 서비스 중단 + 보안 위협

**복구 절차**:

```bash
# 1. 즉시 격리
docker-compose down
# 네트워크 차단

# 2. 사고 조사
# - 로그 분석: docker-compose logs
# - 침해 범위 확인
# - 영향받은 데이터 식별

# 3. 깨끗한 환경 준비
# 새 서버 또는 완전 초기화

# 4. 침해 이전 백업 선택
# 감염 이전 시점의 백업 확인

# 5. 복원 실행
./scripts/restore.sh /backups/archives/gonsai2_backup_[PRE_INCIDENT].tar.gz

# 6. 보안 강화
# - 모든 비밀번호 변경
# - N8N_ENCRYPTION_KEY 재생성 (주의: 기존 자격증명 복호화 불가)
# - JWT_SECRET 변경
# - 방화벽 규칙 강화

# 7. 모니터링 강화
# - 알림 활성화
# - 로그 레벨 증가
```

**예상 복구 시간**: 4-8시간 + 조사 시간

---

### 시나리오 5: 설정 오류

**증상**: 잘못된 설정으로 인한 서비스 오작동

**영향**: 부분적 또는 전체 서비스 중단

**복구 절차**:

```bash
# 1. 변경 사항 롤백
git log --oneline -n 10
git revert [commit-hash]

# 2. 설정 파일 복원 (백업에서)
tar -xzf /backups/archives/latest_backup.tar.gz \
    --strip-components=2 \
    -C ./ \
    gonsai2_backup_*/config/

# 3. 서비스 재시작
docker-compose restart [affected-service]
```

**예상 복구 시간**: 10-30분

---

## 복구 절차

### 복구 우선순위

1. **P0 - Critical (15분 이내)**:
   - 데이터베이스 복구
   - 핵심 서비스 재시작 (n8n, Frontend)

2. **P1 - High (1시간 이내)**:
   - 캐시 복구 (Redis)
   - 모니터링 복구

3. **P2 - Medium (4시간 이내)**:
   - 전체 시스템 검증
   - 성능 최적화

### 복구 체크리스트

#### 사전 확인

- [ ] 재해 유형 식별
- [ ] 영향 범위 확인
- [ ] 최신 백업 파일 확인
- [ ] 복구 팀 소집
- [ ] 이해관계자 통지

#### 복구 실행

- [ ] 서비스 중지
- [ ] 데이터 손상 정도 평가
- [ ] 백업 파일 추출
- [ ] 데이터베이스 복원
- [ ] 애플리케이션 데이터 복원
- [ ] 설정 파일 복원
- [ ] 권한 및 소유권 설정

#### 검증

- [ ] 데이터 무결성 확인
- [ ] 서비스 시작
- [ ] Health Check 통과
- [ ] 기능 테스트 수행
- [ ] 성능 모니터링
- [ ] 로그 확인

#### 사후 작업

- [ ] 서비스 재개 통지
- [ ] 사고 보고서 작성
- [ ] 근본 원인 분석 (RCA)
- [ ] 재발 방지 대책 수립
- [ ] 복구 절차 개선

---

## RTO/RPO

### Recovery Time Objective (RTO)

목표 복구 시간 - 서비스 중단 후 복구 완료까지 허용 시간

| 시나리오 | RTO 목표 | 최대 허용 |
|---------|---------|---------|
| 단일 서비스 장애 | 15분 | 30분 |
| 데이터베이스 손상 | 1시간 | 2시간 |
| 전체 시스템 장애 (동일 서버) | 30분 | 1시간 |
| 전체 시스템 장애 (새 서버) | 4시간 | 8시간 |
| 보안 침해 | 8시간 | 24시간 |

### Recovery Point Objective (RPO)

목표 복구 시점 - 허용 가능한 최대 데이터 손실량

| 데이터 유형 | RPO 목표 | 백업 빈도 |
|-----------|---------|---------|
| n8n 워크플로우 | 24시간 | 매일 |
| 실행 이력 | 24시간 | 매일 |
| 애플리케이션 데이터 | 24시간 | 매일 |
| 설정 파일 | 변경 시점 | 수동 백업 |

---

## 테스트 계획

### 월간 테스트

**일정**: 매월 첫째 주 월요일 02:00 AM

**절차**:
```bash
# 1. 테스트 환경 준비
cd /path/to/test-environment

# 2. 최신 백업으로 복구
./scripts/restore.sh /backups/archives/latest_backup.tar.gz

# 3. 검증
- 모든 서비스 정상 시작 확인
- Health Check 통과
- n8n UI 접속 및 워크플로우 확인
- 데이터베이스 쿼리 테스트

# 4. 결과 문서화
```

### 분기별 DR 훈련

**일정**: 분기별 1회

**내용**:
1. 전체 팀 DR 시나리오 훈련
2. 새 서버로 완전 복구 시뮬레이션
3. 복구 시간 측정 및 개선
4. 절차 업데이트

### 연간 감사

**일정**: 연 1회

**내용**:
1. DR 계획 전체 검토
2. RTO/RPO 목표 재평가
3. 백업 전략 최적화
4. 외부 감사 (선택사항)

---

## 연락처

### 긴급 연락처

| 역할 | 이름 | 전화번호 | 이메일 |
|-----|------|---------|-------|
| 시스템 관리자 | [이름] | [번호] | [이메일] |
| 백업 관리자 | [이름] | [번호] | [이메일] |
| 보안 담당자 | [이름] | [번호] | [이메일] |
| 프로젝트 매니저 | [이름] | [번호] | [이메일] |

### 에스컬레이션 경로

1. **레벨 1** (0-30분): 시스템 관리자
2. **레벨 2** (30-60분): 백업 관리자 + 보안 담당자
3. **레벨 3** (60분+): 프로젝트 매니저 + 경영진

### 외부 지원

- **클라우드 제공자**: [제공자명] - [지원 번호]
- **백업 서비스**: [서비스명] - [지원 번호]
- **보안 컨설팅**: [회사명] - [연락처]

---

## 부록

### A. 백업 파일 구조

```
gonsai2_backup_YYYYMMDD_HHMMSS/
├── n8n-data/           # n8n 워크플로우, 자격증명
├── n8n-files/          # n8n 워크플로우 파일
├── postgres_*.sql      # PostgreSQL 덤프
├── postgres_globals_*.sql
├── mongodb/            # MongoDB 백업
│   └── gonsai2/
├── config/             # 설정 파일
│   ├── .env.production
│   ├── docker-compose.yml
│   ├── nginx/
│   ├── postgres-config/
│   └── monitoring/
```

### B. 유용한 명령어

```bash
# 백업 목록 확인
ls -lh /backups/archives/

# 백업 메타데이터 확인
cat /backups/metadata/gonsai2_backup_*.json | jq

# 특정 파일만 추출
tar -xzf backup.tar.gz gonsai2_backup_*/config/.env.production

# 디스크 사용량 확인
du -sh /backups/*

# Docker 볼륨 확인
docker volume ls
docker volume inspect gonsai2_postgres-data
```

### C. 로그 위치

- **백업 로그**: `/backups/logs/backup_*.log`
- **Docker 로그**: `docker-compose logs`
- **애플리케이션 로그**: `/var/log/gonsai2/`
- **n8n 로그**: `docker logs n8n`
- **Nginx 로그**: `/var/log/nginx/`

---

**문서 버전**: 1.0
**최종 업데이트**: 2024년 11월
**다음 리뷰**: 2025년 2월
