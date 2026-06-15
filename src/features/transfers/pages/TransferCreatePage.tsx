import { useState, useEffect, useMemo, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent, CardFooter } from '../../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/Select';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { transferService } from '../../../services/transferService';
import { storeService } from '../../../services/storeService';
import { useProducts } from '../../../context/ProductContext';
import { useAuthStore } from '../../../app/store';
import type { Store } from '../../../types';

interface TransferItemForm {
  product: string;
  quantity: number;
  availableQuantity?: number;
}

export function TransferCreatePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'uz';
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState(false);
  const { products: allProducts, loading: productsLoading } = useProducts();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
  const userStoreId = user?.store_id || (user?.stores && user.stores.length > 0 ? String(user.stores.find(s => s.type === 'b')?.id || user.stores[0].id) : '');

  const [fromStoreId, setFromStoreId] = useState(isAdmin ? '' : userStoreId);
  const [toStoreId, setToStoreId] = useState('');
  const [items, setItems] = useState<TransferItemForm[]>([]);

  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeProducts = useMemo(() => {
    if (productsLoading) return [];
    if (!fromStoreId) return allProducts;
    // Better to show products that actually have inventory in that store
    return allProducts.filter(p => {
      const inv = p.inventory_by_store?.find(i => String(i.store_id) === String(fromStoreId));
      return inv && inv.quantity > 0;
    });
  }, [allProducts, productsLoading, fromStoreId]);

  const productOptions = useMemo(() => {
    return safeProducts.map(p => {
      const inv = p.inventory_by_store?.find(i => String(i.store_id) === String(fromStoreId));
      const q = inv ? inv.quantity : 0;
      return {
        value: String(p.id),
        label: `${p.name} (Omborda: ${q})`
      };
    });
  }, [safeProducts, fromStoreId]);

  const getProductStock = (productId: string) => {
    if (!fromStoreId || !productId) return 0;
    const p = allProducts.find(prod => String(prod.id) === String(productId));
    if (!p) return 0;
    const inv = p.inventory_by_store?.find(i => String(i.store_id) === String(fromStoreId));
    return inv ? inv.quantity : 0;
  };

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
    if (!isAdmin && userStoreId) {
      setFromStoreId(userStoreId);
    }
  }, [loadData, isAdmin, userStoreId]);

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;

    const invalidItems = items.filter(item => {
      const currentStock = getProductStock(item.product);
      return item.quantity > currentStock;
    });

    if (invalidItems.length > 0) {
      toast.error(t('messages.insufficientStock', 'Omborda yetarli tovar yo\'q!'));
      return;
    }

    const validItems = items.filter(item => item.product && item.quantity > 0);
    if (validItems.length === 0) return;
    try {
      setSaving(true);
      await transferService.create({
        from_store: fromStoreId,
        to_store: toStoreId,
        items: validItems,
      });
      navigate(`/${lang}/transfers`);
    } catch (error) {
      console.error('Failed to create transfer:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={t('transfers.createTransfer', "Tovarlarni ko'chirish")}
        description={t('transfers.title', "Omborlar o'rtasida tovar jo'natish")}
        breadcrumbs={[
          { label: t('nav.transfers', "O'tkazmalar"), href: `/${lang}/transfers` },
          { label: t('common.add', "Qo'shish") },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Card className="border border-border/60 shadow-sm rounded-xl bg-card">
          <CardContent className="p-6 space-y-8">

            {/* Top section: From and To Stores */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">{t('transfers.fromStore', 'Qayerdan')}</Label>
                <Select value={fromStoreId} onValueChange={setFromStoreId} disabled={!isAdmin}>
                  <SelectTrigger className="bg-muted/40 border-border/60 h-11 shadow-none">
                    <SelectValue placeholder={t('transfers.selectStore', 'Do‘konni tanlang')} />
                  </SelectTrigger>
                  <SelectContent>
                    {safeStores.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">{t('transfers.toStore', 'Qayerga')}</Label>
                <Select value={toStoreId} onValueChange={setToStoreId}>
                  <SelectTrigger className="bg-muted/40 border-border/60 h-11 shadow-none">
                    <SelectValue placeholder={t('transfers.selectStore', 'Do‘konni tanlang')} />
                  </SelectTrigger>
                  <SelectContent>
                    {safeStores.filter(s => String(s.id) !== String(fromStoreId)).map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Middle section: Items List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-foreground">{t('transfers.itemsToTransfer', "Jo'natiladigan tovarlar")}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg border border-border bg-card text-foreground hover:bg-muted flex items-center shrink-0 shadow-sm px-4 h-9"
                  onClick={() => setItems([...items, { product: '', quantity: 1 }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('transfers.addProduct', "Tovar qo'shish")}
                </Button>
              </div>

              <div className="space-y-3">
                {items.length === 0 && (
                  <div className="text-center p-8 border border-dashed border-border rounded-xl bg-muted/20">
                    <p className="text-sm text-muted-foreground">{t('transfers.noItems', "Hech qanday tovar qo'shilmagan")}</p>
                  </div>
                )}

                {items.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
                    <div className="flex-1 w-full space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">{t('products.title', 'Tovar')}</Label>
                      <SearchableSelect
                        value={item.product}
                        onValueChange={(value) => {
                          const newItems = [...items];
                          const availableQty = getProductStock(value);
                          newItems[index].product = value;
                          newItems[index].availableQuantity = availableQty;
                          if (newItems[index].quantity > availableQty) {
                            newItems[index].quantity = availableQty;
                          }
                          setItems(newItems);
                        }}
                        options={productOptions}
                        placeholder={t('transfers.selectProduct', 'Tovarni tanlang')}
                        searchPlaceholder={t('common.search', 'Qidirish...')}
                        emptyMessage={t('common.noData', "Ma'lumot yo'q")}
                      />
                    </div>

                    <div className="w-full sm:w-32 space-y-2 shrink-0">
                      <Label className="text-xs font-semibold text-muted-foreground">{t('products.quantity', 'Soni')}</Label>
                      <Input
                        type="number"
                        min="1"
                        className="bg-background border-border/60 h-10 shadow-none text-center sm:text-left"
                        value={item.quantity || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const newItems = [...items];
                          const val = e.target.value;
                          const numVal = val === '' ? 0 : Number(val);
                          const availableQty = newItems[index].availableQuantity ?? getProductStock(newItems[index].product);

                          if (numVal > availableQty) {
                            toast.error(`${t('messages.insufficientStock', 'Maksimal qoldiq')}: ${availableQty}`);
                            newItems[index].quantity = availableQty;
                          } else {
                            newItems[index].quantity = numVal;
                          }
                          setItems(newItems);
                        }}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 sm:mb-0 mt-2 sm:mt-0 ml-auto sm:ml-0"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

          </CardContent>
          <CardFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/${lang}/transfers`)}
              className="w-full sm:flex-1 h-11 border border-border bg-card text-foreground rounded-lg hover:bg-muted"
            >
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button
              type="submit"
              className="w-full sm:flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-lg"
              disabled={saving || !fromStoreId || !toStoreId || items.length === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              {saving ? t('common.loading', 'Yuklanmoqda...') : t('transfers.createTransfer', "Tovarni jo'natish")}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
