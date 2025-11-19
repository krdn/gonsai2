#!/bin/bash

# GitHub Wiki 설정 스크립트
# GitHub Wiki를 초기화하고 프론트엔드 사용자 메뉴얼을 업로드합니다.

set -e

echo "🔧 GitHub Wiki 설정 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Wiki 저장소 URL
WIKI_REPO="git@github.com:krdn/gonsai2.wiki.git"
WIKI_DIR="/tmp/gonsai2.wiki"
MANUAL_PATH="docs/Frontend-User-Manual.md"

# 현재 프로젝트 루트 확인
if [ ! -f "$MANUAL_PATH" ]; then
    echo -e "${RED}❌ 오류: $MANUAL_PATH 파일을 찾을 수 없습니다.${NC}"
    echo "현재 디렉토리: $(pwd)"
    exit 1
fi

echo -e "${GREEN}✅ 메뉴얼 파일 확인 완료${NC}"

# 기존 Wiki 디렉토리 제거
if [ -d "$WIKI_DIR" ]; then
    echo "기존 Wiki 디렉토리 제거 중..."
    rm -rf "$WIKI_DIR"
fi

# Wiki 저장소 클론 시도
echo "Wiki 저장소 클론 중..."
if git clone "$WIKI_REPO" "$WIKI_DIR" 2>/dev/null; then
    echo -e "${GREEN}✅ Wiki 저장소 클론 완료${NC}"
else
    echo -e "${YELLOW}⚠️  Wiki 저장소가 초기화되지 않았습니다.${NC}"
    echo ""
    echo "📝 다음 단계를 따라 Wiki를 초기화하세요:"
    echo ""
    echo "1. 브라우저에서 다음 URL을 엽니다:"
    echo "   https://github.com/krdn/gonsai2/wiki"
    echo ""
    echo "2. 'Create the first page' 버튼을 클릭합니다."
    echo ""
    echo "3. 제목: 'Home'"
    echo "   내용: 'gonsai2 Wiki에 오신 것을 환영합니다.'"
    echo ""
    echo "4. 'Save Page' 버튼을 클릭합니다."
    echo ""
    echo "5. 이 스크립트를 다시 실행하세요:"
    echo "   ./scripts/setup-wiki.sh"
    echo ""

    # 브라우저 열기
    if command -v xdg-open &> /dev/null; then
        xdg-open "https://github.com/krdn/gonsai2/wiki/_new" 2>/dev/null
    elif command -v open &> /dev/null; then
        open "https://github.com/krdn/gonsai2/wiki/_new" 2>/dev/null
    fi

    exit 1
fi

# Wiki 디렉토리로 이동
cd "$WIKI_DIR"

# 메뉴얼 복사
echo "메뉴얼 복사 중..."
cp "$(dirname "$0")/../$MANUAL_PATH" "Frontend-User-Manual.md"

# Git 설정 확인
if ! git config user.email > /dev/null 2>&1; then
    git config user.email "noreply@github.com"
    git config user.name "GitHub Wiki Bot"
fi

# 변경사항 커밋
echo "변경사항 커밋 중..."
git add Frontend-User-Manual.md

if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  변경사항이 없습니다.${NC}"
else
    git commit -m "docs: 프론트엔드 사용자 메뉴얼 추가

프론트엔드의 모든 주요 기능에 대한 상세 사용자 메뉴얼:
- 로그인 및 회원가입
- 워크플로우 관리 (태그 필터링, 실행)
- 실행 내역 조회
- 실시간 모니터링 (WebSocket, 로그, 메트릭)
- AI 에이전트 관리
- 프로필 관리
- 문제 해결 가이드

🤖 Generated with Claude Code
"

    # Wiki에 푸시
    echo "Wiki에 푸시 중..."
    git push origin master

    echo -e "${GREEN}✅ Wiki 업데이트 완료!${NC}"
    echo ""
    echo "📖 Wiki 페이지 확인:"
    echo "   https://github.com/krdn/gonsai2/wiki/Frontend-User-Manual"
    echo ""
fi

# 정리
cd - > /dev/null
rm -rf "$WIKI_DIR"

echo -e "${GREEN}🎉 완료!${NC}"
