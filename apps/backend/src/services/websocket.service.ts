/**
 * WebSocket Service
 *
 * @description 실시간 워크플로우 실행 상태 브로드캐스팅
 */

import WebSocket, { WebSocketServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { log } from '../utils/logger';
import { envConfig } from '../utils/env-validator';

/**
 * WebSocket 메시지 타입
 */
export interface WSMessage {
  type: 'execution.update' | 'workflow.update' | 'error' | 'ping' | 'pong';
  data?: unknown;
  timestamp: string;
}

/**
 * WebSocket 서버 클래스
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * WebSocket 서버 초기화
   */
  public initialize(server: HTTPServer): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', this.handleConnection.bind(this));

    // Ping 인터벌 설정 (30초마다)
    this.pingInterval = setInterval(() => {
      this.broadcast({
        type: 'ping',
        timestamp: new Date().toISOString(),
      });
    }, 30000);

    log.info('WebSocket server initialized', {
      port: envConfig.PORT,
      path: '/ws',
    });
  }

  /**
   * 새로운 클라이언트 연결 처리
   */
  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);

    log.info('WebSocket client connected', {
      totalClients: this.clients.size,
    });

    // 연결 성공 메시지 전송
    this.sendToClient(ws, {
      type: 'pong',
      data: { message: 'Connected to gonsai2 WebSocket server' },
      timestamp: new Date().toISOString(),
    });

    // 클라이언트 메시지 처리
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        this.handleMessage(ws, message);
      } catch (error) {
        log.error('Invalid WebSocket message', error);
        this.sendToClient(ws, {
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 클라이언트 연결 해제 처리
    ws.on('close', () => {
      this.clients.delete(ws);
      log.info('WebSocket client disconnected', {
        totalClients: this.clients.size,
      });
    });

    // 에러 처리
    ws.on('error', (error) => {
      log.error('WebSocket error', error);
      this.clients.delete(ws);
    });
  }

  /**
   * 클라이언트 메시지 처리
   */
  private handleMessage(ws: WebSocket, message: WSMessage): void {
    log.debug('Received WebSocket message', { type: message.type });

    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        log.warn('Unknown WebSocket message type', { type: message.type });
    }
  }

  /**
   * 특정 클라이언트에게 메시지 전송
   */
  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * 모든 클라이언트에게 브로드캐스트
   */
  public broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });

    log.debug('Broadcast WebSocket message', {
      type: message.type,
      clients: this.clients.size,
    });
  }

  /**
   * 실행 상태 업데이트 브로드캐스트
   */
  public broadcastExecutionUpdate(data: {
    executionId: string;
    workflowId: string;
    status: string;
    progress?: number;
  }): void {
    this.broadcast({
      type: 'execution.update',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 워크플로우 업데이트 브로드캐스트
   */
  public broadcastWorkflowUpdate(data: {
    workflowId: string;
    action: 'created' | 'updated' | 'deleted';
  }): void {
    this.broadcast({
      type: 'workflow.update',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * WebSocket 서버 종료
   */
  public shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.clients.forEach((client) => {
      client.close(1000, 'Server shutting down');
    });

    this.wss?.close(() => {
      log.info('WebSocket server closed');
    });
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
export const websocketService = new WebSocketService();
