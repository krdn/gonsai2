/**
 * Socket.io Client
 *
 * @description 실시간 n8n 워크플로우 업데이트를 위한 Socket.io 클라이언트
 */

import { io, Socket } from 'socket.io-client';
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
  private socket: Socket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners = new Map<WebSocketEvent, Set<(data: any) => void>>();

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Socket.io 클라이언트 초기화
        this.socket = io(this.url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        this.socket.on('connect', () => {
          console.log('[Socket.io] Connected', { socketId: this.socket?.id });
          this.reconnectAttempts = 0;
          useWorkflowStore.getState().setConnected(true);
          useWorkflowStore.getState().setConnecting(false);
          useWorkflowStore.getState().setConnectionError(null);
          this.emit('connection.established', {});
          resolve();
        });

        // 서버에서 보내는 연결 성공 메시지
        this.socket.on('connected', (data) => {
          console.log('[Socket.io] Server welcome:', data);
        });

        // 실행 이벤트 리스너
        this.socket.on('execution:started', (data) => {
          this.handleExecutionStarted(data);
          this.emit('execution.started', data);
        });

        this.socket.on('execution:finished', (data) => {
          this.handleExecutionFinished(data);
          this.emit('execution.finished', data);
        });

        this.socket.on('execution:error', (data) => {
          this.handleExecutionError(data);
          this.emit('execution.error', data);
        });

        this.socket.on('execution:update', (data) => {
          this.handleExecutionUpdate(data);
          this.emit('execution.progress', data);
        });

        // 워크플로우 이벤트 리스너
        this.socket.on('workflow:updated', (data) => {
          this.handleWorkflowUpdated(data);
          this.emit('workflow.updated', data);
        });

        this.socket.on('workflow:activated', (data) => {
          this.handleWorkflowStatusChanged(data);
          this.emit('workflow.activated', data);
        });

        this.socket.on('workflow:deactivated', (data) => {
          this.handleWorkflowStatusChanged(data);
          this.emit('workflow.deactivated', data);
        });

        // 메트릭 및 로그 이벤트
        this.socket.on('metric:update', (data) => {
          useWorkflowStore.getState().updateLastUpdate();
        });

        this.socket.on('log:message', (data) => {
          useWorkflowStore.getState().updateLastUpdate();
        });

        this.socket.on('notification', (data) => {
          useWorkflowStore.getState().updateLastUpdate();
        });

        // Pong 응답 처리
        this.socket.on('pong', (data) => {
          console.log('[Socket.io] Pong received:', data);
        });

        this.socket.on('connect_error', (error) => {
          console.error('[Socket.io] Connection error:', error.message);
          useWorkflowStore
            .getState()
            .setConnectionError(`Socket.io connection error: ${error.message}`);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[Socket.io] Disconnected:', reason);
          useWorkflowStore.getState().setConnected(false);
          this.emit('connection.lost', {});

          if (reason === 'io server disconnect') {
            // 서버가 연결을 끊은 경우 수동으로 재연결
            this.socket?.connect();
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('[Socket.io] Reconnected after', attemptNumber, 'attempts');
          this.reconnectAttempts = 0;
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log('[Socket.io] Reconnect attempt', attemptNumber);
          this.reconnectAttempts = attemptNumber;
          useWorkflowStore.getState().setConnecting(true);
        });

        this.socket.on('reconnect_failed', () => {
          console.error('[Socket.io] Reconnection failed after max attempts');
          useWorkflowStore
            .getState()
            .setConnectionError('Failed to reconnect after maximum attempts');
        });
      } catch (error) {
        console.error('[Socket.io] Connection failed:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  send<T = any>(type: WebSocketEvent, data: T): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(type.replace('.', ':'), data);
    } else {
      console.warn('[Socket.io] Cannot send message: not connected');
    }
  }

  // 구독 메서드 추가
  subscribeToExecution(executionId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('subscribe:execution', { executionId });
    }
  }

  unsubscribeFromExecution(executionId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('unsubscribe:execution', { executionId });
    }
  }

  subscribeToWorkflow(workflowId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('subscribe:workflow', { workflowId });
    }
  }

  unsubscribeFromWorkflow(workflowId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('unsubscribe:workflow', { workflowId });
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

  /**
   * 모든 이벤트 리스너 제거 (메모리 누수 방지)
   */
  removeAllListeners(): void {
    this.listeners.forEach((callbacks) => {
      callbacks.clear();
    });
    this.listeners.clear();
  }

  private emit(event: WebSocketEvent, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket.io] Error in ${event} callback:`, error);
        }
      });
    }
  }

  private handleExecutionStarted(data: any): void {
    const execution: WorkflowExecution = {
      id: data.executionId,
      workflowId: data.workflowId,
      workflowName: data.workflowName || '',
      mode: 'trigger',
      status: 'running',
      startedAt: data.startedAt,
      finished: false,
    };
    useWorkflowStore.getState().addRunningExecution(execution);
    useWorkflowStore.getState().updateLastUpdate();
  }

  private handleExecutionFinished(data: any): void {
    useWorkflowStore.getState().updateRunningExecution(data.executionId, {
      status: data.status,
      stoppedAt: data.stoppedAt || data.finishedAt,
      finished: true,
    });
    useWorkflowStore.getState().updateLastUpdate();

    // 일정 시간 후 실행 목록에서 제거
    setTimeout(() => {
      useWorkflowStore.getState().removeRunningExecution(data.executionId);
    }, 5000);
  }

  private handleExecutionError(data: any): void {
    useWorkflowStore.getState().updateRunningExecution(data.executionId, {
      status: 'error',
      stoppedAt: data.stoppedAt || data.finishedAt,
      finished: true,
    });
    useWorkflowStore.getState().updateLastUpdate();
  }

  private handleExecutionUpdate(data: any): void {
    // 실행 업데이트 처리
    if (data.executionId) {
      useWorkflowStore.getState().updateRunningExecution(data.executionId, {
        status: data.status,
        ...(data.stoppedAt && { stoppedAt: data.stoppedAt }),
        ...(data.progress && { progress: data.progress }),
      });
    }
    useWorkflowStore.getState().updateLastUpdate();
  }

  private handleWorkflowUpdated(data: any): void {
    if (data.workflow) {
      useWorkflowStore.getState().updateWorkflow(data.workflow.id, data.workflow);
    }
    useWorkflowStore.getState().updateLastUpdate();
  }

  private handleWorkflowStatusChanged(data: any): void {
    if (data.workflowId) {
      useWorkflowStore.getState().updateWorkflow(data.workflowId, {
        active: data.active,
      });
    }
    useWorkflowStore.getState().updateLastUpdate();
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  // Ping 전송 (서버 연결 확인용)
  ping(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('ping');
    }
  }
}

// 싱글톤 인스턴스
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    // 브라우저 환경에서 동적으로 URL 결정
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

    // 클라이언트 사이드에서만 실행
    if (typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined') {
      // 현재 호스트가 localhost가 아닌 경우 (원격 접속)
      const win = globalThis as any;
      if (win.location) {
        const hostname = win.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          // krdn.iptime.org 도메인은 내부 IP 사용 (NAT hairpin 문제 회피)
          if (hostname === 'krdn.iptime.org') {
            wsUrl = 'http://192.168.0.50:3000';
          } else {
            // 그 외 도메인은 같은 호스트의 백엔드 포트(3000)로 연결
            wsUrl = `http://${hostname}:3000`;
          }
        }
      }
    }

    console.log('[Socket.io] Connecting to:', wsUrl);
    wsClient = new WebSocketClient(wsUrl);
  }
  return wsClient;
}

// disconnectWebSocket 함수는 사용되지 않아 제거됨
// 필요시 wsClient.disconnect()를 직접 호출하세요
