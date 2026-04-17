import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CircleDollarSign,
  CreditCard,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils';

interface Branch {
  id: string;
  name: string;
}

interface FilterData {
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string;
  availableBranches: Branch[];
}

interface SummaryData {
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
}

interface BranchStat {
  branchId: string;
  branchName: string;
  revenue: number;
  profit: number;
  orders: number;
  customers: number;
  debt: number;
}

interface ChartData {
  labels: string[];
  data: number[];
}

interface ProductSales {
  rank: number;
  productId: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
}

interface DebtEntry {
  customerName: string;
  debt: number;
}

interface SupplierDebt {
  supplierName: string;
  debt: number;
}

interface ReportsData {
  filters: FilterData;
  summary: SummaryData;
  branchStatistics: BranchStat[];
  charts: {
    revenueByBranch: ChartData;
    profitTrend: ChartData;
  };
  topSellingProducts: ProductSales[];
  debts: {
    customerDebts: DebtEntry[];
    supplierDebts: SupplierDebt[];
  };
}

const mockMonthlyData: ReportsData = {
  filters: {
    dateRange: {
      from: '2026-04-01',
      to: '2026-04-30',
    },
    branchId: '1',
    availableBranches: [
      { id: 'all', name: 'Barchasi' },
      { id: '1', name: 'Toshkent' },
      { id: '2', name: 'Samarqand' },
      { id: '3', name: 'Andijon' },
    ],
  },
  summary: {
    totalRevenue: 15000000,
    totalProfit: 3500000,
    totalExpenses: 11500000,
    totalOrders: 700,
    averageOrderValue: 214000,
    totalCustomers: 260,
  },
  branchStatistics: [
    {
      branchId: '1',
      branchName: 'Toshkent',
      revenue: 15000000,
      profit: 3500000,
      orders: 700,
      customers: 260,
      debt: 1200000,
    },
  ],
  charts: {
    revenueByBranch: {
      labels: ['Toshkent'],
      data: [15000000],
    },
    profitTrend: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      data: [900000, 1100000, 800000, 700000],
    },
  },
  topSellingProducts: [
    { rank: 1, productId: 'PR-01', name: 'Brake Pad', totalSold: 320, totalRevenue: 9600000 },
    { rank: 2, productId: 'PR-02', name: 'Oil Filter', totalSold: 210, totalRevenue: 4200000 },
    { rank: 3, productId: 'PR-03', name: 'Air Filter', totalSold: 180, totalRevenue: 3600000 },
    { rank: 4, productId: 'PR-04', name: 'Spark Plug', totalSold: 150, totalRevenue: 3000000 },
    { rank: 5, productId: 'PR-05', name: 'Brake Disc', totalSold: 120, totalRevenue: 2400000 },
  ],
  debts: {
    customerDebts: [{ customerName: 'Ali Valiyev', debt: 500000 }],
    supplierDebts: [{ supplierName: 'Auto Parts LLC', debt: 800000 }],
  },
};

const mockYearlyData: ReportsData = {
  filters: {
    dateRange: {
      from: '2026-01-01',
      to: '2026-12-31',
    },
    branchId: '1',
    availableBranches: [
      { id: 'all', name: 'Barchasi' },
      { id: '1', name: 'Toshkent' },
      { id: '2', name: 'Samarqand' },
      { id: '3', name: 'Andijon' },
    ],
  },
  summary: {
    totalRevenue: 180000000,
    totalProfit: 42000000,
    totalExpenses: 138000000,
    totalOrders: 8500,
    averageOrderValue: 211764,
    totalCustomers: 3100,
  },
  branchStatistics: [
    {
      branchId: '1',
      branchName: 'Toshkent',
      revenue: 180000000,
      profit: 42000000,
      orders: 8500,
      customers: 3100,
      debt: 15000000,
    },
  ],
  charts: {
    revenueByBranch: {
      labels: ['Toshkent'],
      data: [180000000],
    },
    profitTrend: {
      labels: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
      data: [3500000, 3700000, 3900000, 4200000, 4100000, 4000000, 3800000, 3900000, 4100000, 4200000, 4300000, 4400000],
    },
  },
  topSellingProducts: [
    { rank: 1, productId: 'PR-01', name: 'Brake Pad', totalSold: 3800, totalRevenue: 114000000 },
    { rank: 2, productId: 'PR-02', name: 'Oil Filter', totalSold: 2500, totalRevenue: 50000000 },
    { rank: 3, productId: 'PR-03', name: 'Air Filter', totalSold: 2100, totalRevenue: 42000000 },
    { rank: 4, productId: 'PR-04', name: 'Spark Plug', totalSold: 1800, totalRevenue: 36000000 },
    { rank: 5, productId: 'PR-05', name: 'Brake Disc', totalSold: 1500, totalRevenue: 30000000 },
  ],
  debts: {
    customerDebts: [{ customerName: 'Ali Valiyev', debt: 6000000 }],
    supplierDebts: [{ supplierName: 'Auto Parts LLC', debt: 12000000 }],
  },
};

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('uz-UZ', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);


export function ReportsPage() {
  const { t } = useTranslation();
  const [statType, setStatType] = useState<'monthly' | 'yearly'>('monthly');
  const [filters, setFilters] = useState(mockMonthlyData.filters);

  // Choose data based on statType
  const data = statType === 'monthly' ? mockMonthlyData : mockYearlyData;

  // When statType changes, update filters to match the selected period
  const handleStatTypeChange = (value: 'monthly' | 'yearly') => {
    setStatType(value);
    setFilters((value === 'monthly' ? mockMonthlyData : mockYearlyData).filters);
  };

  const handleBranchChange = (branchId: string) => {
    setFilters({ ...filters, branchId });
  };

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setFilters({ ...filters, dateRange: { ...filters.dateRange, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.reports')} description={t('reports.description')} />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Hisobotlar</h2>
              <p className="text-sm text-muted-foreground">
                Tanlangan davr uchun moliyaviy ko'rsatkichlar
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
              {/* Statistic type select */}
              <Select value={statType} onValueChange={handleStatTypeChange}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Statistika turi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Oylik</SelectItem>
                  <SelectItem value="yearly">Yillik</SelectItem>
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
                  {filters.availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2">
                <CircleDollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jami Daromad</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(data.summary.totalRevenue)}
                </p>
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
                <p className="text-xs text-muted-foreground">Sof Daromad</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(data.summary.totalProfit)}
                </p>
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
                <p className="text-xs text-muted-foreground">Jami qarzlar</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(data.summary.totalExpenses)}
                </p>
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
                <p className="text-lg font-semibold">
                  {formatCompactNumber(data.summary.totalOrders)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daromad bo'yicha filial ko'rsatkichlari</CardTitle>
            <CardDescription>Filallar bo'yicha daromad taqsimoti</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.branchStatistics.map((branch) => (
              <div key={branch.branchId} className="space-y-3 rounded-xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{branch.branchName}</div>
                    <div className="text-xs text-muted-foreground">
                      {branch.orders} buyurtma | {branch.customers} mijoz
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(branch.revenue)}</div>
                    <div className="text-xs text-muted-foreground">
                      Profit: {formatCurrency(branch.profit)}
                    </div>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-muted">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profit trendsi</CardTitle>
            <CardDescription>{statType === 'monthly' ? 'Haftalik profit dinamikasi' : 'Yillik profit dinamikasi'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-48 overflow-hidden rounded-xl border bg-muted/30 p-4">
              {/* SVG chart is static, but you can make it dynamic if needed */}
              <svg viewBox="0 0 100 52" className="h-full w-full">
                <defs>
                  <linearGradient id="profitGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 35 L 25 28 L 50 15 L 75 20 L 100 10"
                  fill="none"
                  stroke="url(#profitGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Optionally, render circles dynamically based on data.charts.profitTrend.data */}
              </svg>
            </div>
            <div className={`grid gap-2 text-center text-xs ${statType === 'monthly' ? 'grid-cols-4' : 'grid-cols-12'}`}>
              {data.charts.profitTrend.labels.map((label, index) => (
                <div key={label}>
                  <div className="text-muted-foreground">{label}</div>
                  <div className="mt-1 font-medium text-foreground">
                    {formatCurrency(data.charts.profitTrend.data[index])}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eng ko'p sotilgan mahsulotlar</CardTitle>
            <CardDescription>Tanlangan davrda eng ko'p sotilgan mahsulotlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topSellingProducts.map((product) => (
              <div
                key={product.productId}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-semibold">
                    {product.rank}
                  </div>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Sotilgan: {product.totalSold} dona
                    </div>
                  </div>
                </div>
                <div className="text-left font-medium sm:text-right">
                  {formatCurrency(product.totalRevenue)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mijoz qarzari</CardTitle>
              <CardDescription>Jami mijoz qarzlari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.debts.customerDebts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Mijoz qarzlari yo'q
                </div>
              ) : (
                data.debts.customerDebts.map((debt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-xl border px-3 py-2"
                  >
                    <span className="font-medium">{debt.customerName}</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(debt.debt)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ta'minotchi qarzari</CardTitle>
              <CardDescription>Jami ta'minotchi qarzlari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.debts.supplierDebts.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Ta'minotchi qarzlari yo'q
                </div>
              ) : (
                data.debts.supplierDebts.map((debt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-xl border px-3 py-2"
                  >
                    <span className="font-medium">{debt.supplierName}</span>
                    <span className="font-semibold text-amber-600">
                      {formatCurrency(debt.debt)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;