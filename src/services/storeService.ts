import { apiClient } from './api';
import type { Store, StoreFormData, PaginatedResponse, ApiResponse } from '../types';

const normalizeStore = (raw: unknown): Store => {
  const item = (raw ?? {}) as Partial<Store> & {
    id?: string | number;
    phone_number?: string;
    phone?: string;
    type?: string;
    is_warehouse?: boolean;
  };
  const normalizedType = String(item.type ?? '').toLowerCase();
  const isWarehouse = typeof item.is_warehouse === 'boolean'
    ? item.is_warehouse
    : normalizedType === 'w' || normalizedType === 'warehouse' || normalizedType === 'wh';

  return {
    id: String(item.id ?? ''),
    name: item.name ?? '',
    address: item.address ?? '',
    phone: item.phone ?? item.phone_number ?? '',
    phone_number: item.phone_number ?? item.phone ?? '',
    type: item.type,
    latitude: item.latitude,
    longitude: item.longitude,
    is_active: item.is_active,
    sellers: item.sellers,
    is_warehouse: isWarehouse,
    created_at: item.created_at ?? '',
  };
};

const mapStorePayload = (data: StoreFormData): Record<string, unknown> => ({
  name: data.name,
  address: data.address,
  phone_number: data.phone_number ?? data.phone,
  type: data.type ?? (data.is_warehouse ? 'w' : 's'),
  latitude: data.latitude,
  longitude: data.longitude,
});

const mapStoreUpdatePayload = (data: Partial<StoreFormData>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (typeof data.name === 'string') payload.name = data.name;
  if (typeof data.address === 'string') payload.address = data.address;
  if (typeof data.phone_number === 'string') payload.phone_number = data.phone_number;
  if (typeof data.phone === 'string') payload.phone_number = data.phone;
  if (typeof data.type === 'string') payload.type = data.type;
  if (typeof data.is_warehouse === 'boolean' && typeof payload.type !== 'string') {
    payload.type = data.is_warehouse ? 'w' : 's';
  }
  if (typeof data.latitude === 'string') payload.latitude = data.latitude;
  if (typeof data.longitude === 'string') payload.longitude = data.longitude;
  return payload;
};

export const storeService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Store>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/store/?${searchParams.toString()}`);
    const payload = response.data as unknown;
    if (Array.isArray(payload)) {
      const data = payload.map(normalizeStore);
      return {
        data,
        total: data.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? data.length,
      };
    }
    if (payload && typeof payload === 'object') {
      const anyPayload = payload as { data?: unknown; results?: unknown; count?: number; total?: number; page?: number; limit?: number };
      if (anyPayload.data && typeof anyPayload.data === 'object') {
        const nested = anyPayload.data as { data?: unknown; results?: unknown; count?: number; total?: number; page?: number; limit?: number };
        if (Array.isArray(nested.data)) {
          const data = nested.data.map(normalizeStore);
          return {
            data,
            total: typeof nested.total === 'number' ? nested.total : data.length,
            page: typeof nested.page === 'number' ? nested.page : (params?.page ?? 1),
            limit: typeof nested.limit === 'number' ? nested.limit : (params?.limit ?? data.length),
          };
        }
        if (Array.isArray(nested.results)) {
          const data = nested.results.map(normalizeStore);
          return {
            data,
            total: typeof nested.count === 'number' ? nested.count : data.length,
            page: params?.page ?? 1,
            limit: params?.limit ?? data.length,
          };
        }
      }
      if (Array.isArray(anyPayload.data)) {
        const data = anyPayload.data.map(normalizeStore);
        return {
          data,
          total: typeof anyPayload.total === 'number' ? anyPayload.total : data.length,
          page: typeof anyPayload.page === 'number' ? anyPayload.page : (params?.page ?? 1),
          limit: typeof anyPayload.limit === 'number' ? anyPayload.limit : (params?.limit ?? data.length),
        };
      }
      if (Array.isArray(anyPayload.results)) {
        const data = anyPayload.results.map(normalizeStore);
        return {
          data,
          total: typeof anyPayload.count === 'number' ? anyPayload.count : data.length,
          page: params?.page ?? 1,
          limit: params?.limit ?? data.length,
        };
      }
    }
    return { data: [], total: 0, page: params?.page ?? 1, limit: params?.limit ?? 10 };
  },

  getById: async (id: string): Promise<Store> => {
    const response = await apiClient.get<ApiResponse<Store>>(`/store/${id}/`);
    const payload = response.data?.data ?? response.data;
    return normalizeStore(payload);
  },

  create: async (data: StoreFormData): Promise<Store> => {
    const response = await apiClient.post<ApiResponse<Store>>('/store/create/', mapStorePayload(data));
    const payload = response.data?.data ?? response.data;
    return normalizeStore(payload);
  },

  update: async (id: string, data: Partial<StoreFormData>): Promise<Store> => {
    const response = await apiClient.put<ApiResponse<Store>>(`/store/${id}/`, mapStoreUpdatePayload(data));
    const payload = response.data?.data ?? response.data;
    return normalizeStore(payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/store/${id}/`);
  },
};
