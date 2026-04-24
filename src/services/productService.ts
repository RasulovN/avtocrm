import { apiClient, API_ORIGIN } from './api';
import { latinToCyrillic } from '../utils/transliteration';
import type { Product, ProductFormData, ProductFilters, PaginatedResponse, ApiResponse, ProductStoreInventory } from '../types';

const resolveImageUrl = (image?: string | unknown) => {
  if (typeof image !== 'string' || !image) return '';
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

const resolveMeasurement = (raw: unknown): { id?: string; name?: string } => {
  if (!raw) return {};
  if (typeof raw === 'string' || typeof raw === 'number') {
    const text = String(raw);
    return { id: text, name: text };
  }
  if (typeof raw === 'object') {
    const item = raw as {
      id?: string | number;
      measurement?: string;
      measurement_uz?: string;
      measurement_uz_cyrl?: string;
    };
    return {
      id: item.id !== undefined ? String(item.id) : undefined,
      name: item.measurement_uz ?? item.measurement ?? item.measurement_uz_cyrl,
    };
  }
  return {};
};

const resolveLocation = (
  raw: unknown
): { id?: string; name?: string; description?: string } => {
  if (!raw) return {};
  if (typeof raw === 'string' || typeof raw === 'number') {
    const text = String(raw);
    return { id: text, name: text };
  }
  if (typeof raw === 'object') {
    const item = raw as {
      id?: string | number;
      name?: string;
      location?: string;
      location_uz?: string;
      description?: string;
      description_uz?: string;
    };
    return {
      id: item.id !== undefined ? String(item.id) : undefined,
      name: item.name ?? item.location ?? item.location_uz,
      description: item.description ?? item.description_uz,
    };
  }
  return {};
};

const normalizeImages = (images?: unknown[] | string | unknown, image?: unknown) => {
  if (Array.isArray(images)) {
    const resolved = images.map((item) => {
      if (typeof item === 'string') {
        return { image: resolveImageUrl(item), product: 0 };
      }
      if (typeof item === 'object' && item !== null && 'image' in item) {
        const imgObj = item as { image?: string; product?: number };
        return { image: resolveImageUrl(imgObj.image), product: imgObj.product ?? 0 };
      }
      return null;
    }).filter((item): item is { image: string; product: number } => item !== null && item.image !== '');
    console.log('normalizeImages result:', resolved); // Debug
    return resolved.length > 0 ? resolved : undefined;
  }
  if (typeof images === 'string' && images.trim() !== '') {
    return [{ image: resolveImageUrl(images), product: 0 }];
  }
  if (typeof image === 'string' && image.trim() !== '') {
    return [{ image: resolveImageUrl(image), product: 0 }];
  }
  return undefined;
};

const normalizeProduct = (raw: unknown): Product => {
const item = (raw ?? {}) as Partial<Product> & {
    id?: string | number;
    product?: number;
    product_name?: string;
    title?: string;
    title_uz?: string;
    title_uz_cyrl?: string;
    name_uz?: string;
    name_uz_cyrl?: string;
    barcode_value?: string;
    description_uz?: string;
    description_uz_cyrl?: string;
    category?: unknown;
    category_id?: string | number;
    category_name?: string;
    unit_measurement?: string | number | { id?: string | number; measurement?: string; measurement_uz?: string };
    measurement?: string;
    measurement_uz?: string;
    unit_measurement_name?: string;
    item_id?: string | number;
    store_product_id?: string | number;
    location?: unknown;
    location_id?: string | number;
    price?: number | string;
    quantity?: number | string;
    image?: string;
    images?: string[] | string;
    supplier?: { id?: string | number; name?: string; name_uz?: string; name_uz_cyrl?: string };
    store?: { id?: string | number; name?: string; name_uz?: string; name_uz_cyrl?: string };
    batches?: Array<{
      id: number;
      product: number;
      product_name?: string;
      store: number;
      store_name: string;
      quantity: number;
      purchase_price: string;
      selling_price: string;
      barcode: string;
      shtrix_code: string | null;
      location?: { name?: string; description?: string } | null;
    }>;
  };

  const categoryInfo = resolveCategory(item.category ?? item.category_id);
  const unitInfo = resolveMeasurement(item.unit_measurement);
  const locationInfo = resolveLocation(item.location ?? item.location_id);
  const images = normalizeImages(item.images, item.image);
  console.log('normalizeProduct - item.images:', item.images); // Debug
  console.log('normalizeProduct - images after normalize:', images); // Debug
  const image = resolveImageUrl(item.image) || (Array.isArray(images) && images.length > 0 ? images[0].image : '');
  
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
    id: String(item.product ?? item.id ?? item.product_id ?? item.barcode ?? item.barcode_value ?? item.shtrix_code ?? item.sku ?? item.product_name ?? ''),
    product_id: item.product ? String(item.product) : (item.product_id ? String(item.product_id) : undefined),
    item_id: item.item_id !== undefined
      ? String(item.item_id)
      : item.store_product_id !== undefined
        ? String(item.store_product_id)
        : batches?.[0]?.id !== undefined
          ? String(batches[0].id)
          : undefined,
    name: item.name ?? item.product_name ?? item.title ?? item.name_uz ?? item.name_uz_cyrl ?? item.title_uz ?? item.title_uz_cyrl ?? '',
    name_uz_cyrl: item.name_uz_cyrl ?? item.title_uz_cyrl,
    description: item.description ?? item.description_uz ?? item.description_uz_cyrl ?? '',
    description_uz_cyrl: item.description_uz_cyrl,
    category: typeof item.category === 'number' ? item.category : (categoryInfo.id ? Number(categoryInfo.id) : 0),
    category_name: item.category_name ?? categoryInfo.name ?? (typeof item.category === 'string' ? item.category : '') ?? '',
    unit_measurement: normalizeNumber(unitInfo.id ?? item.unit_measurement),
    unit_measurement_name: item.unit_measurement_name ?? item.measurement_uz ?? item.measurement ?? unitInfo.name,
    supplier_id: String(item.supplier_id ?? item.supplier?.id ?? ''),
    supplier_name: item.supplier_name ?? item.supplier?.name ?? item.supplier?.name_uz ?? item.supplier?.name_uz_cyrl,
    store_id: item.store_id !== undefined ? String(item.store_id) : (item.store?.id !== undefined ? String(item.store.id) : undefined),
    store_name: item.store_name ?? item.store?.name ?? item.store?.name_uz ?? item.store?.name_uz_cyrl,
    sku: item.sku ?? '',
    barcode: item.barcode ?? item.barcode_value ?? item.sku,
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
    location_id: locationInfo.id,
    location_name: locationInfo.name,
    location_description: locationInfo.description,
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
  const unitMeasurementId = typeof data.unit_measurement === 'string' && data.unit_measurement.trim() !== ''
    ? data.unit_measurement.trim()
    : undefined;
  const stringImages = Array.isArray(data.images)
    ? data.images.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];

  if (useFormData) {
    const payload = new FormData();
    if (categoryId) payload.append('category', categoryId);
    if (unitMeasurementId) payload.append('unit_measurement', unitMeasurementId);
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
    imageFiles.forEach((file) => {
      payload.append('images', file);
    });
    stringImages.forEach((image) => {
      payload.append('images', image);
    });
    return payload;
  }

  const payload: Record<string, unknown> = {};
  if (categoryId) payload.category = categoryId;
  if (unitMeasurementId) payload.unit_measurement = unitMeasurementId;
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
  if (mode === 'create' && stringImages.length > 0) {
    payload.images = stringImages;
  }
  if (mode === 'update' && data.is_active !== undefined) {
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

    const queryString = params.toString();
    const url = queryString ? `/products/?${queryString}` : '/products/';
    const response = await apiClient.get(url);
    return parsePaginatedProducts(response.data, filters);
  },

  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}/`);
    const payload = response.data?.data ?? response.data;
    console.log('getById - Raw API response:', payload); // Debug
    const result = normalizeProduct(payload);
    console.log('getById - Normalized product:', result); // Debug
    return result;
  },

  create: async (data: ProductFormData): Promise<Product> => {
    const response = await apiClient.post<ApiResponse<Product>>('/products/create/', mapProductPayload(data, { mode: 'create' }));
    const payload = response.data?.data ?? response.data;
    return normalizeProduct(payload);
  },

  update: async (id: string, data: Partial<ProductFormData>): Promise<Product> => {
    const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}/`, mapProductPayload(data, { mode: 'update' }));
    const itemId = typeof data.item_id === 'string' ? data.item_id.trim() : '';
    const locationId = typeof data.location === 'string' ? data.location.trim() : '';
    if (itemId && locationId) {
      await apiClient.patch(`/products/item/${itemId}/`, {
        location: Number(locationId),
      });
    }
    const payload = response.data?.data ?? response.data;
    return normalizeProduct(payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}/`);
  },

  getByBarcode: async (barcode: string): Promise<Product | null> => {
    try {
      const response = await apiClient.get<ApiResponse<Product>>(`/products/barcode/${encodeURIComponent(barcode)}/`);
      const payload = response.data?.data ?? response.data;
      if (!payload) return null;
      return normalizeProduct({
        ...(typeof payload === 'object' && payload !== null ? payload : {}),
        id: (typeof payload === 'object' && payload !== null && 'id' in payload) ? (payload as { id?: string | number }).id : barcode,
        barcode_value: barcode,
      });
    } catch (error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

search: async (query: string): Promise<Product[]> => {
    const response = await apiClient.get<unknown>(`/products/search/${encodeURIComponent(query)}/`);
    const data = response.data;
    if (Array.isArray(data)) {
      return data.map(normalizeProduct);
    }
    if (data && typeof data === 'object') {
      const anyData = data as { results?: unknown; data?: unknown };
      if (Array.isArray(anyData.results)) {
        return anyData.results.map(normalizeProduct);
      }
      if (Array.isArray(anyData.data)) {
        return anyData.data.map(normalizeProduct);
      }
    }
    return [];
  },
};
