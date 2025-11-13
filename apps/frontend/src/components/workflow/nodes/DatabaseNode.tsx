'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeIcon, getNodeColor, formatExecutionTime } from '@/lib/workflow-utils';

interface DatabaseNodeData {
  label: string;
  type: string;
  parameters?: {
    operation?: string;
    collection?: string;
    database?: string;
  };
  executionStatus?: 'success' | 'error' | 'running';
  executionTime?: number;
  hasError?: boolean;
  error?: any;
}

export function DatabaseNode({ data }: NodeProps<DatabaseNodeData>) {
  const nodeColor = getNodeColor('database');
  const icon = getNodeIcon('database');

  const statusColors = {
    success: 'bg-green-100 border-green-500',
    error: 'bg-red-100 border-red-500',
    running: 'bg-blue-100 border-blue-500 animate-pulse',
  };

  const statusClass = data.executionStatus
    ? statusColors[data.executionStatus]
    : 'bg-white border-gray-300';

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-md min-w-[200px] ${statusClass}`}
      style={{ borderColor: data.hasError ? '#ef4444' : nodeColor }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3"
        style={{ background: nodeColor }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-500 uppercase">Database</div>
          <div className="text-sm font-bold text-gray-900">{data.label}</div>
        </div>
      </div>

      {/* Database Info */}
      {data.parameters && (
        <div className="mt-2 space-y-1">
          {data.parameters.operation && (
            <div className="text-xs">
              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                {data.parameters.operation.toUpperCase()}
              </span>
            </div>
          )}
          {data.parameters.database && (
            <div className="text-xs">
              <span className="text-gray-600">DB:</span>
              <span className="ml-1 font-semibold">
                {data.parameters.database}
              </span>
            </div>
          )}
          {data.parameters.collection && (
            <div className="text-xs">
              <span className="text-gray-600">Collection:</span>
              <span className="ml-1 font-semibold">
                {data.parameters.collection}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Execution Info */}
      {data.executionStatus && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">상태:</span>
            <span className={`font-semibold ${
              data.executionStatus === 'success' ? 'text-green-600' :
              data.executionStatus === 'error' ? 'text-red-600' :
              'text-blue-600'
            }`}>
              {data.executionStatus === 'success' ? '성공' :
               data.executionStatus === 'error' ? '실패' : '실행 중'}
            </span>
          </div>
          {data.executionTime && (
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-gray-600">시간:</span>
              <span className="font-semibold">{formatExecutionTime(data.executionTime)}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {data.hasError && data.error && (
        <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
          {data.error.message || 'Database operation failed'}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3"
        style={{ background: nodeColor }}
      />
    </div>
  );
}
