import { apiClient } from './api';
import type { Transfer, TransferFormData, PaginatedResponse, ApiResponse } from '../types';

export const transferService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Transfer>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Transfer>>(`/transfers?${searchParams.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Transfer> => {
    const response = await apiClient.get<ApiResponse<Transfer>>(`/transfers/${id}`);
    return response.data.data;
  },

  create: async (data: TransferFormData): Promise<Transfer> => {
    const response = await apiClient.post<ApiResponse<Transfer>>('/transfers', data);
    return response.data.data;
  },

  updateStatus: async (id: string, status: 'accepted' | 'rejected'): Promise<Transfer> => {
    const response = await apiClient.patch<ApiResponse<Transfer>>(`/transfers/${id}/status`, { status });
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transfers/${id}`);
  },
};
