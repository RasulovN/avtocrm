import { useState, useEffect, useMemo, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Plus, X } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent, CardFooter } from '../../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/Select';
import { transferService } from '../../../services/transferService';
import { storeService } from '../../../services/storeService';
import { useProducts } from '../../../context/ProductContext';
import type { Store } from '../../../types';

interface TransferItemForm {
  product: string;
  quantity: number;
}

export function TransferCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState(false);
  const { products: allProducts, loading: productsLoading } = useProducts();
  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeProducts = useMemo(() => {
    if (productsLoading) return [];
    return allProducts;
  }, [allProducts, productsLoading]);

  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [items, setItems] = useState<TransferItemForm[]>([]);

  const loadData = useCallback(async () => {
    try {
      const storesRes = await storeService.getAll();
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validItems = items.filter(item => item.product && item.quantity > 0);
    if (validItems.length === 0) return;
    try {
      setSaving(true);
      await transferService.create({
        from_store: fromStoreId,
        to_store: toStoreId,
        items: validItems,
      });
      navigate('/transfers');
    } catch (error) {
      console.error('Failed to create transfer:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('transfers.createTransfer')}
        description={t('transfers.title')}
        breadcrumbs={[
          { label: t('nav.transfers'), href: '/transfers' },
          { label: t('common.add') },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card className='border-none'>
            <CardContent className='p-0'>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('transfers.fromStore')}</Label>
                  <Select value={fromStoreId} onValueChange={setFromStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('transfers.selectProduct')} />
                    </SelectTrigger>
                    <SelectContent>
                      {safeStores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('transfers.toStore')}</Label>
                  <Select value={toStoreId} onValueChange={setToStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('transfers.selectProduct')} />
                    </SelectTrigger>
                    <SelectContent>
                      {safeStores.filter(s => s.id !== fromStoreId).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 mt-4 border p-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label>{t('products.title')}</Label>
                  </div>
                  <div className="w-24">
                    <Label>{t('products.quantity')}</Label>
                  </div>
                  <div className="w-10"></div>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select 
                        value={item.product} 
                        onValueChange={(value) => {
                          const newItems = [...items];
                          newItems[index].product = value;
                          setItems(newItems);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('transfers.selectProduct')} />
                        </SelectTrigger>
                        <SelectContent>
                          {safeProducts.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const newItems = [...items];
                          const val = e.target.value;
                          newItems[index].quantity = val === '' ? 0 : Number(val);
                          setItems(newItems);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems([...items, { product: '', quantity: 1 }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('common.add')}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={saving || !fromStoreId || !toStoreId || items.length === 0}>
                <ArrowRight className="h-4 w-4 mr-2" />
                {saving ? t('common.loading') : t('transfers.createTransfer')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
