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

// 이벤트 타입 정의
type SocketEventType =
  | 'execution:update'
  | 'execution:started'
  | 'execution:finished'
  | 'execution:error'
  | 'log:message'
  | 'metric:update'
  | 'notification';

class SocketIOClient {
  private socket: Socket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private connectingPromise: Promise<void> | null = null; // 연결 중인 Promise 캐싱

  // 🔧 메모리 누수 방지: 등록된 핸들러 추적
  private handlerRegistry = new Map<SocketEventType, Set<SocketEventHandler>>();

  // 🔧 인스턴스 ID로 디버깅 지원
  private readonly instanceId = Math.random().toString(36).substring(7);

  constructor(url: string) {
    this.url = url;
    console.log(`[Socket.io] Client instance created: ${this.instanceId}`);
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
      // 🔧 모든 이벤트 핸들러 정리
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectingPromise = null; // 연결 해제 시 Promise 초기화
    console.log(`[Socket.io] Client disconnected: ${this.instanceId}`);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 모든 이벤트 리스너 제거 (메모리 누수 방지)
   */
  removeAllListeners(): void {
    this.handlerRegistry.forEach((handlers, eventType) => {
      handlers.forEach((handler) => {
        this.socket?.off(eventType, handler);
      });
      handlers.clear();
    });
    this.handlerRegistry.clear();
    console.log(`[Socket.io] All listeners removed: ${this.instanceId}`);
  }

  /**
   * 등록된 핸들러 수 조회 (디버깅용)
   */
  getHandlerCount(): number {
    let count = 0;
    this.handlerRegistry.forEach((handlers) => {
      count += handlers.size;
    });
    return count;
  }

  // 🔧 핸들러 등록 헬퍼 (중복 방지)
  private registerHandler(event: SocketEventType, handler: SocketEventHandler): void {
    if (!this.handlerRegistry.has(event)) {
      this.handlerRegistry.set(event, new Set());
    }

    const handlers = this.handlerRegistry.get(event)!;

    // 🔧 중복 핸들러 체크 (같은 함수 참조 방지)
    if (handlers.has(handler)) {
      console.warn(`[Socket.io] Duplicate handler detected for ${event}, skipping`);
      return;
    }

    handlers.add(handler);
    this.socket?.on(event, handler);
  }

  // 🔧 핸들러 해제 헬퍼
  private unregisterHandler(event: SocketEventType, handler: SocketEventHandler): void {
    const handlers = this.handlerRegistry.get(event);
    if (handlers) {
      handlers.delete(handler);
      this.socket?.off(event, handler);
    }
  }

  // Event subscription methods (핸들러 레지스트리 사용)
  onExecutionUpdate(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.registerHandler('execution:update', handler);
  }

  onExecutionStarted(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.registerHandler('execution:started', handler);
  }

  onExecutionFinished(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.registerHandler('execution:finished', handler);
  }

  onExecutionError(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.registerHandler('execution:error', handler);
  }

  onLogMessage(handler: SocketEventHandler<LogMessage>): void {
    this.registerHandler('log:message', handler);
  }

  onMetricUpdate(handler: SocketEventHandler<MetricUpdate>): void {
    this.registerHandler('metric:update', handler);
  }

  onNotification(handler: SocketEventHandler<Notification>): void {
    this.registerHandler('notification', handler);
  }

  // Remove event listeners (핸들러 레지스트리 사용)
  offExecutionUpdate(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.unregisterHandler('execution:update', handler);
  }

  offExecutionStarted(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.unregisterHandler('execution:started', handler);
  }

  offExecutionFinished(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.unregisterHandler('execution:finished', handler);
  }

  offExecutionError(handler: SocketEventHandler<ExecutionUpdate>): void {
    this.unregisterHandler('execution:error', handler);
  }

  offLogMessage(handler: SocketEventHandler<LogMessage>): void {
    this.unregisterHandler('log:message', handler);
  }

  offMetricUpdate(handler: SocketEventHandler<MetricUpdate>): void {
    this.unregisterHandler('metric:update', handler);
  }

  offNotification(handler: SocketEventHandler<Notification>): void {
    this.unregisterHandler('notification', handler);
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

// 🔧 강화된 싱글톤 패턴
let socketClient: SocketIOClient | null = null;

// 🔧 SSR 안전성을 위한 환경 체크
const isBrowser = typeof window !== 'undefined';

export function getSocketClient(): SocketIOClient {
  // 🔧 SSR 환경에서는 경고 후 더미 인스턴스 반환
  if (!isBrowser) {
    console.warn('[Socket.io] getSocketClient called in SSR context');
    // SSR에서는 빈 URL로 인스턴스 생성 (실제 연결은 클라이언트에서만)
    if (!socketClient) {
      socketClient = new SocketIOClient('');
    }
    return socketClient;
  }

  if (!socketClient) {
    // 브라우저 환경에서 동적으로 URL 결정
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

    // 현재 호스트가 localhost가 아닌 경우 (원격 접속)
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // 모든 원격 접속은 공개 도메인의 백엔드 포트(3000)로 연결
      // 내부 IP 사용 시 CORS Private Network Access 정책에 의해 차단됨
      socketUrl = `http://${hostname}:3000`;
    }

    console.log('[Socket.io] Creating singleton client for:', socketUrl);
    socketClient = new SocketIOClient(socketUrl);
  }
  return socketClient;
}

/**
 * 소켓 클라이언트 완전 정리 (앱 종료 시)
 */
export function destroySocketClient(): void {
  if (socketClient) {
    socketClient.disconnect();
    socketClient = null;
    console.log('[Socket.io] Singleton instance destroyed');
  }
}

/**
 * 현재 등록된 핸들러 수 조회 (디버깅용)
 */
export function getSocketHandlerCount(): number {
  return socketClient?.getHandlerCount() ?? 0;
}
