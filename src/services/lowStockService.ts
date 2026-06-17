import { apiClient } from './api';
import type { LowStockItem, LowStockPaginatedResponse } from '../types';

export interface LowStockFilters {
  action_type?: 'purchase' | 'transfer';
  store?: number | string;
  product?: number | string;
  page?: number;
  limit?: number;
  ordering?: string;
}

const buildParams = (filters?: LowStockFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters?.action_type) params.append('action_type', filters.action_type);
  if (filters?.store) params.append('store', String(filters.store));
  if (filters?.product) params.append('product', String(filters.product));
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.ordering) params.append('ordering', filters.ordering);
  return params;
};

export interface LowStockPagedResult {
  data: LowStockItem[];
  total: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
}

const mapResponse = (raw: LowStockPaginatedResponse): LowStockPagedResult => ({
  data: raw.results ?? [],
  total: raw.count ?? 0,
  total_pages: raw.total_pages ?? 1,
  current_page: raw.current_page ?? 1,
  next: raw.next ?? null,
  previous: raw.previous ?? null,
});

export const lowStockService = {
  getLowStock: async (filters?: LowStockFilters): Promise<LowStockPagedResult> => {
    const params = buildParams(filters);
    const response = await apiClient.get<LowStockPaginatedResponse>(
      `/inventory/low-stock/?${params.toString()}`
    );
    return mapResponse(response.data);
  },

  getHistory: async (filters?: LowStockFilters): Promise<LowStockPagedResult> => {
    const params = buildParams(filters);
    const response = await apiClient.get<LowStockPaginatedResponse>(
      `/inventory/low-stock/history/?${params.toString()}`
    );
    return mapResponse(response.data);
  },
};
