import { apiClient } from './api';
import type { PurchaseSession, PurchaseSessionPayload } from '../types';

/**
 * Kirim (xarid) sessiyasi — progressiv wizard qoralamasi.
 * Oqim: create → PATCH (avto-saqlash) → receive (qabul qilish, tasdiqlanmagan)
 *        → confirm (tasdiqlash — haqiqiy StockEntry yaratiladi).
 */
export interface PurchaseSessionConfirmResult {
  status: string;
  id: number;
  session_id: number;
  items_count: number;
  payment_type: string;
  paid_amount: string;
  debt_amount: string;
}

export const purchaseSessionService = {
  /** Foydalanuvchining faol (tugallanmagan) sessiyalari */
  getActive: async (): Promise<PurchaseSession[]> => {
    const response = await apiClient.get<unknown>('/contract/entry/session/');
    const payload = response.data;
    if (Array.isArray(payload)) return payload as PurchaseSession[];
    if (payload && typeof payload === 'object') {
      const obj = payload as { results?: unknown; data?: unknown };
      if (Array.isArray(obj.results)) return obj.results as PurchaseSession[];
      if (Array.isArray(obj.data)) return obj.data as PurchaseSession[];
    }
    return [];
  },

  /** Yangi sessiya boshlash (1-bosqich yakunida) */
  create: async (data: PurchaseSessionPayload): Promise<PurchaseSession> => {
    const response = await apiClient.post<PurchaseSession>('/contract/entry/session/', data);
    return response.data;
  },

  getById: async (id: number): Promise<PurchaseSession> => {
    const response = await apiClient.get<PurchaseSession>(`/contract/entry/session/${id}/`);
    return response.data;
  },

  /** Avto-saqlash — qisman yangilash */
  update: async (id: number, data: PurchaseSessionPayload): Promise<PurchaseSession> => {
    const response = await apiClient.patch<PurchaseSession>(`/contract/entry/session/${id}/`, data);
    return response.data;
  },

  /** Mahsulotlarni qabul qilish — sessiya "qabul qilingan (tasdiqlanmagan)" bo'ladi */
  receive: async (id: number): Promise<PurchaseSession> => {
    const response = await apiClient.post<PurchaseSession>(`/contract/entry/session/${id}/receive/`);
    return response.data;
  },

  /** Tasdiqlash — haqiqiy kirim (StockEntry) yaratiladi */
  confirm: async (id: number): Promise<PurchaseSessionConfirmResult> => {
    const response = await apiClient.post<PurchaseSessionConfirmResult>(`/contract/entry/session/${id}/confirm/`);
    return response.data;
  },

  /** Sessiyani bekor qilish */
  cancel: async (id: number): Promise<void> => {
    await apiClient.delete(`/contract/entry/session/${id}/`);
  },
};
