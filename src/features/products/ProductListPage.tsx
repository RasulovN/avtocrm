import { useEffect, useMemo, useState, useCallback, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Barcode, Search, Printer, Power } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column, type StoreInventory } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BarcodePrint } from '../../components/ui/BarcodePrint';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { productService } from '../../services/productService';
import { useAuthStore } from '../../app/store';
import { useCategories } from '../../context/CategoryContext';
import type { Product, ProductFilters } from '../../types';
import { formatCurrency } from '../../utils';

export function ProductListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || 'uz';
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id;
  const { categories, refreshCategories } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 10;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [deactivating, setDeactivating] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productService.getAll({ ...filters, store_id: !isAdmin ? userStoreId : filters.store_id, page, limit });
      setProducts(response.data);
      setTotal(response.total);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load products:', error);
      setProducts([
        {
          id: '1',
          name: 'Oil Filter',
          description: 'Premium oil filter for cars',
          purchase_price: 15000,
          selling_price: 25000,
          category: 1,
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
          category: 2,
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
          category: 3,
          supplier_id: '1',
          supplier_name: 'AutoParts Co',
          store_id: '1',
          store_name: 'Main Store',
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
  }, [filters, page, isAdmin, userStoreId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (categories.length === 0) {
      void refreshCategories();
    }
  }, [categories.length, refreshCategories]);

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

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds]
  );

  const handleToggleProductSelection = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAllProducts = (ids: string[]) => {
    setSelectedProductIds((prev) => (ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))));
  };

   const handlePrintSelected = () => {
     const printContent = document.getElementById('selected-products-barcode-print-area');
     if (!printContent || selectedProducts.length === 0) return;

     const printWindow = window.open('', '_blank');
     if (!printWindow) return;

     printWindow.document.write(`
       <html>
         <head>
           <title>Print Selected Barcodes</title>
           <style>
             @page {
               size: auto;
               margin: 4mm;
             }
             html, body {
               margin: 0;
               padding: 0;
               background: #fff;
               font-family: Arial, sans-serif;
             }
             body {
               padding: 2mm;
             }
             .barcode-sheet {
               display: flex;
               flex-wrap: wrap;
               align-items: flex-start;
               gap: 3mm;
             }
             .barcode-label {
               display: inline-flex;
               flex-direction: column;
               align-items: center;
               justify-content: center;
               gap: 1.5mm;
               width: fit-content;
               max-width: 58mm;
               padding: 2mm 3mm;
               box-sizing: border-box;
               break-inside: avoid;
               page-break-inside: avoid;
             }
             .barcode-label-name {
               margin: 0;
               font-size: 11px;
               font-weight: 600;
               line-height: 1.2;
               text-align: center;
             }
             .barcode-label svg {
               display: block;
               width: auto !important;
               max-width: 52mm;
               height: 18mm !important;
               overflow: visible;
             }
           </style>
         </head>
         <body>
           <div class="barcode-sheet">${printContent.innerHTML}</div>
         </body>
       </html>
     `);
     printWindow.document.close();
     printWindow.focus();
     printWindow.print();
   };

   const handleDeactivateSelected = async () => {
     if (selectedProductIds.length === 0) return;

     const confirmMessage = selectedProductIds.length === 1
       ? t('products.deactivateOne', '1 та маҳсулотни фаолсизлантиришни хоҳлайсизми?')
       : `${selectedProductIds.length} ${t('products.deactivateMultiple', 'та маҳсулотни фаолсизлантиришни хоҳлайсизми?')}`;

     if (!window.confirm(confirmMessage)) {
       return;
     }

     try {
       setDeactivating(true);
       await Promise.all(
         selectedProductIds.map(id => productService.update(id, { is_active: false }))
       );
       setSelectedProductIds([]);
       await loadProducts();
     } catch (error) {
       console.error('Failed to deactivate products:', error);
     } finally {
       setDeactivating(false);
     }
   };

  const columns: Column<Product>[] = [
    {
      key: 'image',
      header: t('products.image') || 'Image',
      className: 'w-20',
      render: (item: Product) => {
        const imageUrl = Array.isArray(item.images) && item.images.length > 0 
          ? (item.images[0] as any).image || item.image 
          : item.image;

        if (!imageUrl) {
          return (
            <div className="h-10 w-10 rounded border border-dashed bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">—</span>
            </div>
          );
        }

        return (
          <img
            src={imageUrl}
            alt={item.name}
            className="h-10 w-10 rounded object-cover border"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
            }}
          />
        );
      }
    },
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
      render: (item: Product) => item.category_name ?? item.category,
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
          {isAdmin && <Button
            variant="ghost"
            size="icon"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              navigate(`/${lang}/products/${item.id}/edit`);
            }}
            title={t('common.edit')}
          >
            <Edit className="h-4 w-4" />
          </Button>}
          {isAdmin && <Button
            variant="ghost"
            size="icon"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setDeleteId(item.id);
            }}
            title={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('products.title')}
        description={t('products.productList')}
        actions={isAdmin ? (
          <Button onClick={() => navigate(`/${lang}/products/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('products.addProduct')}
          </Button>
        ) : undefined}
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
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && <Select
          value={filters.store_id || 'all'}
          onValueChange={(value) => handleFilterChange('store_id', value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-full sm:w-45">
            <SelectValue placeholder={t('products.filterByStore')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="1">Асосий дўкон</SelectItem>
            <SelectItem value="2">Омбор</SelectItem>
          </SelectContent>
        </Select>}
      </div>

      {selectedProducts.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {selectedProducts.length} {t('products.selectedProducts', 'та маҳсулот танланди')}
          </p>
          <div className="flex gap-2">
            <Button onClick={handlePrintSelected}>
              <Printer className="mr-2 h-4 w-4" />
              {t('products.printBarcode')}
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                onClick={handleDeactivateSelected}
                disabled={deactivating}
              >
                <Power className="mr-2 h-4 w-4" />
                {deactivating ? 'Faolsizlantirilmoqda...' : 'Faolsizlantirish'}
              </Button>
            )}
          </div>
        </div>
      )}

      <DataTable
        data={products}
        columns={columns}
        loading={loading}
        onRowClick={(item: Product) => isAdmin ? navigate(`/${lang}/products/${item.id}/edit`) : undefined}
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
        selectableRows={true}
        selectedRowIds={selectedProductIds}
        onToggleRowSelection={handleToggleProductSelection}
        onToggleAllRows={handleToggleAllProducts}
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

      <div className="absolute -left-24999.75 top-0 opacity-0 pointer-events-none">
        <div id="selected-products-barcode-print-area" className="barcode-sheet">
          {selectedProducts.map((product) => (
            <div key={product.id} className="barcode-label">
              <p className="barcode-label-name">{product.name}</p>
              <BarcodePrint
                value={product.barcode || product.sku || ''}
                productName={product.name}
                showName={false}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default ProductListPage;
