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
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();
  const hasSession = useAuthStore((state) => Boolean(state.user || state.token));
  const user = useAuthStore((state) => state.user);
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id;
  const prevLangRef = useRef(i18n.language);
  const initialLoadRef = useRef(true);

   const refreshProducts = useCallback(async () => {
    console.log('refreshProducts called, isAdmin:', isAdmin, 'userStoreId:', userStoreId);
    try {
      setLoading(true);
      const filters: { limit?: number; store_id?: string } = { limit: 500 };
      if (!isAdmin && userStoreId) {
        filters.store_id = userStoreId;
      }
      console.log('Fetching products with filters:', filters);
      const response = await productService.getAll(filters);
      console.log('Products API response:', response);
      const data = Array.isArray(response.data) ? response.data : [];
      console.log('Products count:', data.length);
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

   useEffect(() => {
     console.log('ProductContext useEffect triggered', {
       hasSession,
       initialLoad: initialLoadRef.current,
       language: i18n.language,
       userId: user?.id,
       userStoreId: user?.store_id,
       isAdmin: isAdmin,
     });

     if (!hasSession) {
       console.log('No session, resetting products');
       initialLoadRef.current = true;
       prevLangRef.current = i18n.language;
       setProducts([]);
       setError(null);
       setLoading(false);
       return;
     }

     // Always refresh when store_id or admin status changes
     console.log('Fetching products due to user/store change');
     void refreshProducts();

     // Note: We don't use initialLoadRef anymore since we want to refresh on every user/store change
   }, [hasSession, i18n.language, userStoreId, isAdmin, refreshProducts]);

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
  // console.log('[useProducts] Hook called, returning:', {
  //   productsCount: context.products.length,
  //   loading: context.loading,
  //   hasError: !!context.error,
  // });
  return context;
}
