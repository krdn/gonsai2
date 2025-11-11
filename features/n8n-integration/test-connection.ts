#!/usr/bin/env ts-node
/**
 * n8n Connection Test Script
 *
 * @description Tests connection to n8n Docker container and validates API access
 *
 * Usage:
 *   npx ts-node features/n8n-integration/test-connection.ts
 */

import { createN8nClient } from './api-client';
import { AuthManager } from './auth-manager';

// ANSI 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * 테스트 결과 출력
 */
function logTest(name: string, passed: boolean, message?: string): void {
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`${icon} ${color}${name}${colors.reset}`);
  if (message) {
    console.log(`   ${colors.cyan}${message}${colors.reset}`);
  }
}

/**
 * 섹션 헤더 출력
 */
function logSection(title: string): void {
  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);
}

/**
 * 메인 테스트 함수
 */
async function runTests(): Promise<void> {
  console.log(
    `${colors.cyan}n8n Connection Test Suite${colors.reset}\n`
  );
  console.log(`시작 시간: ${new Date().toISOString()}\n`);

  let totalTests = 0;
  let passedTests = 0;

  // ============================================
  // 1. 환경 변수 확인
  // ============================================
  logSection('1. 환경 변수 확인');

  totalTests++;
  const hasApiUrl = !!process.env.N8N_API_URL;
  logTest(
    'N8N_API_URL 설정',
    hasApiUrl,
    hasApiUrl ? process.env.N8N_API_URL : '환경 변수가 설정되지 않았습니다'
  );
  if (hasApiUrl) passedTests++;

  totalTests++;
  const hasApiKey = !!process.env.N8N_API_KEY;
  logTest(
    'N8N_API_KEY 설정',
    hasApiKey,
    hasApiKey ? '설정됨 (값 숨김)' : '환경 변수가 설정되지 않았습니다'
  );
  if (hasApiKey) passedTests++;

  if (!hasApiUrl || !hasApiKey) {
    console.log(
      `\n${colors.yellow}⚠️  .env 파일을 확인하세요:${colors.reset}`
    );
    console.log(`   N8N_API_URL=http://localhost:5678`);
    console.log(`   N8N_API_KEY=your-api-key-here`);
    console.log(
      `\n${colors.yellow}💡 API 키 생성: n8n UI → Settings → API${colors.reset}\n`
    );
    process.exit(1);
  }

  // ============================================
  // 2. 인증 검증
  // ============================================
  logSection('2. 인증 설정 검증');

  totalTests++;
  const authManager = AuthManager.fromEnv();
  const authMethod = authManager.getAuthMethod();
  const authValid = authManager.validate();

  logTest(
    '인증 방법',
    authValid.valid,
    authValid.valid
      ? `${authMethod} 사용 중`
      : authValid.error ?? '알 수 없는 오류'
  );
  if (authValid.valid) passedTests++;

  // ============================================
  // 3. n8n 서버 연결 테스트
  // ============================================
  logSection('3. n8n 서버 연결 테스트');

  totalTests++;
  try {
    const healthUrl = process.env.N8N_API_URL + '/healthz';
    const healthResponse = await fetch(healthUrl);
    const isHealthy = healthResponse.ok;

    logTest(
      'n8n 헬스체크',
      isHealthy,
      isHealthy
        ? `HTTP ${healthResponse.status} - 서버 정상`
        : `HTTP ${healthResponse.status} - 서버 오류`
    );
    if (isHealthy) passedTests++;
  } catch (error) {
    logTest(
      'n8n 헬스체크',
      false,
      `연결 실패: ${error instanceof Error ? error.message : error}`
    );
  }

  // ============================================
  // 4. API 클라이언트 테스트
  // ============================================
  logSection('4. API 클라이언트 테스트');

  const client = createN8nClient();

  // 4.1 워크플로우 목록 조회
  totalTests++;
  try {
    const workflows = await client.workflows.getAll();
    const count = Array.isArray(workflows.data)
      ? workflows.data.length
      : workflows.data
      ? 1
      : 0;

    logTest(
      '워크플로우 목록 조회',
      true,
      `${count}개의 워크플로우 발견`
    );
    passedTests++;

    // 워크플로우가 있으면 상세 정보 출력
    if (count > 0) {
      const workflowList = Array.isArray(workflows.data)
        ? workflows.data
        : [workflows.data];

      console.log(`\n   ${colors.cyan}워크플로우 목록:${colors.reset}`);
      workflowList.slice(0, 5).forEach((wf: any) => {
        const status = wf.active ? '🟢 활성' : '⚪ 비활성';
        console.log(`   - ${status} ${wf.name} (ID: ${wf.id})`);
      });

      if (count > 5) {
        console.log(`   ... 외 ${count - 5}개\n`);
      }
    }
  } catch (error) {
    logTest(
      '워크플로우 목록 조회',
      false,
      `오류: ${error instanceof Error ? error.message : error}`
    );
  }

  // 4.2 실행 내역 조회
  totalTests++;
  try {
    const executions = await client.executions.getAll({ pageSize: 5 });
    const count = Array.isArray(executions.data)
      ? executions.data.length
      : executions.data
      ? 1
      : 0;

    logTest('실행 내역 조회', true, `최근 ${count}개의 실행 내역`);
    passedTests++;

    if (count > 0) {
      const executionList = Array.isArray(executions.data)
        ? executions.data
        : [executions.data];

      console.log(`\n   ${colors.cyan}최근 실행:${colors.reset}`);
      executionList.forEach((exec: any) => {
        const statusIcon =
          exec.status === 'success'
            ? '✅'
            : exec.status === 'error'
            ? '❌'
            : '⏳';
        const time = new Date(exec.startedAt).toLocaleString('ko-KR');
        console.log(`   - ${statusIcon} ${exec.status} (${time})`);
      });
    }
  } catch (error) {
    logTest(
      '실행 내역 조회',
      false,
      `오류: ${error instanceof Error ? error.message : error}`
    );
  }

  // ============================================
  // 5. Docker 컨테이너 상태 확인
  // ============================================
  logSection('5. Docker 컨테이너 상태 확인');

  const { execSync } = await import('child_process');

  totalTests++;
  try {
    const containers = execSync(
      'docker ps --filter "name=n8n" --format "{{.Names}}: {{.Status}}"',
      { encoding: 'utf-8' }
    );

    const hasN8n = containers.includes('n8n');
    logTest('n8n 컨테이너 실행 중', hasN8n, containers.trim() || '없음');
    if (hasN8n) passedTests++;
  } catch (error) {
    logTest('n8n 컨테이너 실행 중', false, 'Docker 명령 실패');
  }

  // ============================================
  // 최종 결과
  // ============================================
  logSection('테스트 결과 요약');

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  const allPassed = passedTests === totalTests;

  console.log(`총 테스트: ${totalTests}`);
  console.log(
    `${colors.green}통과: ${passedTests}${colors.reset}`
  );
  console.log(
    `${colors.red}실패: ${totalTests - passedTests}${colors.reset}`
  );
  console.log(`성공률: ${successRate}%\n`);

  if (allPassed) {
    console.log(
      `${colors.green}🎉 모든 테스트 통과! n8n 연결이 정상입니다.${colors.reset}\n`
    );
  } else {
    console.log(
      `${colors.yellow}⚠️  일부 테스트 실패. 설정을 확인하세요.${colors.reset}\n`
    );
  }

  // 다음 단계 안내
  console.log(`${colors.cyan}다음 단계:${colors.reset}`);
  console.log(`1. 샘플 워크플로우 실행 테스트:`);
  console.log(
    `   npx ts-node features/n8n-integration/test-workflow-execution.ts`
  );
  console.log(`2. WebSocket 연결 테스트:`);
  console.log(
    `   npx ts-node features/n8n-integration/test-websocket.ts`
  );
  console.log();

  process.exit(allPassed ? 0 : 1);
}

// 스크립트 실행
if (require.main === module) {
  // .env 파일 로드 시도
  try {
    require('dotenv').config();
  } catch {
    console.log(
      `${colors.yellow}⚠️  dotenv 패키지가 없습니다. npm install dotenv를 실행하세요.${colors.reset}\n`
    );
  }

  runTests().catch((error) => {
    console.error(`${colors.red}테스트 실행 중 오류 발생:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runTests };
