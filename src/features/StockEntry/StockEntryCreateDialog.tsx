import { useState, useEffect, useCallback, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save, Package, Upload, Image as ImageIcon, Tag, Layers, Ruler, DollarSign, AlignLeft, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { inventoryService } from '../../services/inventoryService';
import { storeService } from '../../services/storeService';
import { supplierService } from '../../services/supplierService';
import { useAuthStore } from '../../app/store';
import { useProducts } from '../../context/ProductContext';
import type { Store, Supplier, ProductUnit, ProductFormData, CategoryFormData, ProductUnitFormData } from '../../types';
import { useCategories } from '../../context/CategoryContext';
import { productUnitService } from '../../services/productUnitService';
import { productService } from '../../services/productService';
import { productLocationService, type ProductLocation } from '../../services/productLocationService';
import { categoryService } from '../../services/categoryService';
import { latinToCyrillic } from '../../utils/transliteration';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/Dialog';
import toast from 'react-hot-toast';
import { formatCurrency, cn } from '../../utils';

interface InventoryFormItem {
  product_id: string;
  product_name: string;
  quantity: number | '';
  purchase_price: number | '';
  selling_price: number | '';
  wholesale_price: number | '';
  total: number;
}

interface ItemErrors {
  product_id?: boolean;
  quantity?: boolean;
  purchase_price?: boolean;
  selling_price?: boolean;
  wholesale_price?: boolean;
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
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
  const userStoreId = user?.store_id || (user?.stores && user.stores.length > 0 ? String(user.stores.find(s => s.type === 'b')?.id || user.stores[0].id) : '');

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
  const [cashAmount, setCashAmount] = useState<number | ''>('');
  const [cardAmount, setCardAmount] = useState<number | ''>('');
  const [supplierError, setSupplierError] = useState(false);
  const [itemErrors, setItemErrors] = useState<ItemErrors[]>([]);

  useEffect(() => {
    if (!isAdmin && userStoreId) {
      setStoreId(userStoreId);
    }
  }, [isAdmin, userStoreId]);

  const [items, setItems] = useState<InventoryFormItem[]>([
    { product_id: '', product_name: '', quantity: '', purchase_price: '', selling_price: '', wholesale_price: '', total: 0 }
  ]);

  // Product Dialog States
  const { categories, refreshCategories } = useCategories();
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [newProductData, setNewProductData] = useState<ProductFormData>({
    name: '',
    name_uz_cyrl: '',
    category: '',
    unit_measurement: '',
    description: '',
    description_uz_cyrl: '',
    purchase_price: '',
    selling_price: '',
    location: '',
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Category & Unit Dialog states inside Stock Entry
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name_uz: '',
    name_uz_cyrl: '',
    description_uz: '',
    description_uz_cyrl: '',
    image: '',
  });

  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitFormData, setUnitFormData] = useState<ProductUnitFormData>({
    measurement_uz: '',
    measurement_uz_cyrl: '',
  });

  const loadDialogData = useCallback(async () => {
    try {
      const [unitsRes, locationsRes] = await Promise.all([
        productUnitService.getAll(),
        productLocationService.getAll()
      ]);
      setUnits(unitsRes || []);
      setLocations(locationsRes?.data || []);
    } catch (err) {
      console.error('Failed to load dialog reference data', err);
    }
  }, []);

  useEffect(() => {
    if (isProductDialogOpen) {
      void loadDialogData();
    }
  }, [isProductDialogOpen, loadDialogData]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [imagePreviews]);

  const handleProductSubmit = async () => {
    if (!newProductData.name || !newProductData.category || !newProductData.unit_measurement) {
      toast.error(t('errors.validationError', 'Barcha majdonlarni to\'ldiring'));
      return;
    }

    try {
      setProductSaving(true);
      const payload: ProductFormData = {
        ...newProductData,
        images: imageFiles,
        store_id: userStoreId || storeId || undefined,
      };

      const createdProduct = await productService.create(payload);
      toast.success(t('products.productAdded', 'Mahsulot muvaffaqiyatli qo\'shildi'));
      await refreshProducts();

      if (activeItemIndex !== null) {
        const newItems = [...items];
        const purchasePrice = createdProduct.purchase_price !== null && createdProduct.purchase_price !== undefined ? Number(createdProduct.purchase_price) : Number(newProductData.purchase_price);
        const sellingPrice = createdProduct.selling_price !== null && createdProduct.selling_price !== undefined ? Number(createdProduct.selling_price) : Number(newProductData.selling_price);
        newItems[activeItemIndex] = {
          ...newItems[activeItemIndex],
          product_id: String(createdProduct.id),
          product_name: createdProduct.name,
          purchase_price: purchasePrice,
          selling_price: sellingPrice,
          total: purchasePrice * (newItems[activeItemIndex].quantity || 0),
        };
        setItems(newItems);
      }

      setNewProductData({
        name: '',
        name_uz_cyrl: '',
        category: '',
        unit_measurement: '',
        description: '',
        description_uz_cyrl: '',
        purchase_price: '',
        selling_price: '',
        location: '',
      });
      setImageFiles([]);
      setImagePreviews([]);
      setIsProductDialogOpen(false);
      setActiveItemIndex(null);
    } catch (error) {
      console.error('Failed to create product:', error);
      toast.error(t('errors.generic', 'Mahsulot qo\'shishda xatolik yuz berdi'));
    } finally {
      setProductSaving(false);
    }
  };

  const handleCategorySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setSavingCategory(true);
      const created = await categoryService.create(categoryFormData);
      toast.success(t('categories.categoryAdded', 'Kategoriya muvaffaqiyatli qo\'shildi'));
      await refreshCategories();
      setNewProductData((prev) => ({ ...prev, category: created.id }));
      setIsCategoryDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error(t('errors.generic', 'Xatolik yuz berdi'));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUnitSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setSavingUnit(true);
      const created = await productUnitService.create(unitFormData);
      toast.success(t('products.unitAdded', 'O\'lchov birligi muvaffaqiyatli qo\'shildi'));
      const unitList = await productUnitService.getAll();
      setUnits(unitList);
      setNewProductData((prev) => ({ ...prev, unit_measurement: created.id }));
      setIsUnitDialogOpen(false);
    } catch (error) {
      console.error('Failed to save unit:', error);
      toast.error(t('errors.generic', 'Xatolik yuz berdi'));
    } finally {
      setSavingUnit(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [storesRes, suppliersRes] = await Promise.all([
        storeService.getAll(),
        supplierService.getAll(),
      ]);
      const storesData = Array.isArray(storesRes.data) ? storesRes.data : [];
      setStores(storesData);
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
      setCashAmount('');
      setCardAmount('');
      setSupplierError(false);
      setItemErrors([]);
      setItems([{ product_id: '', product_name: '', quantity: '', purchase_price: '', selling_price: '', wholesale_price: '', total: 0 }]);
    }
  }, [open]);

  // Set default store to "Avtoyon" when stores load
  useEffect(() => {
    if (open && isAdmin && stores.length > 0 && !storeId) {
      const avtoyon = stores.find(s => s.name?.toLowerCase().includes('avtoyon'));
      if (avtoyon) setStoreId(avtoyon.id);
    }
  }, [open, isAdmin, stores, storeId]);

  const handleItemChange = (index: number, field: keyof InventoryFormItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const product = safeProducts.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value as string,
          product_name: product.name,
          purchase_price: product.purchase_price !== null && product.purchase_price !== undefined ? Number(product.purchase_price) : 0,
          selling_price: product.selling_price !== null && product.selling_price !== undefined ? Number(product.selling_price) : 0,
          total: (product.purchase_price !== null && product.purchase_price !== undefined ? Number(product.purchase_price) : 0) * (newItems[index].quantity || 0),
        };
      }
    } else if (field === 'quantity') {
      const qty = value === '' ? '' : Number(value);
      newItems[index] = {
        ...newItems[index],
        quantity: qty,
        total: ((newItems[index].purchase_price || 0) as number) * (qty as number || 0),
      };
    } else if (field === 'purchase_price') {
      const price = value === '' ? '' : Number(value);
      newItems[index] = {
        ...newItems[index],
        purchase_price: price,
        total: (price || 0) * (newItems[index].quantity || 0),
      };
    } else if (field === 'selling_price') {
      newItems[index] = {
        ...newItems[index],
        selling_price: value === '' ? '' : Number(value),
      };
    } else if (field === 'wholesale_price') {
      newItems[index] = {
        ...newItems[index],
        wholesale_price: value === '' ? '' : Number(value),
      };
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: '', purchase_price: '', selling_price: '', wholesale_price: '', total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => {
    const qty = item.quantity === '' ? 0 : item.quantity;
    const price = item.purchase_price === '' ? 0 : item.purchase_price;
    return sum + (qty as number) * (price as number);
  }, 0);

  const totalPaid = (cashAmount === '' ? 0 : cashAmount) + (cardAmount === '' ? 0 : cardAmount);
  const debt = Math.max(0, total - totalPaid);

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;

    // Validation
    let hasError = false;
    const newSupplierError = !supplierId;
    if (newSupplierError) hasError = true;
    setSupplierError(newSupplierError);

    const newItemErrors: ItemErrors[] = items.map(item => {
      const errors: ItemErrors = {
        product_id: !item.product_id,
        quantity: item.quantity === '' || Number(item.quantity) <= 0,
        purchase_price: item.purchase_price === '' || Number(item.purchase_price) <= 0,
        selling_price: item.selling_price === '' || Number(item.selling_price) <= 0,
        wholesale_price: item.wholesale_price === '' || Number(item.wholesale_price) <= 0,
      };
      if (errors.product_id || errors.quantity || errors.purchase_price || errors.selling_price || errors.wholesale_price) {
        hasError = true;
      }
      return errors;
    });
    setItemErrors(newItemErrors);

    if (hasError) {
      toast.error(t('errors.validationError', 'Barcha majburiy maydonlarni to\'ldiring'));
      return;
    }

    try {
      setSaving(true);
      await inventoryService.create({
        supplier: Number(supplierId),
        store: Number(storeId),
        cash_amount: (cashAmount === '' ? 0 : cashAmount).toFixed(2),
        card_amount: (cardAmount === '' ? 0 : cardAmount).toFixed(2),
        items: items.map(item => ({
          product: Number(item.product_id),
          quantity: item.quantity === '' ? 0 : item.quantity,
          purchase_price: (item.purchase_price === '' ? '0' : String(Number(item.purchase_price).toFixed(2))),
          selling_price: (item.selling_price === '' ? '0' : String(Number(item.selling_price).toFixed(2))),
          wholesale_price: (item.wholesale_price === '' ? '0.00' : String(Number(item.wholesale_price).toFixed(2))),
        })),
      });
      toast.success(t('inventory.inventoryCreated', 'Kirim muvaffaqiyatli yaratildi'));
      try {
        await refreshProducts();
      } catch (err) {
        console.error('Failed to refresh products after stock entry:', err);
      }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={supplierError ? 'text-red-500' : ''}>{t('suppliers.title', 'Ta\'minotchi')}</Label>
                <Select value={supplierId} onValueChange={(v) => { setSupplierId(v); setSupplierError(false); }} required>
                  <SelectTrigger className={supplierError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}>
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
                    {safeStores
                      .filter(s => isAdmin || String(s.id) === String(userStoreId))
                      .map(s => (
                        <SelectItem key={s.id} value={s.id} disabled={s.type === 's'}>
                          {s.name} {s.type === 's' ? ' ( дўкон )' : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
                          onValueChange={(v: string) => {
                            handleItemChange(index, 'product_id', v);
                            setItemErrors(prev => {
                              const next = [...prev];
                              if (next[index]) next[index] = { ...next[index], product_id: false };
                              return next;
                            });
                          }}
                          required
                        >
                          <SelectTrigger className={itemErrors[index]?.product_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}>
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
                        <Label className={cn('text-xs', itemErrors[index]?.quantity && 'text-red-500')}>{t('inventory.quantity', 'Miqdor')}</Label>
                        <Input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          className={itemErrors[index]?.quantity ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            handleItemChange(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value));
                            setItemErrors(prev => {
                              const next = [...prev];
                              if (next[index]) next[index] = { ...next[index], quantity: false };
                              return next;
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className={cn('text-xs', itemErrors[index]?.purchase_price && 'text-red-500')}>{t('inventory.purchasePrice', 'Xarid narxi')}</Label>
                        <Input
                          type="number"
                          min="0"
                          required
                          value={item.purchase_price}
                          className={itemErrors[index]?.purchase_price ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            handleItemChange(index, 'purchase_price', e.target.value === '' ? '' : Number(e.target.value));
                            setItemErrors(prev => {
                              const next = [...prev];
                              if (next[index]) next[index] = { ...next[index], purchase_price: false };
                              return next;
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className={cn('text-xs', itemErrors[index]?.selling_price && 'text-red-500')}>{t('products.sellingPrice', 'Sotuv narxi')}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.selling_price}
                          className={itemErrors[index]?.selling_price ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            handleItemChange(index, 'selling_price', e.target.value === '' ? '' : Number(e.target.value));
                            setItemErrors(prev => {
                              const next = [...prev];
                              if (next[index]) next[index] = { ...next[index], selling_price: false };
                              return next;
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className={cn('text-xs', itemErrors[index]?.wholesale_price && 'text-red-500')}>Ulgurji narx</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.wholesale_price}
                          className={itemErrors[index]?.wholesale_price ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            handleItemChange(index, 'wholesale_price', e.target.value === '' ? '' : Number(e.target.value));
                            setItemErrors(prev => {
                              const next = [...prev];
                              if (next[index]) next[index] = { ...next[index], wholesale_price: false };
                              return next;
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Naqt va Karta to'lov */}
            <div className="rounded-lg border p-4 bg-muted/10 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                {t('payment.title', 'To\'lov')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    {t('payment.cash', 'Naqt')}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setCashAmount(val);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    {t('payment.card', 'Karta')}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={cardAmount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setCardAmount(val);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <p className="text-lg font-bold">{t('common.total', 'Jami')}: {formatCurrency(total)}</p>
                <p className="text-sm text-muted-foreground">
                  {t('payment.cash', 'Naqt')}: {formatCurrency(cashAmount === '' ? 0 : cashAmount)} |
                  {t('payment.card', 'Karta')}: {formatCurrency(cardAmount === '' ? 0 : cardAmount)}
                </p>
                {debt > 0 ? (
                  <p className="text-sm font-medium text-red-500">{t('suppliers.debt', 'Qarz')}: {formatCurrency(debt)}</p>
                ) : (
                  <p className="text-sm font-medium text-green-600">{t('common.paid', 'To\'langan')}</p>
                )}
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
        <DialogContent size="lg" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Package className="h-6 w-6 text-primary" />
              {t('products.addProduct', 'Mahsulot qo\'shish')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Mahsulot nomi */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {t('products.name', 'Mahsulot nomi')} <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={t('placeholders.enterProductName', 'Tovar nomini kiriting...')}
                value={newProductData.name}
                onChange={(e) => setNewProductData({
                  ...newProductData,
                  name: e.target.value,
                  name_uz_cyrl: latinToCyrillic(e.target.value)
                })}
                required
              />
            </div>

            {/* Kategoriya & O'lchov birligi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  {t('categories.title', 'Kategoriya')}
                </Label>
                <div className="flex gap-2">
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={newProductData.category}
                    onChange={(e) => setNewProductData({ ...newProductData, category: e.target.value })}
                  >
                    <option value="">{t('categories.selectCategory', 'Kategoriyani tanlang')}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setIsCategoryDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  {t('products.unit', 'O\'lchov birligi')}
                </Label>
                <div className="flex gap-2">
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={newProductData.unit_measurement}
                    onChange={(e) => setNewProductData({ ...newProductData, unit_measurement: e.target.value })}
                  >
                    <option value="">{t('products.selectUnit', 'O\'lchov birligini tanlang')}</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.measurement_uz}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setIsUnitDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>



            {/* Tavsif */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                {t('products.description', 'Tavsif')}
              </Label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('placeholders.enterProductDescription', 'Tovar tavsifini kiriting...')}
                value={newProductData.description}
                onChange={(e) => setNewProductData({
                  ...newProductData,
                  description: e.target.value,
                  description_uz_cyrl: latinToCyrillic(e.target.value)
                })}
              />
            </div>

            {/* Mahsulot joylashuvi */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {t('products.location', 'Mahsulot joylashuvi')}
              </Label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={newProductData.location}
                onChange={(e) => setNewProductData({ ...newProductData, location: e.target.value })}
              >
                <option value="">{t('products.selectLocation', 'Joylashuvni tanlang')}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.location_uz}</option>
                ))}
              </select>
            </div>

            {/* Rasm */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                {t('products.image', 'Rasm')}
              </Label>
              <div className="relative border border-dashed border-border rounded-xl p-4 hover:bg-muted/30 transition-colors cursor-pointer bg-muted/10">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    imagePreviews.forEach((preview) => {
                      if (preview.startsWith('blob:')) {
                        URL.revokeObjectURL(preview);
                      }
                    });
                    const previews = files.map((file) => URL.createObjectURL(file));
                    setImageFiles(files);
                    setImagePreviews(previews);
                  }}
                />
                {imagePreviews.length > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={imagePreviews[0]}
                      alt="Preview"
                      className="h-24 w-auto rounded-lg object-contain border border-border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFiles([]);
                        setImagePreviews([]);
                      }}
                    >
                      {t('common.delete', 'Rasm o\'chirish')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground/60" />
                    <span className="text-sm font-medium">{t('products.uploadImage', 'Rasm')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button onClick={handleProductSubmit} disabled={productSaving}>
              {productSaving ? t('common.loading', 'Yuklanmoqda...') : `+ ${t('products.addProduct', 'Mahsulot qo\'shish')}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Category Dialog inside Stock Entry */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('categories.addCategory', 'Kategoriya qo\'shish')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat_name">{t('categories.categoryName', 'Kategoriya nomi')}</Label>
                <Input
                  id="cat_name"
                  value={categoryFormData.name_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCategoryFormData({
                    ...categoryFormData,
                    name_uz: e.target.value,
                    name_uz_cyrl: latinToCyrillic(e.target.value)
                  })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_name_cyrl">{t('categories.categoryName', 'Kategoriya nomi')} (Cyrillic)</Label>
                <Input
                  id="cat_name_cyrl"
                  value={categoryFormData.name_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCategoryFormData((prev) => ({ ...prev, name_uz_cyrl: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_description">{t('common.description', 'Tavsif')}</Label>
                <Input
                  id="cat_description"
                  value={categoryFormData.description_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCategoryFormData({
                    ...categoryFormData,
                    description_uz: e.target.value,
                    description_uz_cyrl: latinToCyrillic(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_description_cyrl">{t('common.description', 'Tavsif')} (Cyrillic)</Label>
                <Input
                  id="cat_description_cyrl"
                  value={categoryFormData.description_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCategoryFormData((prev) => ({ ...prev, description_uz_cyrl: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                {t('common.cancel', 'Bekor qilish')}
              </Button>
              <Button type="submit" disabled={savingCategory}>
                {savingCategory ? t('common.loading', 'Yuklanmoqda...') : t('common.save', 'Saqlash')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nested Unit Dialog inside Stock Entry */}
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('products.addUnit', 'O\'lchov birligi qo\'shish')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUnitSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="unit_name">{t('products.unitName', 'Birlik nomi')}</Label>
                <Input
                  id="unit_name"
                  value={unitFormData.measurement_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setUnitFormData({
                    ...unitFormData,
                    measurement_uz: e.target.value,
                    measurement_uz_cyrl: latinToCyrillic(e.target.value)
                  })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_name_cyrl">{t('products.unitName', 'Birlik nomi')} (Cyrillic)</Label>
                <Input
                  id="unit_name_cyrl"
                  value={unitFormData.measurement_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setUnitFormData((prev) => ({ ...prev, measurement_uz_cyrl: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
                {t('common.cancel', 'Bekor qilish')}
              </Button>
              <Button type="submit" disabled={savingUnit}>
                {savingUnit ? t('common.loading', 'Yuklanmoqda...') : t('common.save', 'Saqlash')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
