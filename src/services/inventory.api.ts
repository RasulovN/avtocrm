import { apiClient } from './api';

export interface InventorySession {
  id: number;
  store: number;
  started_by: number;
  started_at: string;
  status: 'active' | 'cancelled' | 'completed' | string;
  snapshot_taken: boolean;
  total_items?: number;
  matched_items?: number;
  mismatched_items?: number;
}


export interface InventoryProduct {
  product_id: number;
  product_name: string;
  barcode: string;
  declared: number;
  scanned: number;
  sold_out: number;
  returned: number;
  transfer_out: number;
  transfer_in: number;
  entry: number;
  status: string;
  is_check: boolean;
  final: number;
  difference: number;
}

export interface InventorySessionDetail {
  products: InventoryProduct[];
  checked: InventoryProduct[];
}

export interface ShortageExcessProduct {
  id: number;
  product: number;
  product_name: string;
  category_name: string;
  unit_measurement: string | null;
  counted_quantity: number;
  system_quantity: number;
  diff: number;
  status: 'l' | 'm' | string; // l = shortage, m = excess
  is_check: boolean;
  created_at: string;
}

export interface PaginatedInventoryResult<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface StartInventoryRequest {
  store_id: number;
}

export interface StartInventoryResponse {
  session_id: number;
}

export interface ScanInventoryRequest {
  session_id: number;
  product_id: number;
  quantity: number;
}

export interface FinalizeInventoryRequest {
  session_id: number;
}

export interface CancelInventoryRequest {
  session_id: number;
}

const INVENTORY_ENDPOINT = '/inventory';

export const inventoryApi = {
  /** GET /api/inventory/list/ — all sessions */
  getSessions: async (): Promise<InventorySession[]> => {
    const response = await apiClient.get<any>(
      `${INVENTORY_ENDPOINT}/list/`
    );
    if (response.data && typeof response.data === 'object' && 'results' in response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  /** POST /api/inventory/inventory/start/ — start new session */
  startSession: async (data: StartInventoryRequest): Promise<StartInventoryResponse> => {
    const response = await apiClient.post<StartInventoryResponse>(
      `${INVENTORY_ENDPOINT}/start/`,
      data
    );
    return response.data;
  },

  /** GET /api/inventory/inventory/list/{session_id}/ — session products */
  getSessionProducts: async (sessionId: number): Promise<InventorySessionDetail> => {
    const response = await apiClient.get<InventorySessionDetail>(
      `${INVENTORY_ENDPOINT}/list/${sessionId}/`
    );
    return response.data;
  },

  /** GET /api/inventory/sessions/{session_id}/short/ — session shortages */
  getSessionShorts: async (sessionId: number): Promise<PaginatedInventoryResult<ShortageExcessProduct>> => {
    const response = await apiClient.get<PaginatedInventoryResult<ShortageExcessProduct>>(
      `${INVENTORY_ENDPOINT}/sessions/${sessionId}/short/`
    );
    return response.data;
  },

  /** GET /api/inventory/sessions/{session_id}/over/ — session excess products */
  getSessionOvers: async (sessionId: number): Promise<PaginatedInventoryResult<ShortageExcessProduct>> => {
    const response = await apiClient.get<PaginatedInventoryResult<ShortageExcessProduct>>(
      `${INVENTORY_ENDPOINT}/sessions/${sessionId}/over/`
    );
    return response.data;
  },

  /** PUT /api/inventory/inventory/scan/ — scan/update product */
  scanProduct: async (data: ScanInventoryRequest): Promise<void> => {
    await apiClient.put(`${INVENTORY_ENDPOINT}/scan/`, data);
  },

  /** POST /api/inventory/inventory/finalize/ — finalize session */
  finalizeSession: async (data: FinalizeInventoryRequest): Promise<void> => {
    await apiClient.post(`${INVENTORY_ENDPOINT}/finalize/`, data);
  },

  /** POST /api/inventory/inventory/cancel/ — cancel session */
  cancelSession: async (data: CancelInventoryRequest): Promise<void> => {
    await apiClient.post(`${INVENTORY_ENDPOINT}/cancel/`, data);
  },
};

