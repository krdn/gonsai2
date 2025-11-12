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

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        console.log('[Socket.io] Connected to server');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket.io] Connection error:', error);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
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
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
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
  emit(event: string, data?: any): void {
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
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    socketClient = new SocketIOClient(socketUrl);
  }
  return socketClient;
}
