# Chrome DevTools MCP 설정 가이드

> 마지막 업데이트: 2025-11-27

이 문서는 서버 환경(Ubuntu)에서 Chrome DevTools MCP를 설정하고 사용하는 방법을 설명합니다.

---

## 목차

1. [개요](#개요)
2. [Playwright MCP vs Chrome DevTools MCP](#playwright-mcp-vs-chrome-devtools-mcp)
3. [설정 방법](#설정-방법)
4. [MCP 설정 파일](#mcp-설정-파일)
5. [권장 사항](#권장-사항)

---

## 개요

Chrome DevTools MCP는 **Chrome DevTools Protocol (CDP)**을 사용하여 Chrome 브라우저와 통신합니다. 이를 사용하려면 Chrome이 **디버그 모드**로 실행되어야 합니다.

### 작동 원리

```
┌─────────────┐    CDP (9222)    ┌─────────────┐
│ Claude Code │ ───────────────▶ │   Chrome    │
│   (MCP)     │ ◀─────────────── │ (Debug Mode)│
└─────────────┘                  └─────────────┘
```

---

## Playwright MCP vs Chrome DevTools MCP

### 비교표

| 항목                     | Chrome DevTools MCP    | Playwright MCP       |
| ------------------------ | ---------------------- | -------------------- |
| **브라우저 관리**        | 수동 (별도 실행 필요)  | 자동 (내장 브라우저) |
| **설정 복잡도**          | 높음                   | 낮음                 |
| **서버 리소스**          | 상시 Chrome 프로세스   | 필요시에만 시작      |
| **GUI 필요**             | 선택적 (Headless 가능) | 불필요               |
| **실시간 세션 모니터링** | ✅ 가능                | ❌ 불가능            |
| **여러 탭 동시 관리**    | ✅ 가능                | 제한적               |
| **기존 브라우저 연결**   | ✅ 가능                | ❌ 불가능            |

### 사용 시나리오

| 시나리오                    | 권장 도구           |
| --------------------------- | ------------------- |
| 자동화 테스트               | Playwright MCP      |
| 웹 스크래핑                 | Playwright MCP      |
| 실시간 디버깅               | Chrome DevTools MCP |
| 성능 프로파일링             | Chrome DevTools MCP |
| 기존 브라우저 세션 모니터링 | Chrome DevTools MCP |

---

## 설정 방법

### 방법 1: Headless Chrome (GUI 없이)

가장 간단한 방법으로, GUI 없이 Chrome을 실행합니다.

```bash
# 1. Chrome/Chromium 설치 (이미 설치되어 있으면 생략)
sudo apt-get update
sudo apt-get install -y chromium-browser

# 2. Headless 모드로 디버그 포트 열기
chromium-browser --headless --disable-gpu --remote-debugging-port=9222 --no-sandbox &

# 3. 연결 확인
curl http://localhost:9222/json/version
```

**예상 응답:**

```json
{
  "Browser": "Chrome/xxx.x.xxxx.xxx",
  "Protocol-Version": "1.3",
  "User-Agent": "...",
  "V8-Version": "...",
  "WebKit-Version": "...",
  "webSocketDebuggerUrl": "ws://localhost:9222/devtools/browser/..."
}
```

### 방법 2: Xvfb (가상 디스플레이)

GUI가 필요한 기능을 사용해야 할 경우 가상 디스플레이를 설정합니다.

```bash
# 1. Xvfb 설치
sudo apt-get install -y xvfb chromium-browser

# 2. 가상 디스플레이 시작
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# 3. Chrome 디버그 모드 실행
chromium-browser --remote-debugging-port=9222 --no-sandbox &

# 4. 연결 확인
curl http://localhost:9222/json/version
```

### 방법 3: Docker 사용 (권장)

격리된 환경에서 Chrome을 실행하여 시스템 안정성을 보장합니다.

```bash
# browserless/chrome 이미지 사용
docker run -d \
  --name chrome-debug \
  -p 9222:3000 \
  --restart unless-stopped \
  browserless/chrome:latest

# 연결 확인
curl http://localhost:9222/json/version
```

**장점:**

- 시스템과 격리됨
- 자동 재시작 가능
- 리소스 제한 설정 가능

### 방법 4: systemd 서비스 등록

프로덕션 환경에서 Chrome을 안정적으로 실행하려면 systemd 서비스로 등록합니다.

```bash
# /etc/systemd/system/chrome-debug.service
sudo tee /etc/systemd/system/chrome-debug.service << 'EOF'
[Unit]
Description=Chrome Debug Mode
After=network.target

[Service]
Type=simple
User=gon
Environment=DISPLAY=:99
ExecStartPre=/usr/bin/Xvfb :99 -screen 0 1920x1080x24
ExecStart=/usr/bin/chromium-browser --remote-debugging-port=9222 --no-sandbox --disable-gpu
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 서비스 활성화 및 시작
sudo systemctl daemon-reload
sudo systemctl enable chrome-debug
sudo systemctl start chrome-debug

# 상태 확인
sudo systemctl status chrome-debug
```

---

## MCP 설정 파일

Chrome이 디버그 모드로 실행된 후, Claude Code의 MCP 설정에 추가합니다.

### Claude Desktop 설정

`~/.config/claude-code/mcp_servers.json` 또는 해당 설정 파일:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-chrome-devtools"],
      "env": {
        "CDP_HOST": "localhost",
        "CDP_PORT": "9222"
      }
    }
  }
}
```

### Docker Chrome 사용 시

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-chrome-devtools"],
      "env": {
        "CDP_HOST": "localhost",
        "CDP_PORT": "9222"
      }
    }
  }
}
```

---

## 권장 사항

### 현재 gonsai2 프로젝트 환경

| 항목        | Chrome DevTools MCP           | Playwright MCP            |
| ----------- | ----------------------------- | ------------------------- |
| 설정 복잡도 | 높음 (Chrome 별도 실행 필요)  | 낮음 (자체 브라우저 관리) |
| 서버 리소스 | 상시 Chrome 프로세스 필요     | 필요시에만 브라우저 시작  |
| 유지보수    | Chrome 프로세스 모니터링 필요 | 자동 관리                 |

### 결론

**일반적인 자동화 테스트 및 웹 페이지 확인 작업에는 Playwright MCP를 권장합니다.**

Chrome DevTools MCP는 다음과 같은 경우에 더 유용합니다:

- 실제 브라우저 세션을 실시간으로 모니터링해야 할 때
- 성능 프로파일링이 필요할 때
- 기존에 열려 있는 브라우저에 연결해야 할 때
- 로컬 개발 환경에서 디버깅할 때

---

## 문제 해결

### Chrome이 시작되지 않는 경우

```bash
# 프로세스 확인
ps aux | grep chromium

# 포트 사용 확인
ss -tlnp | grep 9222

# 로그 확인 (systemd 사용 시)
journalctl -u chrome-debug -f
```

### 연결이 거부되는 경우

```bash
# 방화벽 확인
sudo ufw status

# 9222 포트 허용 (필요 시)
sudo ufw allow 9222/tcp
```

### Docker 컨테이너 문제

```bash
# 컨테이너 상태 확인
docker ps -a | grep chrome-debug

# 로그 확인
docker logs chrome-debug

# 컨테이너 재시작
docker restart chrome-debug
```

---

## 관련 문서

- [포트 설정 가이드](PORT_CONFIGURATION.md)
- [문제 해결](Troubleshooting)
- [개발 가이드](Development)

---

## 변경 이력

| 날짜       | 변경 내용      | 담당자 |
| ---------- | -------------- | ------ |
| 2025-11-27 | 초기 문서 작성 | Claude |
