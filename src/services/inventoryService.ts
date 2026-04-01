import { apiClient } from './api';
import type { Inventory, InventoryFormData, PaginatedResponse, ApiResponse } from '../types';

export const inventoryService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Inventory>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Inventory>>(`/inventory?${searchParams.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Inventory> => {
    const response = await apiClient.get<ApiResponse<Inventory>>(`/inventory/${id}`);
    return response.data.data;
  },

  create: async (data: InventoryFormData): Promise<Inventory> => {
    const response = await apiClient.post<ApiResponse<Inventory>>('/inventory', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<InventoryFormData>): Promise<Inventory> => {
    const response = await apiClient.put<ApiResponse<Inventory>>(`/inventory/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory/${id}`);
  },
};
