/**
 * WebSocket Client
 *
 * @description 실시간 n8n 워크플로우 업데이트를 위한 WebSocket 클라이언트
 */

import { useWorkflowStore } from '@/stores/workflow-store';
import type { WorkflowExecution } from '@/types/workflow';

export type WebSocketEvent =
  | 'execution.started'
  | 'execution.finished'
  | 'execution.error'
  | 'execution.progress'
  | 'workflow.updated'
  | 'workflow.activated'
  | 'workflow.deactivated'
  | 'connection.established'
  | 'connection.lost';

export interface WebSocketMessage<T = any> {
  type: WebSocketEvent;
  data: T;
  timestamp: string;
}

export interface ExecutionStartedData {
  executionId: string;
  workflowId: string;
  startedAt: string;
}

export interface ExecutionFinishedData {
  executionId: string;
  workflowId: string;
  status: 'success' | 'error';
  finishedAt: string;
  duration: number;
}

export interface ExecutionProgressData {
  executionId: string;
  workflowId: string;
  currentNode: string;
  progress: number;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners = new Map<WebSocketEvent, Set<(data: any) => void>>();

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          useWorkflowStore.getState().setConnected(true);
          useWorkflowStore.getState().setConnecting(false);
          useWorkflowStore.getState().setConnectionError(null);
          this.emit('connection.established', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          useWorkflowStore.getState().setConnectionError('WebSocket connection error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.stopHeartbeat();
          useWorkflowStore.getState().setConnected(false);
          this.emit('connection.lost', {});
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('[WebSocket] Connection failed:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  send<T = any>(type: WebSocketEvent, data: T): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage<T> = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
    }
  }

  on(event: WebSocketEvent, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // 정리 함수 반환
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event: WebSocketEvent, callback: (data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: WebSocketEvent, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} callback:`, error);
        }
      });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const { type, data } = message;

    // 스토어 업데이트
    useWorkflowStore.getState().updateLastUpdate();

    switch (type) {
      case 'execution.started':
        this.handleExecutionStarted(data as ExecutionStartedData);
        break;
      case 'execution.finished':
        this.handleExecutionFinished(data as ExecutionFinishedData);
        break;
      case 'execution.error':
        this.handleExecutionError(data);
        break;
      case 'execution.progress':
        this.handleExecutionProgress(data as ExecutionProgressData);
        break;
      case 'workflow.updated':
        this.handleWorkflowUpdated(data);
        break;
      case 'workflow.activated':
      case 'workflow.deactivated':
        this.handleWorkflowStatusChanged(data);
        break;
    }

    // 리스너에게 알림
    this.emit(type, data);
  }

  private handleExecutionStarted(data: ExecutionStartedData): void {
    const execution: WorkflowExecution = {
      id: data.executionId,
      workflowId: data.workflowId,
      workflowName: '',
      mode: 'trigger',
      status: 'running',
      startedAt: data.startedAt,
      finished: false,
    };
    useWorkflowStore.getState().addRunningExecution(execution);
  }

  private handleExecutionFinished(data: ExecutionFinishedData): void {
    useWorkflowStore.getState().updateRunningExecution(data.executionId, {
      status: data.status,
      stoppedAt: data.finishedAt,
      finished: true,
    });

    // 일정 시간 후 실행 목록에서 제거
    setTimeout(() => {
      useWorkflowStore.getState().removeRunningExecution(data.executionId);
    }, 5000);
  }

  private handleExecutionError(data: any): void {
    useWorkflowStore.getState().updateRunningExecution(data.executionId, {
      status: 'error',
      stoppedAt: data.finishedAt,
      finished: true,
    });
  }

  private handleExecutionProgress(data: ExecutionProgressData): void {
    // 실행 진행 상황 업데이트 (필요시 구현)
  }

  private handleWorkflowUpdated(data: any): void {
    if (data.workflow) {
      useWorkflowStore.getState().updateWorkflow(data.workflow.id, data.workflow);
    }
  }

  private handleWorkflowStatusChanged(data: any): void {
    if (data.workflowId) {
      useWorkflowStore.getState().updateWorkflow(data.workflowId, {
        active: data.active,
      });
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      useWorkflowStore
        .getState()
        .setConnectionError('Failed to reconnect after maximum attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      useWorkflowStore.getState().setConnecting(true);
      this.connect().catch((error) => {
        console.error('[WebSocket] Reconnection failed:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30초마다 heartbeat
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 싱글톤 인스턴스
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
    wsClient = new WebSocketClient(wsUrl);
  }
  return wsClient;
}

export function disconnectWebSocket(): void {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}
