#!/bin/bash

#
# Test Coverage Report Generator
#
# Runs all test suites and generates comprehensive coverage report.
#

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Coverage Report Generator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Clean previous coverage
echo "🧹 Cleaning previous coverage..."
rm -rf coverage/
echo ""

# Run unit tests with coverage
echo "🧪 Running unit tests..."
npm run test:unit -- --coverage --coverageDirectory=coverage/unit
echo ""

# Run integration tests with coverage (if Docker is available)
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
  echo "🔗 Running integration tests..."
  npm run test:integration -- --coverage --coverageDirectory=coverage/integration
  echo ""
else
  echo "${YELLOW}⚠️  Skipping integration tests (Docker not available)${NC}"
  echo ""
fi

# Merge coverage reports
echo "📊 Merging coverage reports..."
npx nyc merge coverage/unit coverage/.nyc_output/coverage-unit.json || true
npx nyc merge coverage/integration coverage/.nyc_output/coverage-integration.json || true

# Generate final report
echo "📈 Generating final report..."
npx nyc report --reporter=html --reporter=text --reporter=lcov --reporter=json-summary \
  --temp-dir=coverage/.nyc_output \
  --report-dir=coverage/final
echo ""

# Display summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Coverage Report Generated"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Reports available:"
echo "  - HTML:    coverage/final/index.html"
echo "  - LCOV:    coverage/final/lcov.info"
echo "  - JSON:    coverage/final/coverage-summary.json"
echo "  - Text:    (displayed above)"
echo ""

# Check coverage threshold
if [ -f coverage/final/coverage-summary.json ]; then
  echo "🎯 Coverage Summary:"
  cat coverage/final/coverage-summary.json | jq '.total' || true
  echo ""
fi

# Open HTML report if on macOS or Linux with browser
if command -v open &> /dev/null; then
  echo "🌐 Opening coverage report in browser..."
  open coverage/final/index.html
elif command -v xdg-open &> /dev/null; then
  echo "🌐 Opening coverage report in browser..."
  xdg-open coverage/final/index.html
else
  echo "${GREEN}✅ Done! Open coverage/final/index.html in your browser.${NC}"
fi

echo ""
