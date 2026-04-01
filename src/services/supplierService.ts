import { apiClient } from './api';
import type { Supplier, SupplierFormData, PaginatedResponse, ApiResponse } from '../types';

export const supplierService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Supplier>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Supplier>>(`/suppliers?${searchParams.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
    return response.data.data;
  },

  create: async (data: SupplierFormData): Promise<Supplier> => {
    const response = await apiClient.post<ApiResponse<Supplier>>('/suppliers', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<SupplierFormData>): Promise<Supplier> => {
    const response = await apiClient.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};
