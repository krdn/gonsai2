/**
 * Socket.io Service
 *
 * @description 실시간 워크플로우 실행 상태 브로드캐스팅 (Socket.io)
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { log } from '../utils/logger';

/**
 * Socket.io 메시지 타입
 */
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

/**
 * Socket.io 서버 클래스
 */
export class SocketIOService {
  private io: SocketIOServer | null = null;
  private clients: Set<Socket> = new Set();

  /**
   * Socket.io 서버 초기화
   */
  public initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*', // 개발 환경에서는 모든 origin 허용
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        exposedHeaders: ['Access-Control-Allow-Private-Network'],
      },
      transports: ['websocket', 'polling'],
      // Private Network Access 헤더 지원
      allowEIO3: true,
    });

    this.io.on('connection', this.handleConnection.bind(this));

    log.info('Socket.io server initialized', {
      transports: ['websocket', 'polling'],
    });
  }

  /**
   * 새로운 클라이언트 연결 처리
   */
  private handleConnection(socket: Socket): void {
    this.clients.add(socket);

    log.info('Socket.io client connected', {
      socketId: socket.id,
      totalClients: this.clients.size,
    });

    // 연결 성공 메시지 전송
    socket.emit('connected', {
      message: 'Connected to gonsai2 Socket.io server',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Ping 이벤트 처리
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
      });
    });

    // Subscription 이벤트 처리
    socket.on('subscribe:execution', (data: { executionId: string }) => {
      socket.join(`execution:${data.executionId}`);
      log.debug('Client subscribed to execution', {
        socketId: socket.id,
        executionId: data.executionId,
      });
    });

    socket.on('unsubscribe:execution', (data: { executionId: string }) => {
      socket.leave(`execution:${data.executionId}`);
      log.debug('Client unsubscribed from execution', {
        socketId: socket.id,
        executionId: data.executionId,
      });
    });

    socket.on('subscribe:workflow', (data: { workflowId: string }) => {
      socket.join(`workflow:${data.workflowId}`);
      log.debug('Client subscribed to workflow', {
        socketId: socket.id,
        workflowId: data.workflowId,
      });
    });

    socket.on('unsubscribe:workflow', (data: { workflowId: string }) => {
      socket.leave(`workflow:${data.workflowId}`);
      log.debug('Client unsubscribed from workflow', {
        socketId: socket.id,
        workflowId: data.workflowId,
      });
    });

    // 연결 해제 처리
    socket.on('disconnect', (reason) => {
      this.clients.delete(socket);
      log.info('Socket.io client disconnected', {
        socketId: socket.id,
        reason,
        totalClients: this.clients.size,
      });
    });

    // 에러 처리
    socket.on('error', (error) => {
      log.error('Socket.io client error', {
        socketId: socket.id,
        error,
      });
    });
  }

  /**
   * 모든 클라이언트에게 브로드캐스트
   */
  public broadcast(event: string, data: any): void {
    if (!this.io) {
      log.warn('Socket.io not initialized');
      return;
    }

    this.io.emit(event, data);

    log.debug('Broadcast Socket.io message', {
      event,
      clients: this.clients.size,
    });
  }

  /**
   * 특정 룸에 메시지 전송
   */
  public broadcastToRoom(room: string, event: string, data: any): void {
    if (!this.io) {
      log.warn('Socket.io not initialized');
      return;
    }

    this.io.to(room).emit(event, data);

    log.debug('Broadcast Socket.io message to room', {
      room,
      event,
    });
  }

  /**
   * 실행 시작 이벤트 브로드캐스트
   */
  public broadcastExecutionStarted(data: ExecutionUpdate): void {
    this.broadcast('execution:started', data);
    this.broadcastToRoom(`execution:${data.executionId}`, 'execution:update', data);
    this.broadcastToRoom(`workflow:${data.workflowId}`, 'execution:update', data);
  }

  /**
   * 실행 업데이트 이벤트 브로드캐스트
   */
  public broadcastExecutionUpdate(data: ExecutionUpdate): void {
    this.broadcast('execution:update', data);
    this.broadcastToRoom(`execution:${data.executionId}`, 'execution:update', data);
    this.broadcastToRoom(`workflow:${data.workflowId}`, 'execution:update', data);
  }

  /**
   * 실행 완료 이벤트 브로드캐스트
   */
  public broadcastExecutionFinished(data: ExecutionUpdate): void {
    this.broadcast('execution:finished', data);
    this.broadcastToRoom(`execution:${data.executionId}`, 'execution:update', data);
    this.broadcastToRoom(`workflow:${data.workflowId}`, 'execution:update', data);
  }

  /**
   * 실행 오류 이벤트 브로드캐스트
   */
  public broadcastExecutionError(data: ExecutionUpdate): void {
    this.broadcast('execution:error', data);
    this.broadcastToRoom(`execution:${data.executionId}`, 'execution:update', data);
    this.broadcastToRoom(`workflow:${data.workflowId}`, 'execution:update', data);
  }

  /**
   * 로그 메시지 브로드캐스트
   */
  public broadcastLogMessage(data: LogMessage): void {
    this.broadcast('log:message', data);
    if (data.executionId) {
      this.broadcastToRoom(`execution:${data.executionId}`, 'log:message', data);
    }
    if (data.workflowId) {
      this.broadcastToRoom(`workflow:${data.workflowId}`, 'log:message', data);
    }
  }

  /**
   * 메트릭 업데이트 브로드캐스트
   */
  public broadcastMetricUpdate(data: MetricUpdate): void {
    this.broadcast('metric:update', data);
  }

  /**
   * 알림 브로드캐스트
   */
  public broadcastNotification(data: Notification): void {
    this.broadcast('notification', data);
    if (data.executionId) {
      this.broadcastToRoom(`execution:${data.executionId}`, 'notification', data);
    }
    if (data.workflowId) {
      this.broadcastToRoom(`workflow:${data.workflowId}`, 'notification', data);
    }
  }

  /**
   * Socket.io 서버 종료
   */
  public shutdown(): void {
    this.clients.forEach((socket) => {
      socket.disconnect(true);
    });

    if (this.io) {
      this.io.close(() => {
        log.info('Socket.io server closed');
      });
    }
  }

  /**
   * 연결된 클라이언트 수 반환
   */
  public getClientCount(): number {
    return this.clients.size;
  }
}

/**
 * 싱글톤 인스턴스
 */
export const socketIOService = new SocketIOService();
