import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../context/NotificationProvider';
import { t } from 'i18next';

export const NotificationToast: React.FC = () => {
  const [toast, setToast] = useState<any>(null);
  const { markAsRead } = useNotifications();

  useEffect(() => {
    const handler = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 4000);
    };
    window.addEventListener('notification-toast', handler);
    return () => window.removeEventListener('notification-toast', handler);
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50">
      <strong>{toast.title}</strong>
      <div>{toast.message}</div>
      <button
        className="mt-2 underline"
        onClick={() => {
          markAsRead(toast.id);
          setToast(null);
        }}
      >{t("components.markAsRead")}</button>
    </div>
  );
};
