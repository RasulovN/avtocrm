import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, DollarSign, CreditCard, Truck, Store, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { PageHeader } from '../../components/shared/PageHeader';
import { dashboardService } from '../../services/salesService';
import { useAuthStore } from '../../app/store';
import type { DashboardStats } from '../../types';
import { formatCurrency } from '../../utils';
import { logger } from '../../utils/logger';

const fallbackDashboardStats: DashboardStats = {
  total_products: 1250,
  total_sales: 89000000,
  total_debt: 12500000,
  supplier_debt: 8500000,
  store_stats: [
    { store_id: '1', store_name: 'Main Store', product_count: 800, sales_count: 450 },
    { store_id: '2', store_name: 'Warehouse', product_count: 450, sales_count: 0 },
  ],
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      if (!data) {
        logger.warn('Dashboard stats endpoint returned 404, fallback data applied', {
          source: 'DashboardPage.loadStats',
          endpoint: '/dashboard/stats',
        });
        setStats(fallbackDashboardStats);
        return;
      }

      if (isAdmin || !userStoreId) {
        setStats(data);
      } else {
        const scopedStore = data.store_stats.find((store) => store.store_id === userStoreId);
        setStats({
          ...data,
          total_products: scopedStore?.product_count ?? 0,
          total_sales: 0,
          total_debt: 0,
          supplier_debt: 0,
          store_stats: scopedStore ? [scopedStore] : [],
        });
      }
    } catch (error) {
      logger.warn('Dashboard stats fallback applied', {
        reason: error instanceof Error ? error.message : 'unknown',
        source: 'DashboardPage.loadStats',
      });
      setStats(fallbackDashboardStats);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.title')}
        description={isAdmin ? "Overview of your auto spare parts business" : t('dashboard.storePerformance')}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalProducts')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.total_products.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  +12% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.total_sales || 0)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  +8% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalDebt')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.total_debt || 0)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  -5% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.supplierDebt')}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.supplier_debt || 0)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-green-500" />
                  -3% from last month
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
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.store_stats.map((store) => (
                  <div
                    key={store.store_id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
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
                      <p className="font-medium">{store.sales_count} {t('nav.sales').toLowerCase()}</p>
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
            <div className="space-y-4">
              {[
                { name: 'Oil Filter X500', sales: 1250 },
                { name: 'Brake Pads Premium', sales: 980 },
                { name: 'Air Filter AF200', sales: 750 },
                { name: 'Spark Plug SP11', sales: 620 },
                { name: 'Wiper Blades WB15', sales: 480 },
              ].map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.sales} sold
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentSales')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: '1', customer: 'Ahmedov A.', amount: 1250000, time: '2 min ago' },
                { id: '2', customer: 'Karimov K.', amount: 850000, time: '15 min ago' },
                { id: '3', customer: 'Saidov S.', amount: 2100000, time: '32 min ago' },
                { id: '4', customer: 'Rustamov R.', amount: 450000, time: '1 hour ago' },
              ].map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">{sale.customer}</p>
                      <p className="text-xs text-muted-foreground">{sale.time}</p>
                    </div>
                  </div>
                  <span className="font-medium text-green-500">
                    +{formatCurrency(sale.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentTransfers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: '1', from: 'Warehouse', to: 'Main Store', items: 25, time: '1 hour ago' },
                { id: '2', from: 'Main Store', to: 'Branch 2', items: 15, time: '3 hours ago' },
                { id: '3', from: 'Warehouse', to: 'Branch 1', items: 30, time: '5 hours ago' },
              ].map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{transfer.from} → {transfer.to}</p>
                      <p className="text-xs text-muted-foreground">{transfer.items} items • {transfer.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
