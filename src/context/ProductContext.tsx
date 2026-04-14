import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../app/store';
import { productService } from '../services/productService';
import type { Product } from '../types';

interface ProductContextValue {
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();
  const hasSession = useAuthStore((state) => Boolean(state.user || state.token));
  const prevLangRef = useRef(i18n.language);
  const initialLoadRef = useRef(true);

  const refreshProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productService.getAll({ limit: 500 });
      const data = Array.isArray(response.data) ? response.data : [];
      setProducts(data);
      setError(null);
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        return;
      }
      console.error('Failed to load products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasSession) {
      initialLoadRef.current = true;
      prevLangRef.current = i18n.language;
      setProducts([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      void refreshProducts();
      return;
    }
    
    const currentLang = i18n.language;
    if (prevLangRef.current !== currentLang) {
      prevLangRef.current = currentLang;
      void refreshProducts();
    }
  }, [hasSession, i18n.language, refreshProducts]);

  const value = useMemo(() => ({
    products,
    loading,
    error,
    refreshProducts,
  }), [products, loading, error, refreshProducts]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductProvider');
  }
  return context;
}
