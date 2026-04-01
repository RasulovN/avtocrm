import { apiClient } from './api';
import type { Sale, SaleFormData, PaginatedResponse, ApiResponse, DashboardStats } from '../types';

export const salesService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Sale>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Sale>>(`/sales?${searchParams.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Sale> => {
    const response = await apiClient.get<ApiResponse<Sale>>(`/sales/${id}`);
    return response.data.data;
  },

  create: async (data: SaleFormData): Promise<Sale> => {
    const response = await apiClient.post<ApiResponse<Sale>>('/sales', data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/sales/${id}`);
  },
};

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return response.data.data;
  },
};
