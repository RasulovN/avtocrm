import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { inventoryService } from '../../services/inventoryService';
import { storeService } from '../../services/storeService';
import { supplierService } from '../../services/supplierService';
import { useAuthStore } from '../../app/store';
import { useProducts } from '../../context/ProductContext';
import type { Store, Supplier, ProductUnit, ProductFormData } from '../../types';
import { useCategories } from '../../context/CategoryContext';
import { productUnitService } from '../../services/productUnitService';
import { productService } from '../../services/productService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/Dialog';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils';

interface InventoryFormItem {
  product_id: string;
  product_name: string;
  quantity: number | '';
  purchase_price: number | '';
  selling_price: number | '';
  total: number;
}

export function StockEntryCreateDialog({
  open,
  onOpenChange,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();
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
    return isAdmin ? allProducts : allProducts.filter((p) => p.store_id === userStoreId);
  }, [allProducts, productsLoading, isAdmin, userStoreId]);

  const [supplierId, setSupplierId] = useState('');
  const [storeId, setStoreId] = useState(isAdmin ? '' : userStoreId);
  const [paid, setPaid] = useState<number | ''>('');
  const [paymentType, setPaymentType] = useState('cash'); // 'cash', 'card', 'debt'

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
    if (!newProductData.name || !newProductData.category || !newProductData.unit_measurement) {
      toast.error(t('errors.validationError', 'Barcha maydonlarni to\'ldiring'));
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
      await refreshProducts();

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

      setNewProductData({ name: '', category: '', unit_measurement: '', description: '' });
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
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadData();
      setSupplierId('');
      setStoreId(isAdmin ? '' : userStoreId);
      setPaid('');
      setPaymentType('cash');
      setItems([{ product_id: '', product_name: '', quantity: '', purchase_price: '', selling_price: '', total: 0 }]);
    }
  }, [open, loadData, isAdmin, userStoreId]);

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
  
  // If payment is debt, paid amount is 0 automatically
  const actualPaidAmount = paymentType === 'debt' ? 0 : (paid === '' ? 0 : paid);
  const debt = total - actualPaidAmount;

  useEffect(() => {
    if (paymentType !== 'debt' && paid !== '' && paid > total) {
      setPaid(total === 0 ? '' : total);
    }
  }, [total, paid, paymentType]);

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
        paid_amount: actualPaidAmount,
        // payment_type: paymentType // Send it if backend accepts it in the future
        ...( { payment_type: paymentType } as any )
      });
      toast.success(t('inventory.inventoryCreated', 'Kirim muvaffaqiyatli yaratildi'));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create inventory:', error);
      toast.error(t('errors.generic', 'Xatolik yuz berdi'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventory.createIncomingStock', 'Kirim yaratish')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{t('suppliers.title', 'Ta\'minotchi')}</Label>
                <Select value={supplierId} onValueChange={setSupplierId} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventory.selectSupplier', 'Tanlang')} />
                  </SelectTrigger>
                  <SelectContent>
                    {safeSuppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('stores.title', 'Do\'kon')}</Label>
                <Select value={storeId} onValueChange={setStoreId} disabled={!isAdmin} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventory.selectLocation', 'Tanlang')} />
                  </SelectTrigger>
                  <SelectContent>
                    {safeStores.map(s => (
                      <SelectItem key={s.id} value={s.id} disabled={s.type === 's'}>
                        {s.name} {s.type === 's' ? ' ( дўкон )' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('sales.paymentType', 'To\'lov turi')}</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('payment.cash', 'Naqd')}</SelectItem>
                    <SelectItem value="card">{t('payment.card', 'Karta')}</SelectItem>
                    <SelectItem value="debt">{t('payment.debt', 'Qarz')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.paidAmount', 'To\'langan summa')}</Label>
                <Input
                  type="number"
                  min="0"
                  max={total}
                  value={paymentType === 'debt' ? 0 : paid}
                  disabled={paymentType === 'debt'}
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
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{t('products.title', 'Mahsulotlar')}</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('inventory.addProduct', 'Qo\'shish')}
                </Button>
              </div>
              
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="rounded-lg border p-4 bg-muted/20 relative">
                    {items.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-2 h-8 w-8"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-2 lg:col-span-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{t('products.title', 'Mahsulot')}</Label>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveItemIndex(index);
                              setIsProductDialogOpen(true);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium"
                          >
                            <Plus className="h-3 w-3" />
                            {t('common.add', 'Yangi')}
                          </button>
                        </div>
                        <Select
                          value={item.product_id}
                          onValueChange={(v: string) => handleItemChange(index, 'product_id', v)}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('inventory.selectProduct', 'Tanlang')} />
                          </SelectTrigger>
                          <SelectContent>
                            {safeProducts.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t('inventory.quantity', 'Miqdor')}</Label>
                        <Input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t('inventory.purchasePrice', 'Xarid narxi')}</Label>
                        <Input
                          type="number"
                          min="0"
                          required
                          value={item.purchase_price}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'purchase_price', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t('products.sellingPrice', 'Sotuv narxi')}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.selling_price}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'selling_price', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <p className="text-lg font-bold">{t('common.total', 'Jami')}: {formatCurrency(total)}</p>
                <p className="text-sm font-medium text-red-500">{t('suppliers.debt', 'Qarz')}: {formatCurrency(debt)}</p>
              </div>
              <div className="mt-4 sm:mt-0 flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel', 'Bekor qilish')}
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t('common.loading', 'Yuklanmoqda...') : t('common.save', 'Saqlash')}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nested Product Dialog */}
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
                onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
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
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                  <option key={unit.id} value={unit.id}>{unit.measurement_uz}</option>
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
    </>
  );
}
