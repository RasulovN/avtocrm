import { apiClient } from './api';
import type { Sale, SaleFormData, PaginatedResponse, ApiResponse, DashboardStats, SaleReturn, SaleReturnFormData } from '../types';

export const salesService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Sale>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get<{ results: Sale[]; count?: number }>(`/sales/list/?${searchParams.toString()}`);
    const payload = response.data;
    
    let data: Sale[] = [];
    if (Array.isArray(payload)) {
      data = payload;
    } else if (payload && typeof payload === 'object' && 'results' in payload) {
      data = (payload as any).results || [];
    }
    
    return {
      data,
      total: (payload as any)?.count ?? data.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? data.length,
    };
  },

  getById: async (id: string): Promise<Sale> => {
    const response = await apiClient.get<Sale>(`/sales/${id}`);
    return response.data;
  },

  create: async (data: SaleFormData): Promise<Sale> => {  
    const response = await apiClient.post<ApiResponse<Sale>>('/sales/create/', data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/sales/${id}`);
  },
};

export const saleReturnService = {
  getAll: async (): Promise<SaleReturn[]> => {
    const response = await apiClient.get<SaleReturn[] | { results: SaleReturn[] }>('/sales/sale-return/list/');
    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    return (payload as any)?.results || [];
  },

  create: async (data: SaleReturnFormData): Promise<SaleReturn> => {
    const response = await apiClient.post<ApiResponse<SaleReturn>>('/sales/sale-return/', data);
    return response.data.data;
  },
};

export const dashboardService = {
  getStats: async (): Promise<DashboardStats | null> => {
    try {
      const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats', {
        expectedErrorStatuses: [404],
      });
      return response.data.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
