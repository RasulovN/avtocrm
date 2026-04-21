import { create } from 'zustand';
import type { InventorySession, InventoryItem, InventoryStats } from '../services/inventory.api';
import { inventoryApi, type CreateInventorySession } from '../services/inventory.api';

interface InventoryState {
  sessions: InventorySession[];
  currentSession: InventorySession | null;
  items: InventoryItem[];
  stats: InventoryStats | null;
  loading: boolean;
  itemsLoading: boolean;
  updatingItemId: number | null;
  error: string | null;
  
  fetchSessions: (params?: { status?: string }) => Promise<void>;
  fetchSession: (id: number) => Promise<void>;
  createSession: (data: CreateInventorySession) => Promise<InventorySession>;
  loadProducts: (sessionId: number) => Promise<void>;
  fetchItems: (sessionId: number) => Promise<void>;
  updateItemCount: (itemId: number, countedQty: number) => Promise<void>;
  completeInventory: (sessionId: number) => Promise<void>;
  setCurrentSession: (session: InventorySession | null) => void;
  clearError: () => void;
}

const debouncedUpdates: Map<number, NodeJS.Timeout> = new Map();

export const useInventoryStore = create<InventoryState>((set, get) => ({
  sessions: [],
  currentSession: null,
  items: [],
  stats: null,
  loading: false,
  itemsLoading: false,
  updatingItemId: null,
  error: null,

  fetchSessions: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await inventoryApi.getSessions(params);
      set({ sessions: response.data, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch sessions';
      set({ error: message, loading: false });
    }
  },

  fetchSession: async (id) => {
    set({ loading: true, error: null });
    try {
      const session = await inventoryApi.getSession(id);
      set({ currentSession: session, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch session';
      set({ error: message, loading: false });
    }
  },

  createSession: async (data) => {
    set({ loading: true, error: null });
    try {
      const session = await inventoryApi.createSession(data);
      set((state) => ({
        sessions: [session, ...state.sessions],
        loading: false,
      }));
      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create session';
      set({ error: message, loading: false });
      throw error;
    }
  },

  loadProducts: async (sessionId) => {
    set({ itemsLoading: true, error: null });
    try {
      const items = await inventoryApi.loadProducts(sessionId);
      const itemsWithStatus = items.map((item) => ({
        ...item,
        status: item.counted_qty === null 
          ? 'pending' 
          : item.counted_qty === item.expected_qty 
            ? 'matched' 
            : 'mismatch',
        difference: item.counted_qty !== null ? item.counted_qty - item.expected_qty : undefined,
      }));
      set({ items: itemsWithStatus, itemsLoading: false });
      
      const stats = calculateStats(itemsWithStatus);
      set({ stats });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load products';
      set({ error: message, itemsLoading: false });
    }
  },

  fetchItems: async (sessionId) => {
    set({ itemsLoading: true, error: null });
    try {
      const items = await inventoryApi.getItems(sessionId);
      const itemsWithStatus = items.map((item) => ({
        ...item,
        status: item.counted_qty === null 
          ? 'pending' 
          : item.counted_qty === item.expected_qty 
            ? 'matched' 
            : 'mismatch',
        difference: item.counted_qty !== null ? item.counted_qty - item.expected_qty : undefined,
      }));
      set({ items: itemsWithStatus, itemsLoading: false });
      
      const stats = calculateStats(itemsWithStatus);
      set({ stats });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch items';
      set({ error: message, itemsLoading: false });
    }
  },

  updateItemCount: async (itemId, countedQty) => {
    const { items } = get();
    const itemIndex = items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    const existingTimeout = debouncedUpdates.get(itemId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const newItems = [...items];
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      counted_qty: countedQty,
      difference: countedQty - newItems[itemIndex].expected_qty,
      status: countedQty === newItems[itemIndex].expected_qty ? 'matched' : 'mismatch',
    };
    set({ items: newItems });

    const timeoutId = setTimeout(async () => {
      try {
        set({ updatingItemId: itemId });
        await inventoryApi.updateItem(itemId, { counted_qty: countedQty });
        
        const updatedItems = [...get().items];
        const idx = updatedItems.findIndex((i) => i.id === itemId);
        if (idx !== -1) {
          const stats = calculateStats(updatedItems);
          set({ stats, updatingItemId: null });
        }
      } catch {
        set({ updatingItemId: null });
        const originalItems = get().items;
        const originalIndex = originalItems.findIndex((i) => i.id === itemId);
        if (originalIndex !== -1) {
          const restoredItems = [...originalItems];
          restoredItems[originalIndex] = {
            ...restoredItems[originalIndex],
            status: restoredItems[originalIndex].counted_qty === restoredItems[originalIndex].expected_qty 
              ? 'matched' 
              : 'mismatch',
            difference: restoredItems[originalIndex].counted_qty !== null 
              ? restoredItems[originalIndex].counted_qty - restoredItems[originalIndex].expected_qty 
              : undefined,
          };
          set({ items: restoredItems });
        }
      }
      debouncedUpdates.delete(itemId);
    }, 500);

    debouncedUpdates.set(itemId, timeoutId);
  },

  completeInventory: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      const session = await inventoryApi.completeInventory(sessionId);
      set((state) => ({
        currentSession: session,
        sessions: state.sessions.map((s) => (s.id === sessionId ? session : s)),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete inventory';
      set({ error: message, loading: false });
      throw error;
    }
  },

  setCurrentSession: (session) => {
    set({ currentSession: session });
  },

  clearError: () => {
    set({ error: null });
  },
}));

function calculateStats(items: InventoryItem[]): InventoryStats {
  const stats: InventoryStats = {
    total: items.length,
    matched: 0,
    mismatch: 0,
    pending: 0,
  };

  items.forEach((item) => {
    if (item.counted_qty === null) {
      stats.pending++;
    } else if (item.counted_qty === item.expected_qty) {
      stats.matched++;
    } else {
      stats.mismatch++;
    }
  });

  return stats;
}
