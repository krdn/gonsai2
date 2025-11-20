#!/bin/bash
# n8n API Key 설정 도우미 스크립트

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  gonsai2 - n8n API Key 설정 도우미${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. n8n 컨테이너 상태 확인
echo -e "${BLUE}1. n8n 컨테이너 상태 확인 중...${NC}"
if docker ps | grep -q "n8n"; then
    echo -e "${GREEN}✅ n8n 컨테이너 실행 중${NC}"
    docker ps | grep "n8n" | awk '{print "   - " $2 " (" $1 ")"}'
else
    echo -e "${RED}❌ n8n 컨테이너가 실행 중이지 않습니다${NC}"
    echo ""
    echo -e "${YELLOW}n8n 컨테이너를 시작하려면:${NC}"
    echo "   cd /home/gon/docker-n8n"
    echo "   docker-compose up -d"
    exit 1
fi
echo ""

# 2. n8n 헬스체크
echo -e "${BLUE}2. n8n 서버 연결 테스트 중...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ n8n 서버 응답 정상 (HTTP 200)${NC}"
else
    echo -e "${RED}❌ n8n 서버 응답 실패 (HTTP ${HTTP_CODE})${NC}"
    exit 1
fi
echo ""

# 3. .env 파일 확인
echo -e "${BLUE}3. 환경 변수 파일 확인 중...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env 파일 존재${NC}"

    # 기존 API Key 확인
    if grep -q "^N8N_API_KEY=.\+" .env; then
        EXISTING_KEY=$(grep "^N8N_API_KEY=" .env | cut -d'=' -f2)
        if [ -n "$EXISTING_KEY" ]; then
            echo -e "${YELLOW}⚠️  기존 API Key가 이미 설정되어 있습니다${NC}"
            echo -e "   현재 값: ${CYAN}${EXISTING_KEY:0:20}...${NC}"
            echo ""
            read -p "기존 API Key를 교체하시겠습니까? (y/N): " REPLACE
            if [ "$REPLACE" != "y" ] && [ "$REPLACE" != "Y" ]; then
                echo -e "${GREEN}기존 API Key를 유지합니다${NC}"
                exit 0
            fi
        fi
    fi
else
    echo -e "${YELLOW}⚠️  .env 파일이 없습니다. .env.example에서 생성합니다...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env 파일 생성 완료${NC}"
    else
        echo -e "${RED}❌ .env.example 파일을 찾을 수 없습니다${NC}"
        exit 1
    fi
fi
echo ""

# 4. API Key 입력 안내
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  API Key 생성 방법${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}다음 단계를 따라 n8n API Key를 생성하세요:${NC}"
echo ""
echo -e "1️⃣  웹 브라우저에서 n8n 열기:"
echo -e "   ${BLUE}http://localhost:5678${NC}"
echo ""
echo -e "2️⃣  로그인 (필요시)"
echo ""
echo -e "3️⃣  화면 우측 하단 ${YELLOW}Settings${NC} 클릭"
echo ""
echo -e "4️⃣  왼쪽 메뉴에서 ${YELLOW}API${NC} 선택"
echo ""
echo -e "5️⃣  ${GREEN}Create new API key${NC} 버튼 클릭"
echo ""
echo -e "6️⃣  API Key 이름 입력 (예: ${CYAN}gonsai2-dev${NC})"
echo ""
echo -e "7️⃣  생성된 API Key 복사 (${RED}한 번만 표시됨!${NC})"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 5. 브라우저 자동 열기 (선택)
read -p "n8n UI를 브라우저에서 열까요? (Y/n): " OPEN_BROWSER
if [ "$OPEN_BROWSER" != "n" ] && [ "$OPEN_BROWSER" != "N" ]; then
    echo -e "${BLUE}브라우저를 여는 중...${NC}"
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5678" 2>/dev/null
    elif command -v open &> /dev/null; then
        open "http://localhost:5678"
    else
        echo -e "${YELLOW}자동으로 브라우저를 열 수 없습니다${NC}"
        echo -e "수동으로 http://localhost:5678 을 여세요"
    fi
    echo ""
fi

# 6. API Key 입력
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  API Key 입력${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "n8n에서 생성한 API Key를 붙여넣으세요:"
echo -e "${CYAN}(입력 내용은 표시되지 않습니다)${NC}"
echo ""
read -s -p "N8N_API_KEY: " API_KEY
echo ""
echo ""

# API Key 검증
if [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ API Key가 입력되지 않았습니다${NC}"
    exit 1
fi

# 7. .env 파일 업데이트
echo -e "${BLUE}7. .env 파일 업데이트 중...${NC}"

# 기존 N8N_API_KEY 라인 제거 또는 업데이트
if grep -q "^N8N_API_KEY=" .env; then
    # Mac과 Linux 호환
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^N8N_API_KEY=.*|N8N_API_KEY=${API_KEY}|" .env
    else
        sed -i "s|^N8N_API_KEY=.*|N8N_API_KEY=${API_KEY}|" .env
    fi
    echo -e "${GREEN}✅ 기존 API Key 업데이트 완료${NC}"
else
    echo "N8N_API_KEY=${API_KEY}" >> .env
    echo -e "${GREEN}✅ 새 API Key 추가 완료${NC}"
fi
echo ""

# 8. API Key 테스트
echo -e "${BLUE}8. API Key 테스트 중...${NC}"
TEST_RESPONSE=$(curl -s -H "X-N8N-API-KEY: ${API_KEY}" http://localhost:5678/api/v1/workflows)

if echo "$TEST_RESPONSE" | grep -q "message.*API"; then
    echo -e "${RED}❌ API Key 테스트 실패${NC}"
    echo -e "   응답: ${TEST_RESPONSE:0:100}"
    echo ""
    echo -e "${YELLOW}다시 시도하려면:${NC}"
    echo "   ./setup-api-key.sh"
    exit 1
else
    echo -e "${GREEN}✅ API Key 테스트 성공!${NC}"

    # 워크플로우 개수 표시
    WORKFLOW_COUNT=$(echo "$TEST_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
    if [ "$WORKFLOW_COUNT" -gt 0 ]; then
        echo -e "   ${CYAN}${WORKFLOW_COUNT}개의 워크플로우 발견${NC}"
    fi
fi
echo ""

# 9. 완료 메시지
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 설정 완료!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}다음 단계:${NC}"
echo ""
echo -e "1️⃣  종합 연결 테스트 실행:"
echo -e "   ${BLUE}npm run test:connection${NC}"
echo ""
echo -e "2️⃣  샘플 워크플로우 실행 테스트:"
echo -e "   ${BLUE}npm run test:workflow${NC}"
echo ""
echo -e "3️⃣  WebSocket 연결 테스트:"
echo -e "   ${BLUE}npm run test:websocket${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: API Key는 안전하게 보관하세요!${NC}"
echo -e "   .env 파일은 Git에 커밋되지 않도록 .gitignore에 포함되어 있습니다."
echo ""
