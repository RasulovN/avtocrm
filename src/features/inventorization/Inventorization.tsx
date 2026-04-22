import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, ArrowUpToLine, ClipboardCheck, Package, RefreshCcw, Search, ShoppingCart, TriangleAlert } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useProducts } from '../../context/ProductContext';
import { useAuthStore } from '../../app/store';
import type { Product } from '../../types';
import { cn, formatCurrency } from '../../utils';

type StatusFilter = 'all' | 'pending' | 'matched' | 'shortage' | 'overage';
type ImpactKey = 'sales' | 'transferOut' | 'transferIn' | 'incoming';

interface DraftRow {
  product: Product;
  baseQty: number;
  actualQty: number;
  sales: number;
  transferOut: number;
  transferIn: number;
  incoming: number;
  touched: boolean;
}

const getProductStoreQty = (product: Product, storeId?: string) => {
  if (!storeId) {
    return Number(product.total_quantity ?? product.quantity ?? product.total_count ?? 0);
  }

  const byStore = product.inventory_by_store?.find((item) => String(item.store_id) === String(storeId));
  if (byStore) return Number(byStore.quantity || 0);

  if (String(product.store_id || '') === String(storeId)) {
    return Number(product.quantity ?? product.total_count ?? 0);
  }

  return 0;
};

const getSystemQty = (row: DraftRow) => row.baseQty - row.sales - row.transferOut + row.transferIn + row.incoming;
const getDifference = (row: DraftRow) => row.actualQty - getSystemQty(row);

const getRowStatus = (row: DraftRow): Exclude<StatusFilter, 'all'> | 'pending' => {
  const diff = getDifference(row);
  if (!row.touched && row.actualQty === row.baseQty && row.sales === 0 && row.transferOut === 0 && row.transferIn === 0 && row.incoming === 0) {
    return 'pending';
  }
  if (diff < 0) return 'shortage';
  if (diff > 0) return 'overage';
  return 'matched';
};

export default function InventorizationPage() {
  const { t } = useTranslation();
  const { products, loading } = useProducts();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id;

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(userStoreId || 'all');
  const [draftRows, setDraftRows] = useState<Record<string, DraftRow>>({});

  useEffect(() => {
    if (!isAdmin && userStoreId) {
      setSelectedStoreId(userStoreId);
    }
  }, [isAdmin, userStoreId]);

  const stores = useMemo(() => {
    const map = new Map<string, string>();

    products.forEach((product) => {
      product.inventory_by_store?.forEach((item) => {
        map.set(String(item.store_id), item.store_name);
      });

      if (product.store_id && product.store_name) {
        map.set(String(product.store_id), product.store_name);
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(
        products
          .map((product) => product.category_name)
          .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      )
    );

    return values.sort((a, b) => a.localeCompare(b));
  }, [products]);

  const availableProducts = useMemo(() => {
    return products.filter((product) => {
      const qty = getProductStoreQty(product, selectedStoreId === 'all' ? undefined : selectedStoreId);
      return selectedStoreId === 'all' ? true : qty > 0 || String(product.store_id || '') === String(selectedStoreId);
    });
  }, [products, selectedStoreId]);

  useEffect(() => {
    const nextRows = availableProducts.reduce<Record<string, DraftRow>>((acc, product) => {
      const id = String(product.id);
      const baseQty = getProductStoreQty(product, selectedStoreId === 'all' ? undefined : selectedStoreId);

      acc[id] = {
        product,
        baseQty,
        actualQty: baseQty,
        sales: 0,
        transferOut: 0,
        transferIn: 0,
        incoming: 0,
        touched: false,
      };

      return acc;
    }, {});

    setDraftRows(nextRows);
  }, [availableProducts, selectedStoreId]);

  const rows = useMemo(() => Object.values(draftRows), [draftRows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const status = getRowStatus(row);
      const matchesQuery =
        !normalizedQuery ||
        [row.product.name, row.product.sku, row.product.barcode, row.product.shtrix_code]
          .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
          .some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesCategory = selectedCategory === 'all' || row.product.category_name === selectedCategory;
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [rows, query, selectedCategory, statusFilter]);

  const updateRow = (productId: string, updater: (row: DraftRow) => DraftRow) => {
    setDraftRows((current) => {
      const existing = current[productId];
      if (!existing) return current;

      return {
        ...current,
        [productId]: updater(existing),
      };
    });
  };

  const handleImpactChange = (productId: string, key: ImpactKey, value: number) => {
    updateRow(productId, (row) => ({
      ...row,
      [key]: Number.isFinite(value) ? Math.max(0, value) : 0,
      touched: true,
    }));
  };

  const handleActualChange = (productId: string, value: number) => {
    updateRow(productId, (row) => ({
      ...row,
      actualQty: Number.isFinite(value) ? Math.max(0, value) : row.actualQty,
      touched: true,
    }));
  };

  const handleReset = (productId: string) => {
    updateRow(productId, (row) => ({
      ...row,
      actualQty: row.baseQty,
      sales: 0,
      transferOut: 0,
      transferIn: 0,
      incoming: 0,
      touched: false,
    }));
  };

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const checked = filteredRows.filter((row) => getRowStatus(row) !== 'pending').length;
    const matched = filteredRows.filter((row) => getRowStatus(row) === 'matched').length;
    const shortage = filteredRows.filter((row) => getRowStatus(row) === 'shortage').length;
    const overage = filteredRows.filter((row) => getRowStatus(row) === 'overage').length;
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0;
    const totalBaseQty = filteredRows.reduce((sum, row) => sum + row.baseQty, 0);

    return { total, checked, matched, shortage, overage, progress, totalBaseQty };
  }, [filteredRows]);

  const selectedStoreName =
    selectedStoreId === 'all'
      ? "Barcha do'konlar"
      : stores.find((store) => store.id === selectedStoreId)?.name || user?.store_name || '-';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventorization"
        description="Avto zapchastlar bo'yicha inventorization jadvali. Product counti, sotilganlari va boshqa ta'sirlar table ichida o'zgartiriladi."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mahsulot</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tekshirildi</p>
              <p className="text-2xl font-bold">{stats.checked}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-rose-50 p-3 text-rose-700">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Kamomat / Ortiqcha</p>
              <p className="text-2xl font-bold">{stats.shortage} / {stats.overage}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Jarayon</p>
              <p className="text-lg font-bold text-primary">{stats.progress}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{selectedStoreName} bo'yicha inventorization jarayoni</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filterlar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mahsulot nomi, SKU yoki barcode bo'yicha qidiring"
              className="pl-9"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Kategoriya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha kategoriyalar</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Holat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha holatlar</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="matched">Mos</SelectItem>
              <SelectItem value="shortage">Kamomat</SelectItem>
              <SelectItem value="overage">Ortiqcha</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStoreId} onValueChange={setSelectedStoreId} disabled={!isAdmin && Boolean(userStoreId)}>
            <SelectTrigger>
              <SelectValue placeholder="Do'kon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha do'konlar</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="text-lg">Productlar listi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Mos mahsulot topilmadi.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1480px]">
                <thead className="bg-muted/40">
                  <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Mahsulot</th>
                    <th className="px-4 py-3">SKU / Barcode</th>
                    <th className="px-4 py-3 text-right">Xarid</th>
                    <th className="px-4 py-3 text-center">Bazadagi count</th>
                    <th className="px-2 py-3 text-center">Sotilganlari</th>
                    <th className="px-2 py-3 text-center">Tr chiqim</th>
                    <th className="px-2 py-3 text-center">Tr kirim</th>
                    <th className="px-2 py-3 text-center">Kirim</th>
                    <th className="px-4 py-3 text-center">System count</th>
                    <th className="px-2 py-3 text-center">Yangi count</th>
                    <th className="px-4 py-3 text-center">Farq</th>
                    <th className="px-4 py-3 text-center">Holat</th>
                    <th className="px-4 py-3 text-center">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.map((row) => {
                    const productId = String(row.product.id);
                    const systemQty = getSystemQty(row);
                    const difference = getDifference(row);
                    const status = getRowStatus(row);

                    return (
                      <tr key={productId} className="transition-colors hover:bg-accent/25">
                        <td className="px-4 py-3">
                          <div className="min-w-[220px]">
                            <p className="font-medium">{row.product.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.product.category_name || 'Kategoriya ko‘rsatilmagan'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-sm">
                            <p>{row.product.sku || '-'}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {row.product.barcode || row.product.shtrix_code || '-'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {formatCurrency(row.product.purchase_price ?? row.product.min_purchase_price ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold">{row.baseQty.toLocaleString('ru-RU')}</td>
                        <td className="px-2 py-3">
                          <Input
                            type="number"
                            min={0}
                            value={row.sales}
                            onChange={(event) => handleImpactChange(productId, 'sales', Number(event.target.value))}
                            className="h-9 text-center"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <Input
                            type="number"
                            min={0}
                            value={row.transferOut}
                            onChange={(event) => handleImpactChange(productId, 'transferOut', Number(event.target.value))}
                            className="h-9 text-center"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <Input
                            type="number"
                            min={0}
                            value={row.transferIn}
                            onChange={(event) => handleImpactChange(productId, 'transferIn', Number(event.target.value))}
                            className="h-9 text-center"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <Input
                            type="number"
                            min={0}
                            value={row.incoming}
                            onChange={(event) => handleImpactChange(productId, 'incoming', Number(event.target.value))}
                            className="h-9 text-center"
                          />
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold">{systemQty.toLocaleString('ru-RU')}</td>
                        <td className="px-2 py-3">
                          <Input
                            type="number"
                            min={0}
                            value={row.actualQty}
                            onChange={(event) => handleActualChange(productId, Number(event.target.value))}
                            className="h-9 text-center font-semibold"
                          />
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold">
                          <span className={cn(difference < 0 && 'text-rose-600', difference > 0 && 'text-amber-700')}>
                            {difference > 0 ? '+' : ''}{difference.toLocaleString('ru-RU')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                              status === 'matched' && 'bg-emerald-50 text-emerald-700',
                              status === 'shortage' && 'bg-rose-50 text-rose-700',
                              status === 'overage' && 'bg-amber-50 text-amber-700',
                              status === 'pending' && 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {status === 'matched' && 'Mos'}
                            {status === 'shortage' && 'Kamomat'}
                            {status === 'overage' && 'Ortiqcha'}
                            {status === 'pending' && 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="outline" size="sm" onClick={() => handleReset(productId)}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Reset
                          </Button>
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

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-rose-50 p-3 text-rose-700">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Kamomat mahsulotlar</p>
              <p className="text-2xl font-bold">{stats.shortage}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ortiqcha mahsulotlar</p>
              <p className="text-2xl font-bold">{stats.overage}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
              <ArrowUpToLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Jami bazadagi count</p>
              <p className="text-2xl font-bold">{stats.totalBaseQty.toLocaleString('ru-RU')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
