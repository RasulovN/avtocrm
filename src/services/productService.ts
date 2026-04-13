import { apiClient, API_ORIGIN } from './api';
import { latinToCyrillic } from '../utils/transliteration';
import type { Product, ProductFormData, ProductFilters, PaginatedResponse, ApiResponse, ProductStoreInventory } from '../types';

const resolveImageUrl = (image?: string) => {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  if (image.startsWith('/')) return `${API_ORIGIN}${image}`;
  return image;
};

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const resolveCategory = (raw: unknown): { id?: string; name?: string } => {
  if (!raw) return {};
  if (typeof raw === 'string' || typeof raw === 'number') {
    const text = String(raw);
    return { id: text, name: text };
  }
  if (typeof raw === 'object') {
    const item = raw as { id?: string | number; name?: string; name_uz?: string; name_uz_cyrl?: string };
    const id = item.id !== undefined ? String(item.id) : undefined;
    const name = item.name ?? item.name_uz ?? item.name_uz_cyrl;
    return { id, name };
  }
  return {};
};

const normalizeImages = (images?: string[] | string, image?: string) => {
  if (Array.isArray(images)) {
    return images.map((item) => resolveImageUrl(item)).filter(Boolean);
  }
  if (typeof images === 'string' && images.trim() !== '') {
    return resolveImageUrl(images);
  }
  if (typeof image === 'string' && image.trim() !== '') {
    return resolveImageUrl(image);
  }
  return undefined;
};

const normalizeProduct = (raw: unknown): Product => {
  const item = (raw ?? {}) as Partial<Product> & {
    id?: string | number;
    name_uz?: string;
    name_uz_cyrl?: string;
    description_uz?: string;
    description_uz_cyrl?: string;
    category?: unknown;
    category_id?: string | number;
    price?: number | string;
    quantity?: number | string;
    image?: string;
    images?: string[] | string;
    supplier?: { id?: string | number; name?: string; name_uz?: string; name_uz_cyrl?: string };
    store?: { id?: string | number; name?: string; name_uz?: string; name_uz_cyrl?: string };
    batches?: Array<{
      id: number;
      product: number;
      store: number;
      store_name: string;
      quantity: number;
      purchase_price: string;
      selling_price: string;
      barcode: string;
      shtrix_code: string | null;
    }>;
  };

  const categoryInfo = resolveCategory(item.category ?? item.category_id);
  const images = normalizeImages(item.images, item.image);
  const image = resolveImageUrl(item.image) || (Array.isArray(images) ? images[0] : images || '');
  
  const batches = item.batches;
  let totalQuantity = 0;
  let minPurchasePrice: number | undefined;
  let maxPurchasePrice: number | undefined;
  let minSellingPrice: number | undefined;
  let maxSellingPrice: number | undefined;
  let inventoryByStore: ProductStoreInventory[] | undefined;
  
  if (batches && Array.isArray(batches)) {
    inventoryByStore = batches.map((batch) => {
      totalQuantity += batch.quantity;
      const purchasePrice = Number(batch.purchase_price);
      const sellingPrice = Number(batch.selling_price);
      if (!isNaN(purchasePrice)) {
        if (minPurchasePrice === undefined || purchasePrice < minPurchasePrice) minPurchasePrice = purchasePrice;
        if (maxPurchasePrice === undefined || purchasePrice > maxPurchasePrice) maxPurchasePrice = purchasePrice;
      }
      if (!isNaN(sellingPrice)) {
        if (minSellingPrice === undefined || sellingPrice < minSellingPrice) minSellingPrice = sellingPrice;
        if (maxSellingPrice === undefined || sellingPrice > maxSellingPrice) maxSellingPrice = sellingPrice;
      }
      return {
        store_id: String(batch.store),
        store_name: batch.store_name,
        quantity: batch.quantity,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
      };
    });
  }

  const quantity = normalizeNumber(item.quantity ?? item.total_count ?? totalQuantity);
  const purchasePrice = normalizeNumber(item.purchase_price) ?? minPurchasePrice;
  const sellingPrice = normalizeNumber(item.selling_price ?? item.price) ?? minSellingPrice;

  return {
    id: String(item.id ?? item.product_id ?? ''),
    product_id: item.product_id ? String(item.product_id) : undefined,
    name: item.name ?? item.name_uz ?? item.name_uz_cyrl ?? '',
    description: item.description ?? item.description_uz ?? item.description_uz_cyrl ?? '',
    category: typeof item.category === 'number' ? item.category : (categoryInfo.id ? Number(categoryInfo.id) : 0),
    category_name: categoryInfo.name ?? (typeof item.category === 'string' ? item.category : '') ?? '',
    supplier_id: String(item.supplier_id ?? item.supplier?.id ?? ''),
    supplier_name: item.supplier_name ?? item.supplier?.name ?? item.supplier?.name_uz ?? item.supplier?.name_uz_cyrl,
    store_id: item.store_id !== undefined ? String(item.store_id) : (item.store?.id !== undefined ? String(item.store.id) : undefined),
    store_name: item.store_name ?? item.store?.name ?? item.store?.name_uz ?? item.store?.name_uz_cyrl,
    sku: item.sku ?? '',
    barcode: item.barcode ?? item.sku,
    barcode_img: resolveImageUrl(item.barcode_img),
    shtrix_code: item.shtrix_code ?? null,
    image,
    images,
    total_count: quantity,
    is_active: item.is_active,
    quantity,
    purchase_price: purchasePrice,
    selling_price: sellingPrice,
    total_quantity: totalQuantity || undefined,
    min_purchase_price: minPurchasePrice,
    max_purchase_price: maxPurchasePrice,
    min_selling_price: minSellingPrice,
    max_selling_price: maxSellingPrice,
    inventory_by_store: inventoryByStore,
    batches: batches?.map(b => ({
      ...b,
      product: Number(b.product),
      store: Number(b.store),
    })),
    created_at: item.created_at ?? '',
    updated_at: item.updated_at ?? item.created_at ?? '',
  };
};

const hasFile = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File;

const toFileList = (images?: ProductFormData['images']): File[] => {
  if (!images) return [];
  if (Array.isArray(images)) {
    const files: File[] = [];
    for (const item of images) {
      if (hasFile(item)) {
        files.push(item);
      }
    }
    return files;
  }
  return [];
};

const mapProductPayload = (
  data: Partial<ProductFormData>,
  options?: { mode?: 'create' | 'update' }
): Record<string, unknown> | FormData => {
  const mode = options?.mode ?? 'create';
  const imageFiles = toFileList(data.images);
  const useFormData = mode === 'create' && imageFiles.length > 0;

  const categoryId = typeof data.category === 'string' && data.category.trim() !== '' 
    ? data.category.trim() 
    : (typeof data.category === 'number' ? String(data.category) : undefined);

  if (useFormData) {
    const payload = new FormData();
    if (categoryId) payload.append('category', categoryId);
    if (typeof data.name === 'string') {
      payload.append('name_uz', data.name);
      const cyr = typeof data.name_uz_cyrl === 'string' ? data.name_uz_cyrl : latinToCyrillic(data.name);
      payload.append('name_uz_cyrl', cyr);
    }
    if (typeof data.description === 'string') {
      payload.append('description_uz', data.description);
      const cyr = typeof data.description_uz_cyrl === 'string'
        ? data.description_uz_cyrl
        : latinToCyrillic(data.description);
      payload.append('description_uz_cyrl', cyr);
    }
    if (data.is_active !== undefined) {
      payload.append('is_active', String(data.is_active));
    }
    imageFiles.forEach((file) => {
      payload.append('images', file);
    });
    return payload;
  }

  const payload: Record<string, unknown> = {};
  if (categoryId) payload.category = categoryId;
  if (typeof data.name === 'string') {
    if (mode === 'update') {
      payload.name = data.name;
    } else {
      payload.name_uz = data.name;
      payload.name_uz_cyrl = typeof data.name_uz_cyrl === 'string' ? data.name_uz_cyrl : latinToCyrillic(data.name);
    }
  }
  if (typeof data.description === 'string') {
    if (mode === 'update') {
      payload.description = data.description;
    } else {
      payload.description_uz = data.description;
      payload.description_uz_cyrl = typeof data.description_uz_cyrl === 'string'
        ? data.description_uz_cyrl
        : latinToCyrillic(data.description);
    }
  }
  if (data.is_active !== undefined) {
    payload.is_active = data.is_active;
  }
  return payload;
};

const parsePaginatedProducts = (
  payload: unknown,
  params?: { page?: number; limit?: number }
): PaginatedResponse<Product> => {
  if (Array.isArray(payload)) {
    const data = payload.map(normalizeProduct);
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
        const data = nested.data.map(normalizeProduct);
        return {
          data,
          total: typeof nested.total === 'number' ? nested.total : data.length,
          page: typeof nested.page === 'number' ? nested.page : (params?.page ?? 1),
          limit: typeof nested.limit === 'number' ? nested.limit : (params?.limit ?? data.length),
        };
      }
      if (Array.isArray(nested.results)) {
        const data = nested.results.map(normalizeProduct);
        return {
          data,
          total: typeof nested.count === 'number' ? nested.count : data.length,
          page: params?.page ?? 1,
          limit: params?.limit ?? data.length,
        };
      }
    }
    if (Array.isArray(anyPayload.data)) {
      const data = anyPayload.data.map(normalizeProduct);
      return {
        data,
        total: typeof anyPayload.total === 'number' ? anyPayload.total : data.length,
        page: typeof anyPayload.page === 'number' ? anyPayload.page : (params?.page ?? 1),
        limit: typeof anyPayload.limit === 'number' ? anyPayload.limit : (params?.limit ?? data.length),
      };
    }
    if (Array.isArray(anyPayload.results)) {
      const data = anyPayload.results.map(normalizeProduct);
      return {
        data,
        total: typeof anyPayload.count === 'number' ? anyPayload.count : data.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? data.length,
      };
    }
  }

  return { data: [], total: 0, page: params?.page ?? 1, limit: params?.limit ?? 10 };
};

export const productService = {
  getAll: async (filters?: ProductFilters & { page?: number; limit?: number }): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.store_id) params.append('store_id', filters.store_id);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/products/?${params.toString()}`);
    return parsePaginatedProducts(response.data, filters);
  },

  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}/`);
    const payload = response.data?.data ?? response.data;
    return normalizeProduct(payload);
  },

  create: async (data: ProductFormData): Promise<Product> => {
    const response = await apiClient.post<ApiResponse<Product>>('/products/create/', mapProductPayload(data, { mode: 'create' }));
    const payload = response.data?.data ?? response.data;
    return normalizeProduct(payload);
  },

  update: async (id: string, data: Partial<ProductFormData>): Promise<Product> => {
    const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}/`, mapProductPayload(data, { mode: 'update' }));
    const payload = response.data?.data ?? response.data;
    return normalizeProduct(payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}/`);
  },

  getByBarcode: async (barcode: string): Promise<Product | null> => {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/barcode/${encodeURIComponent(barcode)}/`);
    const payload = response.data?.data ?? response.data;
    if (!payload) return null;
    return normalizeProduct(payload);
  },
};
