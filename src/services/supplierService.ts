import { apiClient } from './api';
import type { Supplier, SupplierFormData, PaginatedResponse, ApiResponse } from '../types';

const normalizeSupplier = (raw: unknown): Supplier => {
  const item = (raw ?? {}) as Partial<Supplier> & {
    id?: string | number;
    name?: string;
    name_uz?: string;
    name_uz_cyrl?: string;
    description?: string;
    description_uz?: string;
    description_uz_cyrl?: string;
    address?: string;
    address_uz?: string;
    address_uz_cyrl?: string;
    phone?: string;
    phone_number?: string;
    inn?: string;
    is_active?: boolean;
    debt?: number;
    total_purchase_amount?: string | number;
    total_debt?: string | number;
    created_at?: string;
  };

  return {
    id: String(item.id ?? ''),
    name: item.name ?? item.name_uz ?? item.name_uz_cyrl ?? '',
    name_uz: item.name_uz ?? item.name ?? '',
    name_uz_cyrl: item.name_uz_cyrl ?? '',
    description: item.description ?? item.description_uz ?? item.description_uz_cyrl ?? '',
    description_uz: item.description_uz ?? item.description ?? '',
    description_uz_cyrl: item.description_uz_cyrl ?? '',
    address: item.address ?? item.address_uz ?? item.address_uz_cyrl ?? '',
    address_uz: item.address_uz ?? item.address ?? '',
    address_uz_cyrl: item.address_uz_cyrl ?? '',
    phone: item.phone ?? item.phone_number ?? '',
    phone_number: item.phone_number ?? item.phone ?? '',
    inn: item.inn,
    is_active: item.is_active,
    debt: item.total_debt !== undefined ? Number(item.total_debt) : (typeof item.debt === 'number' ? item.debt : 0),
    total_purchase_amount: item.total_purchase_amount,
    total_debt: item.total_debt,
    created_at: item.created_at ?? '',
  };
};

const mapSupplierPayload = (data: SupplierFormData): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (data.phone_number?.trim()) payload.phone_number = data.phone_number.trim();
  if (data.inn?.trim()) payload.inn = data.inn.trim();
  if (data.name_uz?.trim()) payload.name_uz = data.name_uz.trim();
  if (data.name_uz_cyrl?.trim()) payload.name_uz_cyrl = data.name_uz_cyrl.trim();
  if (data.description_uz?.trim()) payload.description_uz = data.description_uz.trim();
  if (data.description_uz_cyrl?.trim()) payload.description_uz_cyrl = data.description_uz_cyrl.trim();
  if (data.address_uz?.trim()) payload.address_uz = data.address_uz.trim();
  if (data.address_uz_cyrl?.trim()) payload.address_uz_cyrl = data.address_uz_cyrl.trim();
  return payload;
};

const mapSupplierUpdatePayload = (data: Partial<SupplierFormData>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (data.phone_number?.trim()) payload.phone_number = data.phone_number.trim();
  if (data.inn?.trim()) payload.inn = data.inn.trim();
  if (data.name_uz?.trim()) payload.name_uz = data.name_uz.trim();
  if (data.name_uz_cyrl?.trim()) payload.name_uz_cyrl = data.name_uz_cyrl.trim();
  if (data.description_uz?.trim()) payload.description_uz = data.description_uz.trim();
  if (data.description_uz_cyrl?.trim()) payload.description_uz_cyrl = data.description_uz_cyrl.trim();
  if (data.address_uz?.trim()) payload.address_uz = data.address_uz.trim();
  if (data.address_uz_cyrl?.trim()) payload.address_uz_cyrl = data.address_uz_cyrl.trim();
  return payload;
};

export const supplierService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    ordering?: string;
    has_debt?: string;
  }): Promise<PaginatedResponse<Supplier>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.ordering) searchParams.append('ordering', params.ordering);
    if (params?.has_debt) searchParams.append('has_debt', params.has_debt);

    const response = await apiClient.get(`/contract/supplier/?${searchParams.toString()}`);
    const payload = response.data as unknown;
    if (Array.isArray(payload)) {
      const data = payload.map(normalizeSupplier);
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
          const data = nested.data.map(normalizeSupplier);
          return {
            data,
            total: typeof nested.total === 'number' ? nested.total : data.length,
            page: typeof nested.page === 'number' ? nested.page : (params?.page ?? 1),
            limit: typeof nested.limit === 'number' ? nested.limit : (params?.limit ?? data.length),
          };
        }
        if (Array.isArray(nested.results)) {
          const data = nested.results.map(normalizeSupplier);
          return {
            data,
            total: typeof nested.count === 'number' ? nested.count : data.length,
            page: params?.page ?? 1,
            limit: params?.limit ?? data.length,
          };
        }
      }
      if (Array.isArray(anyPayload.data)) {
        const data = anyPayload.data.map(normalizeSupplier);
        return {
          data,
          total: typeof anyPayload.total === 'number' ? anyPayload.total : data.length,
          page: typeof anyPayload.page === 'number' ? anyPayload.page : (params?.page ?? 1),
          limit: typeof anyPayload.limit === 'number' ? anyPayload.limit : (params?.limit ?? data.length),
        };
      }
      if (Array.isArray(anyPayload.results)) {
        const data = anyPayload.results.map(normalizeSupplier);
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

  getById: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get<ApiResponse<Supplier>>(`/contract/supplier/${id}/`);
    const payload = response.data?.data ?? response.data;
    return normalizeSupplier(payload);
  },

  create: async (data: SupplierFormData): Promise<Supplier> => {
    const response = await apiClient.post<ApiResponse<Supplier>>('/contract/supplier/create/', mapSupplierPayload(data));
    const payload = response.data?.data ?? response.data;
    return normalizeSupplier(payload);
  },

  update: async (id: string, data: Partial<SupplierFormData>): Promise<Supplier> => {
    const response = await apiClient.put<ApiResponse<Supplier>>(`/contract/supplier/${id}/`, mapSupplierUpdatePayload(data));
    const payload = response.data?.data ?? response.data;
    return normalizeSupplier(payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/contract/supplier/${id}/`);
  },

  createPayment: async (data: {
    supplier: number;
    entry: number;
    amount: string;
    note?: string;
    // To'lov usuli: 'cash' (default) yoki 'card'; karta bo'lsa bank_card majburiy
    payment_type?: 'cash' | 'card';
    bank_card?: number;
  }) => {
    const response = await apiClient.post('/contract/supplier-payments/create/', data);
    return response.data;
  },

  // Bitta kirim bo'yicha tranzaksiyalar tarixi (kirim 'in' + to'lovlar 'pay')
  getPayments: async (entryId: number): Promise<SupplierTransactionRecord[]> => {
    const response = await apiClient.get<SupplierTransactionRecord[]>(`/contract/supplier-payments/${entryId}/`);
    return Array.isArray(response.data) ? response.data : [];
  },

  // Detail sahifa dashboardi uchun jamlanma ko'rsatkichlar
  getStats: async (id: string | number): Promise<SupplierStats> => {
    const response = await apiClient.get<SupplierStats>(`/contract/supplier/${id}/stats/`);
    return response.data;
  },

  // Ta'minotchining barcha to'lovlari (kirimlardan qat'i nazar), paginatsiyalangan
  getAllPayments: async (
    id: string | number,
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<SupplierTransactionRecord>> => {
    const response = await apiClient.get(`/contract/supplier/${id}/payments/`, { params });
    const data = response.data as {
      count?: number;
      current_page?: number;
      results?: SupplierTransactionRecord[];
    };
    return {
      data: Array.isArray(data?.results) ? data.results : [],
      total: Number(data?.count) || 0,
      page: Number(data?.current_page) || params?.page || 1,
      limit: params?.limit ?? 10,
    };
  },

  // Ta'minotchidan kelgan tovarlar (kirimlar bo'yicha jamlangan), paginatsiyalangan
  getProducts: async (
    id: string | number,
    params?: { page?: number; limit?: number; search?: string },
  ): Promise<PaginatedResponse<SupplierProductRecord>> => {
    const response = await apiClient.get(`/contract/supplier/${id}/products/`, { params });
    const data = response.data as {
      count?: number;
      current_page?: number;
      results?: SupplierProductRecord[];
    };
    return {
      data: Array.isArray(data?.results) ? data.results : [],
      total: Number(data?.count) || 0,
      page: Number(data?.current_page) || params?.page || 1,
      limit: params?.limit ?? 10,
    };
  },
};

export interface SupplierTransactionRecord {
  id: number;
  supplier: number;
  entry: number;
  amount: string;
  type: 'in' | 'pay';
  payment_method?: 'cash' | 'card' | '';
  bank_card?: number | null;
  bank_card_name?: string | null;
  note?: string;
  created_at?: string;
}

// GET /contract/supplier/<id>/stats/ javobi
export interface SupplierStats {
  supplier_id: number;
  created_at?: string | null;
  entries_count: number;
  paid_entries_count: number;
  partial_entries_count: number;
  unpaid_entries_count: number;
  total_purchase_amount: string;
  total_paid_amount: string;
  total_debt: string;
  balance: string;
  items_total_quantity: number;
  orders_per_month: number;
  first_entry_at?: string | null;
  last_entry_at?: string | null;
}

// GET /contract/supplier/<id>/products/ qatori
export interface SupplierProductRecord {
  product: number;
  product_name: string | null;
  sku: string | null;
  barcode: string | null;
  category_name: string | null;
  total_quantity: number;
  entries_count: number;
  last_entry_at: string | null;
  last_purchase_price: string;
  last_selling_price: string;
  image: string | null;
}
