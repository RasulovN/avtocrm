import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  Package,
  Store,
  Truck,
  Trophy,
  TrendingUp,
  ShoppingCart,
  Users,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';
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
  type DetailedReportsResponse,
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

const getProfitLinePoints = (data: number[], maxValue: number): Array<{ x: number; y: number }> => {
  if (data.length === 0) return [];
  if (data.length === 1) return [{ x: 50, y: 50 }];

  const chartWidth = 100;
  const chartHeight = 100;
  const safeMax = maxValue || 1;

  return data.map((value, index) => {
    const ratioX = index / Math.max(1, data.length - 1);
    const ratioY = Math.max(0, Math.min(value / safeMax, 1));
    return {
      x: ratioX * chartWidth,
      y: chartHeight - ratioY * chartHeight,
    };
  });
};

const buildSmoothSvgPath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x} ${point.y}`;
  }
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const controlX = (curr.x + next.x) / 2;
    path += ` C ${controlX} ${curr.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
};

const buildSvgPath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
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
  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([{ id: 'all', name: t('common.all') }]);
  const [stats, setStats] = useState<ReportData | null>(null);
  const [detailedData, setDetailedData] = useState<DetailedReportsResponse | null>(null);
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAvailableBranches([{ id: 'all', name: t('common.all') }]);
      return;
    }

    const loadBranches = async () => {
      if (!isAdmin) {
        setAvailableBranches([
          {
            id: userStoreId || 'all',
            name: user?.store_name || t('common.myBranch', "Менинг филиалим"),
          },
        ]);
        return;
      }

      try {
        const stores = await storeService.getAll({ limit: 100 });
        const next: BranchOption[] = [
          { id: 'all', name: t('common.all') },
          ...stores.data.map((store) => ({
            id: String(store.id),
            name: store.name || store.name_uz || `#${store.id}`,
          })),
        ];
        setAvailableBranches(next);
      } catch {
        setAvailableBranches([{ id: 'all', name: t('common.all') }]);
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
      setDetailedData(null);
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

        const [report, topProductsData, detailedResponse] = await Promise.allSettled([
          reportService.getDashboardReport(params),
          reportService.getTopProducts(params),
          reportService.getDetailedReport(params),
        ]);

        if (!cancelled) {
          if (report.status === 'fulfilled') setStats(report.value);
          if (topProductsData.status === 'fulfilled') setTopProducts(topProductsData.value.slice(0, 6));
          if (detailedResponse.status === 'fulfilled') setDetailedData(detailedResponse.value);
        }
      } catch (error) {
        const axiosErr = error as { response?: { status?: number } };
        if (axiosErr.response?.status !== 401) {
          logger.error('Failed to load dashboard stats:', error);
        }
        if (!cancelled) {
          setStats(null);
          setDetailedData(null);
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
    return branch?.name ?? t('common.unknown', "Номаълум филиал");
  }, [availableBranches, filters.storeId]);

  const profitChartData = detailedData?.charts?.profitTrend?.data || [];
  
  // Calculate appropriate rounded max scale for the chart
  const chartMaxValue = useMemo(() => {
    const max = Math.max(...profitChartData, 1000);
    // Scale intelligently: find next 1000s or appropriate scale step
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / (magnitude / 2)) * (magnitude / 2);
  }, [profitChartData]);

  const profitPoints = useMemo(() => getProfitLinePoints(profitChartData, chartMaxValue), [profitChartData, chartMaxValue]);
  const smoothProfitPath = useMemo(() => buildSmoothSvgPath(profitPoints), [profitPoints]);
  const trendLabels = detailedData?.charts?.profitTrend?.labels || [];
  
  // Generate dynamic grid marks [0, 25%, 50%, 75%, 100%]
  const yAxisLabels = [
    chartMaxValue,
    chartMaxValue * 0.75,
    chartMaxValue * 0.5,
    chartMaxValue * 0.25,
    0,
  ];

  const summary = detailedData?.summary || {
    totalRevenue: toNumber(stats?.monthly_revenue),
    totalProfit: 0,
    totalExpenses: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title={t('dashboard.title')}
          description={isAdmin ? t('dashboard.subtitleAdmin', 'Филиаллар кесимида умумий кўрсаткичлар ва таҳлил') : t('dashboard.subtitleUser', 'Филиалингиз бўйича тезкор статистика')}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={statType} onValueChange={(value) => handleStatTypeChange(value as ReportsFilter)}>
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder={t('placeholders.period')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{t('reports.periods.month')}</SelectItem>
              <SelectItem value="weekly">{t('reports.periods.week')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.storeId}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, storeId: value }))}
            disabled={!isAdmin}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder={t('placeholders.branch')} />
            </SelectTrigger>
            <SelectContent>
              {availableBranches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Revenue */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl duration-300">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('dashboard.totalRevenue')}</p>
              {loading ? (
                <div className="mt-2 h-8 w-32 animate-pulse rounded-md bg-muted" />
              ) : (
                <h3 className="mt-2 text-3xl font-bold tracking-tight">{formatCurrency(summary.totalRevenue || toNumber(stats?.monthly_revenue))}</h3>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="mr-1 h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-600">{t('dashboard.activeFlow')}</span>
          </div>
        </div>

        {/* Net Profit or Expenses */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl duration-300">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/10 blur-2xl transition-all group-hover:bg-violet-500/20" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reports.stats.netProfit', 'Соф фойда')}</p>
              {loading ? (
                <div className="mt-2 h-8 w-32 animate-pulse rounded-md bg-muted" />
              ) : (
                <h3 className="mt-2 text-3xl font-bold tracking-tight">{formatCurrency(summary.totalProfit || 0)}</h3>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="mr-1 h-4 w-4 text-violet-600" />
            <span className="font-medium text-violet-600">{t('dashboard.estimation')}</span>
          </div>
        </div>

        {/* Total Customer Debt */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl duration-300">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-500/10 blur-2xl transition-all group-hover:bg-rose-500/20" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('dashboard.totalDebt')}</p>
              {loading ? (
                <div className="mt-2 h-8 w-32 animate-pulse rounded-md bg-muted" />
              ) : (
                <h3 className="mt-2 text-3xl font-bold tracking-tight">{formatCurrency(toNumber(stats?.total_customer_debt))}</h3>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingDown className="mr-1 h-4 w-4 text-rose-600" />
            <span className="font-medium text-rose-600">{t('dashboard.payables')}</span>
          </div>
        </div>

        {/* Stock Status */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl duration-300">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('dashboard.totalProducts')}</p>
              {loading ? (
                <div className="mt-2 h-8 w-32 animate-pulse rounded-md bg-muted" />
              ) : (
                <h3 className="mt-2 text-3xl font-bold tracking-tight">{toNumber(stats?.total_products_in_stock)}</h3>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110">
              <Package className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Store className="mr-1 h-4 w-4 text-amber-600" />
            <span className="font-medium text-amber-600">{t('dashboard.inInventory')}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Primary Content: Sales/Profit Chart */}
        <Card className="lg:col-span-4 xl:col-span-5 overflow-hidden rounded-2xl border shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2 border-b bg-muted/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">{t('reports.performanceTrend', 'Фаолият тенденцияси')}</CardTitle>
                <CardDescription className="mt-1">{t('reports.profitProgression')}</CardDescription>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.dateRange.from}
                  onChange={(e) => handleDateChange('from', e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="h-8 w-32 text-xs cursor-pointer"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={filters.dateRange.to}
                  onChange={(e) => handleDateChange('to', e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="h-8 w-32 text-xs cursor-pointer"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 px-4 sm:px-8 pb-6">
            {loading ? (
              <div className="h-[300px] w-full animate-pulse rounded-xl bg-muted/50" />
            ) : smoothProfitPath ? (
              <div className="flex flex-col h-[350px] w-full">
                <div className="flex flex-1 relative">
                  {/* Y-Axis value labels on left */}
                  <div className="flex flex-col justify-between text-right pr-3 w-16 select-none text-xs font-medium text-muted-foreground/70">
                    {yAxisLabels.map((lbl, i) => (
                      <div key={i} className="relative -top-[6px] h-0 leading-[12px]">
                        {new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(lbl)}
                      </div>
                    ))}
                  </div>
                  
                  {/* Inner chart area */}
                  <div className="relative flex-1 border-l border-slate-300 h-full">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                      <defs>
                        <linearGradient id="perfectAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(16, 185, 129, 0.25)" />
                          <stop offset="100%" stopColor="rgba(16, 185, 129, 0.02)" />
                        </linearGradient>
                      </defs>

                      {/* Dashed horizontal grid lines */}
                      {[25, 50, 75, 0].map((y) => (
                        <line
                          key={y}
                          x1="0"
                          y1={y}
                          x2="100"
                          y2={y}
                          stroke="#cbd5e1"
                          strokeWidth="1"
                          strokeDasharray="4,3"
                          vectorEffect="non-scaling-stroke"
                          opacity="0.6"
                        />
                      ))}

                      {/* Dashed vertical grid lines for points */}
                      {profitPoints.map((p, i) => (
                        <line
                          key={i}
                          x1={p.x}
                          y1="0"
                          x2={p.x}
                          y2="100"
                          stroke="#cbd5e1"
                          strokeWidth="1"
                          strokeDasharray="4,3"
                          vectorEffect="non-scaling-stroke"
                          opacity="0.6"
                        />
                      ))}

                      {/* Solid thick blue bottom axis */}
                      <line
                        x1="0"
                        y1="100"
                        x2="100"
                        y2="100"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                      />

                      {/* Filled curve region */}
                      {profitPoints.length > 1 && (
                        <path
                          d={`${smoothProfitPath} L ${profitPoints[profitPoints.length - 1].x} 100 L ${profitPoints[0].x} 100 Z`}
                          fill="url(#perfectAreaGradient)"
                        />
                      )}

                      {/* Smoothed Curve line */}
                      <path
                        d={smoothProfitPath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>

                    {/* Data Point Indicators (HTML absolute for perfect circular rendering) */}
                    {profitPoints.map((point, idx) => (
                      <div
                        key={idx}
                        className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-[#10b981] shadow-sm transition-all hover:scale-125 group cursor-pointer z-10"
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      >
                        {/* Tooltip (Optional enhancement) */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap transition-opacity font-medium">
                          {formatCurrency(profitChartData[idx] || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* X-Axis Dates underneath (Aligned to the left border indentation) */}
                <div className="flex pl-16 w-full select-none">
                  <div className="flex w-full justify-between pt-3 relative">
                    {trendLabels.map((lbl, idx) => {
                      // Offset logic for first and last label constraint
                      const style: React.CSSProperties = {};
                      if (idx === 0) style.transform = 'translateX(0%)';
                      else if (idx === trendLabels.length - 1) style.transform = 'translateX(-100%)';
                      else style.transform = 'translateX(-50%)';

                      const leftPct = profitPoints[idx] ? `${profitPoints[idx].x}%` : `${(idx / (trendLabels.length - 1)) * 100}%`;
                      
                      return (
                        <div
                          key={idx}
                          className="absolute text-xs font-medium text-slate-500 whitespace-nowrap"
                          style={{ left: leftPct, ...style }}
                        >
                          {lbl}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Color Legend at the bottom center (Matching reference picture) */}
                <div className="flex items-center justify-center gap-6 pt-10 pb-2 w-full text-sm font-semibold">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <div className="flex items-center justify-center relative w-8">
                      <div className="absolute w-full h-[2px] bg-emerald-500" />
                      <div className="relative h-2.5 w-2.5 rounded-full border-2 border-emerald-600 bg-white" />
                    </div>
                    <span>{t('reports.stats.netProfit', 'Соф фойда')} ($)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-xl border-2 border-dashed bg-muted/20">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                  <p className="mt-2 text-sm text-muted-foreground font-medium">{t('common.loading')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Secondary Sidebar Stats */}
        <div className="grid gap-6 lg:col-span-3 xl:col-span-2">
          {/* Snapshot stats cards (Orders, Average, Customers) */}
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <Card className="p-4 transition-all hover:bg-accent/5 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('customers.totalOrders')}</p>
                  <p className="text-lg font-bold leading-none">{toNumber(summary.totalOrders)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 transition-all hover:bg-accent/5 border-l-4 border-l-indigo-500">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('reports.stats.avgOrder')}</p>
                  <p className="text-lg font-bold leading-none">{formatCurrency(summary.averageOrderValue || 0)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 transition-all hover:bg-accent/5 border-l-4 border-l-teal-500">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-teal-50 p-2 text-teal-600 dark:bg-teal-950">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('reports.stats.totalCustomers')}</p>
                  <p className="text-lg font-bold leading-none">{toNumber(summary.totalCustomers)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Summary Context */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('dashboard.activeParameters')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                <div className="rounded-full bg-background p-1.5 text-primary shadow-sm">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <p className="font-medium text-foreground">
                    {filters.dateRange.from || '-'} &mdash; {filters.dateRange.to || '-'}
                  </p>
                  <p className="text-muted-foreground">{t('reports.analysisPeriod', 'Таҳлил даври')} ({rangeMode})</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                <div className="rounded-full bg-background p-1.5 text-emerald-600 shadow-sm">
                  <Store className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <p className="font-medium text-foreground">{selectedBranchLabel}</p>
                  <p className="text-muted-foreground">{t('placeholders.branch')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Products and Detailed Lists */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500 fill-amber-500/20" />
              <div>
                <CardTitle className="text-lg">{t('dashboard.topProducts')}</CardTitle>
                <CardDescription>{t('reports.topProductsDescription', 'Кўп сотилган маҳсулотлар')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-0 divide-y">
                {[1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                <Package className="mb-2 h-10 w-10 opacity-20" />
                <p>{t('common.noData')}</p>
              </div>
            ) : (
              <div className="divide-y">
                {topProducts.map((product, index) => {
                  const width = maxSold > 0 ? `${Math.max((product.sold / maxSold) * 100, 2)}%` : '0%';
                  return (
                    <div key={product.id} className="group p-4 transition-colors hover:bg-accent/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center font-bold text-muted-foreground">
                            <div className="absolute inset-0 rotate-45 scale-75 rounded-lg bg-muted/50 transition-all group-hover:rotate-90 group-hover:bg-primary/10 group-hover:text-primary" />
                            <span className="relative transition-colors group-hover:text-primary">#{index + 1}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold tracking-tight text-sm sm:text-base group-hover:text-primary transition-colors">{product.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3" /> {product.sold} {t('common.pcs', 'дона')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-emerald-600">{formatCurrency(product.revenue)}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-primary via-indigo-500 to-emerald-500 transition-all duration-700 ease-out"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debt summary container */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-amber-500" />
                  {t('dashboard.supplierDebt', 'Етказиб берувчи қарзлари')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="py-4">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-12 animate-pulse rounded-lg bg-muted" />
                  <div className="h-12 animate-pulse rounded-lg bg-muted" />
                </div>
              ) : toNumber(stats?.total_supplier_debt) === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Truck className="mb-2 h-8 w-8 opacity-20" />
                  <p className="text-xs font-medium">{t('dashboard.noDebts')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200">
                    <span className="text-sm font-medium">{t('reports.stats.totalBalance', 'Жами баланс')}:</span>
                    <span className="text-lg font-bold">{formatCurrency(toNumber(stats?.total_supplier_debt))}</span>
                  </div>
                  <div className="p-4 border-2 border-dashed rounded-xl text-center">
                    <p className="text-xs text-muted-foreground">{t('reports.checkDetails', 'Батафсил таҳлилни "Ҳисоботлар" саҳифасида кўринг')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
