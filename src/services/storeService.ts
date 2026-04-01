import { apiClient } from './api';
import type { Store, StoreFormData, PaginatedResponse, ApiResponse } from '../types';

export const storeService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Store>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Store>>(`/stores?${searchParams.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Store> => {
    const response = await apiClient.get<ApiResponse<Store>>(`/stores/${id}`);
    return response.data.data;
  },

  create: async (data: StoreFormData): Promise<Store> => {
    const response = await apiClient.post<ApiResponse<Store>>('/stores', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<StoreFormData>): Promise<Store> => {
    const response = await apiClient.put<ApiResponse<Store>>(`/stores/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/stores/${id}`);
  },
};
