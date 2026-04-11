import { apiClient } from './api';
import type { Supplier, SupplierFormData, PaginatedResponse, ApiResponse } from '../types';

const normalizeSupplier = (raw: unknown): Supplier => {
  const item = (raw ?? {}) as Partial<Supplier> & {
    id?: string | number;
    name?: string;
    name_uz?: string;
    name_uz_cyrl?: string;
    description?: string;
    description_uz?: string;
    description_uz_cyrl?: string;
    address?: string;
    address_uz?: string;
    address_uz_cyrl?: string;
    phone?: string;
    phone_number?: string;
    inn?: string;
    is_active?: boolean;
    debt?: number;
    created_at?: string;
  };

  return {
    id: String(item.id ?? ''),
    name: item.name ?? item.name_uz ?? item.name_uz_cyrl ?? '',
    name_uz: item.name_uz ?? item.name ?? '',
    name_uz_cyrl: item.name_uz_cyrl ?? '',
    description: item.description ?? item.description_uz ?? item.description_uz_cyrl ?? '',
    description_uz: item.description_uz ?? item.description ?? '',
    description_uz_cyrl: item.description_uz_cyrl ?? '',
    address: item.address ?? item.address_uz ?? item.address_uz_cyrl ?? '',
    address_uz: item.address_uz ?? item.address ?? '',
    address_uz_cyrl: item.address_uz_cyrl ?? '',
    phone: item.phone ?? item.phone_number ?? '',
    phone_number: item.phone_number ?? item.phone ?? '',
    inn: item.inn,
    is_active: item.is_active,
    debt: typeof item.debt === 'number' ? item.debt : 0,
    created_at: item.created_at ?? '',
  };
};

const mapSupplierPayload = (data: SupplierFormData): Record<string, unknown> => ({
  phone_number: data.phone_number,
  inn: data.inn,
  name_uz: data.name_uz,
  name_uz_cyrl: data.name_uz_cyrl,
  description_uz: data.description_uz,
  description_uz_cyrl: data.description_uz_cyrl,
  address_uz: data.address_uz,
  address_uz_cyrl: data.address_uz_cyrl,
});

const mapSupplierUpdatePayload = (data: Partial<SupplierFormData>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (typeof data.phone_number === 'string') payload.phone_number = data.phone_number;
  if (typeof data.inn === 'string') payload.inn = data.inn;
  if (typeof data.name_uz === 'string') payload.name_uz = data.name_uz;
  if (typeof data.name_uz_cyrl === 'string') payload.name_uz_cyrl = data.name_uz_cyrl;
  if (typeof data.description_uz === 'string') payload.description_uz = data.description_uz;
  if (typeof data.description_uz_cyrl === 'string') payload.description_uz_cyrl = data.description_uz_cyrl;
  if (typeof data.address_uz === 'string') payload.address_uz = data.address_uz;
  if (typeof data.address_uz_cyrl === 'string') payload.address_uz_cyrl = data.address_uz_cyrl;
  return payload;
};

export const supplierService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Supplier>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/contract/supplier/?${searchParams.toString()}`);
    const payload = response.data as unknown;
    if (Array.isArray(payload)) {
      const data = payload.map(normalizeSupplier);
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
          const data = nested.data.map(normalizeSupplier);
          return {
            data,
            total: typeof nested.total === 'number' ? nested.total : data.length,
            page: typeof nested.page === 'number' ? nested.page : (params?.page ?? 1),
            limit: typeof nested.limit === 'number' ? nested.limit : (params?.limit ?? data.length),
          };
        }
        if (Array.isArray(nested.results)) {
          const data = nested.results.map(normalizeSupplier);
          return {
            data,
            total: typeof nested.count === 'number' ? nested.count : data.length,
            page: params?.page ?? 1,
            limit: params?.limit ?? data.length,
          };
        }
      }
      if (Array.isArray(anyPayload.data)) {
        const data = anyPayload.data.map(normalizeSupplier);
        return {
          data,
          total: typeof anyPayload.total === 'number' ? anyPayload.total : data.length,
          page: typeof anyPayload.page === 'number' ? anyPayload.page : (params?.page ?? 1),
          limit: typeof anyPayload.limit === 'number' ? anyPayload.limit : (params?.limit ?? data.length),
        };
      }
      if (Array.isArray(anyPayload.results)) {
        const data = anyPayload.results.map(normalizeSupplier);
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

  getById: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get<ApiResponse<Supplier>>(`/contract/supplier/${id}/`);
    const payload = response.data?.data ?? response.data;
    return normalizeSupplier(payload);
  },

  create: async (data: SupplierFormData): Promise<Supplier> => {
    const response = await apiClient.post<ApiResponse<Supplier>>('/contract/supplier/create/', mapSupplierPayload(data));
    const payload = response.data?.data ?? response.data;
    return normalizeSupplier(payload);
  },

  update: async (id: string, data: Partial<SupplierFormData>): Promise<Supplier> => {
    const response = await apiClient.put<ApiResponse<Supplier>>(`/contract/supplier/${id}/`, mapSupplierUpdatePayload(data));
    const payload = response.data?.data ?? response.data;
    return normalizeSupplier(payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/contract/supplier/${id}/`);
  },

  createPayment: async (data: { supplier: number; entry: number; amount: string; note?: string }) => {
    const response = await apiClient.post('/contract/supplier-payments/create/', data);
    return response.data;
  },
};
