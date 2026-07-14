import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../app/store';
import { productService } from '../services/productService';
import type { Product } from '../types';
import { logger } from '../utils/logger';

interface ProductContextValue {
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  ensureLoaded: () => void;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();
  const hasSession = useAuthStore((state) => Boolean(state.user || state.token));
  const user = useAuthStore((state) => state.user);
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
  const userStoreId = user?.store_id;
  const prevLangRef = useRef(i18n.language);
  // Mahsulotlar faqat birinchi iste'molchi sahifa mount bo'lganda yuklanadi
  const [requested, setRequested] = useState(false);

   const refreshProducts = useCallback(async () => {
    // logger.info('refreshProducts called, isAdmin:', isAdmin, 'userStoreId:', userStoreId);
    try {
      setLoading(true);
      const filters: { limit?: number; store_id?: string } = { limit: 2000 };
      logger.info('Fetching products with filters:', filters);
      const response = await productService.getAll(filters);
      // logger.info('Products API response:', response);
      const data = Array.isArray(response.data) ? response.data : [];
      // logger.info('Products count:', data.length);
      setProducts(data);
      setError(null);
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userStoreId]);

   const ensureLoaded = useCallback(() => {
     setRequested(true);
   }, []);

   useEffect(() => {
     if (!hasSession) {
       logger.info('No session, resetting products');
       prevLangRef.current = i18n.language;
       setProducts([]);
       setError(null);
       setLoading(false);
       return;
     }

     // Hech bir sahifa mahsulot so'ramagan bo'lsa, yuklamaymiz
     if (!requested) return;

     // Refresh when store_id, admin status or language changes
     logger.info('Fetching products due to user/store change');
     void refreshProducts();
   }, [hasSession, requested, i18n.language, userStoreId, isAdmin, refreshProducts]);

  const value = useMemo(() => ({
    products,
    loading,
    error,
    refreshProducts,
    ensureLoaded,
  }), [products, loading, error, refreshProducts, ensureLoaded]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductProvider');
  }
  const { ensureLoaded } = context;
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  // logger.info('[useProducts] Hook called, returning:', {
  //   productsCount: context.products.length,
  //   loading: context.loading,
  //   hasError: !!context.error,
  // });
  return context;
}
