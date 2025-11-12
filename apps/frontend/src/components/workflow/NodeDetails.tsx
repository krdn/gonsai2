'use client';

import React from 'react';
import { X } from 'lucide-react';
import { getNodeIcon, getNodeColor, formatExecutionTime } from '@/lib/workflow-utils';
import type { N8nNode, NodeExecutionData } from '@/types/workflow';

interface NodeDetailsProps {
  node: N8nNode;
  executionData?: NodeExecutionData;
  onClose: () => void;
}

export function NodeDetails({ node, executionData, onClose }: NodeDetailsProps) {
  const nodeColor = getNodeColor(node.type);
  const icon = getNodeIcon(node.type);

  return (
    <div className="w-96 bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-10 p-4 border-b border-gray-200 bg-white"
        style={{ borderLeftColor: nodeColor, borderLeftWidth: '4px' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-3xl">{icon}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{node.name}</h2>
              <p className="text-sm text-gray-500">{node.type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Node Status */}
        {node.disabled && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            ⚠️ 이 노드는 비활성화되어 있습니다
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Execution Info */}
        {executionData && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">실행 정보</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">상태</span>
                <span className={`text-sm font-semibold ${
                  executionData.executionStatus === 'success' ? 'text-green-600' :
                  executionData.executionStatus === 'error' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {executionData.executionStatus === 'success' ? '✅ 성공' :
                   executionData.executionStatus === 'error' ? '❌ 실패' : '🔄 실행 중'}
                </span>
              </div>

              {executionData.executionTime !== undefined && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">실행 시간</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatExecutionTime(executionData.executionTime)}
                  </span>
                </div>
              )}

              {executionData.startTime && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">시작 시간</span>
                  <span className="text-sm font-mono text-gray-900">
                    {new Date(executionData.startTime).toLocaleString('ko-KR')}
                  </span>
                </div>
              )}
            </div>

            {/* Error Info */}
            {executionData.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-sm font-semibold text-red-900 mb-1">오류 메시지</div>
                <div className="text-sm text-red-700">{executionData.error.message}</div>
                {executionData.error.description && (
                  <div className="text-xs text-red-600 mt-2">{executionData.error.description}</div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Parameters */}
        {node.parameters && Object.keys(node.parameters).length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">노드 설정</h3>
            <div className="space-y-2">
              {Object.entries(node.parameters).map(([key, value]) => (
                <div key={key} className="p-2 bg-gray-50 rounded">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{key}</div>
                  <div className="text-sm text-gray-900 font-mono break-all">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Credentials */}
        {node.credentials && Object.keys(node.credentials).length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">인증 정보</h3>
            <div className="space-y-2">
              {Object.entries(node.credentials).map(([type, cred]) => (
                <div key={type} className="p-2 bg-gray-50 rounded flex items-center justify-between">
                  <span className="text-sm text-gray-600">{type}</span>
                  <span className="text-sm font-semibold text-gray-900">{cred.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Input Data */}
        {executionData?.data && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">입력 데이터</h3>
            <div className="p-3 bg-gray-900 rounded overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(executionData.data, null, 2)}
              </pre>
            </div>
          </section>
        )}

        {/* Position Info */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">위치 정보</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">X</div>
              <div className="text-sm font-semibold">{node.position[0]}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Y</div>
              <div className="text-sm font-semibold">{node.position[1]}</div>
            </div>
          </div>
        </section>

        {/* Notes */}
        {node.notes && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">노트</h3>
            <div className="p-3 bg-blue-50 rounded text-sm text-blue-900 whitespace-pre-wrap">
              {node.notes}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
