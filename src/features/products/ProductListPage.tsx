import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Barcode, Search } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column, type StoreInventory } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { productService } from '../../services/productService';
import type { Product, ProductFilters } from '../../types';
import { formatCurrency } from '../../utils';

export function ProductListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || 'uz';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 10;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAll({ ...filters, page, limit });
      setProducts(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([
        {
          id: '1',
          name: 'Oil Filter',
          description: 'Premium oil filter for cars',
          purchase_price: 15000,
          selling_price: 25000,
          category: 'Filters',
          supplier_id: '1',
          supplier_name: 'AutoParts Co',
          store_id: '1',
          store_name: 'Main Store',
          sku: 'SKU-001',
          quantity: 100,
          inventory_by_store: [
            { store_id: '1', store_name: 'Main Store', quantity: 60, purchase_price: 15000, selling_price: 25000 },
            { store_id: '2', store_name: 'Warehouse', quantity: 40, purchase_price: 15000, selling_price: 25000 },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Brake Pads',
          description: 'Ceramic brake pads',
          purchase_price: 45000,
          selling_price: 75000,
          category: 'Brakes',
          supplier_id: '1',
          supplier_name: 'AutoParts Co',
          store_id: '1',
          store_name: 'Main Store',
          sku: 'SKU-002',
          quantity: 50,
          inventory_by_store: [
            { store_id: '1', store_name: 'Main Store', quantity: 30, purchase_price: 45000, selling_price: 75000 },
            { store_id: '2', store_name: 'Warehouse', quantity: 20, purchase_price: 45000, selling_price: 75000 },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Spark Plug',
          description: 'IRidium spark plug',
          purchase_price: 8000,
          selling_price: 15000,
          category: 'Electrical',
          supplier_id: '1',
          supplier_name: 'AutoParts Co',
          store_id: '2',
          store_name: 'Warehouse',
          sku: 'SKU-003',
          quantity: 200,
          inventory_by_store: [
            { store_id: '1', store_name: 'Main Store', quantity: 100, purchase_price: 8000, selling_price: 15000 },
            { store_id: '2', store_name: 'Warehouse', quantity: 100, purchase_price: 8000, selling_price: 15000 },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setTotal(3);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(1);
  };

  const handleFilterChange = (key: keyof ProductFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await productService.delete(deleteId);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getInventoryByStore = (item: Product): StoreInventory[] => {
    return item.inventory_by_store || [];
  };

  const columns: Column<Product>[] = [
    {
      key: 'sku',
      header: t('products.sku'),
      className: 'font-mono text-sm',
    },
    {
      key: 'name',
      header: t('products.productName'),
    },
    {
      key: 'category',
      header: t('products.category'),
    },
    {
      key: 'quantity',
      header: t('products.quantity'),
      className: 'min-w-[180px]',
    },
    {
      key: 'purchase_price',
      header: t('products.purchasePrice'),
      className: 'text-right',
      render: (item: Product) => formatCurrency(item.purchase_price ?? 0),
    },
    {
      key: 'selling_price',
      header: t('products.sellingPrice'),
      className: 'text-right',
      render: (item: Product) => formatCurrency(item.selling_price ?? 0),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item: Product) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              navigate(`/${lang}/products/${item.id}/barcode`);
            }}
            title={t('products.printBarcode')}
          >
            <Barcode className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              navigate(`/${lang}/products/${item.id}/edit`);
            }}
            title={t('common.edit')}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setDeleteId(item.id);
            }}
            title={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('products.title')}
        description={t('products.productList')}
        actions={
          <Button onClick={() => navigate(`/${lang}/products/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('products.addProduct')}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('products.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select
          value={filters.category || 'all'}
          onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-full sm:w-45">
            <SelectValue placeholder={t('products.filterByCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="Filters">Filters</SelectItem>
            <SelectItem value="Brakes">Brakes</SelectItem>
            <SelectItem value="Engine">Engine</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filters.store_id || 'all'}
          onValueChange={(value) => handleFilterChange('store_id', value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-full sm:w-45">
            <SelectValue placeholder={t('products.filterByStore')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="1">Main Store</SelectItem>
            <SelectItem value="2">Warehouse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={products}
        columns={columns}
        loading={loading}
        searchPlaceholder={t('products.searchPlaceholder')}
        onSearch={handleSearch}
        onRowClick={(item: Product) => navigate(`/${lang}/products/${item.id}/edit`)}
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
        }}
        inventoryByStore={getInventoryByStore}
        itemNameKey={'name' as keyof Product}
        showFooter={true}
        showStoreStats={true}
        storeKey={'store_name' as keyof Product}
        quantityKey={'quantity' as keyof Product}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        description={t('products.productDeleted')}
        confirmText={t('common.delete')}
        variant="destructive"
        loading={deleting}
      />


    </div>
  );
}

export default ProductListPage;
