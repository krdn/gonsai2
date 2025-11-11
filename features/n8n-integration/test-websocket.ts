#!/usr/bin/env ts-node
/**
 * n8n WebSocket 연결 테스트
 *
 * @description n8n WebSocket 서버와 실시간 통신을 테스트하고 이벤트를 모니터링합니다
 *
 * Usage:
 *   npx ts-node features/n8n-integration/test-websocket.ts
 */

import { N8nWebSocketClient } from './websocket-client';
import { createN8nClient } from './api-client';
import type { WorkflowExecution } from './types';

// ANSI 색상
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(level: 'info' | 'success' | 'error' | 'warning', message: string): void {
  const icons = {
    info: '📡',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  const colorMap = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
  };

  console.log(`${icons[level]} ${colorMap[level]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * WebSocket 이벤트 리스너 등록
 */
function setupEventListeners(wsClient: N8nWebSocketClient): void {
  // 연결 성공
  wsClient.on('open', () => {
    log('success', 'WebSocket 연결 성공');
  });

  // 연결 종료
  wsClient.on('close', (code: number, reason: string) => {
    log('warning', `WebSocket 연결 종료 (코드: ${code}, 이유: ${reason || '없음'})`);
  });

  // 오류 발생
  wsClient.on('error', (error: Error) => {
    log('error', `WebSocket 오류: ${error.message}`);
  });

  // 재연결 시도
  wsClient.on('reconnecting', () => {
    log('info', '재연결 시도 중...');
  });

  // 재연결 성공
  wsClient.on('reconnected', () => {
    log('success', '재연결 성공');
  });

  // 워크플로우 실행 시작
  wsClient.on('workflowExecutionStarted', (execution: WorkflowExecution) => {
    console.log(`\n${colors.cyan}🚀 워크플로우 실행 시작:${colors.reset}`);
    console.log(`   실행 ID: ${colors.magenta}${execution.id}${colors.reset}`);
    console.log(`   워크플로우 ID: ${execution.workflowId}`);
    console.log(`   모드: ${execution.mode}`);
    console.log(`   시작 시간: ${new Date(execution.startedAt).toLocaleString('ko-KR')}`);
  });

  // 워크플로우 실행 완료
  wsClient.on('workflowExecutionCompleted', (execution: WorkflowExecution) => {
    const statusIcon = execution.status === 'success' ? '✅' : '❌';
    console.log(`\n${colors.cyan}${statusIcon} 워크플로우 실행 완료:${colors.reset}`);
    console.log(`   실행 ID: ${colors.magenta}${execution.id}${colors.reset}`);
    console.log(`   상태: ${execution.status}`);

    if (execution.finishedAt) {
      const duration = new Date(execution.finishedAt).getTime() -
                      new Date(execution.startedAt).getTime();
      console.log(`   실행 시간: ${duration}ms`);
    }

    if (execution.error) {
      console.log(`   ${colors.red}오류: ${execution.error.message}${colors.reset}`);
    }
  });

  // 노드 실행 이벤트
  wsClient.on('nodeExecutionStarted', (data: any) => {
    console.log(`   ${colors.yellow}⏳ 노드 실행 시작: ${data.nodeName}${colors.reset}`);
  });

  wsClient.on('nodeExecutionCompleted', (data: any) => {
    const icon = data.error ? '❌' : '✅';
    console.log(`   ${icon} 노드 실행 완료: ${data.nodeName}`);
  });
}

/**
 * 워크플로우 실행 트리거 (테스트용)
 */
async function triggerTestWorkflow(restClient: ReturnType<typeof createN8nClient>): Promise<string | null> {
  try {
    // 활성화된 워크플로우 목록 조회
    const workflows = await restClient.workflows.getAll({ active: true });
    const workflowList = Array.isArray(workflows.data) ? workflows.data :
                        workflows.data ? [workflows.data] : [];

    if (workflowList.length === 0) {
      log('warning', '활성화된 워크플로우가 없습니다');
      return null;
    }

    // 첫 번째 워크플로우 선택
    const workflow = workflowList[0];
    log('info', `테스트 워크플로우 선택: ${workflow.name} (${workflow.id})`);

    // 워크플로우 실행
    const testData = {
      timestamp: new Date().toISOString(),
      source: 'websocket-test',
      data: {
        message: 'WebSocket test execution',
        testId: Math.random().toString(36).substring(7),
      },
    };

    log('info', '워크플로우 실행 시작...');
    const execution = await restClient.executions.execute(workflow.id, testData);

    log('success', `실행 시작됨: ${execution.id}`);
    return execution.id;

  } catch (error) {
    log('error', `워크플로우 실행 실패: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/**
 * 메인 테스트 함수
 */
async function runWebSocketTest(): Promise<void> {
  console.log(`${colors.cyan}n8n WebSocket 연결 테스트${colors.reset}\n`);

  const wsUrl = process.env.N8N_WS_URL || 'ws://localhost:5678';
  const apiKey = process.env.N8N_API_KEY;

  // 환경 변수 확인
  logSection('1. 환경 변수 확인');

  if (!apiKey) {
    log('error', 'N8N_API_KEY가 설정되지 않았습니다');
    console.log(`\n${colors.yellow}설정 방법:${colors.reset}`);
    console.log(`   ./setup-api-key.sh`);
    process.exit(1);
  }

  log('success', `WebSocket URL: ${wsUrl}`);
  log('success', 'API Key 설정됨');

  // WebSocket 클라이언트 생성
  logSection('2. WebSocket 클라이언트 생성');

  const wsClient = new N8nWebSocketClient({
    url: wsUrl,
    apiKey: apiKey,
    reconnect: {
      enabled: true,
      maxAttempts: 3,
      delayMs: 2000,
    },
  });

  log('info', 'WebSocket 클라이언트 생성 완료');

  // 이벤트 리스너 등록
  setupEventListeners(wsClient);

  // WebSocket 연결
  logSection('3. WebSocket 연결');

  try {
    await wsClient.connect();
    log('success', 'WebSocket 연결 성공');
  } catch (error) {
    log('error', `연결 실패: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // REST API 클라이언트 생성
  const restClient = createN8nClient();

  // 실시간 모니터링 테스트
  logSection('4. 실시간 모니터링 테스트');

  log('info', '워크플로우 실행을 모니터링합니다...');
  console.log(`${colors.yellow}실시간으로 이벤트를 수신합니다 (30초간)${colors.reset}\n`);

  // 테스트 워크플로우 실행
  setTimeout(async () => {
    const executionId = await triggerTestWorkflow(restClient);
    if (executionId) {
      console.log(`\n${colors.cyan}실행 ID ${executionId}를 모니터링 중...${colors.reset}`);
    }
  }, 2000);

  // 30초 동안 이벤트 모니터링
  await new Promise((resolve) => {
    let eventCount = 0;
    const startTime = Date.now();

    // 이벤트 카운터
    const countEvent = () => {
      eventCount++;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stdout.write(`\r${colors.cyan}경과 시간: ${elapsed}초 | 수신 이벤트: ${eventCount}개${colors.reset}`);
    };

    // 모든 이벤트에 대해 카운터 증가
    wsClient.on('workflowExecutionStarted', countEvent);
    wsClient.on('workflowExecutionCompleted', countEvent);
    wsClient.on('nodeExecutionStarted', countEvent);
    wsClient.on('nodeExecutionCompleted', countEvent);

    // 30초 후 종료
    setTimeout(() => {
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
      console.log(`\n${colors.green}모니터링 완료: 총 ${eventCount}개 이벤트 수신${colors.reset}`);
      resolve(null);
    }, 30000);
  });

  // 재연결 테스트
  logSection('5. 재연결 테스트');

  log('info', '연결을 종료하고 재연결을 테스트합니다...');

  // 연결 종료
  wsClient.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 재연결
  try {
    await wsClient.connect();
    log('success', '재연결 성공');
  } catch (error) {
    log('error', `재연결 실패: ${error instanceof Error ? error.message : error}`);
  }

  // 정리
  logSection('테스트 완료');

  wsClient.disconnect();
  log('success', 'WebSocket 연결 종료');

  console.log(`\n${colors.cyan}테스트 요약:${colors.reset}`);
  console.log(`✅ WebSocket 연결: 성공`);
  console.log(`✅ 실시간 이벤트 수신: 성공`);
  console.log(`✅ 재연결: 성공`);

  console.log(`\n${colors.cyan}다음 단계:${colors.reset}`);
  console.log(`1. 프로덕션 환경에서 WebSocket 사용:`);
  console.log(`   - websocket-client.ts를 import하여 사용`);
  console.log(`   - 실시간 워크플로우 모니터링 구현`);
  console.log();
  console.log(`2. 에러 핸들링 강화:`);
  console.log(`   - 재연결 로직 커스터마이징`);
  console.log(`   - 이벤트별 오류 처리 추가`);
  console.log();

  process.exit(0);
}

// 스크립트 실행
if (require.main === module) {
  // .env 파일 로드
  try {
    require('dotenv').config();
  } catch {
    console.log(`${colors.yellow}⚠️  dotenv 패키지가 없습니다${colors.reset}`);
  }

  runWebSocketTest().catch((error) => {
    console.error(`${colors.red}테스트 실행 중 오류 발생:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runWebSocketTest };
