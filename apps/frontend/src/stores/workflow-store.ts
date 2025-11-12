/**
 * Workflow Store (Zustand)
 *
 * @description n8n 워크플로우 상태 관리
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  N8nWorkflow,
  WorkflowExecution,
  WorkflowStatistics,
} from '@/types/workflow';

interface WorkflowState {
  // n8n 연결 상태
  connected: boolean;
  connecting: boolean;
  connectionError: string | null;

  // 워크플로우 캐시
  workflows: Map<string, N8nWorkflow>;
  selectedWorkflowId: string | null;

  // 실행 큐
  executionQueue: string[];
  runningExecutions: Map<string, WorkflowExecution>;

  // 실시간 업데이트
  realtimeEnabled: boolean;
  lastUpdate: Date | null;

  // 통계
  statistics: Map<string, WorkflowStatistics>;
}

interface WorkflowActions {
  // 연결 관리
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;

  // 워크플로우 캐시 관리
  setWorkflows: (workflows: N8nWorkflow[]) => void;
  addWorkflow: (workflow: N8nWorkflow) => void;
  updateWorkflow: (id: string, workflow: Partial<N8nWorkflow>) => void;
  removeWorkflow: (id: string) => void;
  getWorkflow: (id: string) => N8nWorkflow | undefined;
  selectWorkflow: (id: string | null) => void;

  // 실행 큐 관리
  addToQueue: (executionId: string) => void;
  removeFromQueue: (executionId: string) => void;
  addRunningExecution: (execution: WorkflowExecution) => void;
  updateRunningExecution: (
    executionId: string,
    execution: Partial<WorkflowExecution>
  ) => void;
  removeRunningExecution: (executionId: string) => void;

  // 실시간 업데이트
  setRealtimeEnabled: (enabled: boolean) => void;
  updateLastUpdate: () => void;

  // 통계
  updateStatistics: (workflowId: string, stats: WorkflowStatistics) => void;
  getStatistics: (workflowId: string) => WorkflowStatistics | undefined;

  // 유틸리티
  reset: () => void;
}

type WorkflowStore = WorkflowState & WorkflowActions;

const initialState: WorkflowState = {
  connected: false,
  connecting: false,
  connectionError: null,
  workflows: new Map(),
  selectedWorkflowId: null,
  executionQueue: [],
  runningExecutions: new Map(),
  realtimeEnabled: true,
  lastUpdate: null,
  statistics: new Map(),
};

export const useWorkflowStore = create<WorkflowStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // 연결 관리
        setConnected: (connected) => set({ connected }),
        setConnecting: (connecting) => set({ connecting }),
        setConnectionError: (connectionError) => set({ connectionError }),

        // 워크플로우 캐시 관리
        setWorkflows: (workflows) => {
          const workflowsMap = new Map<string, N8nWorkflow>();
          workflows.forEach((wf) => workflowsMap.set(wf.id, wf));
          set({ workflows: workflowsMap });
        },

        addWorkflow: (workflow) => {
          const workflows = new Map(get().workflows);
          workflows.set(workflow.id, workflow);
          set({ workflows });
        },

        updateWorkflow: (id, workflowUpdate) => {
          const workflows = new Map(get().workflows);
          const existing = workflows.get(id);
          if (existing) {
            workflows.set(id, { ...existing, ...workflowUpdate });
            set({ workflows });
          }
        },

        removeWorkflow: (id) => {
          const workflows = new Map(get().workflows);
          workflows.delete(id);
          set({ workflows });
        },

        getWorkflow: (id) => get().workflows.get(id),

        selectWorkflow: (selectedWorkflowId) => set({ selectedWorkflowId }),

        // 실행 큐 관리
        addToQueue: (executionId) => {
          set((state) => ({
            executionQueue: [...state.executionQueue, executionId],
          }));
        },

        removeFromQueue: (executionId) => {
          set((state) => ({
            executionQueue: state.executionQueue.filter((id) => id !== executionId),
          }));
        },

        addRunningExecution: (execution) => {
          const runningExecutions = new Map(get().runningExecutions);
          runningExecutions.set(execution.id, execution);
          set({ runningExecutions });
        },

        updateRunningExecution: (executionId, executionUpdate) => {
          const runningExecutions = new Map(get().runningExecutions);
          const existing = runningExecutions.get(executionId);
          if (existing) {
            runningExecutions.set(executionId, { ...existing, ...executionUpdate });
            set({ runningExecutions });
          }
        },

        removeRunningExecution: (executionId) => {
          const runningExecutions = new Map(get().runningExecutions);
          runningExecutions.delete(executionId);
          set({ runningExecutions });
        },

        // 실시간 업데이트
        setRealtimeEnabled: (realtimeEnabled) => set({ realtimeEnabled }),
        updateLastUpdate: () => set({ lastUpdate: new Date() }),

        // 통계
        updateStatistics: (workflowId, stats) => {
          const statistics = new Map(get().statistics);
          statistics.set(workflowId, stats);
          set({ statistics });
        },

        getStatistics: (workflowId) => get().statistics.get(workflowId),

        // 유틸리티
        reset: () => set(initialState),
      }),
      {
        name: 'workflow-store',
        partialize: (state) => ({
          realtimeEnabled: state.realtimeEnabled,
          selectedWorkflowId: state.selectedWorkflowId,
        }),
      }
    ),
    { name: 'WorkflowStore' }
  )
);

// 선택자 (Selectors)
export const useSelectedWorkflow = () => {
  const selectedWorkflowId = useWorkflowStore((state) => state.selectedWorkflowId);
  const workflows = useWorkflowStore((state) => state.workflows);
  return selectedWorkflowId ? workflows.get(selectedWorkflowId) : null;
};

export const useWorkflowList = () => {
  const workflows = useWorkflowStore((state) => state.workflows);
  return Array.from(workflows.values());
};

export const useRunningExecutionsList = () => {
  const runningExecutions = useWorkflowStore((state) => state.runningExecutions);
  return Array.from(runningExecutions.values());
};
