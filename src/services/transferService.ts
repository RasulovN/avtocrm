import { apiClient } from './api';
import type { Transfer, TransferFormData, PaginatedResponse, ApiResponse } from '../types';

const normalizeTransfer = (raw: unknown): Transfer => {
  const item = (raw ?? {}) as Partial<Transfer> & {
    id?: string | number;
    from_store?: string | number;
    to_store?: string | number;
    product?: string | number;
    quantity?: string | number;
    created_by?: string | number;
    approved_by?: string | number;
  };

  return {
    id: String(item.id ?? ''),
    from_store_id: item.from_store_id ? String(item.from_store_id) : undefined,
    from_store_name: item.from_store_name,
    to_store_id: item.to_store_id ? String(item.to_store_id) : undefined,
    to_store_name: item.to_store_name,
    items: Array.isArray(item.items) ? item.items : undefined,
    status: item.status ?? 'pending',
    created_at: item.created_at ?? item.approved_at ?? new Date().toISOString(),
    from_store: item.from_store !== undefined ? String(item.from_store) : undefined,
    to_store: item.to_store !== undefined ? String(item.to_store) : undefined,
    product: item.product !== undefined ? String(item.product) : undefined,
    product_name: item.product_name,
    quantity: item.quantity ?? undefined,
    purchase_price: item.purchase_price,
    selling_price: item.selling_price,
    created_by: item.created_by !== undefined ? String(item.created_by) : undefined,
    approved_by: item.approved_by !== undefined ? String(item.approved_by) : undefined,
    approved_at: item.approved_at ?? null,
  };
};

const mapTransferPayload = (data: TransferFormData) => {
  return {
    from_store: Number(data.from_store),
    to_store: Number(data.to_store),
    items: data.items.map(item => ({
      product: Number(item.product),
      quantity: item.quantity,
    })),
  };
};

const extractTransferList = (payload: unknown): Transfer[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeTransfer);
  }
  if (payload && typeof payload === 'object') {
    const anyPayload = payload as { data?: unknown; results?: unknown };
    if (Array.isArray(anyPayload.data)) return anyPayload.data.map(normalizeTransfer);
    if (Array.isArray(anyPayload.results)) return anyPayload.results.map(normalizeTransfer);
    if (anyPayload.data && typeof anyPayload.data === 'object') {
      const nested = anyPayload.data as { data?: unknown; results?: unknown };
      if (Array.isArray(nested.data)) return nested.data.map(normalizeTransfer);
      if (Array.isArray(nested.results)) return nested.results.map(normalizeTransfer);
    }
  }
  return [];
};

export const transferService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<Transfer>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);

    const response = await apiClient.get(`/transfer/?${searchParams.toString()}`);
    const payload = response.data as unknown;
    const data = extractTransferList(payload);

    const rawTotal = (payload as { total?: unknown })?.total;
    const rawCount = (payload as { count?: unknown })?.count;
    const totalFromPayload =
      typeof rawTotal === 'number' ? rawTotal : typeof rawCount === 'number' ? rawCount : data.length;

    return {
      data,
      total: totalFromPayload,
      page: params?.page ?? 1,
      limit: params?.limit ?? data.length,
    };
  },

create: async (data: TransferFormData): Promise<Transfer> => {
  const response = await apiClient.post<ApiResponse<Transfer>>(
    '/transfer/create/',
    mapTransferPayload(data)
  );

  const payload = response.data?.data ?? response.data;
  return normalizeTransfer(payload);
},

  approve: async (id: string): Promise<Transfer> => {
    const response = await apiClient.post<ApiResponse<Transfer>>(`/transfer/${id}/approve/`);
    const payload = response.data?.data ?? response.data;
    return normalizeTransfer(payload);
  },

  reject: async (id: string): Promise<Transfer> => {
    const response = await apiClient.post<ApiResponse<Transfer>>(`/transfer/${id}/reject/`);
    const payload = response.data?.data ?? response.data;
    return normalizeTransfer(payload);
  },

  // ─── O'tkazma qoralamasi (sessiya): avto-saqlash + davom ettirish ───

  // Foydalanuvchining barcha faol qoralamalari (ro'yxat sahifasi uchun)
  getSessions: async (): Promise<TransferSessionRecord[]> => {
    const response = await apiClient.get('/transfer/session/');
    const data = response.data as unknown;
    if (Array.isArray(data)) return data as TransferSessionRecord[];
    const results = (data as { results?: unknown[] })?.results;
    return Array.isArray(results) ? (results as TransferSessionRecord[]) : [];
  },

  // Foydalanuvchining oxirgi faol qoralamasi (bo'lmasa null)
  getActiveSession: async (): Promise<TransferSessionRecord | null> => {
    const list = await transferService.getSessions();
    return list[0] ?? null;
  },

  // Bitta qoralamani ID bo'yicha olish — "Davom ettirish" aynan shu qoralamani ochishi uchun
  getSession: async (id: number): Promise<TransferSessionRecord> => {
    const response = await apiClient.get<TransferSessionRecord>(`/transfer/session/${id}/`);
    return response.data;
  },

  createSession: async (payload: TransferSessionPayload): Promise<TransferSessionRecord> => {
    const response = await apiClient.post<TransferSessionRecord>('/transfer/session/', payload);
    return response.data;
  },

  updateSession: async (id: number, payload: TransferSessionPayload): Promise<TransferSessionRecord> => {
    const response = await apiClient.patch<TransferSessionRecord>(`/transfer/session/${id}/`, payload);
    return response.data;
  },

  cancelSession: async (id: number): Promise<void> => {
    await apiClient.delete(`/transfer/session/${id}/`);
  },

  completeSession: async (id: number, transferId?: string | number): Promise<void> => {
    await apiClient.post(`/transfer/session/${id}/complete/`, transferId ? { transfer: transferId } : {});
  },
};

export interface TransferSessionRecord {
  id: number;
  from_store: number | null;
  from_store_name?: string | null;
  to_store: number | null;
  to_store_name?: string | null;
  items: { product: number | string | null; quantity: number }[];
  status: 'in_progress' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface TransferSessionPayload {
  from_store?: number | string | null;
  to_store?: number | string | null;
  items?: { product: number | string; quantity: number }[];
}
