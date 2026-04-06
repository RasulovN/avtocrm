import { apiClient, API_ORIGIN } from './api';
import type { Category, CategoryFormData, PaginatedResponse, ApiResponse } from '../types';

const resolveImageUrl = (image?: string) => {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  if (image.startsWith('/')) return `${API_ORIGIN}${image}`;
  return image;
};

const normalizeCategory = (raw: unknown): Category => {
  const item = (raw ?? {}) as Partial<Category> & {
    id?: string | number;
    slug?: string;
    name?: string;
    name_uz?: string;
    name_uz_cyrl?: string;
    description?: string;
    description_uz?: string;
    description_uz_cyrl?: string;
    image?: string;
    created_at?: string;
  };

  return {
    id: String(item.id ?? ''),
    slug: item.slug ?? '',
    name: item.name ?? item.name_uz ?? item.name_uz_cyrl ?? '',
    description: item.description ?? item.description_uz ?? item.description_uz_cyrl ?? '',
    image: resolveImageUrl(item.image),
    created_at: item.created_at ?? '',
  };
};

const buildCategoryFormData = (data: Partial<CategoryFormData>): FormData => {
  const payload = new FormData();
  if (typeof data.name_uz === 'string') payload.append('name_uz', data.name_uz);
  if (typeof data.name_uz_cyrl === 'string') payload.append('name_uz_cyrl', data.name_uz_cyrl);
  if (typeof data.description_uz === 'string') payload.append('description_uz', data.description_uz);
  if (typeof data.description_uz_cyrl === 'string') payload.append('description_uz_cyrl', data.description_uz_cyrl);
  if (data.image instanceof File) payload.append('image', data.image);
  return payload;
};

export const categoryService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Category>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/products/categories/?${searchParams.toString()}`);
    const payload = response.data as unknown;
    if (Array.isArray(payload)) {
      const data = payload.map(normalizeCategory);
      return {
        data,
        total: data.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? data.length,
      };
    }
    if (payload && typeof payload === 'object') {
      const anyPayload = payload as { data?: unknown; results?: unknown; count?: number; total?: number; page?: number; limit?: number };
      if (anyPayload.data && typeof anyPayload.data === 'object') {
        const nested = anyPayload.data as { data?: unknown; results?: unknown; count?: number; total?: number; page?: number; limit?: number };
        if (Array.isArray(nested.data)) {
          const data = nested.data.map(normalizeCategory);
          return {
            data,
            total: typeof nested.total === 'number' ? nested.total : data.length,
            page: typeof nested.page === 'number' ? nested.page : (params?.page ?? 1),
            limit: typeof nested.limit === 'number' ? nested.limit : (params?.limit ?? data.length),
          };
        }
        if (Array.isArray(nested.results)) {
          const data = nested.results.map(normalizeCategory);
          return {
            data,
            total: typeof nested.count === 'number' ? nested.count : data.length,
            page: params?.page ?? 1,
            limit: params?.limit ?? data.length,
          };
        }
      }
      if (Array.isArray(anyPayload.data)) {
        const data = anyPayload.data.map(normalizeCategory);
        return {
          data,
          total: typeof anyPayload.total === 'number' ? anyPayload.total : data.length,
          page: typeof anyPayload.page === 'number' ? anyPayload.page : (params?.page ?? 1),
          limit: typeof anyPayload.limit === 'number' ? anyPayload.limit : (params?.limit ?? data.length),
        };
      }
      if (Array.isArray(anyPayload.results)) {
        const data = anyPayload.results.map(normalizeCategory);
        return {
          data,
          total: typeof anyPayload.count === 'number' ? anyPayload.count : data.length,
          page: params?.page ?? 1,
          limit: params?.limit ?? data.length,
        };
      }
    }
    return { data: [], total: 0, page: params?.page ?? 1, limit: params?.limit ?? 10 };
  },

  getById: async (id: string): Promise<Category> => {
    const response = await apiClient.get<ApiResponse<Category>>(`/products/categories/${id}/`);
    const payload = response.data?.data ?? response.data;
    return normalizeCategory(payload);
  },

  create: async (data: CategoryFormData): Promise<Category> => {
    const response = await apiClient.post<ApiResponse<Category>>(
      '/products/categories/create/',
      buildCategoryFormData(data)
    );
    const payload = response.data?.data ?? response.data;
    return normalizeCategory(payload);
  },

  update: async (id: string, data: Partial<CategoryFormData>): Promise<Category> => {
    const response = await apiClient.put<ApiResponse<Category>>(
      `/products/categories/${id}/`,
      buildCategoryFormData(data)
    );
    const payload = response.data?.data ?? response.data;
    return normalizeCategory(payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/categories/${id}/`);
  },
};
