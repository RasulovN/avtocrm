import { apiClient } from './api';
import type { Sale, SaleFormData, PaginatedResponse, ApiResponse, DashboardStats, SaleReturn, SaleReturnFormData } from '../types';

export interface SaleListFilters {
  page?: number;
  limit?: number;
  search?: string;
  // YYYY-MM-DD — ro'yxat va statistikani sana oralig'i bo'yicha filtrlaydi
  date_from?: string;
  date_to?: string;
  // Do'kon ID (superadmin uchun; oddiy user baribir o'z do'konini ko'radi)
  store?: string;
}

export interface SaleStatistics {
  total_sales: number;
  total_amount: string;
  total_paid: string;
  total_debt: string;
}

export const salesService = {
  getAll: async (params?: SaleListFilters): Promise<PaginatedResponse<Sale>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);
    if (params?.store) searchParams.append('store', params.store);

    const response = await apiClient.get<{ results: Sale[]; count?: number }>(`/sales/list/?${searchParams.toString()}`);
    const payload = response.data;
    
    let data: Sale[] = [];
    let count: number | undefined;
    if (Array.isArray(payload)) {
      data = payload;
    } else if (payload && typeof payload === 'object') {
      const objPayload = payload as { results?: Sale[]; count?: number };
      data = objPayload.results || [];
      count = objPayload.count;
    }
    
    return {
      data,
      total: count ?? data.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? data.length,
    };
  },

  // Filtrlangan davr bo'yicha JAMI statistika (paginatsiyaga bog'liq emas)
  getStatistics: async (params?: Pick<SaleListFilters, 'date_from' | 'date_to' | 'store'>): Promise<SaleStatistics> => {
    const searchParams = new URLSearchParams();
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);
    if (params?.store) searchParams.append('store', params.store);
    const query = searchParams.toString();
    const response = await apiClient.get<SaleStatistics>(`/sales/statistics/${query ? `?${query}` : ''}`);
    return response.data;
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
    const objPayload = payload as { results?: SaleReturn[] };
    return objPayload.results || [];
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
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
