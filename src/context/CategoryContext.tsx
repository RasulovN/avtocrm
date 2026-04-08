import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types';

interface CategoryContextValue {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
  setCategories: (categories: Category[]) => void;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const refreshCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAll();
      const data = Array.isArray(response.data) ? response.data : [];
      setCategories(data);
      setError(null);
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        return;
      }
      console.error('Failed to load categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void refreshCategories();
  }, [refreshCategories]);

  const value = useMemo(() => ({
    categories,
    loading,
    error,
    refreshCategories,
    setCategories,
  }), [categories, loading, error, refreshCategories]);

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  return context;
}
