import { apiClient } from './api';
import type { User, UserFormData, PaginatedResponse, ApiResponse } from '../types';

export const userService = {
  getAll: async (params?: { page?: number; limit?: number; store_id?: string }): Promise<PaginatedResponse<User>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.store_id) searchParams.append('store_id', params.store_id);

    const response = await apiClient.get<PaginatedResponse<User>>(`/users?${searchParams.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data;
  },

  create: async (data: UserFormData): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/users', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<UserFormData>): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  getByStore: async (storeId: string): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>(`/users?store_id=${storeId}`);
    return response.data.data;
  },
};