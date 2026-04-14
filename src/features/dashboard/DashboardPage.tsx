import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, DollarSign, Package, Store, TrendingUp, Truck } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useAuthStore } from '../../app/store';
import { productService } from '../../services/productService';
import { reportService, type ReportData } from '../../services/reportService';
import { salesService } from '../../services/salesService';
import { storeService } from '../../services/storeService';
import { transferService } from '../../services/transferService';
import type { Product, Sale, Store as StoreType, Transfer } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import { logger } from '../../utils/logger';

interface StorePerformanceItem {
  store_id: string;
  store_name: string;
  product_count: number;
  sales_count: number;
}

interface TopProductItem {
  id: string;
  name: string;
  sold: number;
}

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getRelativeTimeLabel = (date: string): string => {
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return '-';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return 'Hozir';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min oldin`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} kun oldin`;

  return formatDate(date);
};

const getTransferQuantity = (transfer: Transfer): number => {
  if (Array.isArray(transfer.items) && transfer.items.length > 0) {
    return transfer.items.reduce((sum, item) => sum + toNumber(item.quantity), 0);
  }
  return toNumber(transfer.quantity);
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id ? String(user.store_id) : '';

  const [stats, setStats] = useState<ReportData | null>(null);
  const [storeStats, setStoreStats] = useState<StorePerformanceItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setStoreStats([]);
      setTopProducts([]);
      setRecentSales([]);
      setRecentTransfers([]);
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);

        const [report, productsResponse, salesResponse, transfersResponse, storesResponse] = await Promise.all([
          reportService.getReport(),
          productService.getAll({ limit: 500 }),
          salesService.getAll({ limit: 200 }),
          transferService.getAll({ limit: 200 }),
          storeService.getAll({ limit: 100 }),
        ]);

        const allProducts = Array.isArray(productsResponse.data) ? productsResponse.data : [];
        const allSales = Array.isArray(salesResponse.data) ? salesResponse.data : [];
        const allTransfers = Array.isArray(transfersResponse.data) ? transfersResponse.data : [];
        const allStores = Array.isArray(storesResponse.data) ? storesResponse.data : [];

        const scopedSales = isAdmin
          ? allSales
          : allSales.filter((sale) => String(sale.store) === userStoreId);

        const scopedTransfers = isAdmin
          ? allTransfers
          : allTransfers.filter(
              (transfer) =>
                String(transfer.from_store) === userStoreId || String(transfer.to_store) === userStoreId
            );

        const relevantStores = isAdmin
          ? allStores
          : allStores.filter((store) => String(store.id) === userStoreId);

        const storeMeta = new Map<string, StoreType>();
        relevantStores.forEach((store) => {
          storeMeta.set(String(store.id), store);
        });

        const productSetsByStore = new Map<string, Set<string>>();
        allProducts.forEach((product: Product) => {
          const inventory = Array.isArray(product.inventory_by_store) ? product.inventory_by_store : [];

          if (inventory.length > 0) {
            inventory.forEach((entry) => {
              const storeId = String(entry.store_id);
              if (!isAdmin && storeId !== userStoreId) return;

              const current = productSetsByStore.get(storeId) ?? new Set<string>();
              current.add(String(product.id));
              productSetsByStore.set(storeId, current);

              if (!storeMeta.has(storeId)) {
                storeMeta.set(storeId, {
                  id: storeId,
                  name: entry.store_name,
                  name_uz: entry.store_name,
                  name_uz_cyrl: '',
                  address: '',
                  address_uz: '',
                  address_uz_cyrl: '',
                  phone: '',
                  phone_number: '',
                  is_warehouse: false,
                  created_at: '',
                });
              }
            });
            return;
          }

          if (!product.store_id) return;
          const storeId = String(product.store_id);
          if (!isAdmin && storeId !== userStoreId) return;

          const current = productSetsByStore.get(storeId) ?? new Set<string>();
          current.add(String(product.id));
          productSetsByStore.set(storeId, current);
        });

        const salesCountByStore = new Map<string, number>();
        scopedSales.forEach((sale) => {
          const storeId = String(sale.store);
          salesCountByStore.set(storeId, (salesCountByStore.get(storeId) ?? 0) + 1);
        });

        const derivedStoreStats = Array.from(storeMeta.entries())
          .map(([storeId, store]) => ({
            store_id: storeId,
            store_name: store.name || store.name_uz || storeId,
            product_count: productSetsByStore.get(storeId)?.size ?? 0,
            sales_count: salesCountByStore.get(storeId) ?? 0,
          }))
          .filter((item) => item.product_count > 0 || item.sales_count > 0)
          .sort((a, b) => b.sales_count - a.sales_count || b.product_count - a.product_count);

        const productNameById = new Map<string, string>();
        allProducts.forEach((product) => {
          productNameById.set(String(product.id), product.name);
        });

        const soldByProduct = new Map<string, TopProductItem>();
        scopedSales.forEach((sale) => {
          sale.items.forEach((item) => {
            const productId = String(item.product);
            const quantity = toNumber(item.quantity);
            const current = soldByProduct.get(productId);
            soldByProduct.set(productId, {
              id: productId,
              name: productNameById.get(productId) ?? `#${productId}`,
              sold: (current?.sold ?? 0) + quantity,
            });
          });
        });

        const derivedTopProducts = Array.from(soldByProduct.values())
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 5);

        const sortedSales = [...scopedSales]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 4);

        const sortedTransfers = [...scopedTransfers]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3);

        setStats(report);
        setStoreStats(derivedStoreStats);
        setTopProducts(derivedTopProducts);
        setRecentSales(sortedSales);
        setRecentTransfers(sortedTransfers);
      } catch (error) {
        const axiosErr = error as { response?: { status?: number } };
        if (axiosErr.response?.status !== 401) {
          logger.error('Failed to load dashboard stats:', error);
        }
        setStats(null);
        setStoreStats([]);
        setTopProducts([]);
        setRecentSales([]);
        setRecentTransfers([]);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [isAdmin, user, userStoreId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.title')}
        description={isAdmin ? "Overview of your auto spare parts business" : t('dashboard.storePerformance')}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalProducts')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 animate-pulse rounded bg-muted" />
            ) : (
              <>
                <div className="text-2xl font-bold">{toNumber(stats?.total_products_in_stock)}</div>
                <p className="text-xs text-muted-foreground">
                  {storeStats.length} {t('dashboard.storePerformance').toLowerCase()}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-green-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 animate-pulse rounded bg-muted" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(toNumber(stats?.monthly_revenue))}</div>
                <p className="text-xs text-muted-foreground">
                  {recentSales.length} {t('dashboard.recentSales').toLowerCase()}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalDebt')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 animate-pulse rounded bg-muted" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(toNumber(stats?.total_customer_debt))}</div>
                <p className="text-xs text-muted-foreground">
                  Hisobot sanasi: {stats?.report_date ? formatDate(stats.report_date) : '-'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-orange-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.supplierDebt')}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 animate-pulse rounded bg-muted" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(toNumber(stats?.total_supplier_debt))}</div>
                <p className="text-xs text-muted-foreground">
                  {recentTransfers.length} {t('dashboard.recentTransfers').toLowerCase()}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.storePerformance')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : storeStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              <div className="space-y-4">
                {storeStats.map((store) => (
                  <div
                    key={store.store_id}
                    className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{store.store_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {store.product_count} {t('nav.products').toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {store.sales_count} {t('nav.sales').toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.topProducts')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{product.sold} dona</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentSales')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                        <DollarSign className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{sale.customer_name || `#${sale.id}`}</p>
                        <p className="text-xs text-muted-foreground">{getRelativeTimeLabel(sale.created_at)}</p>
                      </div>
                    </div>
                    <span className="font-medium text-green-500">
                      +{formatCurrency(toNumber(sale.total_amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentTransfers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : recentTransfers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              <div className="space-y-4">
                {recentTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                        <Truck className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {(transfer.from_store_name || transfer.from_store || '-') + ' -> ' + (transfer.to_store_name || transfer.to_store || '-')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getTransferQuantity(transfer)} dona | {getRelativeTimeLabel(transfer.created_at)}
                        </p>
                      </div>
                    </div>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
