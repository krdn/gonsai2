/**
 * Workflow Utilities
 *
 * @description n8n 워크플로우 데이터를 React Flow 형식으로 변환
 */

import type { Node, Edge } from 'reactflow';
import type { N8nWorkflow, N8nNode } from '@/types/workflow';

export interface WorkflowFlowData {
  nodes: Node[];
  edges: Edge[];
}

/**
 * n8n 워크플로우를 React Flow 형식으로 변환
 */
export function convertWorkflowToFlow(workflow: N8nWorkflow): WorkflowFlowData {
  const nodes: Node[] = workflow.nodes.map((node) => ({
    id: node.id,
    type: getNodeType(node.type),
    position: { x: node.position[0], y: node.position[1] },
    data: {
      ...node,
      label: node.name,
    },
  }));

  const edges: Edge[] = [];
  let edgeId = 0;

  // connections 객체를 edge 배열로 변환
  Object.entries(workflow.connections).forEach(([sourceName, outputs]) => {
    Object.entries(outputs).forEach(([outputType, connections]) => {
      connections.forEach((connection) => {
        edges.push({
          id: `e${edgeId++}`,
          source: getNodeIdByName(workflow.nodes, sourceName),
          target: getNodeIdByName(workflow.nodes, connection.node),
          sourceHandle: `${outputType}-${connection.index}`,
          targetHandle: `${connection.type}-${connection.index}`,
          type: 'smoothstep',
          animated: false,
        });
      });
    });
  });

  return { nodes, edges };
}

/**
 * n8n 노드 타입을 React Flow 커스텀 노드 타입으로 매핑
 */
function getNodeType(n8nType: string): string {
  // 노드 타입 카테고리 매핑
  if (n8nType.includes('trigger')) return 'trigger';
  if (n8nType.includes('Http')) return 'http';
  if (n8nType.includes('AI') || n8nType.includes('openai') || n8nType.includes('claude')) {
    return 'ai';
  }
  if (n8nType.includes('database') || n8nType.includes('mongo') || n8nType.includes('postgres')) {
    return 'database';
  }
  return 'default';
}

/**
 * 노드 이름으로 노드 ID 찾기
 */
function getNodeIdByName(nodes: N8nNode[], name: string): string {
  const node = nodes.find((n) => n.name === name);
  return node?.id || name;
}

/**
 * 실행 상태에 따라 노드 스타일 업데이트
 */
export function updateNodesWithExecutionStatus(nodes: Node[], executionData?: any): Node[] {
  if (!executionData?.resultData?.runData) return nodes;

  return nodes.map((node) => {
    const nodeName = node.data.label;
    const nodeRunData = executionData.resultData.runData[nodeName];

    if (!nodeRunData || !nodeRunData[0]) return node;

    const execution = nodeRunData[0];
    const status = execution.executionStatus || 'success';
    const hasError = !!execution.error;

    return {
      ...node,
      data: {
        ...node.data,
        executionStatus: status,
        executionTime: execution.executionTime,
        hasError,
        error: execution.error,
      },
      className: hasError ? 'node-error' : status === 'success' ? 'node-success' : 'node-running',
    };
  });
}

/**
 * 실행 경로를 하이라이트하기 위해 엣지 업데이트
 */
export function updateEdgesWithExecutionPath(edges: Edge[], executionData?: any): Edge[] {
  if (!executionData?.resultData?.runData) return edges;

  const executedNodes = Object.keys(executionData.resultData.runData);

  return edges.map((edge) => {
    const sourceNode = executedNodes.find((name) => edge.source.includes(name));
    const targetNode = executedNodes.find((name) => edge.target.includes(name));

    const isExecuted = sourceNode && targetNode;

    return {
      ...edge,
      animated: !!isExecuted,
      style: isExecuted
        ? { stroke: '#10b981', strokeWidth: 2 }
        : { stroke: '#d1d5db', strokeWidth: 1 },
    };
  });
}

/**
 * 노드 타입별 아이콘 매핑
 */
export function getNodeIcon(nodeType: string): string {
  const iconMap: Record<string, string> = {
    trigger: '⚡',
    http: '🌐',
    ai: '🤖',
    database: '🗄️',
    default: '⚙️',
  };

  return iconMap[nodeType] || iconMap.default;
}

/**
 * 노드 타입별 색상 매핑
 */
export function getNodeColor(nodeType: string): string {
  const colorMap: Record<string, string> = {
    trigger: '#ef4444',
    http: '#3b82f6',
    ai: '#8b5cf6',
    database: '#10b981',
    default: '#6b7280',
  };

  return colorMap[nodeType] || colorMap.default;
}

/**
 * 실행 시간 포맷팅
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}
