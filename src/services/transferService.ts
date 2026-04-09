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

const mapTransferPayload = (data: TransferFormData): Record<string, unknown> => ({
  from_store: data.from_store,
  to_store: data.to_store,
  product: data.product,
  quantity: data.quantity,
});

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
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Transfer>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/transfer/?${searchParams.toString()}`);
    const payload = response.data as unknown;
    const data = extractTransferList(payload);

    const totalFromPayload =
      typeof (payload as { total?: number })?.total === 'number'
        ? (payload as { total?: number }).total
        : typeof (payload as { count?: number })?.count === 'number'
          ? (payload as { count?: number }).count
          : data.length;

    return {
      data,
      total: totalFromPayload,
      page: params?.page ?? 1,
      limit: params?.limit ?? data.length,
    };
  },

  create: async (data: TransferFormData): Promise<Transfer> => {
    const response = await apiClient.post<ApiResponse<Transfer>>('/transfer/create/', mapTransferPayload(data));
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
};
