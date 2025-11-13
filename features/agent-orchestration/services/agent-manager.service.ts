/**
 * Agent Manager Service
 *
 * @description AI Agent 워크플로우 관리 및 실행 조정
 */

import { Job } from 'bull';
import { log } from '../../../apps/backend/src/utils/logger';
import { n8nClient } from './n8n-client.service';
import { executionQueue } from './execution-queue.service';
import {
  N8nWorkflow,
  N8nNode,
  AINodeType,
  AINodeInfo,
  ExecutionRequest,
  ExecutionResult,
  ExecutionPriority,
  AgentStats,
} from '../types/agent.types';

/**
 * AI 노드 타입 매핑
 */
const AI_NODE_TYPES: AINodeType[] = [
  'n8n-nodes-base.openAi',
  'n8n-nodes-base.openAiChat',
  '@n8n/n8n-nodes-langchain.chatOpenAi',
  '@n8n/n8n-nodes-langchain.chatAnthropic',
];

/**
 * 노드 파라미터 검증 규칙
 */
interface ValidationRule {
  parameter: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
}

const NODE_VALIDATION_RULES: Record<string, ValidationRule[]> = {
  'n8n-nodes-base.openAi': [
    { parameter: 'model', required: true, type: 'string' },
    { parameter: 'prompt', required: true, type: 'string', minLength: 1 },
  ],
  'n8n-nodes-base.openAiChat': [
    { parameter: 'model', required: true, type: 'string' },
    { parameter: 'messages', required: true, type: 'object' },
  ],
  '@n8n/n8n-nodes-langchain.chatOpenAi': [
    { parameter: 'model', required: true, type: 'string' },
  ],
  '@n8n/n8n-nodes-langchain.chatAnthropic': [
    { parameter: 'model', required: true, type: 'string' },
  ],
};

/**
 * Agent Manager 클래스
 */
export class AgentManagerService {
  private workflowCache: Map<string, N8nWorkflow> = new Map();
  private aiNodeCache: Map<string, AINodeInfo[]> = new Map();

  constructor() {
    log.info('Agent Manager Service initialized');
  }

  /**
   * 워크플로우 목록 로드 및 캐싱
   */
  async loadWorkflows(forceRefresh: boolean = false): Promise<N8nWorkflow[]> {
    try {
      if (!forceRefresh && this.workflowCache.size > 0) {
        log.info('Returning cached workflows', { count: this.workflowCache.size });
        return Array.from(this.workflowCache.values());
      }

      log.info('Loading workflows from n8n');
      const workflows = await n8nClient.getWorkflows();

      // 캐시 업데이트
      this.workflowCache.clear();
      workflows.forEach((workflow) => {
        this.workflowCache.set(workflow.id, workflow);
      });

      log.info('Workflows loaded and cached', { count: workflows.length });
      return workflows;
    } catch (error) {
      log.error('Failed to load workflows', error);
      throw error;
    }
  }

  /**
   * 특정 워크플로우 로드
   */
  async getWorkflow(workflowId: string, forceRefresh: boolean = false): Promise<N8nWorkflow> {
    try {
      // 캐시 확인
      if (!forceRefresh && this.workflowCache.has(workflowId)) {
        log.info('Returning cached workflow', { workflowId });
        return this.workflowCache.get(workflowId)!;
      }

      log.info('Loading workflow from n8n', { workflowId });
      const workflow = await n8nClient.getWorkflow(workflowId);

      // 캐시 업데이트
      this.workflowCache.set(workflowId, workflow);

      return workflow;
    } catch (error) {
      log.error('Failed to load workflow', error, { workflowId });
      throw error;
    }
  }

  /**
   * AI 노드 식별
   */
  async identifyAINodes(workflowId: string): Promise<AINodeInfo[]> {
    try {
      // 캐시 확인
      if (this.aiNodeCache.has(workflowId)) {
        log.info('Returning cached AI nodes', { workflowId });
        return this.aiNodeCache.get(workflowId)!;
      }

      // 워크플로우 로드
      const workflow = await this.getWorkflow(workflowId);

      // AI 노드 필터링
      const aiNodes: AINodeInfo[] = workflow.nodes
        .filter((node) => AI_NODE_TYPES.includes(node.type as AINodeType))
        .map((node) => ({
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type as AINodeType,
          position: node.position,
          parameters: node.parameters,
        }));

      // 캐시 업데이트
      this.aiNodeCache.set(workflowId, aiNodes);

      log.info('AI nodes identified', {
        workflowId,
        aiNodeCount: aiNodes.length,
        nodeTypes: aiNodes.map((n) => n.nodeType),
      });

      return aiNodes;
    } catch (error) {
      log.error('Failed to identify AI nodes', error, { workflowId });
      throw error;
    }
  }

  /**
   * 노드 파라미터 검증
   */
  validateNodeParameters(node: N8nNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rules = NODE_VALIDATION_RULES[node.type];

    if (!rules) {
      log.warn('No validation rules for node type', { nodeType: node.type });
      return { valid: true, errors: [] };
    }

    rules.forEach((rule) => {
      const value = node.parameters[rule.parameter];

      // Required 검증
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Missing required parameter: ${rule.parameter}`);
        return;
      }

      if (value === undefined || value === null) {
        return; // Optional parameter not provided
      }

      // Type 검증
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push(`Invalid type for ${rule.parameter}: expected ${rule.type}, got ${actualType}`);
      }

      // String length 검증
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${rule.parameter} is too short (min: ${rule.minLength})`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${rule.parameter} is too long (max: ${rule.maxLength})`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 워크플로우 파라미터 검증
   */
  async validateWorkflow(workflowId: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      const aiNodes = await this.identifyAINodes(workflowId);

      if (aiNodes.length === 0) {
        return {
          valid: false,
          errors: ['No AI nodes found in workflow'],
        };
      }

      const allErrors: string[] = [];

      // 각 AI 노드 검증
      aiNodes.forEach((aiNodeInfo) => {
        const node = workflow.nodes.find((n) => n.id === aiNodeInfo.nodeId);
        if (!node) {
          allErrors.push(`AI node not found: ${aiNodeInfo.nodeId}`);
          return;
        }

        const validation = this.validateNodeParameters(node);
        if (!validation.valid) {
          allErrors.push(`Node ${node.name}: ${validation.errors.join(', ')}`);
        }
      });

      return {
        valid: allErrors.length === 0,
        errors: allErrors,
      };
    } catch (error) {
      log.error('Failed to validate workflow', error, { workflowId });
      throw error;
    }
  }

  /**
   * 워크플로우 실행 조정 (큐에 추가)
   */
  async executeWorkflow(request: ExecutionRequest): Promise<Job<any>> {
    try {
      log.info('Coordinating workflow execution', {
        workflowId: request.workflowId,
        mode: request.mode,
        priority: request.priority,
      });

      // 워크플로우 검증
      const validation = await this.validateWorkflow(request.workflowId);
      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // 실행 ID 생성
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 큐에 작업 추가
      const job = await executionQueue.addJob(
        {
          executionId,
          workflowId: request.workflowId,
          mode: request.mode,
          inputData: request.inputData,
          options: request.options,
          createdAt: new Date(),
        },
        request.priority || 'normal'
      );

      log.info('Workflow execution job created', {
        jobId: job.id,
        executionId,
        workflowId: request.workflowId,
      });

      return job;
    } catch (error) {
      log.error('Failed to coordinate workflow execution', error, {
        workflowId: request.workflowId,
      });
      throw error;
    }
  }

  /**
   * 워크플로우 실행 및 결과 대기
   */
  async executeAndWait(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      const job = await this.executeWorkflow({
        ...request,
        options: {
          ...request.options,
          waitForExecution: true,
        },
      });

      // Job 완료 대기
      const result = await job.finished();

      log.info('Workflow execution completed', {
        jobId: job.id,
        executionId: result.executionId,
        status: result.status,
      });

      return {
        executionId: result.executionId,
        workflowId: request.workflowId,
        status: result.status,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        duration: result.duration,
        outputData: result.outputData,
      };
    } catch (error) {
      log.error('Failed to execute and wait for workflow', error, {
        workflowId: request.workflowId,
      });
      throw error;
    }
  }

  /**
   * Agent 통계 조회
   */
  async getAgentStats(): Promise<AgentStats> {
    try {
      const workflows = await this.loadWorkflows();
      const queueStats = await executionQueue.getQueueStats();

      // AI 노드 통계
      let totalAINodes = 0;
      const nodeTypeCount: Record<string, number> = {};

      for (const workflow of workflows) {
        const aiNodes = await this.identifyAINodes(workflow.id);
        totalAINodes += aiNodes.length;

        aiNodes.forEach((node) => {
          nodeTypeCount[node.nodeType] = (nodeTypeCount[node.nodeType] || 0) + 1;
        });
      }

      return {
        totalWorkflows: workflows.length,
        activeWorkflows: workflows.filter((w) => w.active).length,
        totalAINodes,
        nodeTypeDistribution: nodeTypeCount,
        queueStats,
      };
    } catch (error) {
      log.error('Failed to get agent stats', error);
      throw error;
    }
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.workflowCache.clear();
    this.aiNodeCache.clear();
    log.info('Agent Manager cache cleared');
  }

  /**
   * 특정 워크플로우 캐시 무효화
   */
  invalidateWorkflowCache(workflowId: string): void {
    this.workflowCache.delete(workflowId);
    this.aiNodeCache.delete(workflowId);
    log.info('Workflow cache invalidated', { workflowId });
  }
}

/**
 * 싱글톤 인스턴스
 */
export const agentManager = new AgentManagerService();
