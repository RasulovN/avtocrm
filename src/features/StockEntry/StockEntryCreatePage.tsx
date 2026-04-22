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
import type { Store, Supplier } from '../../types';
import { formatCurrency } from '../../utils';

interface InventoryFormItem {
  product_id: string;
  product_name: string;
  quantity: number | '';
  purchase_price: number | '';
  selling_price: number | '';
  total: number;
}

export function StockEntryCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id || '';
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);
  const { products: allProducts, loading: productsLoading } = useProducts();
  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeSuppliers = useMemo(() => (Array.isArray(suppliers) ? suppliers : []), [suppliers]);
  const safeProducts = useMemo(() => {
    if (productsLoading) return [];
    // Apply store filtering like SalesPage does
    const filtered = isAdmin ? allProducts : allProducts.filter((p) => p.store_id === userStoreId);
    console.log('[InventoryCreatePage] Filtered products:', {
      allProductsCount: allProducts.length,
      filteredCount: filtered.length,
      isAdmin,
      userStoreId,
      productsLoading,
    });
    return filtered;
  }, [allProducts, productsLoading, isAdmin, userStoreId]);

  const [supplierId, setSupplierId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [paid, setPaid] = useState<number | ''>('');
  const [items, setItems] = useState<InventoryFormItem[]>([
    { product_id: '', product_name: '', quantity: '', purchase_price: '', selling_price: '', total: 0 }
  ]);

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
        { id: '1', name: 'Main Store', is_warehouse: false, created_at: '' },
        { id: '2', name: 'Warehouse', is_warehouse: true, created_at: '' },
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

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      navigate('/inventory');
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
          { label: t('inventory.title'), href: '/inventory' },
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
                <Select value={storeId} onValueChange={setStoreId}>
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
                        {s.name} {s.type === 's' ? ' ( doʻkon )' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.paidAmount')}</Label>
                <Input
                  type="number"
                  value={paid}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPaid(e.target.value === '' ? '' : Number(e.target.value))}
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
                      <Label className="text-xs">{t('products.title')}</Label>
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
    </div>
  );
}
