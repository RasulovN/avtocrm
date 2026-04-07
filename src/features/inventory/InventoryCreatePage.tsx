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
import { productService } from '../../services/productService';
import type { Store, Supplier, Product } from '../../types';
import { formatCurrency } from '../../utils';

interface InventoryFormItem {
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  total: number;
}

export function InventoryCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeSuppliers = useMemo(() => (Array.isArray(suppliers) ? suppliers : []), [suppliers]);
  const safeProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  const [supplierId, setSupplierId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [paid, setPaid] = useState(0);
  const [items, setItems] = useState<InventoryFormItem[]>([
    { product_id: '', product_name: '', quantity: 1, purchase_price: 0, total: 0 }
  ]);

  const loadData = useCallback(async () => {
    try {
      const [storesRes, suppliersRes, productsRes] = await Promise.all([
        storeService.getAll(),
        supplierService.getAll(),
        productService.getAll({ limit: 100 }),
      ]);
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setStores([
        { id: '1', name: 'Main Store', is_warehouse: false, created_at: '' },
        { id: '2', name: 'Warehouse', is_warehouse: true, created_at: '' },
      ]);
      setSuppliers([
        { id: '1', name: 'AutoParts Co', debt: 0, created_at: '' },
      ]);
      setProducts([
        { id: '1', name: 'Oil Filter', purchase_price: 15000, selling_price: 25000, category: 'Filters', supplier_id: '1', store_id: '1', sku: 'SKU-001', description: '', quantity: 0, created_at: '', updated_at: '' },
        { id: '2', name: 'Brake Pads', purchase_price: 45000, selling_price: 75000, category: 'Brakes', supplier_id: '1', store_id: '1', sku: 'SKU-002', description: '', quantity: 0, created_at: '', updated_at: '' },
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
        newItems[index] = {
          ...newItems[index],
          product_id: value as string,
          product_name: product.name,
          purchase_price: product.purchase_price,
          total: product.purchase_price * newItems[index].quantity,
        };
      }
    } else if (field === 'quantity') {
      newItems[index] = {
        ...newItems[index],
        quantity: value as number,
        total: (newItems[index].purchase_price || 0) * (value as number),
      };
    } else if (field === 'purchase_price') {
      newItems[index] = {
        ...newItems[index],
        purchase_price: value as number,
        total: (value as number) * newItems[index].quantity,
      };
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1, purchase_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.total, 0);
  const debt = total - paid;

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSaving(true);
      await inventoryService.create({
        supplier_id: supplierId,
        store_id: storeId,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          total: item.total,
        })),
        paid,
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
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.paidAmount')}</Label>
                <Input
                  type="number"
                  value={paid}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPaid(Number(e.target.value))}
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
                        {safeProducts.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">{t('inventory.quantity')}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('inventory.purchasePrice')}</Label>
                      <Input
                        type="number"
                        value={item.purchase_price}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'purchase_price', Number(e.target.value))}
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
