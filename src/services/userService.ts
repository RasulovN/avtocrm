import { apiClient } from './api';
import type { User, UserFormData, PaginatedResponse, ApiResponse } from '../types';

export const userService = {
  getAll: async (params?: { page?: number; limit?: number; store_id?: string }): Promise<PaginatedResponse<User>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.store_id) searchParams.append('store_id', params.store_id);

    const response = await apiClient.get(`/users/?${searchParams.toString()}`);
    const payload = response.data as unknown;
    if (Array.isArray(payload)) {
      return {
        data: payload,
        total: payload.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? payload.length,
      };
    }
    if (payload && typeof payload === 'object') {
      const anyPayload = payload as { data?: unknown; results?: unknown; count?: number; total?: number; page?: number; limit?: number };
      if (anyPayload.data && typeof anyPayload.data === 'object') {
        const nested = anyPayload.data as { data?: unknown; results?: unknown; count?: number; total?: number; page?: number; limit?: number };
        if (Array.isArray(nested.data)) {
          return {
            data: nested.data,
            total: typeof nested.total === 'number' ? nested.total : nested.data.length,
            page: typeof nested.page === 'number' ? nested.page : (params?.page ?? 1),
            limit: typeof nested.limit === 'number' ? nested.limit : (params?.limit ?? nested.data.length),
          };
        }
        if (Array.isArray(nested.results)) {
          return {
            data: nested.results,
            total: typeof nested.count === 'number' ? nested.count : nested.results.length,
            page: params?.page ?? 1,
            limit: params?.limit ?? nested.results.length,
          };
        }
      }
      if (Array.isArray(anyPayload.data)) {
        return {
          data: anyPayload.data,
          total: typeof anyPayload.total === 'number' ? anyPayload.total : anyPayload.data.length,
          page: typeof anyPayload.page === 'number' ? anyPayload.page : (params?.page ?? 1),
          limit: typeof anyPayload.limit === 'number' ? anyPayload.limit : (params?.limit ?? anyPayload.data.length),
        };
      }
      if (Array.isArray(anyPayload.results)) {
        return {
          data: anyPayload.results,
          total: typeof anyPayload.count === 'number' ? anyPayload.count : anyPayload.results.length,
          page: params?.page ?? 1,
          limit: params?.limit ?? anyPayload.results.length,
        };
      }
    }
    return { data: [], total: 0, page: params?.page ?? 1, limit: params?.limit ?? 10 };
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}/`);
    return response.data.data;
  },

  create: async (data: UserFormData): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/users/seller-create/', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<UserFormData>): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}/`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}/`);
  },

  getByStore: async (storeId: string): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>(`/users/?store_id=${storeId}`);
    return response.data.data;
  },
};
