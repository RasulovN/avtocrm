import { apiClient } from './api';
import type { Inventory, InventoryFormData, PaginatedResponse, ApiResponse, ContractEntry } from '../types';
import type { SupplierPayment } from '../features/StockEntry/StockEntryListPage';

export interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  store?: string | number;
  supplier?: string | number;
  date_from?: string;
  date_to?: string;
  ordering?: string;
}

const parsePaginatedResponse = <T>(data: any, defaultLimit = 10): PaginatedResponse<T> => {
  // Handle standard DRF pagination object { count, total_pages, current_page, results: [] }
  if (data && typeof data === 'object' && 'results' in data) {
    return {
      data: data.results as T[],
      total: Number(data.count) || 0,
      page: Number(data.current_page) || 1,
      limit: defaultLimit,
    };
  }
  
  // Handle simpler data wrapping or direct arrays
  if (Array.isArray(data)) {
    return {
      data: data as T[],
      total: data.length,
      page: 1,
      limit: Math.max(data.length, 10),
    };
  }
  
  // Return fallback object
  return {
    data: [],
    total: 0,
    page: 1,
    limit: defaultLimit
  };
};

export const inventoryService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Inventory>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Inventory>>(`/contract/entry/list/?${searchParams.toString()}`);
    return response.data;
  },

  getEntries: async (filters?: InventoryFilters): Promise<PaginatedResponse<ContractEntry>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.store) params.append('store', filters.store.toString());
    if (filters?.supplier) params.append('supplier', filters.supplier.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.ordering) params.append('ordering', filters.ordering);

    const response = await apiClient.get('/contract/entry/list/', { params });
    return parsePaginatedResponse<ContractEntry>(response.data, filters?.limit || 10);
  },

  getById: async (id: string): Promise<Inventory> => {
    const response = await apiClient.get<ApiResponse<Inventory>>(`/inventory/${id}`);
    return response.data.data;
  },

  create: async (data: InventoryFormData): Promise<Inventory> => {  
    const response = await apiClient.post<ApiResponse<Inventory>>('/contract/entry/create/', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<InventoryFormData>): Promise<Inventory> => {
    const response = await apiClient.put<ApiResponse<Inventory>>(`/inventory/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory/${id}`);
  },
  getSupplierPayment: async (id: string) => {
    const response = await apiClient.get<SupplierPayment[]>(`/contract/supplier-payments/${id}/`);
    return response.data;
  }
};

