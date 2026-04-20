import { apiClient } from './api';

export interface InventorySession {
  id: number;
  store_id: number;
  store_name?: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  completed_at?: string;
  created_by?: number;
  total_items?: number;
  matched_items?: number;
  mismatched_items?: number;
}

export interface InventoryItem {
  id: number;
  inventory: number;
  product: number;
  product_name: string;
  product_sku: string;
  expected_qty: number;
  counted_qty: number | null;
  difference?: number;
  status?: 'matched' | 'mismatch' | 'pending';
}

export interface CreateInventorySession {
  store_id: number;
}

export interface LoadProductsResponse {
  items: InventoryItem[];
  total_items: number;
}

export interface UpdateInventoryItem {
  counted_qty: number;
}

export interface InventoryStats {
  total: number;
  matched: number;
  mismatch: number;
  pending: number;
}

const INVENTORY_ENDPOINT = '/inventory';
const INVENTORY_ITEM_ENDPOINT = '/inventory-item';

export const inventoryApi = {
  getSessions: async (params?: { page?: number; limit?: number; status?: string }): Promise<{ data: InventorySession[]; total: number }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);

    const response = await apiClient.get<{ data: InventorySession[]; total: number }>(
      `${INVENTORY_ENDPOINT}/?${searchParams.toString()}`
    );
    return response.data;
  },

  getSession: async (id: number): Promise<InventorySession> => {
    const response = await apiClient.get<{ data: InventorySession }>(`${INVENTORY_ENDPOINT}/${id}`);
    return response.data.data;
  },

  createSession: async (data: CreateInventorySession): Promise<InventorySession> => {
    const response = await apiClient.post<{ data: InventorySession }>(`${INVENTORY_ENDPOINT}/`, data);
    return response.data.data;
  },

  loadProducts: async (sessionId: number): Promise<InventoryItem[]> => {
    const response = await apiClient.post<{ data: InventoryItem[] }>(
      `${INVENTORY_ENDPOINT}/${sessionId}/load_products`
    );
    return response.data.data;
  },

  getItems: async (sessionId: number): Promise<InventoryItem[]> => {
    const response = await apiClient.get<{ data: InventoryItem[] }>(
      `${INVENTORY_ENDPOINT}/${sessionId}/items`
    );
    return response.data.data;
  },

  updateItem: async (itemId: number, data: UpdateInventoryItem): Promise<InventoryItem> => {
    const response = await apiClient.patch<{ data: InventoryItem }>(
      `${INVENTORY_ITEM_ENDPOINT}/${itemId}/`,
      data
    );
    return response.data.data;
  },

  completeInventory: async (sessionId: number): Promise<InventorySession> => {
    const response = await apiClient.post<{ data: InventorySession }>(
      `${INVENTORY_ENDPOINT}/${sessionId}/complete`
    );
    return response.data.data;
  },

  getStats: async (sessionId: number): Promise<InventoryStats> => {
    const response = await apiClient.get<{ data: InventoryStats }>(
      `${INVENTORY_ENDPOINT}/${sessionId}/stats`
    );
    return response.data.data;
  },
};
