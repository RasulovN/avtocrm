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

const makeNotification = (
  id: string,
  title: string,
  message: string,
  type: AppNotification['type'] = 'info'
): AppNotification => ({
  id,
  title,
  message,
  created_at: new Date().toISOString(),
  read: false,
  type,
});

class MockNotificationSocketService {
  private notifications: AppNotification[] = [];
  private subscribers = new Set<Subscriber>();
  private timer: number | null = null;
  private activeUserId: number | null = null;
  private seq = 1;

  connect(user: User) {
    if (this.activeUserId === user.id && this.timer) {
      this.emit();
      return;
    }

    this.disconnect();
    this.activeUserId = user.id;
    this.notifications = this.seedNotifications(user);
    this.emit();

    window.setTimeout(() => {
      if (this.activeUserId !== user.id) return;
      this.push(
        makeNotification(
          `welcome-${user.id}`,
          user.is_superuser ? 'Admin panel tayyor' : 'Do\'kon paneli tayyor',
          user.is_superuser
            ? 'Barcha boshqaruv bo\'limlari kuzatuv uchun faol.'
            : `${user.store_name || 'Do\'kon'} bo\'yicha bildirishnomalar yoqildi.`,
          'success'
        )
      );
    }, 4800);

    this.timer = window.setInterval(() => {
      if (this.activeUserId !== user.id) return;
      this.push(this.generateNotification(user));
    }, 82000);
  }

  disconnect() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    callback(this.notifications);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  markAsRead(id: string) {
    this.notifications = this.notifications.map((item) =>
      item.id === id ? { ...item, read: true } : item
    );
    this.emit();
  }

  markAllAsRead() {
    this.notifications = this.notifications.map((item) => ({ ...item, read: true }));
    this.emit();
  }

  private push(notification: AppNotification) {
    this.notifications = [notification, ...this.notifications].slice(0, 12);
    this.emit();
  }

  private emit() {
    this.subscribers.forEach((subscriber) => subscriber([...this.notifications]));
  }

  private seedNotifications(user: User): AppNotification[] {
    if (user.is_superuser) {
      return [
        makeNotification('seed-1', 'Yangi sotuv', 'Chilonzor filialida 3 ta mahsulot sotildi.', 'success'),
        makeNotification('seed-2', 'Transfer so\'rovi', 'Sergeli omboridan yangi transfer so\'rovi keldi.', 'warning'),
      ];
    }

    return [
      makeNotification(
        'seed-3',
        'Do\'kon holati',
        `${user.store_name || 'Do\'kon'} bo\'yicha kunlik statistika yangilandi.`,
        'info'
      ),
      makeNotification('seed-4', 'Yangi buyurtma', 'Sotuv bo\'limida yangi mijoz savdosi boshlandi.', 'success'),
    ];
  }

  private generateNotification(user: User): AppNotification {
    const id = `notif-${this.seq++}`;
    const storeName = user.store_name || 'Do\'kon';

    if (user.is_superuser) {
      const items = [
        makeNotification(id, 'Kirim tasdiqlandi', 'Ombordan yangi kirim operatsiyasi yakunlandi.', 'success'),
        makeNotification(id, 'Past qoldiq', `${storeName} bo\'yicha ayrim mahsulotlar soni kamaydi.`, 'warning'),
        makeNotification(id, 'Hisobot tayyor', 'Kunlik moliyaviy hisobot avtomatik yig\'ildi.', 'info'),
      ];
      return items[this.seq % items.length];
    }

    const items = [
      makeNotification(id, 'Yangi sotuv', `${storeName} da yangi savdo cheki yaratildi.`, 'success'),
      makeNotification(id, 'Transfer yuborildi', `${storeName} uchun yangi o'tkazma harakati bor.`, 'info'),
      makeNotification(id, 'Qoldiq eslatmasi', 'Ba\'zi mahsulotlar qoldig\'i minimal darajaga tushdi.', 'warning'),
    ];
    return items[this.seq % items.length];
  }
}

export const notificationService = new MockNotificationSocketService();
