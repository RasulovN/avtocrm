import { apiClient } from './api';
import type { PaginatedResponse } from '../types';

export interface CustomerFromApi {
  id: number;
  full_name: string;
  phone_number: string;
  total_purchase_amount?: string | number;
  total_debt?: string | number;
  store_debts?: Array<{ store: string; debt: number }>;
  sales?: any[];
  created_at?: string;
  updated_at?: string;
}

interface CustomerFormData {
  full_name: string;
  phone_number: string;
}

const parsePaginatedCustomers = (
  payload: unknown,
  params?: { page?: number; limit?: number }
): PaginatedResponse<CustomerFromApi> => {
  if (Array.isArray(payload)) {
    return {
      data: payload as CustomerFromApi[],
      total: payload.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? payload.length,
    };
  }

  if (payload && typeof payload === 'object') {
    const anyPayload = payload as {
      count?: number;
      total?: number;
      page?: number;
      limit?: number;
      current_page?: number;
      results?: unknown;
      data?: unknown;
    };

    if (anyPayload.data && typeof anyPayload.data === 'object') {
      const nested = anyPayload.data as {
        count?: number;
        total?: number;
        page?: number;
        limit?: number;
        results?: unknown;
        data?: unknown;
      };
      if (Array.isArray(nested.results)) {
        return {
          data: nested.results as CustomerFromApi[],
          total: typeof nested.count === 'number' ? nested.count : nested.results.length,
          page: params?.page ?? 1,
          limit: params?.limit ?? nested.results.length,
        };
      }
      if (Array.isArray(nested.data)) {
        return {
          data: nested.data as CustomerFromApi[],
          total: typeof nested.total === 'number' ? nested.total : nested.data.length,
          page: params?.page ?? 1,
          limit: params?.limit ?? nested.data.length,
        };
      }
    }

    if (Array.isArray(anyPayload.results)) {
      return {
        data: anyPayload.results as CustomerFromApi[],
        total: typeof anyPayload.count === 'number' ? anyPayload.count : anyPayload.results.length,
        page: typeof anyPayload.current_page === 'number' ? anyPayload.current_page : (params?.page ?? 1),
        limit: params?.limit ?? anyPayload.results.length,
      };
    }

    if (Array.isArray(anyPayload.data)) {
      return {
        data: anyPayload.data as CustomerFromApi[],
        total: typeof anyPayload.total === 'number' ? anyPayload.total : anyPayload.data.length,
        page: typeof anyPayload.page === 'number' ? anyPayload.page : (params?.page ?? 1),
        limit: typeof anyPayload.limit === 'number' ? anyPayload.limit : (params?.limit ?? 10),
      };
    }
  }

  return { data: [], total: 0, page: params?.page ?? 1, limit: params?.limit ?? 10 };
};

export const customerApiService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<CustomerFromApi>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    const url = queryString ? `/users/customers/list/?${queryString}` : '/users/customers/list/';
    const response = await apiClient.get<unknown>(url);
    return parsePaginatedCustomers(response.data, params);
  },

  getById: async (id: number): Promise<CustomerFromApi> => {
    const response = await apiClient.get<CustomerFromApi>(`/users/customers/${id}/`);
    return response.data;
  },

  create: async (data: CustomerFormData): Promise<CustomerFromApi> => {
    const response = await apiClient.post<CustomerFromApi>('/users/customers/create/', data);
    return response.data;
  },

  update: async (id: number, data: CustomerFormData): Promise<CustomerFromApi> => {
    const response = await apiClient.put<CustomerFromApi>(`/users/customers/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/customers/${id}/`);
  },

  createDebtPayment: async (data: { customer: number; amount: string; type: 'cash' | 'card' }) => {
    const response = await apiClient.post('/debts/create/', data);
    return response.data;
  },

  createDebtPaymentForSale: async (data: { sale: number; amount: string; type: 'cash' | 'card' }) => {
    const response = await apiClient.post('/debts/create/', data);
    return response.data;
  },

  getDebtPayments: async (saleId: number) => {
    try {
      const response = await apiClient.get(`/debts/${saleId}/`);
      return response.data;
    } catch (error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },
};
