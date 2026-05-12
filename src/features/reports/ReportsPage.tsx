import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDollarSign, CreditCard, ShoppingCart, TrendingUp, Award, Clock, Building2, Users } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import {
  reportService,
  type DetailedReportsResponse,
  type ReportsFilter,
  type ReportsQueryParams,
} from '../../services/reportService';
import { storeService } from '../../services/storeService';
import { formatCurrency } from '../../utils';

interface BranchOption {
  id: string;
  name: string;
}

interface ReportsFiltersState {
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string;
}

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

const EMPTY_REPORT_DATA: DetailedReportsResponse = {
  filters: {},
  summary: {
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
  },
  branchStatistics: [],
  charts: {
    profitTrend: {
      labels: [],
      data: [],
    },
  },
  topSellingProducts: [],
  debts: {
    customerDebts: [],
    supplierDebts: [],
  },
};

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('uz-UZ', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

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

export function ReportsPage() {
  const { t } = useTranslation();
  const [statType, setStatType] = useState<ReportsFilter>('monthly');
  const [trendChartType, setTrendChartType] = useState<'line' | 'bar'>('line');
  const [rangeMode, setRangeMode] = useState<'preset' | 'custom'>('preset');
  const [filters, setFilters] = useState<ReportsFiltersState>({
    dateRange: getPresetRange('monthly'),
    branchId: 'all',
  });
  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([
    { id: 'all', name: t('common.all') },
  ]);
  const [data, setData] = useState<DetailedReportsResponse>(EMPTY_REPORT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBranches = async () => {
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError('');

        const params: ReportsQueryParams = {};
        if (rangeMode === 'custom' && filters.dateRange.from && filters.dateRange.to) {
          params.from = filters.dateRange.from;
          params.to = filters.dateRange.to;
        } else {
          params.filter = statType;
        }
        if (filters.branchId !== 'all') {
          params.storeId = filters.branchId;
        }

        const report = await reportService.getDetailedReport(params);
        if (!cancelled) {
          setData(report);
        }
      } catch {
        if (!cancelled) {
          setError('Hisobot ma`lumotlarini olishda xatolik yuz berdi');
          setData(EMPTY_REPORT_DATA);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [filters.branchId, filters.dateRange.from, filters.dateRange.to, rangeMode, statType]);

  const handleStatTypeChange = (value: ReportsFilter) => {
    setStatType(value);
    setRangeMode('preset');
    setFilters((prev) => ({
      ...prev,
      dateRange: getPresetRange(value),
    }));
  };

  const handleBranchChange = (branchId: string) => {
    setFilters((prev) => ({ ...prev, branchId }));
  };

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setRangeMode('custom');
    setFilters((prev) => ({
      ...prev,
      dateRange: { ...prev.dateRange, [field]: value },
    }));
  };

  const maxBranchRevenue = useMemo(
    () => Math.max(...data.branchStatistics.map((branch) => branch.revenue), 0),
    [data.branchStatistics]
  );

  const chartMaxValue = useMemo(() => {
    const max = Math.max(...data.charts.profitTrend.data, 1000);
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / (magnitude / 2)) * (magnitude / 2);
  }, [data.charts.profitTrend.data]);

  const profitPoints = useMemo(() => getProfitLinePoints(data.charts.profitTrend.data, chartMaxValue), [data.charts.profitTrend.data, chartMaxValue]);
  const smoothProfitPath = useMemo(() => buildSmoothSvgPath(profitPoints), [profitPoints]);
  const profitPath = useMemo(() => buildSvgPath(profitPoints), [profitPoints]);
  const profitMaxValue = useMemo(() => Math.max(...data.charts.profitTrend.data, 0), [data.charts.profitTrend.data]);

  const yAxisLabels = [chartMaxValue, chartMaxValue * 0.75, chartMaxValue * 0.5, chartMaxValue * 0.25, 0];

  const trendColumnsClass =
    data.charts.profitTrend.labels.length >= 6 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader title={t('nav.reports')} description={t('reports.description')} />

        <div className="flex flex-wrap gap-3 items-center bg-card rounded-xl border p-2 shadow-sm">
          <div className="flex items-center gap-2 border-r pr-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Select value={statType} onValueChange={(value) => handleStatTypeChange(value as ReportsFilter)}>
              <SelectTrigger className="h-9 w-full sm:w-32 border-none focus:ring-0 shadow-none">
                <SelectValue placeholder={t('placeholders.statType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t('reports.periods.month')}</SelectItem>
                <SelectItem value="weekly">{t('reports.periods.week')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 border-r pr-2">
            <Input
              type="date"
              value={filters.dateRange.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="h-8 w-36 border-none focus-visible:ring-0 shadow-none text-sm"
            />
            <span className="text-muted-foreground text-xs">-</span>
            <Input
              type="date"
              value={filters.dateRange.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="h-8 w-36 border-none focus-visible:ring-0 shadow-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={filters.branchId} onValueChange={handleBranchChange}>
              <SelectTrigger className="h-9 w-full sm:w-40 border-none focus:ring-0 shadow-none">
                <SelectValue placeholder={t('placeholders.selectBranch')} />
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
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
          {error}
        </div>
      )}

      {/* Premium Metric Scoreboard */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-1 shadow-sm transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-50" />
          <div className="relative rounded-[15px] bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">{t('dashboard.totalRevenue')}</p>
                <h3 className="text-2xl font-bold tracking-tight text-emerald-600 group-hover:scale-[1.02] transition-transform origin-left duration-300">{formatCurrency(data.summary.totalRevenue)}</h3>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 p-3 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <CircleDollarSign className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-1 shadow-sm transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent opacity-50" />
          <div className="relative rounded-[15px] bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">{t('reports.stats.netProfit')}</p>
                <h3 className="text-2xl font-bold tracking-tight text-indigo-600 group-hover:scale-[1.02] transition-transform origin-left duration-300">{formatCurrency(data.summary.totalProfit)}</h3>
              </div>
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/50 p-3 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-1 shadow-sm transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-linear-to-br from-rose-500/5 to-transparent opacity-50" />
          <div className="relative rounded-[15px] bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">{t('sales.totalCost')}</p>
                <h3 className="text-2xl font-bold tracking-tight text-rose-600 group-hover:scale-[1.02] transition-transform origin-left duration-300">{formatCurrency(data.summary.totalExpenses)}</h3>
              </div>
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-1 shadow-sm transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-linear-to-br from-sky-500/5 to-transparent opacity-50" />
          <div className="relative rounded-[15px] bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">{t('customers.totalOrders')}</p>
                <h3 className="text-2xl font-bold tracking-tight text-sky-600 group-hover:scale-[1.02] transition-transform origin-left duration-300">{formatCompactNumber(data.summary.totalOrders)}</h3>
              </div>
              <div className="rounded-xl bg-sky-50 dark:bg-sky-950/50 p-3 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
                <ShoppingCart className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mid Section: Chart & Branch Performance */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Dynamic Performance Trend */}
        <Card className="lg:col-span-4 shadow-md overflow-hidden border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {t('reports.performanceTrend')}
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  {rangeMode === 'custom' ? 'Shaxsiy tanlangan sana kesimi' : `${statType === 'monthly' ? 'Oylik' : 'Haftalik'} tendensiya`}
                </CardDescription>
              </div>
              <div className="inline-flex p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setTrendChartType('line')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${trendChartType === 'line' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Чизиқли
                </button>
                <button
                  onClick={() => setTrendChartType('bar')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${trendChartType === 'bar' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Устунли
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-64 w-full relative overflow-hidden pt-4 pb-2">
              {trendChartType === 'line' && smoothProfitPath ? (
                <div className="flex flex-col h-full w-full">
                  <div className="flex flex-1 relative">
                    {/* Y-Axis Left Values */}
                    <div className="flex flex-col justify-between text-right pr-3 w-14 select-none text-[10px] font-medium text-muted-foreground/70">
                      {yAxisLabels.map((lbl, i) => (
                        <div key={i} className="relative -top-[5px] h-0 leading-[10px]">
                          {new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(lbl)}
                        </div>
                      ))}
                    </div>
                    {/* Chart Core */}
                    <div className="relative flex-1 border-l border-slate-300 h-full overflow-visible">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                        <defs>
                          <linearGradient id="reportAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.2)" />
                            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
                          </linearGradient>
                        </defs>
                        {/* Grid Lines */}
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
                        {/* Bottom Blue Axis */}
                        <line
                          x1="0"
                          y1="100"
                          x2="100"
                          y2="100"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                        {/* Filled Shape */}
                        {profitPoints.length > 1 && (
                          <path
                            d={`${smoothProfitPath} L ${profitPoints[profitPoints.length - 1].x} 100 L ${profitPoints[0].x} 100 Z`}
                            fill="url(#reportAreaGrad)"
                          />
                        )}
                        {/* Line */}
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

                      {/* Data Point Indicators (HTML absolute layer) */}
                      {profitPoints.map((point, idx) => (
                        <div
                          key={idx}
                          className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-[#10b981] shadow-sm transition-all hover:scale-125 group cursor-pointer z-10"
                          style={{ left: `${point.x}%`, top: `${point.y}%` }}
                        >
                          <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity font-medium">
                            {formatCurrency(data.charts.profitTrend.data[idx] || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : trendChartType === 'bar' && data.charts.profitTrend.data.length > 0 ? (
                <div className="flex h-full items-end justify-around gap-2 md:gap-4 px-2 border-l border-slate-300 border-b-2 border-b-blue-500 ml-14">
                  {data.charts.profitTrend.data.map((value, index) => {
                    const heightPercent = profitMaxValue > 0 ? Math.max((value / profitMaxValue) * 100, 4) : 0;
                    return (
                      <div key={`${index}-${value}`} className="group/bar relative flex flex-1 flex-col items-center justify-end gap-1 h-full max-w-[40px]">
                        <div className="absolute bottom-full opacity-0 group-hover/bar:opacity-100 mb-2 bg-popover text-popover-foreground text-[10px] p-1 px-2 rounded shadow whitespace-nowrap transition-all duration-200">
                          {formatCurrency(value)}
                        </div>
                        <div
                          className="w-full rounded-t-md bg-linear-to-t from-primary via-primary to-indigo-400 opacity-90 shadow-lg group-hover/bar:opacity-100 transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-xl ml-14">
                  {t('common.noData')}
                </div>
              )}
            </div>
            
            {/* Labels grid */}
            <div className={`grid gap-3 text-center ${trendColumnsClass}`}>
              {data.charts.profitTrend.labels.map((label, index) => (
                <div key={`${label}-${index}`} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xs font-bold text-foreground truncate">
                    {formatCurrency(data.charts.profitTrend.data[index] ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Branch Statistics Breakdown */}
        <Card className="lg:col-span-3 shadow-sm border-0 shadow-emerald-100/50 dark:shadow-none">
          <CardHeader className="bg-emerald-50/30 dark:bg-emerald-950/10 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              {t('reports.storePerformance')}
            </CardTitle>
            <CardDescription className="text-xs">{t('reports.storePerformanceDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {data.branchStatistics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl">
                <Building2 className="h-10 w-10 opacity-20 mb-2" />
                <p className="text-sm">{t('common.noData')}</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[400px]">
                {data.branchStatistics.map((branch) => {
                  const width = maxBranchRevenue > 0 ? `${Math.max((branch.revenue / maxBranchRevenue) * 100, 3)}%` : '0%';
                  return (
                    <div key={branch.store_id} className="group rounded-xl border p-3 transition-all hover:border-emerald-200 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate group-hover:text-emerald-600 transition-colors">{branch.store__name || `#${branch.store_id}`}</h4>
                          <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {branch.orders}</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {branch.customers}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-sm text-emerald-600">{formatCurrency(branch.revenue)}</span>
                        </div>
                      </div>
                      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full rounded-full bg-linear-to-r from-emerald-500 via-emerald-400 to-teal-300 transition-all duration-700 group-hover:from-emerald-600"
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
      </div>

      {/* Bottom Lists: Best Products & Debts */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Top Selling Section */}
        <Card className="lg:col-span-3 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">{t('dashboard.topProducts')}</CardTitle>
                <CardDescription className="text-xs">{t('reports.topProductsDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.topSellingProducts.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-sm text-muted-foreground">
                <Award className="h-12 w-12 opacity-20 mb-2" />
                <p>{t('common.noData')}</p>
              </div>
            ) : (
              <div className="divide-y">
                {data.topSellingProducts.map((product, index) => (
                  <div key={`${product.productId}-${index}`} className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/30">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                      {product.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate leading-none mb-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="text-foreground font-medium">{product.totalSold}</span> {t('common.pcs')}
                      </p>
                    </div>
                    <div className="text-right font-bold text-sm tracking-tight text-emerald-600">
                      {formatCurrency(product.totalRevenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Multi-Section Debts Pane */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Customer Debts Pane */}
          <Card className="flex-1 shadow-sm border-l-4 border-l-rose-500 shadow-rose-100/20 dark:shadow-none">
            <CardHeader className="pb-3 border-b border-dashed">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-rose-500" />
                  {t('dashboard.totalDebt')}
                </CardTitle>
                <span className="text-xs text-muted-foreground font-medium uppercase">{t('reports.customers')}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {data.debts.customerDebts.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground font-medium bg-muted/20 rounded-xl border border-dashed">
                  {t('dashboard.noDebts')}
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {data.debts.customerDebts.map((debt, index) => (
                    <div
                      key={`${debt.customerName}-${index}`}
                      className="flex items-center justify-between p-3 rounded-xl border bg-card hover:border-rose-200 transition-colors"
                    >
                      <span className="text-sm font-medium text-muted-foreground truncate pr-2">{debt.customerName}</span>
                      <span className="font-bold text-sm text-rose-600 whitespace-nowrap">{formatCurrency(debt.debt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Debts Pane */}
          <Card className="flex-1 shadow-sm border-l-4 border-l-amber-500 shadow-amber-100/20 dark:shadow-none">
            <CardHeader className="pb-3 border-b border-dashed">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-500" />
                  {t("reports.supplierDebts")}
                </CardTitle>
                <span className="text-xs text-muted-foreground font-medium uppercase">{t('reports.suppliers')}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {data.debts.supplierDebts.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground font-medium bg-muted/20 rounded-xl border border-dashed">
                  {t("reports.noSupplierDebts", "Қарзлар мавжуд эмас")}
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {data.debts.supplierDebts.map((debt, index) => (
                    <div
                      key={`${debt.supplierName}-${index}`}
                      className="flex items-center justify-between p-3 rounded-xl border bg-card hover:border-amber-200 transition-colors"
                    >
                      <span className="text-sm font-medium text-muted-foreground truncate pr-2">{debt.supplierName}</span>
                      <span className="font-bold text-sm text-amber-600 whitespace-nowrap">{formatCurrency(debt.debt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm shadow-lg animate-bounce font-medium">
          {t('common.loading')}
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
