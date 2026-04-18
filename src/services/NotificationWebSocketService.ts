// src/services/NotificationWebSocketService.ts
type NotificationData = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type Listener = (data: NotificationData) => void;
type StatusListener = (status: ConnectionStatus) => void;

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error' | 'reconnecting';

export class NotificationWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private heartbeatInterval = 25000;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private listeners: Listener[] = [];
  private statusListeners: StatusListener[] = [];
  private status: ConnectionStatus = 'closed';

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.log('Already connected or connecting');
      return;
    }
    this.manuallyClosed = false;
    this.setStatus('connecting');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.log('WebSocket connected');
      this.setStatus('open');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      this.log('WebSocket message:', event.data);
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((cb) => cb(data));
      } catch (e) {
        this.log('Invalid JSON:', event.data);
      }
    };

    this.ws.onerror = (event) => {
      this.log('WebSocket error', event);
      this.setStatus('error');
    };

    this.ws.onclose = (event) => {
      this.log('WebSocket closed', event);
      this.setStatus('closed');
      this.stopHeartbeat();
      if (!this.manuallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnect();
      }
    };
  }

  disconnect() {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('closed');
  }

  private reconnect() {
    this.reconnectAttempts++;
    this.setStatus('reconnecting');
    setTimeout(() => {
      this.log(`Reconnect attempt #${this.reconnectAttempts}`);
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        this.log('Heartbeat ping sent');
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  addListener(cb: Listener) {
    this.listeners.push(cb);
  }

  removeListener(cb: Listener) {
    this.listeners = this.listeners.filter((l) => l !== cb);
  }

  addStatusListener(cb: StatusListener) {
    this.statusListeners.push(cb);
  }

  removeStatusListener(cb: StatusListener) {
    this.statusListeners = this.statusListeners.filter((l) => l !== cb);
  }

  getStatus() {
    return this.status;
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  private log(...args: any[]) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.log('[NotificationWS]', ...args);
    }
  }
}
