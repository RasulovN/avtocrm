import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NotificationWebSocketService } from '../services/NotificationWebSocketService';
import { authService } from '../services/authService';

type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error' | 'reconnecting';

type NotificationData = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type NotificationContextType = {
  notifications: NotificationData[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  connectionStatus: ConnectionStatus;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const WS_URL = 'wss://api.avtoyon.uz/ws/notifications/';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('closed');
  const wsRef = useRef<NotificationWebSocketService | null>(null);

  // Strict Mode double connect oldini olish uchun
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const isAuthenticated = authService.isAuthenticated();
    const shouldConnect = isAuthenticated && !import.meta.env.DEV;

    if (!shouldConnect) {
      setConnectionStatus('closed');
      return;
    }

    const ws = new NotificationWebSocketService(WS_URL);
    wsRef.current = ws;

    ws.addListener((data) => {
      console.log('[NotificationProvider] Yangi notification:', data);
      setNotifications((prev) => [{ ...data, read: false }, ...prev]);
      // Toast va audio trigger qilinadi (quyida)
    });

    ws.addStatusListener(setConnectionStatus);

    ws.connect();

    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, []);

  // Toast va audio trigger
  useEffect(() => {
    if (!notifications.length) return;
    const latest = notifications[0];
    if (!latest.read) {
      // Toast
      window.dispatchEvent(new CustomEvent('notification-toast', { detail: latest }));
      // Audio
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});
    }
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, connectionStatus }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
