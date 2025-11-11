/**
 * n8n WebSocket Client
 *
 * @module n8n-integration/websocket-client
 * @description Real-time workflow execution monitoring via WebSocket
 *
 * @aiContext
 * This client connects to n8n's WebSocket endpoint for real-time updates.
 * Automatically reconnects on disconnection with exponential backoff.
 *
 * Usage:
 * ```typescript
 * const ws = new N8nWebSocketClient({ baseUrl, sessionId });
 * ws.on('executionStarted', (data) => console.log('Started:', data));
 * await ws.connect();
 * ```
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

/**
 * WebSocket client configuration
 */
export interface N8nWebSocketConfig {
  /** n8n base URL (e.g., http://localhost:5678) */
  baseUrl: string;

  /** Session ID for authentication */
  sessionId: string;

  /** Auto-reconnect on disconnection */
  autoReconnect?: boolean;

  /** Reconnect delay in milliseconds */
  reconnectDelay?: number;

  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
}

/**
 * WebSocket event types
 */
export type WebSocketEvent =
  | 'executionStarted'
  | 'executionFinished'
  | 'executionProgress'
  | 'nodeExecuted'
  | 'error'
  | 'connected'
  | 'disconnected'
  | 'reconnecting';

/**
 * WebSocket message payload
 */
export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: string;
}

/**
 * n8n WebSocket client with automatic reconnection
 *
 * @aiContext
 * Maintains a persistent WebSocket connection to n8n.
 * Emits events for real-time execution monitoring.
 */
export class N8nWebSocketClient extends EventEmitter {
  private ws?: WebSocket;
  private readonly baseUrl: string;
  private readonly sessionId: string;
  private readonly autoReconnect: boolean;
  private readonly reconnectDelay: number;
  private readonly maxReconnectAttempts: number;

  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private isConnecting = false;
  private isClosed = false;

  constructor(config: N8nWebSocketConfig) {
    super();

    this.baseUrl = config.baseUrl.replace(/^http/, 'ws'); // Convert to ws://
    this.sessionId = config.sessionId;
    this.autoReconnect = config.autoReconnect ?? true;
    this.reconnectDelay = config.reconnectDelay ?? 3000;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 10;
  }

  /**
   * Connect to n8n WebSocket
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    this.isClosed = false;

    try {
      const wsUrl = `${this.baseUrl}/?sessionId=${this.sessionId}`;

      this.ws = new WebSocket(wsUrl, {
        headers: {
          Origin: this.baseUrl.replace(/^ws/, 'http'),
        },
      });

      await this.setupWebSocket();
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.emit('disconnected');
  }

  /**
   * Send message to n8n
   */
  send(type: string, data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Setup WebSocket event handlers
   */
  private async setupWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      this.ws.on('open', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleMessage(message);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse message: ${error}`));
        }
      });

      this.ws.on('close', (code: number, reason: string) => {
        this.isConnecting = false;
        this.emit('disconnected', { code, reason });

        if (this.autoReconnect && !this.isClosed) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error: Error) => {
        this.isConnecting = false;
        this.emit('error', error);
        reject(error);
      });
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'executionStarted':
        this.emit('executionStarted', message.data);
        break;

      case 'executionFinished':
        this.emit('executionFinished', message.data);
        break;

      case 'executionProgress':
        this.emit('executionProgress', message.data);
        break;

      case 'nodeExecuted':
        this.emit('nodeExecuted', message.data);
        break;

      case 'error':
        this.emit('error', new Error(String(message.data)));
        break;

      default:
        // Unknown message type - log but don't error
        console.warn(`Unknown WebSocket message type: ${message.type}`);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnect attempts reached'));
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        this.emit('error', error);
      });
    }, delay);
  }
}

/**
 * Create WebSocket client with environment variables
 *
 * @aiContext
 * Convenience factory for creating WebSocket clients.
 */
export function createWebSocketClient(
  config?: Partial<N8nWebSocketConfig>
): N8nWebSocketClient {
  return new N8nWebSocketClient({
    baseUrl: config?.baseUrl ?? process.env.N8N_API_URL ?? '',
    sessionId: config?.sessionId ?? crypto.randomUUID(),
    ...config,
  });
}
