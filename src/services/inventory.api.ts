import { apiClient } from './api';

export interface InventorySession {
  id: number;
  store_id: number;
  store_name?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  created_by?: number;
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
  /** GET /api/inventory/inventory/list/ — all sessions */
  getSessions: async (): Promise<InventorySession[]> => {
    const response = await apiClient.get<{ data: InventorySession[] }>(
      `${INVENTORY_ENDPOINT}/list/`
    );
    return response.data.data;
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

