import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CreditCard, DollarSign, Package, Store, Truck, Trophy } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { useAuthStore } from '../../app/store';
import {
  reportService,
  type DashboardTopProduct,
  type ReportData,
  type ReportsFilter,
  type ReportsQueryParams,
} from '../../services/reportService';
import { storeService } from '../../services/storeService';
import { formatCurrency, formatDate } from '../../utils';
import { logger } from '../../utils/logger';

interface BranchOption {
  id: string;
  name: string;
}

interface DashboardFiltersState {
  dateRange: {
    from: string;
    to: string;
  };
  storeId: string;
}

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetRange = (filter: ReportsFilter): { from: string; to: string } => {
  const today = new Date();
  const end = formatDateForInput(today);
  if (filter === 'weekly') {
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    return { from: formatDateForInput(startDate), to: end };
  }
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: formatDateForInput(firstDay), to: formatDateForInput(lastDay) };
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id ? String(user.store_id) : '';

  const [statType, setStatType] = useState<ReportsFilter>('monthly');
  const [rangeMode, setRangeMode] = useState<'preset' | 'custom'>('preset');
  const [filters, setFilters] = useState<DashboardFiltersState>({
    dateRange: getPresetRange('monthly'),
    storeId: userStoreId || 'all',
  });
  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([{ id: 'all', name: 'Barchasi' }]);
  const [stats, setStats] = useState<ReportData | null>(null);
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAvailableBranches([{ id: 'all', name: 'Barchasi' }]);
      return;
    }

    const loadBranches = async () => {
      if (!isAdmin) {
        setAvailableBranches([
          {
            id: userStoreId || 'all',
            name: user?.store_name || "Mening filalim",
          },
        ]);
        return;
      }

      try {
        const stores = await storeService.getAll({ limit: 100 });
        const next: BranchOption[] = [
          { id: 'all', name: 'Barchasi' },
          ...stores.data.map((store) => ({
            id: String(store.id),
            name: store.name || store.name_uz || `#${store.id}`,
          })),
        ];
        setAvailableBranches(next);
      } catch {
        setAvailableBranches([{ id: 'all', name: 'Barchasi' }]);
      }
    };

    void loadBranches();
  }, [isAdmin, user, userStoreId]);

  useEffect(() => {
    const nextStoreId = isAdmin ? filters.storeId || 'all' : userStoreId || 'all';
    if (filters.storeId !== nextStoreId) {
      setFilters((prev) => ({
        ...prev,
        storeId: nextStoreId,
      }));
    }
  }, [filters.storeId, isAdmin, userStoreId]);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setTopProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);

        const params: ReportsQueryParams = {};
        if (rangeMode === 'custom' && filters.dateRange.from && filters.dateRange.to) {
          params.from = filters.dateRange.from;
          params.to = filters.dateRange.to;
        } else {
          params.filter = statType;
        }

        const scopedStoreId = isAdmin ? filters.storeId : userStoreId;
        if (scopedStoreId && scopedStoreId !== 'all') {
          params.store_id = scopedStoreId;
        }

        const [report, topProductsData] = await Promise.all([
          reportService.getDashboardReport(params),
          reportService.getTopProducts(params),
        ]);

        if (!cancelled) {
          setStats(report);
          setTopProducts(topProductsData.slice(0, 8));
        }
      } catch (error) {
        const axiosErr = error as { response?: { status?: number } };
        if (axiosErr.response?.status !== 401) {
          logger.error('Failed to load dashboard stats:', error);
        }
        if (!cancelled) {
          setStats(null);
          setTopProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [
    filters.dateRange.from,
    filters.dateRange.to,
    filters.storeId,
    isAdmin,
    rangeMode,
    statType,
    user,
    userStoreId,
  ]);

  const handleStatTypeChange = (value: ReportsFilter) => {
    setStatType(value);
    setRangeMode('preset');
    setFilters((prev) => ({
      ...prev,
      dateRange: getPresetRange(value),
    }));
  };

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setRangeMode('custom');
    setFilters((prev) => ({
      ...prev,
      dateRange: { ...prev.dateRange, [field]: value },
    }));
  };

  const maxSold = useMemo(() => Math.max(...topProducts.map((item) => item.sold), 0), [topProducts]);
  const selectedBranchLabel = useMemo(() => {
    const branch = availableBranches.find((item) => item.id === filters.storeId);
    return branch?.name ?? "Noma'lum filial";
  }, [availableBranches, filters.storeId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.title')}
        description={isAdmin ? 'Filiallar kesimida umumiy ko‘rsatkichlar' : 'Filialingiz bo‘yicha tezkor statistika'}
      />

      <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-background to-emerald-500/5">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <Select value={statType} onValueChange={(value) => handleStatTypeChange(value as ReportsFilter)}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Davr" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Oylik</SelectItem>
              <SelectItem value="weekly">Haftalik</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filters.dateRange.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="w-full lg:w-42"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={filters.dateRange.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="w-full lg:w-42"
            />
          </div>

          <Select
            value={filters.storeId}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, storeId: value }))}
            disabled={!isAdmin}
          >
            <SelectTrigger className="w-full lg:w-52">
              <SelectValue placeholder="Filial" />
            </SelectTrigger>
            <SelectContent>
              {availableBranches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-sky-500/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalProducts')}</CardTitle>
            <Package className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{toNumber(stats?.total_products_in_stock)}</div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(toNumber(stats?.monthly_revenue))}</div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-rose-500/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalDebt')}</CardTitle>
            <CreditCard className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(toNumber(stats?.total_customer_debt))}</div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-amber-500/10 to-transparent" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.supplierDebt')}</CardTitle>
            <Truck className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(toNumber(stats?.total_supplier_debt))}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-500" />
              {t('dashboard.topProducts')}
            </CardTitle>
            <CardDescription>Tanlangan davr bo‘yicha eng ko‘p sotilgan mahsulotlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : (
              topProducts.map((product, index) => {
                const width = maxSold > 0 ? `${Math.max((product.sold / maxSold) * 100, 6)}%` : '0%';
                return (
                  <div key={product.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sold} dona sotilgan</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-emerald-600">{formatCurrency(product.revenue)}</p>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full bg-linear-to-r from-primary to-emerald-400"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtr xulosasi</CardTitle>
            <CardDescription>Aktiv parametrlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div className="text-sm">
                <p className="font-medium">
                  {filters.dateRange.from || '-'} - {filters.dateRange.to || '-'}
                </p>
                <p className="text-muted-foreground">
                  {rangeMode === 'custom' ? 'Custom range' : statType === 'monthly' ? 'Oylik' : 'Haftalik'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border p-3">
              <Store className="h-4 w-4 text-primary" />
              <div className="text-sm">
                <p className="font-medium">{selectedBranchLabel}</p>
                <p className="text-muted-foreground">Tanlangan filial</p>
              </div>
            </div>

            <div className="rounded-xl border p-3 text-sm">
              <p className="text-muted-foreground">Hisobot sanasi</p>
              <p className="mt-1 font-medium">{stats?.report_date ? formatDate(stats.report_date) : '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
