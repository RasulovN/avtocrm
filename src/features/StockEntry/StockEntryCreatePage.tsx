import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { inventoryService } from '../../services/inventoryService';
import { storeService } from '../../services/storeService';
import { supplierService } from '../../services/supplierService';
import { useAuthStore } from '../../app/store';
import { useProducts } from '../../context/ProductContext';
import type { Store, Supplier, ProductUnit, ProductFormData, Product } from '../../types';
import { useCategories } from '../../context/CategoryContext';
import { productUnitService } from '../../services/productUnitService';
import { productLocationService, type ProductLocation } from '../../services/productLocationService';
import { productService } from '../../services/productService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/Dialog';
import toast from 'react-hot-toast';
import { latinToCyrillic } from '../../utils/transliteration';
import { formatCurrency } from '../../utils';
import { logger } from '../../utils/logger';

interface InventoryFormItem {
  product_id: string;
  product_name: string;
  quantity: number | '';
  purchase_price: number | '';
  selling_price: number | '';
  total: number;
}

export function StockEntryCreatePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'uz';
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id || (user?.stores && user.stores.length > 0 ? String(user.stores[0].id) : '');
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);
  const { products: allProducts, loading: productsLoading, refreshProducts } = useProducts();
  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeSuppliers = useMemo(() => (Array.isArray(suppliers) ? suppliers : []), [suppliers]);
  const safeProducts = useMemo(() => {
    if (productsLoading) return [];
    // Apply store filtering like SalesPage does
    const filtered = isAdmin ? allProducts : allProducts.filter((p) => p.store_id === userStoreId);
    logger.info('[InventoryCreatePage] Filtered products:', {
      allProductsCount: allProducts.length,
      filteredCount: filtered.length,
      isAdmin,
      userStoreId,
      productsLoading,
    });
    return filtered;
  }, [allProducts, productsLoading, isAdmin, userStoreId]);

  const [supplierId, setSupplierId] = useState('');
  const [storeId, setStoreId] = useState(isAdmin ? '' : userStoreId);
  const [paid, setPaid] = useState<number | ''>('');

  useEffect(() => {
    if (!isAdmin && userStoreId) {
      setStoreId(userStoreId);
    }
  }, [isAdmin, userStoreId]);

  const [items, setItems] = useState<InventoryFormItem[]>([
    { product_id: '', product_name: '', quantity: '', purchase_price: '', selling_price: '', total: 0 }
  ]);

  // Product Dialog States
  const { categories } = useCategories();
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [newProductData, setNewProductData] = useState<ProductFormData>({
    name: '',
    category: '',
    unit_measurement: '',
    description: '',
  });

  const loadDialogData = useCallback(async () => {
    try {
      const unitsRes = await productUnitService.getAll();
      setUnits(unitsRes || []);
    } catch (err) {
      console.error('Failed to load unit data', err);
    }
  }, []);

  useEffect(() => {
    if (isProductDialogOpen) {
      void loadDialogData();
    }
  }, [isProductDialogOpen, loadDialogData]);

  const handleProductSubmit = async () => {
    if (!newProductData.name) {
      toast.error(t('errors.validationError', 'Mahsulot nomini kiriting'));
      return;
    }
    if (!newProductData.category) {
      toast.error(t('errors.validationError', 'Kategoriyani tanlang'));
      return;
    }
    if (!newProductData.unit_measurement) {
      toast.error(t('errors.validationError', 'O\'lchov birligini tanlang'));
      return;
    }

    try {
      setProductSaving(true);
      const payload: ProductFormData = {
        ...newProductData,
        store_id: userStoreId || storeId || undefined,
      };

      const createdProduct = await productService.create(payload);
      toast.success(t('products.productAdded', 'Mahsulot muvaffaqiyatli qo\'shildi'));

      // Refresh global products list
      await refreshProducts();

      // Auto-populate the selected item row
      if (activeItemIndex !== null) {
        const newItems = [...items];
        newItems[activeItemIndex] = {
          ...newItems[activeItemIndex],
          product_id: String(createdProduct.id),
          product_name: createdProduct.name,
          purchase_price: createdProduct.purchase_price ?? '',
          selling_price: createdProduct.selling_price ?? '',
          total: (createdProduct.purchase_price || 0) * (newItems[activeItemIndex].quantity || 0),
        };
        setItems(newItems);
      }

      // Reset form and close dialog
      setNewProductData({
        name: '',
        category: '',
        unit_measurement: '',
        description: '',
      });
      setIsProductDialogOpen(false);
      setActiveItemIndex(null);
    } catch (error) {
      console.error('Failed to create product:', error);
      toast.error(t('errors.generic', 'Mahsulot qo\'shishda xatolik yuz berdi'));
    } finally {
      setProductSaving(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [storesRes, suppliersRes] = await Promise.all([
        storeService.getAll(),
        supplierService.getAll(),
      ]);
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load data:', error);
      setStores([
        { id: '1', name: 'Асосий дўкон', is_warehouse: false, created_at: '' },
        { id: '2', name: 'Омбор', is_warehouse: true, created_at: '' },
      ]);
      setSuppliers([
        { id: '1', name: 'AutoParts Co', debt: 0, created_at: '' },
      ]);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleItemChange = (index: number, field: keyof InventoryFormItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const product = safeProducts.find(p => p.id === value);
      if (product) {
        const purchasePrice = product.purchase_price ?? '';
        const sellingPrice = product.selling_price ?? '';
        newItems[index] = {
          ...newItems[index],
          product_id: value as string,
          product_name: product.name,
          purchase_price: purchasePrice,
          selling_price: sellingPrice,
          total: (purchasePrice || 0) * (newItems[index].quantity || 0),
        };
      }
    } else if (field === 'quantity') {
      const qty = value === '' ? '' : Number(value);
      newItems[index] = {
        ...newItems[index],
        quantity: qty,
        total: ((newItems[index].purchase_price || 0) as number) * (qty as number),
      };
    } else if (field === 'purchase_price') {
      const price = value === '' ? '' : Number(value);
      newItems[index] = {
        ...newItems[index],
        purchase_price: price,
        total: (price as number) * (newItems[index].quantity || 0),
      };
    } else if (field === 'selling_price') {
      newItems[index] = {
        ...newItems[index],
        selling_price: value === '' ? '' : Number(value),
      };
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: '', purchase_price: '', selling_price: '', total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => {
    const qty = item.quantity === '' ? 0 : item.quantity;
    const price = item.purchase_price === '' ? 0 : item.purchase_price;
    return sum + (qty as number) * (price as number);
  }, 0);
  const paidAmount = paid === '' ? 0 : paid;
  const debt = total - paidAmount;

  useEffect(() => {
    if (paid !== '' && paid > total) {
      setPaid(total === 0 ? '' : total);
    }
  }, [total, paid]);

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      await inventoryService.create({
        supplier: supplierId,
        store: storeId,
        items: items.map(item => ({
          product: item.product_id,
          quantity: item.quantity === '' ? 0 : item.quantity,
          purchase_price: (item.purchase_price === '' ? '0' : String(item.purchase_price)),
          selling_price: (item.selling_price === '' ? '0' : String(item.selling_price)),
        })),
        paid_amount: paid === '' ? 0 : paid,
      });
      navigate(`/${lang}/stockentry`);
    } catch (error) {
      console.error('Failed to create inventory:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.createIncomingStock')}
        description={t('inventory.addFromSupplier')}
        breadcrumbs={[
          { label: t('nav.stockentry'), href: `/${lang}/stockentry` },
          { label: t('common.create') },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('suppliers.title')}</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventory.selectSupplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {safeSuppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('stores.title')}</Label>
                <Select value={storeId} onValueChange={setStoreId} disabled={!isAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventory.selectLocation')} />
                  </SelectTrigger>
                  <SelectContent>
                    {safeStores.map(s => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        disabled={s.type === 's'}
                      >
                        {s.name} {s.type === 's' ? ' ( дўкон )' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.paidAmount')}</Label>
                <Input
                  type="number"
                  min="0"
                  max={total}
                  value={paid}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    if (val !== '' && val > total) {
                      setPaid(total);
                    } else {
                      setPaid(val);
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('products.title')}</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('inventory.addProduct')}</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{t('products.title')}</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveItemIndex(index);
                            setIsProductDialogOpen(true);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium"
                        >
                          <Plus className="h-3 w-3" />
                          {t('common.add', 'Qo\'shish')}
                        </button>
                      </div>
                      <Select
                        value={item.product_id}
                        onValueChange={(v: string) => handleItemChange(index, 'product_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('inventory.selectProduct')} />
                        </SelectTrigger>
                        <SelectContent>
                          {safeProducts.length === 0 && !productsLoading && (
                            <div className="p-2 text-xs text-muted-foreground">
                              {t('common.noData')}
                            </div>
                          )}
                          {productsLoading && (
                            <div className="p-2 text-xs text-muted-foreground">
                              {t('common.loading')}...
                            </div>
                          )}
                          {safeProducts.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('inventory.quantity')}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('inventory.purchasePrice')}</Label>
                      <Input
                        type="number"
                        value={item.purchase_price}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'purchase_price', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('products.sellingPrice')}</Label>
                      <Input
                        type="number"
                        value={item.selling_price}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'selling_price', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">{t('common.total')}: </span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-lg font-medium">{t('common.total')}: {formatCurrency(total)}</p>
                <p className="text-sm text-muted-foreground">{t('suppliers.debt')}: {formatCurrency(debt)}</p>
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? t('common.loading') : t('inventory.createIncomingStock')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{t('products.addProduct', 'Yangi mahsulot qo\'shish')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('products.name', 'Mahsulot nomi')}</Label>
              <Input
                value={newProductData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewProductData({
                    ...newProductData,
                    name: val,
                  });
                }}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('categories.title', 'Kategoriya')}</Label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newProductData.category}
                onChange={(e) => setNewProductData({ ...newProductData, category: e.target.value })}
              >
                <option value="">{t('categories.selectCategory', 'Kategoriyani tanlang')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>{t('products.unit', 'O\'lchov birligi')}</Label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newProductData.unit_measurement}
                onChange={(e) => setNewProductData({ ...newProductData, unit_measurement: e.target.value })}
              >
                <option value="">{t('products.selectUnit', 'O\'lchov birligini tanlang')}</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.measurement_uz}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>{t('products.description', 'Tavsif')}</Label>
              <Input
                value={newProductData.description || ''}
                onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleProductSubmit} disabled={productSaving}>
              {productSaving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
