import { apiClient } from './api';
import type { BankCard, BankCardFormData } from '../types';

const normalizeBankCard = (raw: unknown): BankCard => {
  const item = (raw ?? {}) as Partial<BankCard> & { id?: string | number };
  return {
    id: Number(item.id ?? 0),
    name: item.name ?? '',
    is_default: Boolean(item.is_default),
    is_active: item.is_active !== false,
    created_at: item.created_at ?? '',
  };
};

export const bankCardService = {
  /** GET /api/sales/bank-cards/ — barcha yoki filtr bilan */
  getAll: async (params?: { is_active?: boolean }): Promise<BankCard[]> => {
    const searchParams = new URLSearchParams();
    if (params?.is_active !== undefined) searchParams.append('is_active', String(params.is_active));

    const queryString = searchParams.toString();
    const url = queryString ? `/sales/bank-cards/?${queryString}` : '/sales/bank-cards/';
    const response = await apiClient.get<unknown>(url);
    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload.map(normalizeBankCard);
    }
    if (payload && typeof payload === 'object') {
      const objPayload = payload as { results?: unknown; data?: unknown };
      if (Array.isArray(objPayload.results)) return objPayload.results.map(normalizeBankCard);
      if (Array.isArray(objPayload.data)) return objPayload.data.map(normalizeBankCard);
    }
    return [];
  },

  /** GET /api/sales/bank-cards/{id}/ — bitta karta */
  getById: async (id: number): Promise<BankCard> => {
    const response = await apiClient.get<unknown>(`/sales/bank-cards/${id}/`);
    return normalizeBankCard(response.data);
  },

  /** POST /api/sales/bank-cards/ — yangi karta yaratish */
  create: async (data: BankCardFormData): Promise<BankCard> => {
    const payload: Record<string, unknown> = {
      name: data.name,
      is_default: data.is_default ?? false,
      is_active: data.is_active !== false, // default: true
    };
    const response = await apiClient.post<unknown>('/sales/bank-cards/', payload);
    const res = response.data as { data?: unknown };
    return normalizeBankCard(res?.data ?? response.data);
  },

  /** PATCH /api/sales/bank-cards/{id}/ — qisman yangilash */
  update: async (id: number, data: Partial<BankCardFormData>): Promise<BankCard> => {
    const response = await apiClient.patch<unknown>(`/sales/bank-cards/${id}/`, data);
    const res = response.data as { data?: unknown };
    return normalizeBankCard(res?.data ?? response.data);
  },

  /** PUT /api/sales/bank-cards/{id}/ — to'liq yangilash */
  updateFull: async (id: number, data: BankCardFormData): Promise<BankCard> => {
    const payload: Record<string, unknown> = {
      name: data.name,
      is_default: data.is_default ?? false,
      is_active: data.is_active !== false,
    };
    const response = await apiClient.put<unknown>(`/sales/bank-cards/${id}/`, payload);
    const res = response.data as { data?: unknown };
    return normalizeBankCard(res?.data ?? response.data);
  },

  /** Kartani faollashtirish / faolsizlashtirish toggle (PATCH is_active) */
  toggleActive: async (id: number, isActive: boolean): Promise<BankCard> => {
    const response = await apiClient.patch<unknown>(`/sales/bank-cards/${id}/`, {
      is_active: isActive,
    });
    const res = response.data as { data?: unknown };
    return normalizeBankCard(res?.data ?? response.data);
  },

  /** DELETE /api/sales/bank-cards/{id}/ — soft delete (is_active=false bo'ladi) */
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/sales/bank-cards/${id}/`);
  },
};
