import { apiClient } from './api';

interface CustomerFromApi {
  id: number;
  full_name: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

interface CustomerFormData {
  full_name: string;
  phone_number: string;
}

export const customerApiService = {
  getAll: async (): Promise<CustomerFromApi[]> => {
    const response = await apiClient.get<CustomerFromApi[]>('/users/customers/list/');
    return response.data;
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
};