import { apiClient } from './api';
import type { ProductUnit, ProductUnitFormData, ApiResponse } from '../types';

const normalizeUnit = (raw: unknown): ProductUnit => {
  const item = (raw ?? {}) as Partial<ProductUnit> & {
    id?: string | number;
    name?: string;
    name_uz?: string;
    name_uz_cyrl?: string;
  };

  return {
    id: String(item.id ?? ''),
    name_uz: item.name_uz ?? item.name ?? '',
    name_uz_cyrl: item.name_uz_cyrl ?? '',
  };
};

const normalizeUnitsPayload = (payload: unknown): ProductUnit[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeUnit);
  }

  if (payload && typeof payload === 'object') {
    const anyPayload = payload as { data?: unknown; results?: unknown };
    if (Array.isArray(anyPayload.data)) {
      return anyPayload.data.map(normalizeUnit);
    }
    if (Array.isArray(anyPayload.results)) {
      return anyPayload.results.map(normalizeUnit);
    }
  }

  return [];
};

export const productUnitService = {
  getAll: async (): Promise<ProductUnit[]> => {
    const response = await apiClient.get<ApiResponse<ProductUnit[]> | unknown>('/products/units/');
    const payload = (response.data as any)?.data ?? response.data;
    return normalizeUnitsPayload(payload);
  },

  getById: async (id: string): Promise<ProductUnit> => {
    const response = await apiClient.get<ApiResponse<ProductUnit>>(`/products/units/${id}/`);
    const payload = response.data?.data ?? response.data;
    return normalizeUnit(payload);
  },

  create: async (data: ProductUnitFormData): Promise<ProductUnit> => {
    const response = await apiClient.post<ApiResponse<ProductUnit>>('/products/units/create/', data);
    const payload = response.data?.data ?? response.data;
    return normalizeUnit(payload);
  },

  update: async (id: string, data: Partial<ProductUnitFormData>): Promise<ProductUnit> => {
    const response = await apiClient.put<ApiResponse<ProductUnit>>(`/products/units/${id}/`, data);
    const payload = response.data?.data ?? response.data;
    return normalizeUnit(payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/units/${id}/`);
  },
};
