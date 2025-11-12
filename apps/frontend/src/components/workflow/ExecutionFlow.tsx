'use client';

import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Play } from 'lucide-react';
import { formatExecutionTime, getNodeIcon } from '@/lib/workflow-utils';
import type { WorkflowExecution, N8nWorkflow } from '@/types/workflow';
import { useWorkflowStore } from '@/stores/workflow-store';

interface ExecutionFlowProps {
  workflow: N8nWorkflow;
  execution: WorkflowExecution;
  className?: string;
}

interface ExecutionStep {
  nodeName: string;
  nodeType: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  startTime?: string;
  executionTime?: number;
  error?: any;
}

export function ExecutionFlow({ workflow, execution, className = '' }: ExecutionFlowProps) {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const runningExecutions = useWorkflowStore((state) => state.runningExecutions);

  // Extract execution steps from execution data
  useEffect(() => {
    if (!execution.data?.resultData?.runData) return;

    const runData = execution.data.resultData.runData;
    const executionSteps: ExecutionStep[] = [];

    // Get node execution order from workflow
    workflow.nodes.forEach((node) => {
      const nodeRunData = runData[node.name];
      if (nodeRunData && nodeRunData[0]) {
        const runInfo = nodeRunData[0];
        executionSteps.push({
          nodeName: node.name,
          nodeType: node.type,
          status: runInfo.error ? 'error' : 'success',
          startTime: runInfo.startTime ? String(runInfo.startTime) : undefined,
          executionTime: runInfo.executionTime,
          error: runInfo.error,
        });
      }
    });

    setSteps(executionSteps);
  }, [execution, workflow]);

  // Update with real-time execution data
  useEffect(() => {
    const currentExecution = runningExecutions.get(execution.id);
    if (currentExecution && currentExecution.data?.resultData?.runData) {
      const runData = currentExecution.data.resultData.runData;
      setSteps((prev) =>
        prev.map((step) => {
          const nodeRunData = runData[step.nodeName];
          if (nodeRunData && nodeRunData[0]) {
            const runInfo = nodeRunData[0];
            return {
              ...step,
              status: runInfo.error ? 'error' : 'success',
              executionTime: runInfo.executionTime,
              error: runInfo.error,
            };
          }
          return step;
        })
      );
    }
  }, [runningExecutions, execution.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Play className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const totalExecutionTime = steps.reduce((acc, step) => acc + (step.executionTime || 0), 0);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">실행 흐름</h3>
            <p className="text-sm text-gray-500">{workflow.name}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{formatExecutionTime(totalExecutionTime)}</span>
            </div>
            <div className={`text-xs font-medium mt-1 ${
              execution.status === 'success' ? 'text-green-600' :
              execution.status === 'error' ? 'text-red-600' :
              execution.status === 'running' ? 'text-blue-600' :
              'text-gray-600'
            }`}>
              {execution.status === 'success' ? '✅ 성공' :
               execution.status === 'error' ? '❌ 실패' :
               execution.status === 'running' ? '🔄 실행 중' :
               execution.status}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={`${step.nodeName}-${index}`} className="relative flex items-start gap-4">
                {/* Status icon */}
                <div className="relative z-10 flex-shrink-0 w-12 h-12 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center">
                  {getStatusIcon(step.status)}
                </div>

                {/* Step content */}
                <div className="flex-1 pb-6">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getNodeIcon(step.nodeType)}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {step.nodeName}
                          </div>
                          <div className="text-xs text-gray-500">{step.nodeType}</div>
                        </div>
                      </div>
                      {step.executionTime !== undefined && (
                        <div className="text-xs font-mono text-gray-600">
                          {formatExecutionTime(step.executionTime)}
                        </div>
                      )}
                    </div>

                    {/* Error message */}
                    {step.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {step.error.message || 'Error occurred'}
                      </div>
                    )}

                    {/* Start time */}
                    {step.startTime && (
                      <div className="mt-2 text-xs text-gray-500">
                        시작: {new Date(step.startTime).toLocaleTimeString('ko-KR')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {steps.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">실행 데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>{steps.filter((s) => s.status === 'success').length} 성공</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <span>{steps.filter((s) => s.status === 'error').length} 실패</span>
            </div>
          </div>
          <div>
            실행 ID: <span className="font-mono">{execution.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
