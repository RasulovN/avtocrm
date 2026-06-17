import { apiClient } from './api';
import { latinToCyrillic } from '../utils/transliteration';
import type { PaginatedResponse } from '../types';

export interface ProductLocation {
  id: string;
  location_uz: string;
  location_uz_cyrl: string;
  description_uz: string;
  description_uz_cyrl: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductLocationFormData {
  location_uz: string;
  location_uz_cyrl: string;
  description_uz: string;
  description_uz_cyrl: string;
}

const normalizeLocation = (raw: unknown): ProductLocation => {
  const item = (raw ?? {}) as any;
  const location_uz = String(item.location_uz ?? item.location ?? '');
  const description_uz = String(item.description_uz ?? item.description ?? '');
  return {
    id: String(item.id ?? 0),
    location_uz,
    location_uz_cyrl: String(item.location_uz_cyrl ?? latinToCyrillic(location_uz) ?? ''),
    description_uz,
    description_uz_cyrl: String(item.description_uz_cyrl ?? latinToCyrillic(description_uz) ?? ''),
    created_at: String(item.created_at ?? ''),
    updated_at: String(item.updated_at ?? ''),
  };
};

const mapLocationPayload = (data: ProductLocationFormData): Record<string, unknown> => {
  return {
    location_uz: data.location_uz,
    location_uz_cyrl: data.location_uz_cyrl,
    description_uz: data.description_uz,
    description_uz_cyrl: data.description_uz_cyrl,
  };
};

export const productLocationService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<ProductLocation>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString();
    const url = queryString ? `/products/store-product/locations/?${queryString}` : '/products/store-product/locations/';
    
    const response = await apiClient.get(url);
    const payload = response.data as unknown;
    
    if (Array.isArray(payload)) {
      const data = payload.map(normalizeLocation);
      return {
        data,
        total: data.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? data.length
      };
    }
    
    if (payload && typeof payload === 'object') {
      const p = payload as any;
      // Handle common backend variations (data.results, results, etc)
      const target = p.data && typeof p.data === 'object' ? p.data : p;
      const dataArray = Array.isArray(target.results) ? target.results : (Array.isArray(target.data) ? target.data : (Array.isArray(target) ? target : []));
      
      const data = dataArray.map(normalizeLocation);
      const total = typeof target.count === 'number' ? target.count : (typeof target.total === 'number' ? target.total : data.length);
      
      return {
        data,
        total,
        page: params?.page ?? 1,
        limit: params?.limit ?? data.length
      };
    }
    
    return { data: [], total: 0, page: 1, limit: 10 };
  },

  getById: async (id: string): Promise<ProductLocation> => {
    const response = await apiClient.get(`/products/store-product/locations/${id}/`);
    return normalizeLocation(response.data);
  },

  create: async (data: ProductLocationFormData): Promise<ProductLocation> => {
    const payload = mapLocationPayload(data);
    const response = await apiClient.post('/products/store-product/locations/', payload);
    return normalizeLocation(response.data);
  },

  update: async (id: string, data: Partial<ProductLocationFormData>): Promise<ProductLocation> => {
    const payload = mapLocationPayload(data as ProductLocationFormData);
    const response = await apiClient.put(`/products/store-product/locations/${id}/`, payload);
    return normalizeLocation(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/store-product/locations/${id}/`);
  },
};

