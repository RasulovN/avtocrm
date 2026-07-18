import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../app/store';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types';

interface CategoryContextValue {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
  setCategories: (categories: Category[]) => void;
  ensureLoaded: () => void;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();
  const hasSession = useAuthStore((state) => Boolean(state.user || state.token));
  const prevLangRef = useRef(i18n.language);
  // Kategoriyalar faqat birinchi iste'molchi sahifa mount bo'lganda yuklanadi
  const [requested, setRequested] = useState(false);

  const refreshCategories = useCallback(async () => {
    try {
      setLoading(true);
      // Backend StandardPagination limitni 100 taga cheklaydi — 1000 so'rash
      // baribir 100 ta qaytarardi, shuning uchun rostini yozamiz.
      const response = await categoryService.getAll({ limit: 100 });
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

  const ensureLoaded = useCallback(() => {
    setRequested(true);
  }, []);

  useEffect(() => {
    if (!hasSession) {
      prevLangRef.current = i18n.language;
      setCategories([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Hech bir sahifa kategoriya so'ramagan bo'lsa, yuklamaymiz
    if (!requested) return;

    prevLangRef.current = i18n.language;
    void refreshCategories();
  }, [hasSession, requested, i18n.language, refreshCategories]);

  const value = useMemo(() => ({
    categories,
    loading,
    error,
    refreshCategories,
    setCategories,
    ensureLoaded,
  }), [categories, loading, error, refreshCategories, ensureLoaded]);

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  const { ensureLoaded } = context;
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  return context;
}
