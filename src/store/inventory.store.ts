import { create } from 'zustand';
import type { InventorySession, InventoryProduct, ShortageExcessProduct, CheckedInventoryProduct } from '../services/inventory.api';
import { inventoryApi } from '../services/inventory.api';

interface InventoryState {
  sessions: InventorySession[];
  currentSessionProducts: InventoryProduct[];
  currentSessionChecked: CheckedInventoryProduct[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  checkedCount: number;
  statusFilter: 'checked' | 'unchecked' | 'all';
  currentSessionShorts: ShortageExcessProduct[];
  currentSessionOvers: ShortageExcessProduct[];
  loading: boolean;
  itemsLoading: boolean;
  scanningProductId: number | null;
  error: string | null;

  fetchSessions: () => Promise<void>;
  startSession: (storeId: number) => Promise<number>;
  fetchSessionProducts: (sessionId: number, params?: { page?: number; limit?: number; status?: 'checked' | 'unchecked' | 'all' }) => Promise<void>;
  setPage: (page: number) => void;
  setStatusFilter: (status: 'checked' | 'unchecked' | 'all') => void;
  fetchSessionShorts: (sessionId: number) => Promise<void>;
  fetchSessionOvers: (sessionId: number) => Promise<void>;
  scanProduct: (sessionId: number, productId: number, quantity: number) => Promise<void>;
  finalizeSession: (sessionId: number) => Promise<void>;
  cancelSession: (sessionId: number) => Promise<void>;
  clearError: () => void;
}

const debouncedScans: Map<number, ReturnType<typeof setTimeout>> = new Map();

export const useInventoryStore = create<InventoryState>((set) => ({
  sessions: [],
  currentSessionProducts: [],
  currentSessionChecked: [],
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  checkedCount: 0,
  statusFilter: 'all',
  currentSessionShorts: [],
  currentSessionOvers: [],
  loading: false,
  itemsLoading: false,
  scanningProductId: null,
  error: null,

  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const sessions = await inventoryApi.getSessions();
      set({ sessions: sessions || [], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch sessions';
      set({ error: message, loading: false });
    }
  },

  startSession: async (storeId) => {
    set({ loading: true, error: null });
    try {
      const response = await inventoryApi.startSession({ store_id: storeId });
      set({ loading: false });
      return response.session_id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session';
      set({ error: message, loading: false });
      throw error;
    }
  },

  fetchSessionProducts: async (sessionId, params) => {
    set({ itemsLoading: true, error: null });
    try {
      const detail = await inventoryApi.getSessionProducts(sessionId, params);
      set({
        currentSessionProducts: detail.results,
        currentSessionChecked: detail.checked,
        currentPage: detail.current_page,
        totalPages: detail.total_pages,
        totalCount: detail.count,
        checkedCount: detail.checked_count,
        itemsLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch session products';
      set({ error: message, itemsLoading: false });
    }
  },

  setPage: (page) => set({ currentPage: page }),
  setStatusFilter: (status) => set({ statusFilter: status }),

  fetchSessionShorts: async (sessionId) => {
    set({ itemsLoading: true, error: null });
    try {
      const response = await inventoryApi.getSessionShorts(sessionId);
      set({
        currentSessionShorts: response.results || [],
        itemsLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch shortages';
      set({ error: message, itemsLoading: false });
    }
  },

  fetchSessionOvers: async (sessionId) => {
    set({ itemsLoading: true, error: null });
    try {
      const response = await inventoryApi.getSessionOvers(sessionId);
      set({
        currentSessionOvers: response.results || [],
        itemsLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch excess products';
      set({ error: message, itemsLoading: false });
    }
  },

  scanProduct: async (sessionId, productId, quantity) => {
    const existingTimeout = debouncedScans.get(productId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Optimistic update
    set((state) => ({
      currentSessionProducts: state.currentSessionProducts.map((p) =>
        p.product_id === productId ? { ...p, scanned: quantity, is_check: true } : p
      ),
    }));

    const timeoutId = setTimeout(async () => {
      try {
        set({ scanningProductId: productId });
        await inventoryApi.scanProduct({ session_id: sessionId, product_id: productId, quantity });
        // Refresh list after successful scan
        const state = useInventoryStore.getState();
        const detail = await inventoryApi.getSessionProducts(sessionId, { page: state.currentPage, limit: 20, status: state.statusFilter });
        set({
          currentSessionProducts: detail.results,
          currentSessionChecked: detail.checked,
          currentPage: detail.current_page,
          totalPages: detail.total_pages,
          totalCount: detail.count,
          checkedCount: detail.checked_count,
          scanningProductId: null,
        });
      } catch {
        set({ scanningProductId: null });
        // Re-fetch to restore correct state
        try {
          const state = useInventoryStore.getState();
          const detail = await inventoryApi.getSessionProducts(sessionId, { page: state.currentPage, limit: 20, status: state.statusFilter });
          set({
            currentSessionProducts: detail.results,
            currentSessionChecked: detail.checked,
            currentPage: detail.current_page,
            totalPages: detail.total_pages,
            totalCount: detail.count,
            checkedCount: detail.checked_count,
          });
        } catch {
          // Ignore secondary error
        }
      }
      debouncedScans.delete(productId);
    }, 600);

    debouncedScans.set(productId, timeoutId);
  },

  finalizeSession: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      await inventoryApi.finalizeSession({ session_id: sessionId });
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, status: 'completed' as const } : s
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to finalize inventory';
      set({ error: message, loading: false });
      throw error;
    }
  },

  cancelSession: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      await inventoryApi.cancelSession({ session_id: sessionId });
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, status: 'cancelled' as const } : s
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel inventory';
      set({ error: message, loading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

