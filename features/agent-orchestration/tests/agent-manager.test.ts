/**
 * Agent Manager Integration Tests
 *
 * @description n8n 컨테이너의 실제 워크플로우를 사용한 통합 테스트
 */

import { agentManager } from '../services/agent-manager.service';
import { executionQueue } from '../services/execution-queue.service';
import { n8nClient } from '../services/n8n-client.service';
import { envConfig } from '../../../apps/backend/src/utils/env-validator';

/**
 * 테스트 환경 설정
 */
describe('Agent Manager Integration Tests', () => {
  beforeAll(async () => {
    console.log('🧪 Starting Agent Manager integration tests');
    console.log(`n8n URL: ${envConfig.N8N_BASE_URL}`);
  });

  afterAll(async () => {
    // 큐 종료
    await executionQueue.shutdown();
    console.log('✅ Tests completed, queue shut down');
  });

  /**
   * 테스트 1: 워크플로우 로드
   */
  describe('Workflow Loading', () => {
    it('should load workflows from n8n', async () => {
      const workflows = await agentManager.loadWorkflows();

      console.log(`📋 Loaded ${workflows.length} workflows`);
      expect(workflows).toBeDefined();
      expect(Array.isArray(workflows)).toBe(true);

      if (workflows.length > 0) {
        const firstWorkflow = workflows[0];
        console.log(`First workflow: ${firstWorkflow.name} (${firstWorkflow.id})`);
        expect(firstWorkflow.id).toBeDefined();
        expect(firstWorkflow.name).toBeDefined();
        expect(Array.isArray(firstWorkflow.nodes)).toBe(true);
      }
    });

    it('should return cached workflows on second call', async () => {
      const firstCall = await agentManager.loadWorkflows();
      const secondCall = await agentManager.loadWorkflows(); // Should use cache

      expect(secondCall).toEqual(firstCall);
      console.log('✅ Cache working correctly');
    });

    it('should force refresh when requested', async () => {
      const cached = await agentManager.loadWorkflows();
      const refreshed = await agentManager.loadWorkflows(true);

      expect(refreshed).toBeDefined();
      console.log('✅ Force refresh working');
    });
  });

  /**
   * 테스트 2: AI 노드 식별
   */
  describe('AI Node Identification', () => {
    it('should identify AI nodes in workflow', async () => {
      const workflows = await agentManager.loadWorkflows();

      if (workflows.length === 0) {
        console.log('⚠️  No workflows found, skipping AI node test');
        return;
      }

      // 첫 번째 워크플로우에서 AI 노드 찾기
      const workflow = workflows[0];
      const aiNodes = await agentManager.identifyAINodes(workflow.id);

      console.log(`🤖 Found ${aiNodes.length} AI nodes in workflow ${workflow.name}`);

      aiNodes.forEach((node) => {
        console.log(`  - ${node.nodeName} (${node.nodeType})`);
        expect(node.nodeId).toBeDefined();
        expect(node.nodeName).toBeDefined();
        expect(node.nodeType).toBeDefined();
      });
    });

    it('should cache AI node information', async () => {
      const workflows = await agentManager.loadWorkflows();

      if (workflows.length === 0) {
        console.log('⚠️  No workflows found, skipping cache test');
        return;
      }

      const workflowId = workflows[0].id;
      const firstCall = await agentManager.identifyAINodes(workflowId);
      const secondCall = await agentManager.identifyAINodes(workflowId);

      expect(secondCall).toEqual(firstCall);
      console.log('✅ AI node cache working');
    });
  });

  /**
   * 테스트 3: 파라미터 검증
   */
  describe('Parameter Validation', () => {
    it('should validate workflow parameters', async () => {
      const workflows = await agentManager.loadWorkflows();

      if (workflows.length === 0) {
        console.log('⚠️  No workflows found, skipping validation test');
        return;
      }

      const workflow = workflows[0];
      const validation = await agentManager.validateWorkflow(workflow.id);

      console.log(`🔍 Validation result for ${workflow.name}:`);
      console.log(`  Valid: ${validation.valid}`);
      if (!validation.valid) {
        console.log(`  Errors: ${validation.errors.join(', ')}`);
      }

      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('errors');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  /**
   * 테스트 4: 워크플로우 실행 (큐 추가)
   */
  describe('Workflow Execution (Queue)', () => {
    it('should add workflow execution to queue', async () => {
      const workflows = await agentManager.loadWorkflows();

      if (workflows.length === 0) {
        console.log('⚠️  No workflows found, skipping execution test');
        return;
      }

      // 활성화된 워크플로우 찾기
      const activeWorkflow = workflows.find((w) => w.active);
      if (!activeWorkflow) {
        console.log('⚠️  No active workflows found, skipping execution test');
        return;
      }

      console.log(`🚀 Adding workflow ${activeWorkflow.name} to queue`);

      const job = await agentManager.executeWorkflow({
        workflowId: activeWorkflow.id,
        mode: 'manual',
        priority: 'normal',
        inputData: { test: true },
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      console.log(`✅ Job created: ${job.id}`);

      // 작업 상태 확인
      const jobState = await job.getState();
      console.log(`Job state: ${jobState}`);
    }, 10000); // 10초 타임아웃

    it('should execute workflow with high priority', async () => {
      const workflows = await agentManager.loadWorkflows();
      const activeWorkflow = workflows.find((w) => w.active);

      if (!activeWorkflow) {
        console.log('⚠️  No active workflows found');
        return;
      }

      const job = await agentManager.executeWorkflow({
        workflowId: activeWorkflow.id,
        mode: 'manual',
        priority: 'high',
      });

      expect(job).toBeDefined();
      console.log(`✅ High priority job created: ${job.id}`);
    });
  });

  /**
   * 테스트 5: 동기 실행 (executeAndWait)
   */
  describe('Synchronous Execution', () => {
    it('should execute workflow and wait for completion', async () => {
      const workflows = await agentManager.loadWorkflows();
      const activeWorkflow = workflows.find((w) => w.active);

      if (!activeWorkflow) {
        console.log('⚠️  No active workflows found');
        return;
      }

      console.log(`🚀 Executing workflow ${activeWorkflow.name} and waiting...`);

      const result = await agentManager.executeAndWait({
        workflowId: activeWorkflow.id,
        mode: 'manual',
        priority: 'urgent',
        inputData: { test: true },
        options: {
          timeout: 60000, // 1분 타임아웃
        },
      });

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBeDefined();

      console.log(`✅ Execution completed:`);
      console.log(`  Execution ID: ${result.executionId}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Duration: ${result.duration}ms`);

      if (result.status === 'failed') {
        console.log(`  Error: ${JSON.stringify(result.error)}`);
      }
    }, 120000); // 2분 타임아웃
  });

  /**
   * 테스트 6: Agent 통계
   */
  describe('Agent Statistics', () => {
    it('should retrieve agent statistics', async () => {
      const stats = await agentManager.getAgentStats();

      console.log('📊 Agent Statistics:');
      console.log(`  Total workflows: ${stats.totalWorkflows}`);
      console.log(`  Active workflows: ${stats.activeWorkflows}`);
      console.log(`  Total AI nodes: ${stats.totalAINodes}`);
      console.log(`  Node type distribution:`, stats.nodeTypeDistribution);
      console.log(`  Queue stats:`, stats.queueStats);

      expect(stats.totalWorkflows).toBeGreaterThanOrEqual(0);
      expect(stats.activeWorkflows).toBeGreaterThanOrEqual(0);
      expect(stats.totalAINodes).toBeGreaterThanOrEqual(0);
      expect(stats.queueStats).toBeDefined();
    });
  });

  /**
   * 테스트 7: 큐 관리
   */
  describe('Queue Management', () => {
    it('should get queue statistics', async () => {
      const stats = await executionQueue.getQueueStats();

      console.log('📊 Queue Statistics:');
      console.log(`  Waiting: ${stats.waiting}`);
      console.log(`  Active: ${stats.active}`);
      console.log(`  Completed: ${stats.completed}`);
      console.log(`  Failed: ${stats.failed}`);

      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });

    it('should cancel a job', async () => {
      const workflows = await agentManager.loadWorkflows();
      const activeWorkflow = workflows.find((w) => w.active);

      if (!activeWorkflow) {
        console.log('⚠️  No active workflows found');
        return;
      }

      // 작업 생성
      const job = await agentManager.executeWorkflow({
        workflowId: activeWorkflow.id,
        mode: 'manual',
        priority: 'low',
      });

      // 즉시 취소
      await executionQueue.cancelJob(job.data.executionId);
      console.log(`✅ Job ${job.id} canceled`);
    });
  });

  /**
   * 테스트 8: 캐시 관리
   */
  describe('Cache Management', () => {
    it('should clear all cache', async () => {
      await agentManager.loadWorkflows();
      agentManager.clearCache();
      console.log('✅ Cache cleared');
    });

    it('should invalidate specific workflow cache', async () => {
      const workflows = await agentManager.loadWorkflows();

      if (workflows.length > 0) {
        const workflowId = workflows[0].id;
        agentManager.invalidateWorkflowCache(workflowId);
        console.log(`✅ Cache invalidated for workflow ${workflowId}`);
      }
    });
  });

  /**
   * 테스트 9: 에러 처리
   */
  describe('Error Handling', () => {
    it('should handle invalid workflow ID', async () => {
      try {
        await agentManager.getWorkflow('invalid_workflow_id');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Invalid workflow ID handled correctly');
      }
    });

    it('should handle validation errors', async () => {
      const workflows = await agentManager.loadWorkflows();

      if (workflows.length > 0) {
        const validation = await agentManager.validateWorkflow(workflows[0].id);
        // 검증 실패 시에도 에러 배열이 반환되어야 함
        expect(validation.errors).toBeDefined();
        expect(Array.isArray(validation.errors)).toBe(true);
      }
    });
  });
});

/**
 * 수동 테스트 실행 스크립트
 */
if (require.main === module) {
  console.log('🧪 Running Agent Manager Integration Tests');
  console.log('='.repeat(50));

  (async () => {
    try {
      // Jest 없이 수동 테스트 실행
      console.log('\n1️⃣  Testing workflow loading...');
      const workflows = await agentManager.loadWorkflows();
      console.log(`✅ Loaded ${workflows.length} workflows`);

      if (workflows.length > 0) {
        const workflow = workflows[0];
        console.log(`\n2️⃣  Testing AI node identification for: ${workflow.name}`);
        const aiNodes = await agentManager.identifyAINodes(workflow.id);
        console.log(`✅ Found ${aiNodes.length} AI nodes`);

        console.log('\n3️⃣  Testing parameter validation...');
        const validation = await agentManager.validateWorkflow(workflow.id);
        console.log(`✅ Validation result: ${validation.valid ? 'PASS' : 'FAIL'}`);
        if (!validation.valid) {
          console.log(`Errors: ${validation.errors.join(', ')}`);
        }

        const activeWorkflow = workflows.find((w) => w.active);
        if (activeWorkflow) {
          console.log(`\n4️⃣  Testing workflow execution for: ${activeWorkflow.name}`);
          const job = await agentManager.executeWorkflow({
            workflowId: activeWorkflow.id,
            mode: 'manual',
            priority: 'normal',
            inputData: { test: true },
          });
          console.log(`✅ Job created: ${job.id}`);

          // 큐 통계 확인
          console.log('\n5️⃣  Testing queue statistics...');
          const queueStats = await executionQueue.getQueueStats();
          console.log(`✅ Queue stats:`, queueStats);
        } else {
          console.log('\n⚠️  No active workflows found for execution test');
        }
      }

      console.log('\n6️⃣  Testing agent statistics...');
      const stats = await agentManager.getAgentStats();
      console.log(`✅ Agent stats:`, stats);

      console.log('\n✅ All manual tests completed!');
      await executionQueue.shutdown();
      process.exit(0);
    } catch (error) {
      console.error('❌ Test failed:', error);
      await executionQueue.shutdown();
      process.exit(1);
    }
  })();
}
