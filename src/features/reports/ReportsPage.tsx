import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDollarSign, CreditCard, ShoppingCart, TrendingUp } from 'lucide-react';
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

const getProfitLinePoints = (data: number[]): Array<{ x: number; y: number }> => {
  if (data.length === 0) return [];
  if (data.length === 1) return [{ x: 50, y: 26 }];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const spread = Math.max(max - min, 1);
  const chartWidth = 100;
  const chartHeight = 52;
  const paddingTop = 4;
  const paddingBottom = 4;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  return data.map((value, index) => {
    const ratioX = index / (data.length - 1);
    const normalized = (value - min) / spread;
    return {
      x: ratioX * chartWidth,
      y: chartHeight - paddingBottom - normalized * usableHeight,
    };
  });
};

const buildSvgPath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x} ${point.y}`;
  }
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
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
    { id: 'all', name: 'Barchasi' },
  ]);
  const [data, setData] = useState<DetailedReportsResponse>(EMPTY_REPORT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBranches = async () => {
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
  const profitPoints = useMemo(() => getProfitLinePoints(data.charts.profitTrend.data), [data.charts.profitTrend.data]);
  const profitPath = useMemo(() => buildSvgPath(profitPoints), [profitPoints]);
  const profitMaxValue = useMemo(() => Math.max(...data.charts.profitTrend.data, 0), [data.charts.profitTrend.data]);
  const trendColumnsClass =
    data.charts.profitTrend.labels.length >= 6 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.reports')} description={t('reports.description')} />

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
        <Select value={statType} onValueChange={(value) => handleStatTypeChange(value as ReportsFilter)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Statistika turi" />
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
            className="w-full sm:w-40"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={filters.dateRange.to}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="w-full sm:w-40"
          />
        </div>

        <Select value={filters.branchId} onValueChange={handleBranchChange}>
          <SelectTrigger className="w-full sm:w-45">
            <SelectValue placeholder="Filialni tanlang" />
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

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2">
                <CircleDollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jami daromad</p>
                <p className="text-lg font-semibold">{formatCurrency(data.summary.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-2">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sof foyda</p>
                <p className="text-lg font-semibold">{formatCurrency(data.summary.totalProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-2">
                <CreditCard className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jami xarajat</p>
                <p className="text-lg font-semibold">{formatCurrency(data.summary.totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Buyurtmalar</p>
                <p className="text-lg font-semibold">{formatCompactNumber(data.summary.totalOrders)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filial statistikasi</CardTitle>
            <CardDescription>Tanlangan davr bo&apos;yicha filiallar kesimida</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.branchStatistics.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Ma&apos;lumot topilmadi
              </div>
            ) : (
              data.branchStatistics.map((branch) => {
                const width = maxBranchRevenue > 0 ? `${(branch.revenue / maxBranchRevenue) * 100}%` : '0%';
                return (
                  <div key={branch.store_id} className="space-y-3 rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium">{branch.store__name || `#${branch.store_id}`}</div>
                        <div className="text-xs text-muted-foreground">
                          {branch.orders} buyurtma | {branch.customers} mijoz
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(branch.revenue)}</div>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Foyda trendi</CardTitle>
              <Select value={trendChartType} onValueChange={(value) => setTrendChartType(value as 'line' | 'bar')}>
                <SelectTrigger className="h-9 w-full sm:w-28">
                  <SelectValue placeholder="Chart turi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CardDescription>
              {rangeMode === 'custom' ? 'Tanlangan sanalar bo&apos;yicha dinamikasi' : `${statType === 'monthly' ? 'Oylik' : 'Haftalik'} dinamikasi`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-48 overflow-hidden rounded-xl border bg-muted/30 p-4">
              {trendChartType === 'line' && profitPath ? (
                <svg viewBox="0 0 100 52" className="h-full w-full">
                  <defs>
                    <linearGradient id="profitGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <path
                    d={profitPath}
                    fill="none"
                    stroke="url(#profitGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {profitPoints.map((point, index) => (
                    <circle key={index} cx={point.x} cy={point.y} r="1.8" fill="#06b6d4" />
                  ))}
                </svg>
              ) : trendChartType === 'bar' && data.charts.profitTrend.data.length > 0 ? (
                <div className="flex h-full items-end gap-2">
                  {data.charts.profitTrend.data.map((value, index) => {
                    const heightPercent = profitMaxValue > 0 ? Math.max((value / profitMaxValue) * 100, 4) : 0;
                    return (
                      <div key={`${index}-${value}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                        <div
                          className="w-full rounded-md bg-gradient-to-t from-sky-500 to-indigo-500"
                          style={{ height: `${heightPercent}%` }}
                          title={`${data.charts.profitTrend.labels[index] ?? ''}: ${formatCurrency(value)}`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Grafik ma&apos;lumoti yo&apos;q
                </div>
              )}
            </div>
            <div className={`grid gap-2 text-center text-xs ${trendColumnsClass}`}>
              {data.charts.profitTrend.labels.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed p-4 text-muted-foreground">
                  Ma&apos;lumot topilmadi
                </div>
              ) : (
                data.charts.profitTrend.labels.map((label, index) => (
                  <div key={`${label}-${index}`}>
                    <div className="text-muted-foreground">{label}</div>
                    <div className="mt-1 font-medium text-foreground">
                      {formatCurrency(data.charts.profitTrend.data[index] ?? 0)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eng ko&apos;p sotilgan mahsulotlar</CardTitle>
            <CardDescription>Tanlangan davr bo&apos;yicha TOP mahsulotlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topSellingProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Ma&apos;lumot topilmadi
              </div>
            ) : (
              data.topSellingProducts.map((product) => (
                <div
                  key={`${product.productId}-${product.rank}`}
                  className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-semibold">
                      {product.rank}
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">Sotilgan: {product.totalSold} dona</div>
                    </div>
                  </div>
                  <div className="text-left font-medium sm:text-right">{formatCurrency(product.totalRevenue)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mijoz qarzlari</CardTitle>
              <CardDescription>Tanlangan davrdagi mijoz qarzlari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.debts.customerDebts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Mijoz qarzlari yo&apos;q
                </div>
              ) : (
                data.debts.customerDebts.map((debt, index) => (
                  <div
                    key={`${debt.customerName}-${index}`}
                    className="flex items-center justify-between rounded-xl border px-3 py-2"
                  >
                    <span className="font-medium">{debt.customerName}</span>
                    <span className="font-semibold text-red-600">{formatCurrency(debt.debt)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ta&apos;minotchi qarzlari</CardTitle>
              <CardDescription>Tanlangan davrdagi ta&apos;minotchi qarzlari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.debts.supplierDebts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Ta&apos;minotchi qarzlari yo&apos;q
                </div>
              ) : (
                data.debts.supplierDebts.map((debt, index) => (
                  <div
                    key={`${debt.supplierName}-${index}`}
                    className="flex items-center justify-between rounded-xl border px-3 py-2"
                  >
                    <span className="font-medium">{debt.supplierName}</span>
                    <span className="font-semibold text-amber-600">{formatCurrency(debt.debt)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Yuklanmoqda...</div> : null}
    </div>
  );
}

export default ReportsPage;
