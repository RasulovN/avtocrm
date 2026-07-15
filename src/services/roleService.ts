import { apiClient } from './api';
import type { Role, PermissionCatalogModule } from '../types';

export interface RolePayload {
  name: string;
  description?: string;
  permissions: string[];
}

export const roleService = {
  getAll: async (): Promise<Role[]> => {
    const response = await apiClient.get<Role[]>('/users/roles/');
    return Array.isArray(response.data) ? response.data : [];
  },

  getCatalog: async (): Promise<PermissionCatalogModule[]> => {
    const response = await apiClient.get<PermissionCatalogModule[]>('/users/roles/catalog/');
    return Array.isArray(response.data) ? response.data : [];
  },

  create: async (data: RolePayload): Promise<Role> => {
    const response = await apiClient.post<Role>('/users/roles/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<RolePayload>): Promise<Role> => {
    const response = await apiClient.put<Role>(`/users/roles/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/roles/${id}/`);
  },
};
