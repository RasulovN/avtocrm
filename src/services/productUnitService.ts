import { apiClient } from './api';
import type { ProductUnit, ProductUnitFormData, ApiResponse } from '../types';

const PRODUCT_MEASUREMENTS_ENDPOINT = '/products/measurements/';

const normalizeUnit = (raw: unknown): ProductUnit => {
  const item = (raw ?? {}) as Partial<ProductUnit> & {
    id?: string | number;
    measurement?: string;
    measurement_uz?: string;
    measurement_uz_cyrl?: string;
  };

  return {
    id: String(item.id ?? ''),
    measurement_uz: item.measurement_uz ?? item.measurement ?? '',
    measurement_uz_cyrl: item.measurement_uz_cyrl ?? '',
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

const buildUnitPayload = (data: Partial<ProductUnitFormData>): Partial<ProductUnitFormData> => ({
  measurement_uz: data.measurement_uz?.trim() ?? '',
  measurement_uz_cyrl: data.measurement_uz_cyrl?.trim() ?? '',
});

export const productUnitService = {
  getAll: async (): Promise<ProductUnit[]> => {
    const response = await apiClient.get<ApiResponse<ProductUnit[]> | unknown>(PRODUCT_MEASUREMENTS_ENDPOINT);
    const payload = (response.data as any)?.data ?? response.data;
    return normalizeUnitsPayload(payload);
  },

  getById: async (id: string): Promise<ProductUnit> => {
    const response = await apiClient.get<ApiResponse<ProductUnit>>(`${PRODUCT_MEASUREMENTS_ENDPOINT}${id}/`);
    const payload = response.data?.data ?? response.data;
    return normalizeUnit(payload);
  },

  create: async (data: ProductUnitFormData): Promise<ProductUnit> => {
    const response = await apiClient.post<ApiResponse<ProductUnit>>(
      PRODUCT_MEASUREMENTS_ENDPOINT,
      buildUnitPayload(data)
    );
    const payload = response.data?.data ?? response.data;
    return normalizeUnit(payload);
  },

  update: async (id: string, data: Partial<ProductUnitFormData>): Promise<ProductUnit> => {
    const response = await apiClient.put<ApiResponse<ProductUnit>>(
      `${PRODUCT_MEASUREMENTS_ENDPOINT}${id}/`,
      buildUnitPayload(data)
    );
    const payload = response.data?.data ?? response.data;
    return normalizeUnit(payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${PRODUCT_MEASUREMENTS_ENDPOINT}${id}/`);
  },
};
