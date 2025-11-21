'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeIcon, getNodeColor, formatExecutionTime } from '@/lib/workflow-utils';

interface TriggerNodeData {
  label: string;
  type: string;
  executionStatus?: 'success' | 'error' | 'running';
  executionTime?: number;
  hasError?: boolean;
  error?: any;
}

export function TriggerNode({ data }: NodeProps<TriggerNodeData>) {
  const nodeColor = getNodeColor('trigger');
  const icon = getNodeIcon('trigger');

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
      className={`px-4 py-3 rounded-lg border-2 shadow-md min-w-[180px] ${statusClass}`}
      style={{ borderColor: data.hasError ? '#ef4444' : nodeColor }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-500 uppercase">Trigger</div>
          <div className="text-sm font-bold text-gray-900">{data.label}</div>
        </div>
      </div>

      {/* Execution Info */}
      {data.executionStatus && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">상태:</span>
            <span
              className={`font-semibold ${
                data.executionStatus === 'success'
                  ? 'text-green-600'
                  : data.executionStatus === 'error'
                    ? 'text-red-600'
                    : 'text-blue-600'
              }`}
            >
              {data.executionStatus === 'success'
                ? '성공'
                : data.executionStatus === 'error'
                  ? '실패'
                  : '실행 중'}
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
          {data.error.message || 'Error occurred'}
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
