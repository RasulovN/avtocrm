import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Camera,
  CheckCircle2,
  ClipboardList,
  Package,
  RefreshCcw,
  Search,
  ShoppingCart,
  TriangleAlert,
  WandSparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { BarcodeInput } from '../../components/BarcodeInput';
import { ScannerModal } from '../../components/ScannerModal';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useProducts } from '../../context/ProductContext';
import { storeService } from '../../services/storeService';
import { useAuthStore } from '../../app/store';
import type { Product, Store } from '../../types';
import { cn } from '../../utils';

type InventoryImpactKey = 'sales' | 'transferOut' | 'transferIn' | 'incoming';

interface InventoryImpact {
  sales: number;
  transferOut: number;
  transferIn: number;
  incoming: number;
}

interface DraftInventoryRow {
  product: Product;
  expectedQty: number;
  countedQty: number;
  impacts: InventoryImpact;
  scannedCount: number;
  touched: boolean;
}

interface GeneratedInventoryPreview {
  generatedAt: string;
  matchedCount: number;
  shortageCount: number;
  overageCount: number;
  shortageItems: Array<{ id: string; name: string; quantity: number }>;
  incomingItems: Array<{ id: string; name: string; quantity: number }>;
}

const EMPTY_IMPACTS: InventoryImpact = {
  sales: 0,
  transferOut: 0,
  transferIn: 0,
  incoming: 0,
};

const formatNumber = (value: number) => value.toLocaleString('ru-RU');

const getStoreQuantity = (product: Product, storeId: string) => {
  const storeInventory = product.inventory_by_store?.find((item) => String(item.store_id) === String(storeId));
  if (storeInventory) return Number(storeInventory.quantity || 0);

  if (String(product.store_id || '') === String(storeId)) {
    return Number(product.quantity ?? product.total_count ?? 0);
  }

  return 0;
};

const buildInitialDraftRow = (product: Product, storeId: string): DraftInventoryRow => {
  const expectedQty = getStoreQuantity(product, storeId);

  return {
    product,
    expectedQty,
    countedQty: expectedQty,
    impacts: { ...EMPTY_IMPACTS },
    scannedCount: 0,
    touched: false,
  };
};

const getSystemQty = (row: DraftInventoryRow) =>
  row.expectedQty - row.impacts.sales - row.impacts.transferOut + row.impacts.transferIn + row.impacts.incoming;

const getDifference = (row: DraftInventoryRow) => row.countedQty - getSystemQty(row);

const getRowStatus = (row: DraftInventoryRow) => {
  const difference = getDifference(row);
  if (difference < 0) return 'shortage';
  if (difference > 0) return 'overage';
  if (row.touched || row.scannedCount > 0) return 'matched';
  return 'pending';
};

export function InventoryCreateSessionPage() {
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id || '';
  const { products, loading: productsLoading } = useProducts();

  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(userStoreId);
  const [draftRows, setDraftRows] = useState<Record<string, DraftInventoryRow>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<GeneratedInventoryPreview | null>(null);
  const [recentScanIds, setRecentScanIds] = useState<string[]>([]);

  const scannerInputRef = useRef<HTMLInputElement | null>(null);

  const loadStores = useCallback(async () => {
    try {
      setStoresLoading(true);
      const response = await storeService.getAll();
      const loadedStores = Array.isArray(response.data) ? response.data : [];
      setStores(isAdmin ? loadedStores : loadedStores.filter((store) => String(store.id) === String(userStoreId)));
    } catch {
      toast.error("Do'konlarni yuklashda xatolik yuz berdi");
    } finally {
      setStoresLoading(false);
    }
  }, [isAdmin, userStoreId]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  const availableProducts = useMemo(() => {
    if (!selectedStoreId) return [];

    return products
      .filter((product) => {
        const quantity = getStoreQuantity(product, selectedStoreId);
        return quantity > 0 || product.inventory_by_store?.some((item) => String(item.store_id) === String(selectedStoreId));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, selectedStoreId]);

  useEffect(() => {
    if (!selectedStoreId) {
      setDraftRows({});
      setSelectedProductId('');
      return;
    }

    const nextRows = availableProducts.reduce<Record<string, DraftInventoryRow>>((acc, product) => {
      const key = String(product.id);
      acc[key] = buildInitialDraftRow(product, selectedStoreId);
      return acc;
    }, {});

    setDraftRows(nextRows);
    setGeneratedPreview(null);

    const firstProductId = availableProducts[0]?.id ? String(availableProducts[0].id) : '';
    setSelectedProductId(firstProductId);
  }, [availableProducts, selectedStoreId]);

  const draftList = useMemo(() => Object.values(draftRows), [draftRows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return draftList;

    return draftList.filter((row) =>
      [row.product.name, row.product.sku, row.product.barcode, row.product.shtrix_code]
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [draftList, searchQuery]);

  const selectedRow = selectedProductId ? draftRows[selectedProductId] : undefined;

  const shortageRows = useMemo(
    () => draftList.filter((row) => getDifference(row) < 0).sort((a, b) => getDifference(a) - getDifference(b)),
    [draftList]
  );

  const overageRows = useMemo(
    () => draftList.filter((row) => getDifference(row) > 0).sort((a, b) => getDifference(b) - getDifference(a)),
    [draftList]
  );

  const stats = useMemo(() => {
    const totalProducts = draftList.length;
    const matched = draftList.filter((row) => getRowStatus(row) === 'matched').length;
    const shortage = shortageRows.length;
    const overage = overageRows.length;
    const pending = draftList.filter((row) => getRowStatus(row) === 'pending').length;
    const scanned = draftList.reduce((sum, row) => sum + row.scannedCount, 0);
    const totalSystemQty = draftList.reduce((sum, row) => sum + getSystemQty(row), 0);
    const totalCountedQty = draftList.reduce((sum, row) => sum + row.countedQty, 0);
    return { totalProducts, matched, shortage, overage, pending, scanned, totalSystemQty, totalCountedQty };
  }, [draftList, overageRows.length, shortageRows.length]);

  const updateRow = useCallback((productId: string, updater: (row: DraftInventoryRow) => DraftInventoryRow) => {
    setDraftRows((current) => {
      const existing = current[productId];
      if (!existing) return current;

      return {
        ...current,
        [productId]: updater(existing),
      };
    });
    setGeneratedPreview(null);
  }, []);

  const handleCountChange = useCallback((productId: string, countedQty: number) => {
    updateRow(productId, (row) => ({
      ...row,
      countedQty: Number.isFinite(countedQty) ? Math.max(0, countedQty) : row.countedQty,
      touched: true,
    }));
  }, [updateRow]);

  const handleImpactChange = useCallback((productId: string, key: InventoryImpactKey, value: number) => {
    updateRow(productId, (row) => ({
      ...row,
      impacts: {
        ...row.impacts,
        [key]: Number.isFinite(value) ? Math.max(0, value) : 0,
      },
      touched: true,
    }));
  }, [updateRow]);

  const handleResetRow = useCallback((productId: string) => {
    updateRow(productId, (row) => ({
      ...row,
      countedQty: row.expectedQty,
      impacts: { ...EMPTY_IMPACTS },
      scannedCount: 0,
      touched: false,
    }));
    setRecentScanIds((current) => current.filter((id) => id !== productId));
  }, [updateRow]);

  const findDraftByCode = useCallback((barcode: string) => {
    const normalized = barcode.trim().toLowerCase();
    return draftList.find((row) =>
      [row.product.barcode, row.product.shtrix_code, row.product.sku, row.product.name]
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .some((value) => value.toLowerCase() === normalized)
    );
  }, [draftList]);

  const registerScannedProduct = useCallback(async (barcode: string) => {
    const row = findDraftByCode(barcode);

    if (!row) {
      throw new Error('Product not found');
    }

    const productId = String(row.product.id);
    updateRow(productId, (current) => ({
      ...current,
      countedQty: current.countedQty + 1,
      scannedCount: current.scannedCount + 1,
      touched: true,
    }));

    setSelectedProductId(productId);
    setRecentScanIds((current) => [productId, ...current.filter((id) => id !== productId)].slice(0, 8));
    toast.success(`${row.product.name} sanog'i +1 ga oshirildi`);
  }, [findDraftByCode, updateRow]);

  const {
    inputRef,
    value: barcodeValue,
    onChange: barcodeOnChange,
    onKeyDown: barcodeOnKeyDown,
    status: scannerStatus,
    message: scannerMessage,
  } = useBarcodeScanner({
    onScan: registerScannedProduct,
    minLength: 3,
    scannerMaxGap: 250,
  });

  useEffect(() => {
    scannerInputRef.current = inputRef.current;
  }, [inputRef]);

  const handleScannerInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    barcodeOnKeyDown(event);

    if (event.key === 'Enter' && barcodeValue.trim()) {
      event.preventDefault();
      void registerScannedProduct(barcodeValue.trim());
    }
  }, [barcodeOnKeyDown, barcodeValue, registerScannedProduct]);

  const handleGenerate = useCallback(() => {
    if (!selectedStoreId) {
      toast.error("Avval do'konni tanlang");
      return;
    }

    if (draftList.length === 0) {
      toast.error('Inventarizatsiya uchun mahsulotlar topilmadi');
      return;
    }

    const shortageItems = shortageRows.map((row) => ({
      id: String(row.product.id),
      name: row.product.name,
      quantity: Math.abs(getDifference(row)),
    }));

    const incomingItems = overageRows.map((row) => ({
      id: String(row.product.id),
      name: row.product.name,
      quantity: getDifference(row),
    }));

    setGeneratedPreview({
      generatedAt: new Date().toISOString(),
      matchedCount: stats.matched,
      shortageCount: shortageItems.length,
      overageCount: incomingItems.length,
      shortageItems,
      incomingItems,
    });

    toast.success('Inventarizatsiya generatsiya preview tayyorlandi');
  }, [draftList.length, overageRows, selectedStoreId, shortageRows, stats.matched]);

  const selectedStore = stores.find((store) => String(store.id) === String(selectedStoreId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Inventorization"
        description="Backend tayyor bo'lguncha ishlaydigan professional draft inventorization studiyasi. Mahsulotlarni sanang, jarayon ta'sirlarini kiriting va yakuniy generatsiya preview oling."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowScanner(true)}>
              <Camera className="mr-2 h-4 w-4" />
              Kamera skaner
            </Button>
            <Button onClick={handleGenerate}>
              <WandSparkles className="mr-2 h-4 w-4" />
              Generatsiya qilish
            </Button>
          </>
        }
      />

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-amber-500/5">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.3fr,1fr]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Do'kon</p>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger disabled={storesLoading || (!isAdmin && Boolean(userStoreId))}>
                    <SelectValue placeholder="Do'konni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Qidiruv</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Mahsulot nomi, SKU yoki barcode bo'yicha qidiring"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Tezkor skanerlash</p>
                  <p className="text-xs text-muted-foreground">
                    Kamera yoki barcode scanner apparati orqali mahsulotni topib, sanog'ini avtomatik oshiring.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowScanner(true)}>
                  <Camera className="mr-2 h-4 w-4" />
                  Ochish
                </Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr,260px]">
                <div className="space-y-2">
                  <BarcodeInput
                    ref={inputRef}
                    value={barcodeValue}
                    onChange={barcodeOnChange}
                    onKeyDown={handleScannerInputKeyDown}
                    status={scannerStatus}
                    autoFocus
                  />
                  <p className="min-h-5 text-xs text-muted-foreground">
                    {scannerMessage || "Scanner apparatidan kelgan kod avtomatik ushlanadi. Enter bossangiz qo'lda ham qidiriladi."}
                  </p>
                </div>
                <div className="rounded-xl border border-dashed p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">So'nggi scanlar</p>
                  <div className="mt-3 space-y-2">
                    {recentScanIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Hali scan qilinmagan.</p>
                    ) : (
                      recentScanIds.map((productId) => {
                        const row = draftRows[productId];
                        if (!row) return null;
                        return (
                          <button
                            key={productId}
                            type="button"
                            onClick={() => setSelectedProductId(productId)}
                            className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{row.product.name}</p>
                              <p className="text-xs text-muted-foreground">Scan: {row.scannedCount} ta</p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                              {row.countedQty}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: 'Jami mahsulot', value: stats.totalProducts, icon: Package, tone: 'bg-slate-50 text-slate-700' },
              { label: 'Mos kelgan', value: stats.matched, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
              { label: 'Kamomat', value: stats.shortage, icon: TriangleAlert, tone: 'bg-rose-50 text-rose-700' },
              { label: 'Ortiqcha', value: stats.overage, icon: ArrowDownToLine, tone: 'bg-amber-50 text-amber-700' },
              { label: 'Pending', value: stats.pending, icon: ClipboardList, tone: 'bg-sky-50 text-sky-700' },
              { label: 'Scan qilingan', value: stats.scanned, icon: Camera, tone: 'bg-violet-50 text-violet-700' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border bg-background p-4">
                <div className={cn('mb-3 inline-flex rounded-xl p-2', item.tone)}>
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{formatNumber(item.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr,0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="text-xl">Mahsulotlar ro'yxati</CardTitle>
            <CardDescription>
              Barcha asosiy ma'lumotlar bitta ixcham jadvalda. Shu qatorning o'zida count va ta'sirlarni tahrirlashingiz mumkin.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedStoreId ? (
              <div className="p-8 text-center text-muted-foreground">Inventarizatsiyani boshlash uchun do'kon tanlang.</div>
            ) : productsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Mahsulotlar yuklanmoqda...</div>
            ) : filteredRows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Mos mahsulot topilmadi.</div>
            ) : (
              <div className="max-h-[900px] overflow-auto">
                <table className="w-full min-w-[1080px]">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                    <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Mahsulot</th>
                      <th className="px-3 py-3 text-center">Baza</th>
                      <th className="px-3 py-3 text-center">Sotuv</th>
                      <th className="px-3 py-3 text-center">Tr chiqim</th>
                      <th className="px-3 py-3 text-center">Tr kirim</th>
                      <th className="px-3 py-3 text-center">Kirim</th>
                      <th className="px-3 py-3 text-center">System</th>
                      <th className="px-3 py-3 text-center">Yangi sanoq</th>
                      <th className="px-3 py-3 text-center">Natija</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRows.map((row) => {
                      const productId = String(row.product.id);
                      const systemQty = getSystemQty(row);
                      const difference = getDifference(row);
                      const status = getRowStatus(row);

                      return (
                        <tr
                          key={productId}
                          className={cn(
                            'transition-colors hover:bg-accent/30',
                            selectedProductId === productId && 'bg-accent/40'
                          )}
                          onClick={() => setSelectedProductId(productId)}
                        >
                          <td className="px-4 py-3">
                            <div className="min-w-[240px]">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{row.product.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {row.product.sku || row.product.barcode || row.product.shtrix_code || 'Kod mavjud emas'}
                                  </p>
                                </div>
                                {row.scannedCount > 0 && (
                                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                                    Scan {row.scannedCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-sm font-semibold">{formatNumber(row.expectedQty)}</td>
                          <td className="px-2 py-3">
                            <Input
                              type="number"
                              min={0}
                              value={row.impacts.sales}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => handleImpactChange(productId, 'sales', Number(event.target.value))}
                              className="h-9 text-center"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <Input
                              type="number"
                              min={0}
                              value={row.impacts.transferOut}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => handleImpactChange(productId, 'transferOut', Number(event.target.value))}
                              className="h-9 text-center"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <Input
                              type="number"
                              min={0}
                              value={row.impacts.transferIn}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => handleImpactChange(productId, 'transferIn', Number(event.target.value))}
                              className="h-9 text-center"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <Input
                              type="number"
                              min={0}
                              value={row.impacts.incoming}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => handleImpactChange(productId, 'incoming', Number(event.target.value))}
                              className="h-9 text-center"
                            />
                          </td>
                          <td className="px-3 py-3 text-center text-sm font-semibold">{formatNumber(systemQty)}</td>
                          <td className="px-2 py-3">
                            <Input
                              type="number"
                              min={0}
                              value={row.countedQty}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => handleCountChange(productId, Number(event.target.value))}
                              className="h-9 text-center font-semibold"
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={cn(
                                'inline-flex min-w-20 justify-center rounded-full px-3 py-1 text-xs font-semibold',
                                status === 'shortage' && 'bg-rose-50 text-rose-700',
                                status === 'overage' && 'bg-amber-50 text-amber-700',
                                status === 'matched' && 'bg-emerald-50 text-emerald-700',
                                status === 'pending' && 'bg-slate-100 text-slate-700',
                              )}
                            >
                              {status === 'shortage' && `${difference}`}
                              {status === 'overage' && `+${difference}`}
                              {status === 'matched' && 'Mos'}
                              {status === 'pending' && 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Qisqa ko'rinish</CardTitle>
              <CardDescription>
                Tanlangan qatorning ixcham overview'i.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedRow ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
                  Mahsulot tanlang, detail panel shu yerda chiqadi.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{selectedRow.product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {selectedRow.product.sku || selectedRow.product.barcode || selectedRow.product.shtrix_code || 'Kod yo`q'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleResetRow(String(selectedRow.product.id))}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-muted-foreground">Baza / System</p>
                        <p className="mt-1 text-lg font-bold">
                          {formatNumber(selectedRow.expectedQty)} / {formatNumber(getSystemQty(selectedRow))}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-muted-foreground">Sanoq / Farq</p>
                        <p className="mt-1 text-lg font-bold">
                          {formatNumber(selectedRow.countedQty)} / {getDifference(selectedRow) > 0 ? '+' : ''}{formatNumber(getDifference(selectedRow))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Kamomat va ortiqcha</CardTitle>
              <CardDescription>
                Sanoq yakunida kam chiqqanlar `Kamomat` ga, ortiqcha topilganlar esa `Inventorization kirimlar` orqali qo'shiladi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-rose-700">Kamomat ro'yxati</p>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-rose-700">
                    {shortageRows.length} ta
                  </span>
                </div>
                <div className="space-y-2">
                  {shortageRows.length === 0 ? (
                    <p className="text-sm text-rose-700/80">Hozircha kamomat yo'q.</p>
                  ) : (
                    shortageRows.slice(0, 6).map((row) => (
                      <button
                        key={row.product.id}
                        type="button"
                        onClick={() => setSelectedProductId(String(row.product.id))}
                        className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left"
                      >
                        <span className="truncate text-sm font-medium">{row.product.name}</span>
                        <span className="text-sm font-semibold text-rose-700">{getDifference(row)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-700">Inventorization kirimlar</p>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-amber-700">
                    {overageRows.length} ta
                  </span>
                </div>
                <div className="space-y-2">
                  {overageRows.length === 0 ? (
                    <p className="text-sm text-amber-700/80">Hozircha ortiqcha topilmadi.</p>
                  ) : (
                    overageRows.slice(0, 6).map((row) => (
                      <button
                        key={row.product.id}
                        type="button"
                        onClick={() => setSelectedProductId(String(row.product.id))}
                        className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left"
                      >
                        <span className="truncate text-sm font-medium">{row.product.name}</span>
                        <span className="text-sm font-semibold text-amber-700">+{getDifference(row)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Generatsiya preview</CardTitle>
              <CardDescription>
                Bu blok backend payload uchun tayyor preview. Keyin API tayyor bo'lsa shu obyekt to'g'ridan-to'g'ri yuboriladi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!generatedPreview ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
                  Preview hali generatsiya qilinmagan. `Generatsiya qilish` tugmasini bosing.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border p-3">
                      <p className="text-xs text-muted-foreground">Mos mahsulotlar</p>
                      <p className="mt-1 text-2xl font-bold">{generatedPreview.matchedCount}</p>
                    </div>
                    <div className="rounded-xl border p-3">
                      <p className="text-xs text-muted-foreground">Kamomat yozuvlari</p>
                      <p className="mt-1 text-2xl font-bold">{generatedPreview.shortageCount}</p>
                    </div>
                    <div className="rounded-xl border p-3">
                      <p className="text-xs text-muted-foreground">Kirim yozuvlari</p>
                      <p className="mt-1 text-2xl font-bold">{generatedPreview.overageCount}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-sm font-semibold">Yaratiladigan session</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Status: <span className="font-medium text-foreground">jarayonda</span>
                      {' '}| Do'kon: <span className="font-medium text-foreground">{selectedStore?.name || '-'}</span>
                      {' '}| Bazadagi jami: <span className="font-medium text-foreground">{formatNumber(stats.totalSystemQty)}</span>
                      {' '}| Sanalgan jami: <span className="font-medium text-foreground">{formatNumber(stats.totalCountedQty)}</span>
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Yakunda generatsiya bosilganda mahsulot countlari moslashtiriladi, ortiqchalar kirimga, kam chiqqanlar kamomatga tushadi.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <p className="mb-2 text-sm font-semibold text-rose-700">Kamomat payload</p>
                      <div className="space-y-2">
                        {generatedPreview.shortageItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Kamomat payload bo'sh.</p>
                        ) : (
                          generatedPreview.shortageItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                              <span className="truncate text-sm">{item.name}</span>
                              <span className="text-sm font-semibold text-rose-700">{item.quantity}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-amber-700">Inventorization kirim payload</p>
                      <div className="space-y-2">
                        {generatedPreview.incomingItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Kirim payload bo'sh.</p>
                        ) : (
                          generatedPreview.incomingItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                              <span className="truncate text-sm">{item.name}</span>
                              <span className="text-sm font-semibold text-amber-700">+{item.quantity}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ScannerModal
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={registerScannedProduct}
      />
    </div>
  );
}
