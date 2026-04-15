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
      console.log('[ProductContext] Starting to fetch products...');
      const response = await productService.getAll({ limit: 500 });
      console.log('[ProductContext] API Response:', response);
      const data = Array.isArray(response.data) ? response.data : [];
      console.log('[ProductContext] Extracted data length:', data.length, 'Data:', data);
      setProducts(data);
      setError(null);
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        console.log('[ProductContext] Got 401 error, ignoring');
        return;
      }
      console.error('[ProductContext] Failed to load products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[ProductContext] useEffect triggered', {
      hasSession,
      initialLoadRef: initialLoadRef.current,
      language: i18n.language,
    });

    if (!hasSession) {
      console.log('[ProductContext] No session, resetting');
      initialLoadRef.current = true;
      prevLangRef.current = i18n.language;
      setProducts([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (initialLoadRef.current) {
      console.log('[ProductContext] Initial load, fetching products');
      initialLoadRef.current = false;
      void refreshProducts();
      return;
    }
    
    const currentLang = i18n.language;
    if (prevLangRef.current !== currentLang) {
      console.log('[ProductContext] Language changed, fetching products');
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
  console.log('[useProducts] Hook called, returning:', {
    productsCount: context.products.length,
    loading: context.loading,
    hasError: !!context.error,
  });
  return context;
}
