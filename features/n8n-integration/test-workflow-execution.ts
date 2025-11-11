#!/usr/bin/env ts-node
/**
 * 샘플 워크플로우 실행 테스트
 *
 * @description n8n 워크플로우를 실제로 실행하고 결과를 검증합니다
 *
 * Usage:
 *   npx ts-node features/n8n-integration/test-workflow-execution.ts [workflow-id]
 */

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
    info: '📋',
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
 * 워크플로우 실행 결과 출력
 */
function printExecutionResult(execution: WorkflowExecution): void {
  const statusIcon = execution.status === 'success' ? '✅' :
                     execution.status === 'error' ? '❌' : '⏳';

  console.log(`\n${colors.cyan}실행 결과:${colors.reset}`);
  console.log(`   상태: ${statusIcon} ${execution.status}`);
  console.log(`   실행 ID: ${colors.magenta}${execution.id}${colors.reset}`);
  console.log(`   워크플로우 ID: ${execution.workflowId}`);
  console.log(`   모드: ${execution.mode}`);
  console.log(`   시작 시간: ${new Date(execution.startedAt).toLocaleString('ko-KR')}`);

  if (execution.finishedAt) {
    const duration = new Date(execution.finishedAt).getTime() -
                    new Date(execution.startedAt).getTime();
    console.log(`   종료 시간: ${new Date(execution.finishedAt).toLocaleString('ko-KR')}`);
    console.log(`   실행 시간: ${colors.cyan}${duration}ms${colors.reset}`);
  }

  // 노드별 실행 정보
  if (execution.data?.resultData?.runData) {
    const runData = execution.data.resultData.runData;
    const nodeNames = Object.keys(runData);

    if (nodeNames.length > 0) {
      console.log(`\n${colors.cyan}노드 실행 정보 (${nodeNames.length}개):${colors.reset}`);

      nodeNames.forEach((nodeName) => {
        const nodeData = runData[nodeName];
        if (nodeData && nodeData.length > 0) {
          const lastRun = nodeData[nodeData.length - 1];
          const nodeStatus = lastRun.error ? '❌ 실패' : '✅ 성공';
          const execTime = lastRun.executionTime || 0;

          console.log(`   ${nodeStatus} ${nodeName} (${execTime}ms)`);

          // 오류가 있으면 표시
          if (lastRun.error) {
            console.log(`      ${colors.red}오류: ${lastRun.error.message}${colors.reset}`);
          }

          // 출력 데이터 미리보기
          const mainData = lastRun.data?.main?.[0];
          if (mainData && mainData.length > 0) {
            const itemCount = mainData.length;
            console.log(`      ${colors.cyan}출력: ${itemCount}개 항목${colors.reset}`);

            // 첫 번째 항목 미리보기
            if (mainData[0]?.json) {
              const preview = JSON.stringify(mainData[0].json, null, 2)
                .split('\n')
                .slice(0, 5)
                .join('\n');
              console.log(`      미리보기:\n${preview}...`);
            }
          }
        }
      });
    }
  }

  // 오류 정보
  if (execution.error) {
    console.log(`\n${colors.red}오류 정보:${colors.reset}`);
    console.log(`   메시지: ${execution.error.message}`);
    if (execution.error.node) {
      console.log(`   발생 노드: ${execution.error.node}`);
    }
    if (execution.error.stack) {
      console.log(`   스택 트레이스:\n${execution.error.stack}`);
    }
  }
}

/**
 * 메인 테스트 함수
 */
async function runWorkflowTest(): Promise<void> {
  console.log(`${colors.cyan}n8n 워크플로우 실행 테스트${colors.reset}\n`);

  const client = createN8nClient();

  try {
    // 1. 워크플로우 목록 조회
    logSection('1. 워크플로우 목록 조회');

    const workflows = await client.workflows.getAll({ active: true });
    const workflowList = Array.isArray(workflows.data) ? workflows.data :
                        workflows.data ? [workflows.data] : [];

    if (workflowList.length === 0) {
      log('warning', '활성화된 워크플로우가 없습니다');
      console.log(`\n${colors.yellow}n8n UI에서 워크플로우를 생성하고 활성화하세요:${colors.reset}`);
      console.log(`   http://localhost:5678`);
      process.exit(0);
    }

    log('success', `${workflowList.length}개의 활성 워크플로우 발견`);

    // 워크플로우 목록 출력
    console.log(`\n${colors.cyan}활성 워크플로우:${colors.reset}`);
    workflowList.forEach((wf: any, index: number) => {
      const trigger = wf.nodes?.find((n: any) =>
        n.type.includes('trigger') || n.type.includes('webhook')
      );
      const triggerType = trigger ? trigger.type.split('.').pop() : '알 수 없음';

      console.log(`   ${index + 1}. ${colors.magenta}${wf.name}${colors.reset}`);
      console.log(`      ID: ${wf.id}`);
      console.log(`      트리거: ${triggerType}`);
      console.log(`      노드 수: ${wf.nodes?.length || 0}`);
    });

    // 2. 워크플로우 선택
    logSection('2. 워크플로우 선택');

    // 명령줄 인자 확인
    const workflowIdArg = process.argv[2];
    let selectedWorkflow: any;

    if (workflowIdArg) {
      selectedWorkflow = workflowList.find((wf: any) => wf.id === workflowIdArg);
      if (!selectedWorkflow) {
        log('error', `워크플로우 ID "${workflowIdArg}"를 찾을 수 없습니다`);
        process.exit(1);
      }
      log('info', `지정된 워크플로우: ${selectedWorkflow.name}`);
    } else {
      // 첫 번째 수동 실행 가능한 워크플로우 선택
      selectedWorkflow = workflowList.find((wf: any) => {
        const hasManualTrigger = wf.nodes?.some((n: any) =>
          n.type.includes('manualTrigger') || !n.type.includes('trigger')
        );
        return hasManualTrigger;
      }) || workflowList[0];

      log('info', `자동 선택: ${selectedWorkflow.name}`);
      console.log(`\n${colors.yellow}💡 Tip: 특정 워크플로우 실행하려면:${colors.reset}`);
      console.log(`   npx ts-node features/n8n-integration/test-workflow-execution.ts <workflow-id>`);
    }

    // 3. 워크플로우 실행
    logSection('3. 워크플로우 실행');

    log('info', `워크플로우 실행 중: ${selectedWorkflow.name}`);

    // 테스트 데이터 준비
    const testData = {
      timestamp: new Date().toISOString(),
      source: 'test-workflow-execution',
      testMode: true,
      data: {
        message: 'Test execution from gonsai2',
        userId: 'test-user-123',
        action: 'test_workflow',
      },
    };

    console.log(`\n${colors.cyan}입력 데이터:${colors.reset}`);
    console.log(JSON.stringify(testData, null, 2));

    const execution = await client.executions.execute(
      selectedWorkflow.id,
      testData
    );

    log('success', `실행 시작됨: ${execution.id}`);

    // 4. 실행 완료 대기
    logSection('4. 실행 완료 대기');

    log('info', '워크플로우 완료를 기다리는 중...');
    console.log(`${colors.yellow}(최대 60초 대기)${colors.reset}\n`);

    const startTime = Date.now();
    let lastStatus = '';

    // 상태 폴링 표시
    const pollInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stdout.write(`\r${colors.cyan}대기 중... ${elapsed}초 경과${colors.reset}`);
    }, 1000);

    try {
      const completedExecution = await client.executions.waitForCompletion(
        execution.id,
        {
          maxWaitMs: 60000,      // 60초
          pollIntervalMs: 2000,  // 2초마다 확인
        }
      );

      clearInterval(pollInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // 진행 표시 지우기

      const totalTime = Date.now() - startTime;

      if (completedExecution.status === 'success') {
        log('success', `워크플로우 완료 (${totalTime}ms)`);
      } else if (completedExecution.status === 'error') {
        log('error', `워크플로우 실패 (${totalTime}ms)`);
      } else {
        log('warning', `워크플로우 상태: ${completedExecution.status}`);
      }

      // 5. 결과 출력
      logSection('5. 실행 결과');
      printExecutionResult(completedExecution);

      // 6. 결과 검증
      logSection('6. 결과 검증');

      const isSuccess = completedExecution.status === 'success';
      const hasOutput = completedExecution.data?.resultData?.runData &&
                       Object.keys(completedExecution.data.resultData.runData).length > 0;

      log(isSuccess ? 'success' : 'error',
          `실행 상태: ${completedExecution.status}`);
      log(hasOutput ? 'success' : 'warning',
          `출력 데이터: ${hasOutput ? '있음' : '없음'}`);

      if (!isSuccess) {
        console.log(`\n${colors.yellow}워크플로우 디버깅:${colors.reset}`);
        console.log(`1. n8n UI에서 워크플로우 열기: http://localhost:5678/workflow/${selectedWorkflow.id}`);
        console.log(`2. 실행 내역 확인: http://localhost:5678/executions`);
        console.log(`3. 각 노드의 입력/출력 데이터 확인`);
      }

      // 최종 요약
      logSection('테스트 요약');

      console.log(`워크플로우: ${colors.magenta}${selectedWorkflow.name}${colors.reset}`);
      console.log(`실행 ID: ${colors.cyan}${execution.id}${colors.reset}`);
      console.log(`상태: ${isSuccess ? colors.green : colors.red}${completedExecution.status}${colors.reset}`);
      console.log(`실행 시간: ${totalTime}ms`);

      process.exit(isSuccess ? 0 : 1);

    } catch (error) {
      clearInterval(pollInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r');

      if (error instanceof Error && error.message.includes('timeout')) {
        log('warning', '워크플로우 실행 타임아웃 (60초 초과)');
        console.log(`\n${colors.yellow}워크플로우가 아직 실행 중일 수 있습니다${colors.reset}`);
        console.log(`n8n UI에서 확인: http://localhost:5678/executions`);
        process.exit(2);
      }

      throw error;
    }

  } catch (error) {
    log('error', `테스트 실패: ${error instanceof Error ? error.message : error}`);

    if (error instanceof Error) {
      console.error(`\n${colors.red}오류 상세:${colors.reset}`);
      console.error(error.stack);
    }

    console.log(`\n${colors.yellow}문제 해결:${colors.reset}`);
    console.log(`1. .env 파일에 N8N_API_KEY가 설정되어 있는지 확인`);
    console.log(`2. n8n 컨테이너가 실행 중인지 확인: docker ps | grep n8n`);
    console.log(`3. API Key가 유효한지 n8n UI에서 확인`);

    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  // .env 파일 로드
  try {
    require('dotenv').config();
  } catch {
    console.log(`${colors.yellow}⚠️  dotenv 패키지가 없습니다${colors.reset}`);
  }

  runWorkflowTest();
}

export { runWorkflowTest };
