/**
 * WebSocket manager for real-time updates.
 * Automatically reconnects and handles subscriptions.
 */
import { getApiBase } from './config';

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private onConnectHandlers: Set<ConnectionHandler> = new Set();
  private onDisconnectHandlers: Set<ConnectionHandler> = new Set();
  private isIntentionallyClosed = false;

  constructor(private path: string = '/ws') {}

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.isIntentionallyClosed = false;
    const wsUrl = getApiBase().replace('http', 'ws') + this.path;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.onConnectHandlers.forEach((handler) => handler());
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          const handlers = this.handlers.get(type);
          if (handlers) {
            handlers.forEach((handler) => handler(data));
          }

          // Broadcast to "all" listeners
          const allHandlers = this.handlers.get('*');
          if (allHandlers) {
            allHandlers.forEach((handler) => handler(message));
          }
        } catch (error) {
          console.error('[WS] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.onDisconnectHandlers.forEach((handler) => handler());

        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(
            `[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
          );
          setTimeout(() => this.connect(), delay);
        }
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('[WS] Not connected, message not sent');
    }
  }

  subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(type);
        }
      }
    };
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.onConnectHandlers.add(handler);
    return () => this.onConnectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.onDisconnectHandlers.add(handler);
    return () => this.onDisconnectHandlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global singleton instance
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

/**
 * React hook for WebSocket subscriptions.
 */
export function useWebSocket(type: string, handler: MessageHandler, enabled = true) {
  const ws = getWebSocketManager();

  if (typeof window !== 'undefined' && enabled) {
    // Connect on mount
    if (!ws.isConnected) {
      ws.connect();
    }

    // Subscribe and cleanup
    const unsubscribe = ws.subscribe(type, handler);
    return () => {
      unsubscribe();
    };
  }
}
