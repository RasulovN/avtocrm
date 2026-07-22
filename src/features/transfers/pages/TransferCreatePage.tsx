import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Send, ScanBarcode } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent, CardFooter } from '../../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/Select';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { LazyScannerModal } from '../../../components/LazyScannerModal';
import { transferService } from '../../../services/transferService';
import { storeService } from '../../../services/storeService';
import { useProducts } from '../../../context/ProductContext';
import { useAuthStore } from '../../../app/store';
import type { Store } from '../../../types';

interface TransferItemForm {
  product: string;
  quantity: number;
  availableQuantity?: number;
  /** React key uchun barqaror ID — qatorlar tepadan qo'shilganda state adashmasligi uchun */
  rowId: number;
}

let transferRowSeq = 0;

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
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  // Yuborishga urinilganda tanlanmagan tovar/miqdor qatorlari qizil ko'rsatiladi
  const [showErrors, setShowErrors] = useState(false);

  // ─── Qoralama (sessiya): avto-saqlash + davom ettirish ───
  // Yubormaguncha o'tkazma IN_PROGRESS qoralama bo'lib serverda turadi
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const sessionReady = useRef(false); // qoralama yuklanmaguncha avto-saqlash o'chiq
  const creatingSession = useRef(false); // parallel POST'lardan himoya

  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeProducts = useMemo(() => {
    if (productsLoading) return [];
    // Always show all products — quantity will be shown in label, validation happens on submit
    return allProducts;
  }, [allProducts, productsLoading]);

  const productOptions = useMemo(() => {
    return safeProducts.map(p => {
      let q: number | string = 0;
      if (fromStoreId && p.inventory_by_store && p.inventory_by_store.length > 0) {
        const inv = p.inventory_by_store.find(i => String(i.store_id) === String(fromStoreId));
        q = inv !== undefined ? inv.quantity : '—';
      } else {
        q = p.quantity ?? 0;
      }
      // SKU/shtrix-kod sublabel sifatida — SearchableSelect qidiruvi label bilan
      // birga sublabel bo'yicha ham ishlaydi, ya'ni nom, SKU va barcode bo'yicha topiladi
      const codes = [p.sku, p.barcode].filter(Boolean).join(' • ');
      return {
        value: String(p.id),
        label: `${p.name} (Omborda: ${q})`,
        sublabel: codes || undefined,
      };
    });
  }, [safeProducts, fromStoreId]);


  const getProductStock = (productId: string) => {
    if (!productId) return 0;
    const p = allProducts.find(prod => String(prod.id) === String(productId));
    if (!p) return 0;
    if (!fromStoreId) return p.quantity ?? 0;
    if (!p.inventory_by_store || p.inventory_by_store.length === 0) {
      return p.quantity ?? 0; // Fallback to total quantity if no store data
    }
    const inv = p.inventory_by_store.find(i => String(i.store_id) === String(fromStoreId));
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

  // Sahifa ochilganda faol qoralama bo'lsa tiklanadi (davom ettirish).
  // DIQQAT: effekt auth store to'liq tiklangandan KEYIN ishlashi shart —
  // aks holda isAdmin hali false bo'lib, admin uchun "qayerdan" do'koni
  // tiklanmay qolardi (har safar qayta tanlashga to'g'ri kelardi).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!user || restoredRef.current) return;
    restoredRef.current = true;
    let cancelled = false;
    transferService
      .getActiveSession()
      .then((session) => {
        if (cancelled || !session) return;
        setSessionId(session.id);
        // Do'kon xodimida "qayerdan" o'z do'koniga qulflangan — faqat admin tiklaydi
        if (session.from_store && isAdmin) setFromStoreId(String(session.from_store));
        if (session.to_store) setToStoreId(String(session.to_store));
        if (Array.isArray(session.items) && session.items.length > 0) {
          setItems(
            session.items
              .filter((it) => it && it.product != null)
              .map((it) => ({
                product: String(it.product),
                quantity: Number(it.quantity) || 0,
                rowId: ++transferRowSeq,
              })),
          );
        }
        toast.success(t('transfers.draftRestored', 'Qoralama tiklandi — davom ettirishingiz mumkin'));
      })
      .catch(() => { /* qoralama bo'lmasa jim davom etamiz */ })
      .finally(() => {
        if (!cancelled) sessionReady.current = true;
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  // Qoralamani serverga yozish; yangi sessiya ochilsa ID qaytaradi
  const persistDraft = useCallback(async (): Promise<number | null> => {
    // Admin "qayerdan" do'konni tanlagan bo'lsa ham qoralama saqlanadi —
    // (xodimda from avtomatik o'z do'koni, shuning uchun u hisobga olinmaydi,
    // aks holda har kirishda bo'sh qoralama yaratilib ketardi)
    const hasContent =
      Boolean(toStoreId) || items.length > 0 || (isAdmin && Boolean(fromStoreId));
    if (!sessionId && !hasContent) return null; // bo'sh forma — saqlashga hojat yo'q
    const payload = {
      from_store: fromStoreId || null,
      to_store: toStoreId || null,
      items: items
        .filter((item) => item.product)
        .map(({ product, quantity }) => ({ product, quantity })),
    };
    try {
      setSaveState('saving');
      if (sessionId) {
        await transferService.updateSession(sessionId, payload);
        setSaveState('saved');
        return sessionId;
      }
      if (creatingSession.current) return null;
      creatingSession.current = true;
      const session = await transferService.createSession(payload);
      setSessionId(session.id);
      setSaveState('saved');
      return session.id;
    } catch {
      setSaveState('idle');
      return sessionId;
    } finally {
      creatingSession.current = false;
    }
  }, [sessionId, fromStoreId, toStoreId, items, isAdmin]);

  // Avto-saqlash: o'zgarishdan 1.2s keyin qoralama serverga yoziladi
  useEffect(() => {
    if (!sessionReady.current) return;
    const timer = setTimeout(() => {
      void persistDraft();
    }, 1200);
    return () => clearTimeout(timer);
  }, [fromStoreId, toStoreId, items, persistDraft]);

  // Tab yopilayotganda saqlash tugamagan bo'lsa ogohlantiramiz
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveState === 'saving') e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveState]);

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const processBarcode = (code: string) => {
    const foundProduct = safeProducts.find(p => p.barcode === code || p.shtrix_code === code || p.sku === code);
    
    if (foundProduct) {
       const existingIndex = items.findIndex(i => String(i.product) === String(foundProduct.id));
       const availableQty = getProductStock(String(foundProduct.id));

       if (existingIndex >= 0) {
         const newItems = [...items];
         if (newItems[existingIndex].quantity + 1 > availableQty) {
           toast.error(`${t('messages.insufficientStock', 'Maksimal qoldiq')}: ${availableQty}`);
         } else {
           newItems[existingIndex].quantity += 1;
           setItems(newItems);
           toast.success(`${foundProduct.name} +1`);
         }
       } else {
         if (availableQty < 1) {
           toast.error(`${t('messages.insufficientStock', 'Maksimal qoldiq')}: 0`);
         } else {
           // Yangi tovar tepadan qo'shiladi — avval qo'shilganlari pastda qoladi
           setItems([
             { product: String(foundProduct.id), quantity: 1, availableQuantity: availableQty, rowId: ++transferRowSeq },
             ...items,
           ]);
           toast.success(`${foundProduct.name} qo'shildi`);
         }
       }
    } else {
       toast.error(t('products.notFound', 'Mahsulot topilmadi!'));
    }
    
    setBarcodeInput('');
  };

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInput.trim();
      if (!code) return;
      processBarcode(code);
    }
  };

  const handleScannerModalScan = (barcode: string) => {
    processBarcode(barcode);
    setShowScanner(false);
  };

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;

    // Avval aniq xabarlar: tovar tanlanmagan qator qizil belgilanadi
    if (items.some(item => !item.product)) {
      setShowErrors(true);
      toast.error(t('transfers.productNotSelected', 'Mahsulot tanlanmagan — tovarni tanlang'));
      return;
    }
    if (items.some(item => item.quantity <= 0)) {
      setShowErrors(true);
      toast.error(t('messages.invalidQuantity', 'Noto‘g‘ri miqdor kiritildi'));
      return;
    }

    const invalidItems = items.filter(item => {
      const currentStock = getProductStock(item.product);
      return item.quantity > currentStock;
    });

    if (invalidItems.length > 0) {
      toast.error(t('messages.insufficientStock', 'Omborda yetarli tovar yo\'q!'));
      return;
    }

    setShowErrors(false);
    try {
      setSaving(true);
      const created = await transferService.create({
        from_store: fromStoreId,
        to_store: toStoreId,
        items: items.map(({ product, quantity }) => ({ product, quantity })),
      });
      // Qoralama yakunlanadi — endi u "davom ettirish" ro'yxatida chiqmaydi
      if (sessionId) {
        transferService.completeSession(sessionId, created?.id).catch(() => { /* jim */ });
      }
      navigate(`/${lang}/transfers`);
    } catch (error) {
      console.error('Failed to create transfer:', error);
    } finally {
      setSaving(false);
    }
  };

  // ─── Chiqish oqimi: o'zgarishlar bo'lsa "saqlansinmi?" deb so'raymiz ───
  const hasDraftContent =
    Boolean(toStoreId) || items.length > 0 || (isAdmin && Boolean(fromStoreId));

  const handleCancelClick = () => {
    if (hasDraftContent || sessionId) {
      setLeaveOpen(true);
    } else {
      navigate(`/${lang}/transfers`);
    }
  };

  const handleLeaveSave = async () => {
    await persistDraft();
    toast.success(
      t('transfers.draftSavedToast', 'Qoralama saqlandi — ro‘yxat tepasida “Qoralama” bo‘lib turadi'),
    );
    navigate(`/${lang}/transfers`);
  };

  const handleLeaveDiscard = async () => {
    if (sessionId) {
      try {
        await transferService.cancelSession(sessionId);
      } catch { /* jim */ }
    }
    navigate(`/${lang}/transfers`);
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
          <CardContent className="p-4 sm:p-6 space-y-8">

            {/* Top section: From and To Stores */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">{t('transfers.itemsToTransfer', "Jo'natiladigan tovarlar")}</h3>
                  {/* Avto-saqlash indikatori */}
                  {saveState !== 'idle' && (
                    <span className="text-[11px] text-muted-foreground">
                      {saveState === 'saving'
                        ? t('transfers.autosaveSaving', 'Saqlanmoqda…')
                        : t('transfers.autosaveSaved', 'Qoralama saqlandi')}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative min-w-0 w-full sm:w-64">
                    <Input
                      placeholder={t('products.scanBarcode', 'Shtrixkod skanerlash...')}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={handleBarcodeScan}
                      className="w-full h-10 pr-10"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowScanner(true)}
                      title={t('products.scanBarcode', 'Shtrixkod skanerlash...')}
                    >
                      <ScanBarcode className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg border border-border bg-card text-foreground hover:bg-muted flex items-center shrink-0 shadow-sm px-4 h-10"
                    onClick={() => setItems([{ product: '', quantity: 0, rowId: ++transferRowSeq }, ...items])}
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('transfers.addProduct', "Tovar qo'shish")}</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {items.length === 0 && (
                  <div className="text-center p-8 border border-dashed border-border rounded-xl bg-muted/20">
                    <p className="text-sm text-muted-foreground">{t('transfers.noItems', "Hech qanday tovar qo'shilmagan")}</p>
                  </div>
                )}

                {items.map((item, index) => (
                  <div key={item.rowId} className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
                    <div className="min-w-0 flex-1 w-full space-y-2">
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
                          // Tovar tanlanganda 0 turgan miqdor avtomatik 1 ga chiqadi
                          if (newItems[index].quantity === 0 && availableQty > 0) {
                            newItems[index].quantity = 1;
                          }
                          setItems(newItems);
                        }}
                        options={productOptions}
                        placeholder={t('transfers.selectProduct', 'Tovarni tanlang')}
                        searchPlaceholder={t('purchaseSession.searchProduct', "Nomi, SKU yoki shtrix-kod bo'yicha qidirish…")}
                        emptyMessage={t('common.noData', "Ma'lumot yo'q")}
                        className={showErrors && !item.product ? 'rounded-xl ring-2 ring-red-500/70' : ''}
                      />
                      {showErrors && !item.product && (
                        <p className="text-xs text-red-500">
                          {t('transfers.productNotSelected', 'Mahsulot tanlanmagan — tovarni tanlang')}
                        </p>
                      )}
                    </div>

                    <div className="w-full sm:w-32 space-y-2 shrink-0">
                      <Label className="text-xs font-semibold text-muted-foreground">{t('products.quantity', 'Soni')}</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="0"
                        className={`bg-background border-border/60 h-10 shadow-none text-center sm:text-left ${
                          showErrors && item.quantity <= 0 ? 'border-red-500 focus-visible:ring-red-500/40' : ''
                        }`}
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
          <CardFooter className="p-4 pt-0 sm:p-6 sm:pt-0 flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
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

      <LazyScannerModal
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={handleScannerModalScan}
      />

      {/* Chiqishdan oldin: o'zgarishlar qoralamada qolsinmi? */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('transfers.leaveTitle', 'Sahifadan chiqish')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t(
              'transfers.leaveQuestion',
              'O‘zgarishlar qoralamada saqlansinmi? Keyin qaytganingizda shu joydan davom ettirasiz.',
            )}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
              onClick={handleLeaveDiscard}
            >
              {t('transfers.leaveDiscard', 'Qoralamani o‘chirish')}
            </Button>
            <Button type="button" className="flex-1" onClick={handleLeaveSave}>
              {t('transfers.leaveSave', 'Saqlash va chiqish')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
