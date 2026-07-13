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

  create: async (data: BankCardFormData): Promise<BankCard> => {
    const response = await apiClient.post<unknown>('/sales/bank-cards/', data);
    const payload = response.data as { data?: unknown };
    return normalizeBankCard(payload?.data ?? response.data);
  },

  update: async (id: number, data: Partial<BankCardFormData>): Promise<BankCard> => {
    const response = await apiClient.patch<unknown>(`/sales/bank-cards/${id}/`, data);
    const payload = response.data as { data?: unknown };
    return normalizeBankCard(payload?.data ?? response.data);
  },

  // Soft delete: backend kartani o'chirmaydi, is_active=false qiladi
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/sales/bank-cards/${id}/`);
  },
};
