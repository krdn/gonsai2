#!/usr/bin/env node
/**
 * 기본 n8n 연결 테스트 (JavaScript)
 * TypeScript 설정 없이 빠르게 테스트
 */

const https = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}=== n8n 기본 연결 테스트 ===${colors.reset}\n`);

// 1. 헬스체크
console.log('1. n8n 헬스체크...');
fetch('http://localhost:5678/healthz')
  .then(res => {
    if (res.ok) {
      console.log(`   ${colors.green}✅ 헬스체크 성공 (HTTP ${res.status})${colors.reset}`);
      return testWorkflows();
    } else {
      console.log(`   ${colors.red}❌ 헬스체크 실패 (HTTP ${res.status})${colors.reset}`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.log(`   ${colors.red}❌ 연결 실패: ${error.message}${colors.reset}`);
    console.log(`\n${colors.yellow}💡 n8n 컨테이너가 실행 중인지 확인하세요:${colors.reset}`);
    console.log(`   docker ps | grep n8n\n`);
    process.exit(1);
  });

// 2. 워크플로우 API 테스트 (API Key 필요)
function testWorkflows() {
  console.log('\n2. 워크플로우 API 테스트...');

  fetch('http://localhost:5678/api/v1/workflows')
    .then(res => res.json())
    .then(data => {
      console.log(`   ${colors.yellow}⚠️  API Key 필요${colors.reset}`);
      console.log(`   응답: ${JSON.stringify(data).slice(0, 100)}...`);
      showNextSteps();
    })
    .catch(error => {
      console.log(`   ${colors.red}❌ API 호출 실패: ${error.message}${colors.reset}`);
      showNextSteps();
    });
}

function showNextSteps() {
  console.log(`\n${colors.cyan}=== 다음 단계 ===${colors.reset}`);
  console.log(`\n1. n8n UI에서 API Key 생성:`);
  console.log(`   http://localhost:5678`);
  console.log(`   Settings > API > Create new API key`);

  console.log(`\n2. .env 파일에 API Key 추가:`);
  console.log(`   N8N_API_KEY=your-api-key-here`);

  console.log(`\n3. TypeScript 테스트 실행:`);
  console.log(`   npm run test:connection\n`);
}
