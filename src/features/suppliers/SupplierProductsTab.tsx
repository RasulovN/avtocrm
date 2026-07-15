import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Package } from 'lucide-react';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { Input } from '../../components/ui/Input';
import { supplierService, type SupplierProductRecord } from '../../services/supplierService';
import { formatCurrency } from '../../utils';
import { handleError } from '../../utils/errorHandler';

interface SupplierProductsTabProps {
  supplierId: string;
}

// DataTable `id` maydonini talab qiladi — product ID dan foydalanamiz
type ProductRow = SupplierProductRecord & { id: number };

export function SupplierProductsTab({ supplierId }: SupplierProductsTabProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Qidiruv debounce: yozish tugagach 400ms kutib, 1-sahifadan qayta yuklaymiz
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierService.getProducts(supplierId, {
        page,
        limit,
        search: debouncedSearch || undefined,
      });
      setProducts(res.data.map((row) => ({ ...row, id: row.product })));
      setTotal(res.total);
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Failed to load supplier products' });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [supplierId, page, debouncedSearch]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const columns: Column<ProductRow>[] = [
    {
      key: 'image',
      header: t('suppliers.photo', 'Foto'),
      render: (item) =>
        item.image ? (
          <img
            src={item.image}
            alt={item.product_name || ''}
            loading="lazy"
            className="h-10 w-10 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
        ),
    },
    {
      key: 'product_name',
      header: t('suppliers.productName', 'Nomi'),
      render: (item) => (
        <div>
          <p className="max-w-52 truncate font-medium text-foreground" title={item.product_name || ''}>
            {item.product_name || `#${item.product}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.entries_count} {t('suppliers.entriesShort', 'ta kirim')}
          </p>
        </div>
      ),
    },
    {
      key: 'sku',
      header: t('products.sku', 'Artikul'),
      render: (item) => <span className="font-mono text-sm">{item.sku || '—'}</span>,
    },
    {
      key: 'barcode',
      header: t('products.barcode', 'Barkod'),
      render: (item) => <span className="font-mono text-sm">{item.barcode || '—'}</span>,
    },
    {
      key: 'category_name',
      header: t('suppliers.category', 'Kategoriya'),
      render: (item) =>
        item.category_name ? (
          <span className="text-sm">{item.category_name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{t('suppliers.noCategory', 'Mavjud emas')}</span>
        ),
    },
    {
      key: 'total_quantity',
      header: t('suppliers.quantityTotal', 'Miqdor'),
      render: (item) => (
        <span className="font-semibold tabular-nums">
          {item.total_quantity} {t('suppliers.pcs', 'dona')}
        </span>
      ),
    },
    {
      key: 'last_purchase_price',
      header: t('suppliers.lastPurchasePrice', 'Kirim narxi'),
      render: (item) => (
        <span className="tabular-nums">{formatCurrency(Number(item.last_purchase_price) || 0)}</span>
      ),
    },
    {
      key: 'last_selling_price',
      header: t('suppliers.sellingPrice', 'Sotish narxi'),
      render: (item) => (
        <span className="font-semibold tabular-nums">{formatCurrency(Number(item.last_selling_price) || 0)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('suppliers.searchProducts', 'Nomi, artikul yoki barkod bo‘yicha qidirish...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataTable
        data={products}
        columns={columns}
        loading={loading}
        emptyMessage={t('suppliers.noProducts', 'Bu ta’minotchidan tovarlar yo‘q')}
        pagination={{ page, limit, total, onPageChange: setPage }}
      />
    </div>
  );
}
