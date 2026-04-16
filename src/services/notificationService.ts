import type { User } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

type Subscriber = (notifications: AppNotification[]) => void;

const WS_URL = 'wss://api.avtoyon.uz/ws/notifications/';

class NotificationSocketService {
  private ws: WebSocket | null = null;
  private notifications: AppNotification[] = [];
  private subscribers = new Set<Subscriber>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimer: number | null = null;
  private user: User | null = null;
  private heartbeatInterval: number | null = null;
  private isManualDisconnect = false;
  private isConnecting = false;

  connect(user: User) {
    this.user = user;
    this.isManualDisconnect = false;
    this.notifications = [];
    this.emit();
    this.createConnection();
  }

  private createConnection() {
    if (!this.user || this.isConnecting || this.isManualDisconnect) return;

    this.isConnecting = true;

    try {
      // ❗ Cookie avtomatik yuboriladi
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('✅ WS CONNECTED');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        this.push({
          id: `ws-connect-${Date.now()}`,
          title: 'Aloqa yoqildi',
          message: 'Real vaqtda bildirishnomalar faol.',
          created_at: new Date().toISOString(),
          read: false,
          type: 'success',
        });
      };

      this.ws.onmessage = (event) => {
        console.log('📩 MESSAGE:', event.data);

        try {
          const data = JSON.parse(event.data);

          if (data.type === 'notification' || data.notification) {
            const notification: AppNotification = {
              id: data.id || `notif-${Date.now()}`,
              title: data.title || 'Bildirishnoma',
              message: data.message || data.body || '',
              created_at: data.created_at || new Date().toISOString(),
              read: false,
              type: data.level || 'info',
            };

            this.push(notification);
          }
        } catch {
          this.push({
            id: `notif-${Date.now()}`,
            title: 'Yangi xabar',
            message: event.data,
            created_at: new Date().toISOString(),
            read: false,
            type: 'info',
          });
        }
      };

      this.ws.onclose = (e) => {
        console.log('❌ WS CLOSED:', e);
        this.isConnecting = false;
        this.stopHeartbeat();

        if (this.isManualDisconnect) return;

        this.push({
          id: `ws-disconnect-${Date.now()}`,
          title: 'Aloqa uzildi',
          message: 'Server bilan aloqa uzildi. Qayta ulanish...',
          created_at: new Date().toISOString(),
          read: false,
          type: 'warning',
        });

        this.attemptReconnect();
      };

      this.ws.onerror = (e) => {
        console.log('🚨 WS ERROR:', e);
        this.isConnecting = false;
      };
    } catch (error) {
      console.log('❌ WS INIT ERROR:', error);
      this.isConnecting = false;
    }
  }

  private attemptReconnect() {
    if (this.isManualDisconnect || !this.user) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.push({
        id: `ws-failed-${Date.now()}`,
        title: 'Ulana olmadik',
        message: 'Serverga ulanish amalga oshmadi.',
        created_at: new Date().toISOString(),
        read: false,
        type: 'warning',
      });
      return;
    }

    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.createConnection();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.user = null;
  }

  subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    callback([...this.notifications]);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  markAsRead(id: string) {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this.emit();
  }

  markAllAsRead() {
    this.notifications = this.notifications.map((n) => ({
      ...n,
      read: true,
    }));
    this.emit();
  }

  private push(notification: AppNotification) {
    this.notifications = [notification, ...this.notifications].slice(0, 50);
    this.emit();
  }

  private emit() {
    this.subscribers.forEach((cb) => cb([...this.notifications]));
  }

  send(message: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export const notificationService = new NotificationSocketService();