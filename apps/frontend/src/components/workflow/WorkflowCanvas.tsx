'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './nodes';
import {
  convertWorkflowToFlow,
  updateNodesWithExecutionStatus,
  updateEdgesWithExecutionPath,
} from '@/lib/workflow-utils';
import type { N8nWorkflow, WorkflowExecution } from '@/types/workflow';

interface WorkflowCanvasProps {
  workflow: N8nWorkflow;
  executionData?: WorkflowExecution;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export function WorkflowCanvas({
  workflow,
  executionData,
  onNodeClick,
  className = '',
}: WorkflowCanvasProps) {
  // Convert n8n workflow to React Flow format
  const initialFlow = useMemo(() => convertWorkflowToFlow(workflow), [workflow]);

  // Initialize nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges);

  // Update nodes with execution status
  useEffect(() => {
    if (executionData) {
      const updatedNodes = updateNodesWithExecutionStatus(initialFlow.nodes, executionData.data);
      setNodes(updatedNodes);

      const updatedEdges = updateEdgesWithExecutionPath(initialFlow.edges, executionData.data);
      setEdges(updatedEdges);
    } else {
      setNodes(initialFlow.nodes);
      setEdges(initialFlow.edges);
    }
  }, [executionData, initialFlow, setNodes, setEdges]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  // MiniMap node color function
  const nodeColor = useCallback((node: Node) => {
    if (node.data.hasError) return '#ef4444';
    if (node.data.executionStatus === 'success') return '#10b981';
    if (node.data.executionStatus === 'running') return '#3b82f6';
    if (node.data.executionStatus === 'error') return '#ef4444';
    return '#d1d5db';
  }, []);

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
          style: { strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        {/* Background grid */}
        <Background color="#aaa" gap={16} />

        {/* Controls (zoom, fit view, etc.) */}
        <Controls showInteractive={false} />

        {/* Mini map */}
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white/80 backdrop-blur-sm"
        />

        {/* Workflow info panel */}
        <Panel
          position="top-left"
          className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900">{workflow.name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  workflow.active ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span>{workflow.active ? '활성화' : '비활성화'}</span>
            </div>
            <div className="text-xs text-gray-500">노드: {workflow.nodes.length}개</div>
          </div>
        </Panel>

        {/* Execution status panel */}
        {executionData && (
          <Panel
            position="top-right"
            className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3"
          >
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-700">실행 상태</div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    executionData.status === 'success'
                      ? 'bg-green-500'
                      : executionData.status === 'error'
                        ? 'bg-red-500'
                        : executionData.status === 'running'
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-gray-400'
                  }`}
                />
                <span className="text-xs font-semibold">
                  {executionData.status === 'success'
                    ? '성공'
                    : executionData.status === 'error'
                      ? '실패'
                      : executionData.status === 'running'
                        ? '실행 중'
                        : executionData.status}
                </span>
              </div>
              {executionData.stoppedAt && executionData.startedAt && (
                <div className="text-xs text-gray-600">
                  실행 시간:{' '}
                  {Math.round(
                    (new Date(executionData.stoppedAt).getTime() -
                      new Date(executionData.startedAt).getTime()) /
                      1000
                  )}
                  초
                </div>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
