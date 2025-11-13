/**
 * Socket.io Client
 *
 * @description 실시간 모니터링을 위한 Socket.io 클라이언트
 */

import { io, Socket } from 'socket.io-client';

export interface ExecutionUpdate {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  progress?: number;
  currentNode?: string;
  startedAt: string;
  stoppedAt?: string;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  executionId?: string;
  workflowId?: string;
  nodeId?: string;
  metadata?: Record<string, any>;
}

export interface MetricUpdate {
  timestamp: string;
  executionsPerMinute: number;
  averageExecutionTime: number;
  errorRate: number;
  queueLength: number;
  activeExecutions: number;
  aiTokensUsed?: number;
}

export interface Notification {
  id: string;
  type: 'error' | 'success' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  executionId?: string;
  workflowId?: string;
  action?: {
    label: string;
    url: string;
  };
}

type SocketEventHandler<T = any> = (data: T) => void;

class SocketIOClient {
  private socket: Socket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private connectingPromise: Promise<void> | null = null; // 연결 중인 Promise 캐싱

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    // 이미 연결되어 있으면 즉시 반환
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    // 연결 시도 중이면 기존 Promise 반환 (중복 연결 방지)
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    // 새로운 연결 시도
    this.connectingPromise = new Promise((resolve, reject) => {
      this.socket = io(this.url, {
        transports: ['polling', 'websocket'], // polling handshake → WebSocket upgrade (권장)
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        console.log('[Socket.io] Connected to server');
        this.reconnectAttempts = 0;
        this.connectingPromise = null; // 연결 성공 시 Promise 초기화
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket.io] Connection error:', error);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.connectingPromise = null; // 연결 실패 시 Promise 초기화
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket.io] Disconnected:', reason);
      });

      // Global error handler
      this.socket.on('error', (error) => {
        console.error('[Socket.io] Error:', error);
      });
    });

    return this.connectingPromise;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectingPromise = null; // 연결 해제 시 Promise 초기화
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Event subscription methods
  onExecutionUpdate(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.socket?.on('execution:update', handler);
  }

  onExecutionStarted(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.socket?.on('execution:started', handler);
  }

  onExecutionFinished(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.socket?.on('execution:finished', handler);
  }

  onExecutionError(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.socket?.on('execution:error', handler);
  }

  onLogMessage(handler: SocketEventHandler<LogMessage>): void {
    this.socket?.on('log:message', handler);
  }

  onMetricUpdate(handler: SocketEventHandler<MetricUpdate>): void {
    this.socket?.on('metric:update', handler);
  }

  onNotification(handler: SocketEventHandler<Notification>): void {
    this.socket?.on('notification', handler);
  }

  // Remove event listeners
  offExecutionUpdate(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.socket?.off('execution:update', handler);
  }

  offExecutionStarted(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.socket?.off('execution:started', handler);
  }

  offExecutionFinished(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.socket?.off('execution:finished', handler);
  }

  offExecutionError(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.socket?.off('execution:error', handler);
  }

  offLogMessage(handler: SocketEventHandler<LogMessage>): void {
    this.socket?.off('log:message', handler);
  }

  offMetricUpdate(handler: SocketEventHandler<MetricUpdate>): void {
    this.socket?.off('metric:update', handler);
  }

  offNotification(handler: SocketEventHandler<Notification>): void {
    this.socket?.off('notification', handler);
  }

  // Emit events
  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  // Subscribe to specific execution
  subscribeToExecution(executionId: string): void {
    this.emit('subscribe:execution', { executionId });
  }

  unsubscribeFromExecution(executionId: string): void {
    this.emit('unsubscribe:execution', { executionId });
  }

  // Subscribe to specific workflow
  subscribeToWorkflow(workflowId: string): void {
    this.emit('subscribe:workflow', { workflowId });
  }

  unsubscribeFromWorkflow(workflowId: string): void {
    this.emit('unsubscribe:workflow', { workflowId });
  }
}

// Singleton instance
let socketClient: SocketIOClient | null = null;

export function getSocketClient(): SocketIOClient {
  if (!socketClient) {
    // 브라우저 환경에서 동적으로 URL 결정
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

    // 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      // 현재 호스트가 localhost가 아닌 경우 (원격 접속)
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // 모든 원격 접속은 공개 도메인의 백엔드 포트(3000)로 연결
        // 내부 IP 사용 시 CORS Private Network Access 정책에 의해 차단됨
        socketUrl = `http://${hostname}:3000`;
      }
    }

    console.log('[Socket.io] Connecting to:', socketUrl);
    socketClient = new SocketIOClient(socketUrl);
  }
  return socketClient;
}
