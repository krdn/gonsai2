#!/bin/bash

###############################################################################
# Test Setup Script
#
# 테스트 환경 초기화 스크립트
###############################################################################

set -e

echo "🧪 Setting up test environment for gonsai2..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 의존성 확인
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# 2. npm 패키지 설치
echo -e "${YELLOW}📥 Installing npm packages...${NC}"
npm install

# 3. Husky 설정
echo -e "${YELLOW}🐕 Setting up Husky git hooks...${NC}"
npx husky install
chmod +x .husky/pre-commit

# 4. Cypress 설치
echo -e "${YELLOW}🌲 Installing Cypress...${NC}"
npx cypress install

# 5. 테스트 디렉토리 생성
echo -e "${YELLOW}📁 Creating test directories...${NC}"
mkdir -p tests/integration
mkdir -p tests/e2e/fixtures
mkdir -p tests/e2e/screenshots
mkdir -p tests/e2e/videos
mkdir -p tests/utils
mkdir -p coverage

# 6. 환경 변수 확인
echo -e "${YELLOW}🔐 Checking environment variables...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created. Please update with your credentials.${NC}"
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# 7. Jest 캐시 초기화
echo -e "${YELLOW}🗑️  Clearing Jest cache...${NC}"
npm test -- --clearCache 2>/dev/null || true

# 8. 간단한 테스트 실행 (설정 검증)
echo -e "${YELLOW}🧪 Running quick test verification...${NC}"
if npm run test:unit -- --passWithNoTests --silent 2>/dev/null; then
    echo -e "${GREEN}✅ Test configuration is valid${NC}"
else
    echo -e "${RED}❌ Test configuration has issues. Please check jest.config.js${NC}"
fi

# 9. 완료 메시지
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 Test environment setup completed successfully!      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update .env file with your credentials"
echo "  2. Run tests: npm test"
echo "  3. Run with coverage: npm run test:coverage"
echo "  4. Open Cypress: npm run test:e2e:open"
echo ""
echo -e "${YELLOW}Available test commands:${NC}"
echo "  npm test              - Run all tests"
echo "  npm run test:unit     - Run unit tests"
echo "  npm run test:integration - Run integration tests"
echo "  npm run test:e2e      - Run E2E tests (headless)"
echo "  npm run test:watch    - Run tests in watch mode"
echo "  npm run test:coverage - Generate coverage report"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  - TESTING_GUIDE.md    - Comprehensive testing guide"
echo "  - README.md           - Project documentation"
echo ""
