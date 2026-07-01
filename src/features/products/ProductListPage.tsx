import { useEffect, useMemo, useState, useCallback, type ChangeEvent, type FormEvent } from 'react';
import JsBarcode from 'jsbarcode';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import toast from 'react-hot-toast';
import { Plus, Edit, Barcode, Search, Printer, Power, Eye, Package, Loader2, ChevronLeft, ChevronRight, X, Warehouse, Store as StoreIcon, Calendar, Tag, Hash, Layers, Upload, Download, MapPin, Ruler, ImageIcon } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { productService } from '../../services/productService';
import { storeService } from '../../services/storeService';
import { productUnitService } from '../../services/productUnitService';
import { productLocationService, type ProductLocation } from '../../services/productLocationService';
import { categoryService } from '../../services/categoryService';
import { useAuthStore } from '../../app/store';
import { useCategories } from '../../context/CategoryContext';
import type { Product, ProductFormData, ProductFilters, ProductUnit, CategoryFormData, ProductUnitFormData, Store, Category } from '../../types';
import { formatCurrency, cn } from '../../utils';
import { latinToCyrillic } from '../../utils/transliteration';
import { handleError } from '../../utils/errorHandler';

export function ProductListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || 'uz';
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
  const userStoreId = user?.store_id;
  const { categories, refreshCategories } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [deactivating, setDeactivating] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load stores list for dynamic column headers
  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await storeService.getAll({ limit: 100 });
        setStores(res.data);
      } catch {
        setStores([]);
      }
    };
    void loadStores();
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productService.getAll({ ...filters, store_id: !isAdmin ? userStoreId : filters.store_id, page, limit });
      setProducts(response.data);
      setTotal(response.total);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: true, logData: 'Failed to load products' });
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

  // Handle auto-open via search params (for navigation redirection)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === 'true') {
      setIsAddModalOpen(true);
      navigate(window.location.pathname, { replace: true });
    }
  }, [navigate]);

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
      handleError(error, { showToast: true });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await productService.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      handleError(error, { showToast: true });
    }
  };

  const handleExcelUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await productService.importProducts(file);
      toast.success(t('products.importSuccess', 'Mahsulotlar muvaffaqiyatli import qilindi'));
      void loadProducts();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds]
  );

  const handlePrintSelected = () => {
    if (selectedProducts.length === 0) return;

    const canvas = document.createElement('canvas');
    const barcodeCards = selectedProducts.map((product) => {
      const isShtrixUrl = product.shtrix_code && (product.shtrix_code.startsWith('http://') || product.shtrix_code.startsWith('https://') || product.shtrix_code.startsWith('/media/'));
      const barcodeValue = product.barcode || product.sku || '';
      
      let dataUrl = '';
      if (isShtrixUrl) {
        dataUrl = product.shtrix_code!;
      } else if (barcodeValue) {
        try {
          JsBarcode(canvas, barcodeValue, {
            format: 'CODE128',
            width: 2,
            height: 80,
            displayValue: false,
            margin: 0
          });
          dataUrl = canvas.toDataURL('image/png');
        } catch (error) {
          handleError(error, { showToast: true });
        }
      }

      if (!dataUrl) return '';

      return `
        <div class="barcode-label">
          <img src="${dataUrl}" />
        </div>
      `;
    }).join('');

    const htmlContent = `
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
             .barcode-label img {
               display: block;
               width: auto !important;
               max-width: 52mm;
               height: auto !important;
               max-height: 25mm;
             }
           </style>
         </head>
         <body>
           <div class="barcode-sheet">
             ${barcodeCards}
           </div>
           <script>
             window.onload = function() {
               setTimeout(function() { window.print(); }, 500);
             };
           </script>
         </body>
       </html>
     `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
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
      handleError(error, { showToast: true });
    } finally {
      setDeactivating(false);
    }
  };

  // Helper: get image URL from product
  const getImageUrl = (item: Product): string | null => {
    if (Array.isArray(item.images) && item.images.length > 0) {
      const first = item.images[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object' && first !== null && 'image' in first) return (first as { image: string }).image;
    }
    return item.image || null;
  };

  // Compute total quantity for a product
  const getTotalQuantity = (item: Product): number => {
    if (item.inventory_by_store && item.inventory_by_store.length > 0) {
      return item.inventory_by_store.reduce((sum, inv) => sum + inv.quantity, 0);
    }
    return item.total_quantity ?? item.quantity ?? 0;
  };

  // Get quantity for a specific store
  const getStoreQuantity = (item: Product, storeId: string): number => {
    if (!item.inventory_by_store) return 0;
    const inv = item.inventory_by_store.find(i => String(i.store_id) === String(storeId));
    return inv?.quantity ?? 0;
  };

  // Pagination
  const getPageNumbers = (currentPage: number, totalPagesCount: number) => {
    const pages: (number | string)[] = [];
    const delta = 2;

    for (let i = 1; i <= totalPagesCount; i++) {
      if (
        i === 1 ||
        i === totalPagesCount ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const totalPages = Math.ceil(total / limit);

  // Determine which stores have inventory data in any product (for dynamic columns)
  const storeColumns = useMemo(() => {
    // Collect all unique store ids from product inventory data
    const storeMap = new Map<string, string>();
    products.forEach((product) => {
      product.inventory_by_store?.forEach((inv) => {
        if (!storeMap.has(String(inv.store_id))) {
          storeMap.set(String(inv.store_id), inv.store_name);
        }
      });
    });
    // If no inventory data, fall back to loaded stores
    if (storeMap.size === 0 && stores.length > 0) {
      stores.forEach((s) => storeMap.set(s.id, s.name));
    }
    return Array.from(storeMap.entries()).map(([id, name]) => ({ id, name }));
  }, [products, stores]);

  // Split stores into warehouse (Ombor) and shops (Do'konlar)
  const warehouseStore = useMemo(() => {
    return stores.find(s => s.is_warehouse);
  }, [stores]);

  const shopStores = useMemo(() => {
    return storeColumns;
  }, [storeColumns]);

  const LOW_STOCK_THRESHOLD = 5;

  const getStockStatus = useCallback((totalQty: number): 'out_of_stock' | 'low_stock' | 'in_stock' => {
    if (totalQty === 0) return 'out_of_stock';
    if (totalQty <= LOW_STOCK_THRESHOLD) return 'low_stock';
    return 'in_stock';
  }, []);

  const filteredProducts = useMemo(() => {
    if (!filters.stock_status) return products;
    return products.filter(p => {
      const qty = getTotalQuantity(p);
      if (filters.stock_status === 'out_of_stock') return qty === 0;
      if (filters.stock_status === 'low_stock') return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
      return true;
    });
  }, [products, filters.stock_status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('products.title')}
        description={t('products.productList')}
        actions={isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              {t('products.downloadTemplate', 'Shablon yuklash')}
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('excel-upload')?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              {t('products.importExcel', 'Import qilish')}
            </Button>
            <input 
              type="file" 
              id="excel-upload" 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleExcelUpload} 
            />
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('products.addProduct')}
            </Button>
          </div>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t('products.filterByCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {lang === 'cyrl' && category.name_uz_cyrl ? category.name_uz_cyrl : (category.name_uz || category.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.stock_status || 'all'}
          onValueChange={(value) => handleFilterChange('stock_status', value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t('products.stockStatus', 'Qoldiq holati')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="in_stock">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {t('products.inStock', 'Omborda bor')}
              </span>
            </SelectItem>
            <SelectItem value="low_stock">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                {t('products.lowStock', 'Kam qolgan')}
              </span>
            </SelectItem>
            <SelectItem value="out_of_stock">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {t('products.outOfStock', 'Tugagan')}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {filters.stock_status && (
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-lg">
            {filteredProducts.length} / {products.length}
          </div>
        )}
      </div>

      {/* Selected products action bar */}
      {selectedProducts.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-primary/5 px-5 py-3">
          <p className="text-sm font-medium text-primary">
            {selectedProducts.length} {t('products.selectedProducts', 'та маҳсулот танланди')}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePrintSelected}>
              <Printer className="mr-2 h-4 w-4" />
              {t('products.printBarcode')}
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeactivateSelected}
                disabled={deactivating}
              >
                <Power className="mr-2 h-4 w-4" />
                {deactivating ? t('common.loading') : t('products.deactivate', 'Фаолсизлантириш')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Mobile Card-Based View ═══════ */}
      <div className="block md:hidden space-y-4">
        {loading ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-card rounded-2xl border border-border/60">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm font-medium">{t('common.loading')}</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-card rounded-2xl border border-border/60">
            <Package className="h-8 w-8 opacity-40 text-muted-foreground" />
            <span className="text-sm">{t('common.noData', "Ma'lumot yo'q")}</span>
          </div>
        ) : (
          filteredProducts.map((item) => {
            const imageUrl = getImageUrl(item);
            const totalQty = getTotalQuantity(item);
            const stockStatus = getStockStatus(totalQty);
            const isActive = item.is_active !== false;

            return (
              <div
                key={item.id}
                onClick={() => isAdmin && navigate(`/${lang}/products/${item.id}/edit`)}
                className={cn(
                  "rounded-2xl bg-card p-4 shadow-sm space-y-4 active:scale-[0.99] transition-transform cursor-pointer relative",
                  !isActive && "opacity-60",
                  stockStatus === 'out_of_stock' && "border-l-4 border-l-red-500 border border-border/60",
                  stockStatus === 'low_stock' && "border-l-4 border-l-yellow-500 border border-border/60",
                  stockStatus === 'in_stock' && "border border-border/60"
                )}
              >
                {/* Upper part: Image and title info */}
                <div className="flex gap-3">
                  <div className="shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="h-16 w-16 rounded-xl object-cover border border-border/40"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          const parent = img.parentElement;
                          if (parent && !parent.querySelector('[data-img-fallback]')) {
                            const ph = document.createElement('div');
                            ph.setAttribute('data-img-fallback', '');
                            ph.className = 'h-16 w-16 rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center';
                            const span = document.createElement('span');
                            span.className = 'text-muted-foreground text-xs';
                            span.textContent = '—';
                            ph.appendChild(span);
                            parent.appendChild(ph);
                          }
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                        #{item.id}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      {item.category_name && (
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <Tag className="h-3 w-3 text-primary" />
                          {item.category_name}
                        </span>
                      )}
                      {item.sku && (
                        <span className="text-slate-500 font-mono bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded text-[10px]">
                          SKU: {item.sku}
                        </span>
                      )}
                      {item.barcode && (
                        <span className="text-slate-500 font-mono bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded text-[10px]">
                          Barcode: {item.barcode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle part: Prices */}
                <div className="grid grid-cols-3 gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/40 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">{t('products.purchasePrice', 'Kelish narxi')}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200 mt-0.5 block">
                      {formatCurrency(item.purchase_price ?? 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">{t('products.sellingPrice', 'Sotuv narxi')}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-500 mt-0.5 block">
                      {formatCurrency(item.selling_price ?? 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">{t('products.wholesalePrice', 'Ulgurji narx')}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200 mt-0.5 block">
                      {formatCurrency(item.wholesale_price ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Inventory / Stocks details */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-border/30">
                  <div className="flex items-center justify-between text-xs border-b border-border/30 pb-2">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      {t('common.total', 'Jami')}:
                    </span>
                    <span className={cn(
                      "font-bold tabular-nums text-sm",
                      stockStatus === 'out_of_stock' && "text-red-600 dark:text-red-400",
                      stockStatus === 'low_stock' && "text-yellow-600 dark:text-yellow-400",
                      stockStatus === 'in_stock' && "text-green-600 dark:text-green-400"
                    )}>
                      {totalQty}
                    </span>
                  </div>

                  {shopStores.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-1">
                      {shopStores.map((store) => {
                        const qty = getStoreQuantity(item, store.id);
                        const storeStatus = getStockStatus(qty);
                        return (
                          <div key={store.id} className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[80px] flex items-center gap-1 font-medium">
                              <StoreIcon className="h-3 w-3 shrink-0 text-blue-500" />
                              {store.name}
                            </span>
                            <span className={cn(
                              "font-bold tabular-nums",
                              storeStatus === 'out_of_stock' && "text-red-600 dark:text-red-400",
                              storeStatus === 'low_stock' && "text-yellow-600 dark:text-yellow-400",
                              storeStatus === 'in_stock' && "text-green-600 dark:text-green-400"
                            )}>
                              {qty}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer part: Status & action button */}
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <div>
                    {stockStatus === 'out_of_stock' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {t('products.outOfStock', 'Tugagan')}
                      </span>
                    ) : stockStatus === 'low_stock' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {t('products.lowStock', 'Kam qolgan')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {t('products.inStock', 'Omborda bor')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 rounded-lg flex items-center text-xs shadow-sm bg-card hover:bg-muted border border-border"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewProduct(item);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {t('common.view', "Ko'rish")}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════ Product Table ═══════ */}
      <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm" style={{ minWidth: `${Math.max(1100, 800 + shopStores.length * 90)}px` }}>
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {/* ID */}
              <th className="w-14 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ID
              </th>
              {/* Image */}
              <th className="w-16 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('products.image', 'Tovar rasmi')}
              </th>
              {/* Name + barcode underneath */}
              <th className="min-w-[200px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('products.productName', 'Tovar nomi')}
              </th>
              {/* SKU */}
              <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('products.sku', 'SKU')}
              </th>
              {/* Barcode */}
              <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('products.barcode')}
              </th>
              {/* Category */}
              <th className="w-[140px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('products.category', 'Kategoriya')}
              </th>
              {/* Purchase price */}
              <th className="w-[110px] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('products.purchasePrice', 'Kelish narxi')}
              </th>
              {/* Selling price */}
              <th className="w-[110px] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('products.sellingPrice', 'Sotuv narxi')}
              </th>
              {/* Wholesale price */}
              <th className="w-[110px] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('products.wholesalePrice', 'Ulgurji narx')}
              </th>
              {/* Jami (Total) */}
              <th className="w-[80px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('common.total', 'Jami')}
              </th>
              {/* Dynamic store columns */}
              {shopStores.map((store, idx) => (
                <th key={store.id} className="w-[90px] px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {store.name || `${t('stores.title', "Do'kon")} ${idx + 1}`}
                </th>
              ))}
              {/* Status */}
              {/* <th className="w-[110px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('common.status', 'Holat')}
              </th> */}
              {/* Actions */}
              <th className="w-10 px-2 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10 + shopStores.length} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">{t('common.loading')}</span>
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={10 + shopStores.length} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8 opacity-40" />
                    <span className="text-sm">{t('common.noData', "Ma'lumot yo'q")}</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((item) => {
                const imageUrl = getImageUrl(item);
                const totalQty = getTotalQuantity(item);
                const stockStatus = getStockStatus(totalQty);
                const isSelected = selectedProductIds.includes(item.id);
                const isActive = item.is_active !== false;

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-border/40 transition-colors hover:bg-muted/20',
                      isSelected && 'bg-primary/5',
                      !isActive && 'opacity-60',
                      stockStatus === 'out_of_stock' && 'border-l-2 border-l-red-500',
                      stockStatus === 'low_stock' && 'border-l-2 border-l-yellow-500'
                    )}
                  >
                    {/* ID */}
                    <td className="px-3 py-3">
                      <span className="text-xs font-mono text-muted-foreground">#{item.id}</span>
                    </td>

                    {/* Product Image */}
                    <td className="px-2 py-2">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="h-11 w-11 rounded-lg object-cover border border-border/40"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            const parent = img.parentElement;
                            if (parent && !parent.querySelector('[data-img-fallback]')) {
                              const ph = document.createElement('div');
                              ph.setAttribute('data-img-fallback', '');
                              ph.className = 'h-11 w-11 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center';
                              const span = document.createElement('span');
                              span.className = 'text-muted-foreground text-xs';
                              span.textContent = '—';
                              ph.appendChild(span);
                              parent.appendChild(ph);
                            }
                          }}
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </td>

                    {/* Product Name + barcode underneath */}
                    <td
                      className="px-3 py-2 cursor-pointer"
                      onClick={() => isAdmin && navigate(`/${lang}/products/${item.id}/edit`)}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate max-w-[220px] leading-tight">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          ID: {item.id}
                        </p>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono bg-muted/40 px-2 py-0.5 rounded-md text-muted-foreground">
                        {item.sku || '—'}
                      </code>
                    </td>

                    {/* Barcode */}
                    <td className="px-3 py-2">
                      {item.barcode ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                          <span>{item.barcode}</span>
                          {item.shtrix_code && (
                            <a
                              href={item.shtrix_code}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 transition-colors"
                              title={t('titles.printBarcode', 'Barcode chop etish')}
                            >
                              <Barcode className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      ) : '—'}
                    </td>

                    {/* Category */}
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {item.category_name || String(item.category || '—')}
                    </td>

                    {/* Purchase Price */}
                    <td className="px-3 py-2 text-right text-sm tabular-nums">
                      {formatCurrency(item.purchase_price ?? 0)}
                    </td>

                    {/* Selling Price */}
                    <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(item.selling_price ?? 0)}
                    </td>

                    {/* Wholesale Price */}
                    <td className="px-3 py-2 text-right text-sm tabular-nums">
                      {formatCurrency(item.wholesale_price ?? 0)}
                    </td>

                    {/* Total Quantity */}
                    <td className="px-3 py-2 text-center">
                      <span className={cn(
                        'text-sm font-semibold tabular-nums',
                        stockStatus === 'out_of_stock' && 'text-red-600 dark:text-red-400',
                        stockStatus === 'low_stock' && 'text-yellow-600 dark:text-yellow-400',
                        stockStatus === 'in_stock' && 'text-green-600 dark:text-green-400'
                      )}>
                        {totalQty}
                      </span>
                    </td>

                    {/* Dynamic Store Columns */}
                    {shopStores.map((store) => {
                      const qty = getStoreQuantity(item, store.id);
                      const storeStatus = getStockStatus(qty);
                      return (
                        <td key={store.id} className="px-2 py-2 text-center">
                          <span className={cn(
                            'text-sm font-semibold tabular-nums',
                            storeStatus === 'out_of_stock' && 'text-red-600 dark:text-red-400',
                            storeStatus === 'low_stock' && 'text-yellow-600 dark:text-yellow-400',
                            storeStatus === 'in_stock' && 'text-green-600 dark:text-green-400'
                          )}>
                            {qty}
                          </span>
                        </td>
                      );
                    })}

                    {/* Status */}
                    {/* <td className="px-3 py-2 text-center">
                      {totalQty > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold badge-success whitespace-nowrap">
                          {t('products.inStock', 'Omborda bor')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold badge-danger whitespace-nowrap">
                          {t('products.outOfStock', 'Tugagan')}
                        </span>
                      )}
                    </td> */}

                    {/* Action: View */}
                    <td className="px-2 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewProduct(item);
                        }}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title={t('common.view', "Ko'rish")}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4 border-t border-border mt-4">
          <div className="text-sm text-muted-foreground font-medium order-2 sm:order-1">
            {(page - 1) * limit + 1}-{Math.min(page * limit, total)} / {total}
          </div>
          
          <div className="flex items-center gap-4 flex-wrap order-1 sm:order-2 justify-end w-full sm:w-auto">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {getPageNumbers(page, totalPages).map((p, idx) => {
                if (p === '...') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground text-sm select-none"
                    >
                      ...
                    </span>
                  );
                }

                const isCurrent = p === page;
                return (
                  <Button
                    key={`page-${p}`}
                    variant={isCurrent ? 'outline' : 'ghost'}
                    size="icon"
                    className={`h-8 w-8 p-0 font-medium transition-all duration-150 rounded-lg ${
                      isCurrent 
                        ? "border border-primary text-primary hover:bg-transparent hover:text-primary font-bold shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Button>
                );
              })}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>




            <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
              <span>Go to</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                defaultValue={page}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = Number((e.target as HTMLInputElement).value);
                    if (val >= 1 && val <= totalPages) {
                      setPage(val);
                    }
                  }
                }}
                className="w-12 h-8 px-1.5 text-center bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span>Page</span>
            </div>
          </div>
        </div>
      )}

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

      {/* ═══════ Product Detail Modal ═══════ */}
      <ProductDetailModal
        product={viewProduct}
        onClose={() => setViewProduct(null)}
        onEdit={(id) => navigate(`/${lang}/products/${id}/edit`)}
        stores={stores}
        warehouseStore={warehouseStore ?? null}
        t={t}
      />

      {/* ═══════ Add Product Modal ═══════ */}
      <AddProductModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          void loadProducts();
        }}
        categories={categories}
        refreshCategories={refreshCategories}
        t={t}
      />

    </div>
  );
}

/* ════════════════════════════════════════════════
   Product Detail Modal Component
   ════════════════════════════════════════════════ */

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  stores: Store[];
  warehouseStore: Store | null;
  t: TFunction<'translation', undefined>;
}

function ProductDetailModal({ product, onClose, onEdit, stores, t }: ProductDetailModalProps) {
  const isShtrixUrl = product && product.shtrix_code && (product.shtrix_code.startsWith('http://') || product.shtrix_code.startsWith('https://') || product.shtrix_code.startsWith('/media/'));

  // Use a callback ref to generate the barcode because Dialog portals mount asynchronously,
  // meaning the SVG element may not be present in the DOM during the first render/useEffect run.
  const barcodeRef = useCallback((node: SVGSVGElement | null) => {
    if (!node || !product || isShtrixUrl) return;
    const barcodeValue = product.barcode || product.sku || '';
    if (!barcodeValue) return;

    try {
      JsBarcode(node, barcodeValue, {
        format: 'CODE128',
        width: 2.5,
        height: 70,
        displayValue: true,
        fontSize: 13,
        margin: 8,
        textMargin: 6,
        background: 'transparent',
      });
    } catch (err) {
      handleError(err, { showToast: true });
    }
  }, [product, isShtrixUrl]);

  if (!product) return null;

  const imageUrl = (() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      const first = product.images[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object' && first !== null && 'image' in first) return (first as { image: string }).image;
    }
    return product.image || null;
  })();

  const barcodeValue = product.barcode || product.sku || '';
  const totalQty = product.inventory_by_store
    ? product.inventory_by_store.reduce((s, i) => s + i.quantity, 0)
    : (product.total_quantity ?? product.quantity ?? 0);

  const warehouseIds = new Set(stores.filter(s => s.is_warehouse).map(s => String(s.id)));

  const handlePrint = () => {
    if (!barcodeValue) return;

    let dataUrl = '';
    if (isShtrixUrl) {
      dataUrl = product.shtrix_code!;
    } else {
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: false,
          margin: 0,
        });
        dataUrl = canvas.toDataURL('image/png');
      } catch { return; }
    }

    const htmlContent = `<!DOCTYPE html>
      <html><head><title>Print Barcode</title>
      <style>
        @page { size: auto; margin: 0; }
        body { 
          margin: 0; 
          padding: 0; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          background: #fff;
        }
        img { 
          max-width: 100%; 
          max-height: 100%; 
          object-fit: contain; 
        }
      </style></head>
      <body>
        <img src="${dataUrl}" />
        <script>window.onload=function(){setTimeout(function(){window.print()},500)};</script>
      </body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-card px-6 py-4">
          <DialogHeader className="p-0">
            <DialogTitle className="text-lg">{t('products.productDetails', "Mahsulot ma'lumotlari")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(product.id)}>
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              {t('common.edit', 'Tahrirlash')}
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Top: Image + Basic Info */}
          <div className="flex gap-6">
            {/* Product Image */}
            <div className="shrink-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="h-32 w-32 rounded-2xl object-cover border border-border/40"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-32 w-32 rounded-2xl border border-dashed border-border bg-muted/30 flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground mb-1 truncate">{product.name}</h2>
              {product.name_uz_cyrl && (
                <p className="text-sm text-muted-foreground mb-3">{product.name_uz_cyrl}</p>
              )}

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-semibold">#{product.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('products.category', 'Kategoriya')}:</span>
                  <span className="font-semibold">{product.category_name || String(product.category || '—')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('products.sku', 'SKU')}:</span>
                  <code className="font-mono text-xs bg-muted/40 px-1.5 py-0.5 rounded">{product.sku || '—'}</code>
                </div>
                <div className="flex items-center gap-2">
                  <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('products.barcode', 'Barcode')}:</span>
                  <code className="font-mono text-xs bg-muted/40 px-1.5 py-0.5 rounded">{product.barcode || '—'}</code>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('products.unit', 'Birlik')}:</span>
                  <span className="font-semibold">{product.unit_measurement_name || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground mb-1">{t('products.purchasePrice', 'Kelish narxi')}</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(product.purchase_price ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground mb-1">{t('products.sellingPrice', 'Sotuv narxi')}</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(product.selling_price ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground mb-1">{t('products.totalQuantity', 'Jami miqdor')}</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold tabular-nums">{totalQty}</p>
                {totalQty > 0 ? (
                  <span className="badge-success text-[10px] px-2 py-0.5 rounded-md font-semibold">{t('products.inStock', 'Omborda bor')}</span>
                ) : (
                  <span className="badge-danger text-[10px] px-2 py-0.5 rounded-md font-semibold">{t('products.outOfStock', 'Tugagan')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Store Inventory Breakdown */}
          {product.inventory_by_store && product.inventory_by_store.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                {t('products.storeInventory', "Do'konlar bo'yicha qoldiq")}
              </h3>
              <div className="space-y-2">
                {product.inventory_by_store.map((inv) => {
                  const isWh = warehouseIds.has(String(inv.store_id));
                  return (
                    <div
                      key={inv.store_id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/50 bg-muted/10"
                    >
                      <div className="flex items-center gap-3">
                        {isWh ? (
                          <Warehouse className="h-4 w-4 text-blue-500" />
                        ) : (
                          <StoreIcon className="h-4 w-4 text-violet-500" />
                        )}
                        <span className="text-sm font-medium">{inv.store_name}</span>
                        {isWh && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">Ombor</span>
                        )}
                      </div>
                      <span className={cn(
                        'text-sm font-bold tabular-nums',
                        inv.quantity === 0 ? 'text-muted-foreground' : 'text-foreground'
                      )}>
                        {inv.quantity} {product.unit_measurement_name || t('products.pcs', 'dona')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">{t('products.description', 'Tavsif')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Barcode / Shtrix code */}
          {barcodeValue && (
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-muted-foreground" />
                  {t('products.barcode', 'Shtrix kod')}
                </h3>
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  {t('common.print', 'Chop etish')}
                </Button>
              </div>
              <div className="flex justify-center bg-white rounded-xl p-4">
                {isShtrixUrl ? (
                  <img src={product.shtrix_code!} alt="Barcode" className="max-w-[280px] h-auto" />
                ) : (
                  <svg ref={barcodeRef} />
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2 font-mono">{isShtrixUrl ? (product.barcode || barcodeValue) : barcodeValue}</p>
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {t('common.createdAt', 'Yaratilgan')}: {product.created_at ? new Date(product.created_at).toLocaleDateString() : '—'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {t('common.updatedAt', 'Yangilangan')}: {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════════════════════════════════════
   Add Product Modal Component
   ════════════════════════════════════════════════ */

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  refreshCategories: () => Promise<void>;
  t: TFunction<'translation', undefined>;
}

const addProductInitialForm: ProductFormData = {
  name: '',
  name_uz_cyrl: '',
  description: '',
  description_uz_cyrl: '',
  category: '',
  unit_measurement: '',
  location: '',
  purchase_price: '',
  selling_price: '',
  images: [],
  min_stock: undefined,
  is_active: true,
};

function AddProductModal({ open, onClose, onSuccess, categories, refreshCategories, t }: AddProductModalProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'uz';
  const [formData, setFormData] = useState<ProductFormData>(addProductInitialForm);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Sub-dialog states: Category
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name_uz: '',
    name_uz_cyrl: '',
    description_uz: '',
    description_uz_cyrl: '',
    image: '',
  });

  // Sub-dialog states: Unit
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitFormData, setUnitFormData] = useState<ProductUnitFormData>({
    measurement_uz: '',
    measurement_uz_cyrl: '',
  });

  // Load options when modal opens
  useEffect(() => {
    if (!open) return;
    const loadOptions = async () => {
      try {
        const [unitList, locationList] = await Promise.all([
          productUnitService.getAll(),
          productLocationService.getAll(),
        ]);
        setUnits(unitList);
        setLocations(locationList?.data || []);
      } catch (error) {
        handleError(error, { showToast: true, logData: 'Failed to load product form options' });
      }
    };
    void loadOptions();
  }, [open]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData(addProductInitialForm);
      setImageFiles([]);
      setImagePreviews([]);
    }
  }, [open]);

  // Set default unit to "dona" when units are loaded
  useEffect(() => {
    if (units.length > 0 && !formData.unit_measurement) {
      const dona = units.find(u => u.measurement_uz?.toLowerCase() === 'dona');
      if (dona) {
        setFormData(prev => ({ ...prev, unit_measurement: dona.id }));
      }
    }
  }, [units]);

  // Clean up previews on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((p) => {
        if (p.startsWith('blob:')) URL.revokeObjectURL(p);
      });
    };
  }, [imagePreviews]);

  const handleChange = (field: keyof ProductFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      name_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
      description_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    imagePreviews.forEach((p) => {
      if (p.startsWith('blob:')) URL.revokeObjectURL(p);
    });
    const previews = files.map((file) => URL.createObjectURL(file));
    setImageFiles(files);
    setImagePreviews(previews);
  };

  const handleRemoveImage = (index: number) => {
    const preview = imagePreviews[index];
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: ProductFormData = {
        ...formData,
        images: imageFiles,
      };
      await productService.create(payload);
      toast.success(t('products.productAdded'));
      onSuccess();
    } catch (error) {
      handleError(error, { showToast: true });
      toast.error(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  // Category sub-dialog handlers
  const handleOpenCategoryDialog = () => {
    setIsCategoryDialogOpen(true);
    setCategoryFormData({ name_uz: '', name_uz_cyrl: '', description_uz: '', description_uz_cyrl: '', image: '' });
  };

  const handleCategorySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setSavingCategory(true);
      const created = await categoryService.create(categoryFormData);
      toast.success(t('categories.categoryAdded'));
      await refreshCategories();
      handleChange('category', created.id);
      setIsCategoryDialogOpen(false);
    } catch (error) {
      handleError(error, { showToast: true });
      toast.error(t('errors.generic'));
    } finally {
      setSavingCategory(false);
    }
  };

  // Unit sub-dialog handlers
  const handleOpenUnitDialog = () => {
    setIsUnitDialogOpen(true);
    setUnitFormData({ measurement_uz: '', measurement_uz_cyrl: '' });
  };

  const handleUnitSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setSavingUnit(true);
      const created = await productUnitService.create(unitFormData);
      toast.success(t('products.unitAdded'));
      const unitList = await productUnitService.getAll();
      setUnits(unitList);
      handleChange('unit_measurement', created.id);
      setIsUnitDialogOpen(false);
    } catch (error) {
      handleError(error, { showToast: true });
      toast.error(t('errors.generic'));
    } finally {
      setSavingUnit(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-border/60 bg-card px-6 py-5">
            <DialogHeader className="p-0">
              <DialogTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {t('products.addProduct')}
              </DialogTitle>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-5">
              {/* ── Row 1: Name ── */}
              <div className="space-y-2">
                <Label htmlFor="add-name" className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('products.productName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-name"
                  placeholder="Tovar nomini kiriting..."
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              {/* ── Row 2: Category + Unit ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="add-category" className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('products.category')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={formData.category || ''}
                        onValueChange={(value) => handleChange('category', value)}
                      >
        <SelectTrigger id="add-category">
          <SelectValue placeholder={t('products.selectCategory')} />
        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {lang === 'cyrl' && cat.name_uz_cyrl ? cat.name_uz_cyrl : (cat.name_uz || cat.name)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleOpenCategoryDialog} className="shrink-0">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Unit of Measurement */}
                <div className="space-y-2">
                  <Label htmlFor="add-unit" className="flex items-center gap-1.5">
                    <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('products.unitMeasurement')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={formData.unit_measurement || ''}
                        onValueChange={(value) => handleChange('unit_measurement', value)}
                      >
                        <SelectTrigger id="add-unit">
                          <SelectValue placeholder={t('products.selectUnitMeasurement')} />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>{unit.measurement_uz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleOpenUnitDialog} className="shrink-0">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>


              {/* ── Row 4: Description ── */}
              <div className="space-y-2">
                <Label htmlFor="add-description" className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('common.description')}
                </Label>
                <textarea
                  id="add-description"
                  rows={3}
                  placeholder="Tovar tavsifini kiriting..."
                  value={formData.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="flex w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-min-stock" className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('products.minStock', 'Minimal qoldiq')}
                </Label>
                <Input
                  id="add-min-stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.min_stock === undefined ? '' : formData.min_stock}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    handleChange('min_stock', val === '' ? undefined : Number(val));
                  }}
                />
              </div>

              {/* ── Row 5: Location ── */}
              <div className="space-y-2">
                <Label htmlFor="add-location" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('products.productLocation', 'Tovar joylashuvi')}
                </Label>
                <Select
                  value={formData.location || ''}
                  onValueChange={(value) => handleChange('location', value)}
                >
                  <SelectTrigger id="add-location">
                    <SelectValue placeholder={t('products.selectLocation')} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.location_uz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Row 6: Images ── */}
              <div className="space-y-2">
                <Label htmlFor="add-image" className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('products.image', 'Rasm')}
                </Label>
                <div className="relative">
                  <label
                    htmlFor="add-image"
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 px-4 py-6 cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-primary/5',
                      imagePreviews.length > 0 && 'py-3'
                    )}
                  >
                    <Upload className="h-6 w-6 text-muted-foreground/50" />
                    <span className="text-sm text-muted-foreground">
                      {t('products.image', 'Rasm yuklash uchun bosing')}
                    </span>
                    <input
                      id="add-image"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </label>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={src}
                          alt={`Preview ${idx + 1}`}
                          className="h-20 w-20 rounded-lg object-cover border border-border/40"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          title={t('common.delete')}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-10 border-t border-border/60 bg-card px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('products.addProduct')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Category Sub-Dialog ── */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('categories.addCategory')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="modal_cat_name">{t('categories.categoryName')}</Label>
                <Input
                  id="modal_cat_name"
                  value={categoryFormData.name_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCategoryFormData((prev) => ({
                      ...prev,
                      name_uz: e.target.value,
                      name_uz_cyrl: latinToCyrillic(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal_cat_name_cyrl">{t('categories.categoryName')} (Cyrillic)</Label>
                <Input
                  id="modal_cat_name_cyrl"
                  value={categoryFormData.name_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCategoryFormData((prev) => ({ ...prev, name_uz_cyrl: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={savingCategory}>
                {savingCategory ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Unit Sub-Dialog ── */}
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('products.addUnit')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUnitSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="modal_unit_name">{t('products.unitName')}</Label>
                <Input
                  id="modal_unit_name"
                  value={unitFormData.measurement_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setUnitFormData((prev) => ({
                      ...prev,
                      measurement_uz: e.target.value,
                      measurement_uz_cyrl: latinToCyrillic(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal_unit_name_cyrl">{t('products.unitName')} (Cyrillic)</Label>
                <Input
                  id="modal_unit_name_cyrl"
                  value={unitFormData.measurement_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setUnitFormData((prev) => ({ ...prev, measurement_uz_cyrl: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={savingUnit}>
                {savingUnit ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProductListPage;
