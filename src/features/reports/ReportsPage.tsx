import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightLeft,
  BarChart3,
  Calendar,
  CircleDollarSign,
  CreditCard,
  Database,
  Download,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';
import { salesService } from '../../services/salesService';
import { storeService } from '../../services/storeService';
import { supplierService } from '../../services/supplierService';
import { transferService } from '../../services/transferService';
import type { Inventory, Product, Sale, Store, Supplier, Transfer } from '../../types';
import { formatCurrency, formatDateShort } from '../../utils';

type ReportType = 'all' | 'sales' | 'inventory' | 'financial' | 'transfer';
type PeriodType = 'week' | 'month' | 'quarter' | 'year';

interface ReportsData {
  sales: Sale[];
  inventory: Inventory[];
  transfers: Transfer[];
  stores: Store[];
  suppliers: Supplier[];
  products: Product[];
}

interface TrendPoint {
  label: string;
  revenue: number;
  purchase: number;
  profit: number;
}

interface GeneratedReport {
  id: string;
  type: Exclude<ReportType, 'all'>;
  title: string;
  summary: string;
  periodLabel: string;
  generatedAt: string;
  status: 'ready';
}

interface ReportsAnalytics {
  revenue: number;
  purchase: number;
  profit: number;
  debt: number;
  supplierDebt: number;
  avgReceipt: number;
  margin: number;
  salesCount: number;
  totalUnitsSold: number;
  totalUnitsReceived: number;
  revenueChange: number;
  purchaseChange: number;
  profitChange: number;
  debtChange: number;
  trend: TrendPoint[];
  chartValues: number[];
  storePerformance: { id: string; name: string; revenue: number; profit: number; salesCount: number; transferCount: number }[];
  topSelling: { name: string; quantity: number; revenue: number }[];
  stockMix: { name: string; quantity: number }[];
  transfersByStatus: { completed: number; pending: number; rejected: number };
  generatedReports: GeneratedReport[];
}

type ExportRow = Record<string, string | number>;

const EMPTY_DATA: ReportsData = {
  sales: [],
  inventory: [],
  transfers: [],
  stores: [],
  suppliers: [],
  products: [],
};

const REPORT_TYPE_STYLES: Record<Exclude<ReportType, 'all'>, { icon: typeof CircleDollarSign; accent: string; soft: string }> = {
  sales: { icon: CircleDollarSign, accent: 'text-emerald-600', soft: 'bg-emerald-500/10' },
  inventory: { icon: Warehouse, accent: 'text-sky-600', soft: 'bg-sky-500/10' },
  financial: { icon: BarChart3, accent: 'text-violet-600', soft: 'bg-violet-500/10' },
  transfer: { icon: ArrowRightLeft, accent: 'text-amber-600', soft: 'bg-amber-500/10' },
};

const getSafeArray = <T,>(result: PromiseSettledResult<{ data: T[] }>): T[] =>
  result.status === 'fulfilled' ? result.value.data : [];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getRangeStart = (period: PeriodType, now: Date) => {
  const end = startOfDay(now);
  if (period === 'week') return addDays(end, -6);
  if (period === 'month') return addDays(end, -29);
  if (period === 'quarter') return addMonths(end, -2);
  return addMonths(end, -11);
};

const getPreviousRange = (period: PeriodType, now: Date) => {
  const currentStart = getRangeStart(period, now);
  if (period === 'week' || period === 'month') {
    const days = period === 'week' ? 7 : 30;
    const prevEnd = addDays(currentStart, -1);
    const prevStart = addDays(prevEnd, -(days - 1));
    return { start: prevStart, end: prevEnd };
  }

  if (period === 'quarter') {
    const prevStart = addMonths(currentStart, -3);
    return { start: prevStart, end: addDays(currentStart, -1) };
  }

  const prevStart = addMonths(currentStart, -12);
  return { start: prevStart, end: addDays(currentStart, -1) };
};

const isWithinRange = (value: string | undefined, start: Date, end: Date) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date <= end;
};

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('uz-UZ', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const groupLabel = (date: Date, period: PeriodType) => {
  if (period === 'week') {
    return new Intl.DateTimeFormat('uz-UZ', { weekday: 'short' }).format(date);
  }

  if (period === 'month') {
    return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short' }).format(date);
  }

  return new Intl.DateTimeFormat('uz-UZ', { month: 'short' }).format(date);
};

const buildTrend = (sales: Sale[], inventory: Inventory[], period: PeriodType, now: Date): TrendPoint[] => {
  if (period === 'week') {
    const start = getRangeStart(period, now);
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(start, index);
      const revenue = sales
        .filter((sale) => isWithinRange(sale.created_at, day, addDays(day, 1)))
        .reduce((sum, sale) => sum + (sale.total_price || sale.total || 0), 0);
      const purchase = inventory
        .filter((item) => isWithinRange(item.created_at, day, addDays(day, 1)))
        .reduce((sum, item) => sum + item.total, 0);
      const profit = sales
        .filter((sale) => isWithinRange(sale.created_at, day, addDays(day, 1)))
        .reduce((sum, sale) => sum + sale.profit, 0);

      return { label: groupLabel(day, period), revenue, purchase, profit };
    });
  }

  if (period === 'month') {
    const start = getRangeStart(period, now);
    return Array.from({ length: 5 }, (_, index) => {
      const bucketStart = addDays(start, index * 7);
      const bucketEnd = index === 4 ? now : addDays(bucketStart, 6);
      const revenue = sales
        .filter((sale) => isWithinRange(sale.created_at, bucketStart, bucketEnd))
        .reduce((sum, sale) => sum + (sale.total_price || sale.total || 0), 0);
      const purchase = inventory
        .filter((item) => isWithinRange(item.created_at, bucketStart, bucketEnd))
        .reduce((sum, item) => sum + item.total, 0);
      const profit = sales
        .filter((sale) => isWithinRange(sale.created_at, bucketStart, bucketEnd))
        .reduce((sum, sale) => sum + sale.profit, 0);

      return { label: groupLabel(bucketStart, period), revenue, purchase, profit };
    });
  }

  const bucketCount = period === 'quarter' ? 3 : 12;
  const start = getRangeStart(period, now);

  return Array.from({ length: bucketCount }, (_, index) => {
    const monthStart = addMonths(start, index);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
    const revenue = sales
      .filter((sale) => isWithinRange(sale.created_at, monthStart, monthEnd))
      .reduce((sum, sale) => sum + (sale.total_price || sale.total || 0), 0);
    const purchase = inventory
      .filter((item) => isWithinRange(item.created_at, monthStart, monthEnd))
      .reduce((sum, item) => sum + item.total, 0);
    const profit = sales
      .filter((sale) => isWithinRange(sale.created_at, monthStart, monthEnd))
      .reduce((sum, sale) => sum + sale.profit, 0);

    return { label: groupLabel(monthStart, period), revenue, purchase, profit };
  });
};

const buildLinePath = (values: number[], width: number, height: number) => {
  if (!values.length) return '';

  const maxValue = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / maxValue) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

const toExportValue = (value: string | number) => value;

const createWorksheet = (
  workbook: { addWorksheet: (name: string) => { columns?: Array<{ header: string; key: string; width: number }>; addRows: (rows: ExportRow[]) => void; addRow: (row: string[]) => void; getRow: (index: number) => { font?: { bold: boolean } } } },
  name: string,
  rows: ExportRow[]
) => {
  const worksheet = workbook.addWorksheet(name);

  if (rows.length === 0) {
    worksheet.addRow(['No data']);
    return;
  }

  const headers = Object.keys(rows[0]);
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 2, 14), 28),
  }));

  worksheet.addRows(
    rows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, toExportValue(value)]))
    )
  );

  headers.forEach((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...rows.map((row) => String(row[header] ?? '').length)
    );
    if (worksheet.columns?.[index]) {
      worksheet.columns[index].width = Math.min(Math.max(maxLength + 2, 14), 36);
    }
  });

  worksheet.getRow(1).font = { bold: true };
};

const downloadFile = (buffer: ArrayBuffer, fileName: string) => {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const DonutChart = ({
  completed,
  pending,
  rejected,
  label,
}: {
  completed: number;
  pending: number;
  rejected: number;
  label: string;
}) => {
  const values = [completed, pending, rejected];
  const total = values.reduce((sum, value) => sum + value, 0);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const normalized = total === 0 ? [1, 0, 0] : values;
  const colors = ['#10b981', '#f59e0b', '#ef4444'];

  let offset = 0;

  return (
    <div className="relative flex h-40 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="transparent" stroke="currentColor" strokeOpacity="0.08" strokeWidth="12" />
        {normalized.map((value, index) => {
          const dash = (value / Math.max(total, 1)) * circumference;
          const segment = (
            <circle
              key={colors[index]}
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke={colors[index]}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return segment;
        })}
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold">{total}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
};

export function ReportsPage() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<ReportType>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData>(EMPTY_DATA);

  useEffect(() => {
    void loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setLoading(true);
    try {
      const [salesResult, inventoryResult, transferResult, storeResult, supplierResult, productResult] = await Promise.allSettled([
        salesService.getAll({ page: 1, limit: 500 }),
        inventoryService.getAll({ page: 1, limit: 500 }),
        transferService.getAll({ page: 1, limit: 500 }),
        storeService.getAll({ page: 1, limit: 200 }),
        supplierService.getAll({ page: 1, limit: 200 }),
        productService.getAll({ page: 1, limit: 500 }),
      ]);

      setData({
        sales: getSafeArray(salesResult),
        inventory: getSafeArray(inventoryResult),
        transfers: getSafeArray(transferResult),
        stores: getSafeArray(storeResult),
        suppliers: getSafeArray(supplierResult),
        products: getSafeArray(productResult),
      });
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo<ReportsAnalytics>(() => {
    const now = new Date();
    const periodStart = getRangeStart(selectedPeriod, now);
    const previousRange = getPreviousRange(selectedPeriod, now);

    const salesInRange = data.sales.filter((sale) => isWithinRange(sale.created_at, periodStart, now));
    const inventoryInRange = data.inventory.filter((item) => isWithinRange(item.created_at, periodStart, now));
    const transfersInRange = data.transfers.filter((item) => isWithinRange(item.created_at, periodStart, now));

    const previousSales = data.sales.filter((sale) => isWithinRange(sale.created_at, previousRange.start, previousRange.end));
    const previousInventory = data.inventory.filter((item) => isWithinRange(item.created_at, previousRange.start, previousRange.end));

    const revenue = salesInRange.reduce((sum, sale) => sum + (sale.total_price || sale.total || 0), 0);
    const purchase = inventoryInRange.reduce((sum, item) => sum + item.total, 0);
    const profit = salesInRange.reduce((sum, sale) => sum + sale.profit, 0);
    const debt = inventoryInRange.reduce((sum, item) => sum + item.debt, 0);
    const supplierDebt = data.suppliers.reduce((sum, supplier) => sum + supplier.debt, 0);

    const previousRevenue = previousSales.reduce((sum, sale) => sum + (sale.total_price || sale.total || 0), 0);
    const previousPurchase = previousInventory.reduce((sum, item) => sum + item.total, 0);
    const previousProfit = previousSales.reduce((sum, sale) => sum + sale.profit, 0);
    const previousDebt = previousInventory.reduce((sum, item) => sum + item.debt, 0);

    const totalUnitsSold = salesInRange.reduce(
      (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const totalUnitsReceived = inventoryInRange.reduce(
      (sum, entry) => sum + entry.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const avgReceipt = salesInRange.length ? revenue / salesInRange.length : 0;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const trend = buildTrend(salesInRange, inventoryInRange, selectedPeriod, now);
    const chartValues = trend.map((point) =>
      selectedType === 'inventory' ? point.purchase : selectedType === 'financial' ? point.profit : point.revenue
    );

    const storePerformance = data.stores
      .map((store) => {
        const relatedSales = salesInRange.filter((sale) => sale.store_id === store.id);
        const relatedTransfers = transfersInRange.filter(
          (transfer) => transfer.from_store_id === store.id || transfer.to_store_id === store.id
        );

        return {
          id: store.id,
          name: store.name,
          revenue: relatedSales.reduce((sum, sale) => sum + (sale.total_price || sale.total || 0), 0),
          profit: relatedSales.reduce((sum, sale) => sum + sale.profit, 0),
          salesCount: relatedSales.length,
          transferCount: relatedTransfers.length,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const topProducts = new Map<string, { name: string; quantity: number; revenue: number }>();
    salesInRange.forEach((sale) => {
      sale.items.forEach((item) => {
        const key = item.product_id || item.product_name || item.id;
        const entry = topProducts.get(key) || {
          name: item.product_name || t('common.noData'),
          quantity: 0,
          revenue: 0,
        };
        entry.quantity += item.quantity;
        entry.revenue += item.total;
        topProducts.set(key, entry);
      });
    });

    const topSelling = Array.from(topProducts.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const categoryInventory = new Map<string, number>();
    data.products.forEach((product) => {
      const category = product.category || t('reports.uncategorized');
      const quantity = product.total_quantity ?? product.quantity ?? product.total_count ?? 0;
      categoryInventory.set(category, (categoryInventory.get(category) || 0) + quantity);
    });

    const stockMix = Array.from(categoryInventory.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const transfersByStatus = {
      completed: transfersInRange.filter((item) => item.status === 'accepted').length,
      pending: transfersInRange.filter((item) => item.status === 'pending').length,
      rejected: transfersInRange.filter((item) => item.status === 'rejected').length,
    };

    const periodLabel = `${formatDateShort(periodStart)} - ${formatDateShort(now)}`;
    const generatedReports: GeneratedReport[] = [
      {
        id: 'sales',
        type: 'sales',
        title: t('reports.generated.sales'),
        summary: `${salesInRange.length} ${t('reports.labels.transactions').toLowerCase()} | ${formatCompactNumber(totalUnitsSold)} ${t('reports.labels.units').toLowerCase()}`,
        periodLabel,
        generatedAt: now.toISOString(),
        status: 'ready',
      },
      {
        id: 'inventory',
        type: 'inventory',
        title: t('reports.generated.inventory'),
        summary: `${inventoryInRange.length} ${t('reports.labels.receipts').toLowerCase()} | ${formatCompactNumber(totalUnitsReceived)} ${t('reports.labels.units').toLowerCase()}`,
        periodLabel,
        generatedAt: now.toISOString(),
        status: 'ready',
      },
      {
        id: 'financial',
        type: 'financial',
        title: t('reports.generated.financial'),
        summary: `${formatCurrency(profit)} | ${margin.toFixed(1)}% ${t('reports.labels.margin').toLowerCase()}`,
        periodLabel,
        generatedAt: now.toISOString(),
        status: 'ready',
      },
      {
        id: 'transfer',
        type: 'transfer',
        title: t('reports.generated.transfer'),
        summary: `${transfersInRange.length} ${t('reports.labels.movements').toLowerCase()} | ${transfersByStatus.completed} ${t('common.accepted').toLowerCase()}`,
        periodLabel,
        generatedAt: now.toISOString(),
        status: 'ready',
      },
    ];

    return {
      revenue,
      purchase,
      profit,
      debt,
      supplierDebt,
      avgReceipt,
      margin,
      salesCount: salesInRange.length,
      totalUnitsSold,
      totalUnitsReceived,
      revenueChange: percentChange(revenue, previousRevenue),
      purchaseChange: percentChange(purchase, previousPurchase),
      profitChange: percentChange(profit, previousProfit),
      debtChange: percentChange(debt, previousDebt),
      trend,
      chartValues,
      storePerformance,
      topSelling,
      stockMix,
      transfersByStatus,
      generatedReports,
    };
  }, [data, selectedPeriod, selectedType, t]);

  const visibleReports = useMemo(() => {
    if (selectedType === 'all') return analytics.generatedReports;
    return analytics.generatedReports.filter((report) => report.type === selectedType);
  }, [analytics.generatedReports, selectedType]);

  const linePath = useMemo(() => buildLinePath(analytics.chartValues, 100, 44), [analytics.chartValues]);
  const trendMax = Math.max(...analytics.chartValues, 1);
  const storeMax = Math.max(...analytics.storePerformance.map((item) => item.revenue), 1);
  const stockMax = Math.max(...analytics.stockMix.map((item) => item.quantity), 1);

  const handleExportExcel = async () => {
    const now = new Date();
    const rangeStart = getRangeStart(selectedPeriod, now);
    const salesInRange = data.sales.filter((sale) => isWithinRange(sale.created_at, rangeStart, now));
    const inventoryInRange = data.inventory.filter((item) => isWithinRange(item.created_at, rangeStart, now));
    const transfersInRange = data.transfers.filter((item) => isWithinRange(item.created_at, rangeStart, now));

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AvtoCRM';
    workbook.created = new Date();

    createWorksheet(workbook, 'Summary', [
      { metric: t('reports.stats.totalSales'), value: analytics.revenue },
      { metric: t('reports.stats.totalPurchases'), value: analytics.purchase },
      { metric: t('reports.stats.netProfit'), value: analytics.profit },
      { metric: t('reports.stats.totalDebt'), value: analytics.debt + analytics.supplierDebt },
      { metric: t('reports.labels.averageReceipt'), value: analytics.avgReceipt },
      { metric: t('reports.labels.margin'), value: Number(analytics.margin.toFixed(2)) },
      { metric: t('reports.labels.transactions'), value: analytics.salesCount },
      { metric: t('reports.labels.unitsSold'), value: analytics.totalUnitsSold },
      { metric: t('reports.labels.stockLoad'), value: analytics.totalUnitsReceived },
    ]);

    createWorksheet(
      workbook,
      'Trend',
      analytics.trend.map((item) => ({
        period: item.label,
        revenue: item.revenue,
        purchase: item.purchase,
        profit: item.profit,
      }))
    );

    createWorksheet(
      workbook,
      'Stores',
      analytics.storePerformance.map((item) => ({
        store: item.name,
        revenue: item.revenue,
        profit: item.profit,
        sales_count: item.salesCount,
        transfer_count: item.transferCount,
      }))
    );

    if (analytics.topSelling.length > 0) {
      createWorksheet(
        workbook,
        'TopProducts',
        analytics.topSelling.map((item) => ({
          product: item.name,
          quantity: item.quantity,
          revenue: item.revenue,
        }))
      );
    }

    if (analytics.stockMix.length > 0) {
      createWorksheet(
        workbook,
        'StockMix',
        analytics.stockMix.map((item) => ({
          category: item.name,
          quantity: item.quantity,
        }))
      );
    }

    if (selectedType === 'all' || selectedType === 'sales') {
      createWorksheet(
        workbook,
        'Sales',
        salesInRange.map((sale) => ({
          date: sale.created_at,
          store: sale.store_name || sale.store_id,
          total_price: sale.total_price || sale.total || 0,
          total_cost: sale.total_cost,
          profit: sale.profit,
          items_count: sale.items.reduce((sum, item) => sum + item.quantity, 0),
          payment_method: sale.payment_method || '',
        }))
      );
    }

    if (selectedType === 'all' || selectedType === 'inventory') {
      createWorksheet(
        workbook,
        'Inventory',
        inventoryInRange.map((entry) => ({
          date: entry.created_at,
          supplier: entry.supplier_name || entry.supplier_id,
          store: entry.store_name || entry.store_id,
          total: entry.total,
          paid: entry.paid,
          debt: entry.debt,
          items_count: entry.items.reduce((sum, item) => sum + item.quantity, 0),
          status: entry.status,
        }))
      );
    }

    if (selectedType === 'all' || selectedType === 'transfer') {
      createWorksheet(
        workbook,
        'Transfers',
        transfersInRange.map((transfer) => ({
          date: transfer.created_at,
          from_store: transfer.from_store_name || transfer.from_store_id,
          to_store: transfer.to_store_name || transfer.to_store_id,
          items_count: transfer.items.reduce((sum, item) => sum + item.quantity, 0),
          status: transfer.status,
        }))
      );
    }

    const fileSuffix = selectedType === 'all' ? 'full' : selectedType;
    const buffer = await workbook.xlsx.writeBuffer();
    downloadFile(buffer as ArrayBuffer, `reports-${fileSuffix}-${selectedPeriod}.xlsx`);
  };

  const statCards = [
    {
      key: 'revenue',
      title: t('reports.stats.totalSales'),
      value: formatCurrency(analytics.revenue),
      change: analytics.revenueChange,
      icon: CircleDollarSign,
      tone: 'from-emerald-500/10',
      visible: selectedType === 'all' || selectedType === 'sales' || selectedType === 'financial',
    },
    {
      key: 'purchase',
      title: t('reports.stats.totalPurchases'),
      value: formatCurrency(analytics.purchase),
      change: analytics.purchaseChange,
      icon: ShoppingCart,
      tone: 'from-sky-500/10',
      visible: selectedType === 'all' || selectedType === 'inventory' || selectedType === 'financial',
    },
    {
      key: 'profit',
      title: t('reports.stats.netProfit'),
      value: formatCurrency(analytics.profit),
      change: analytics.profitChange,
      icon: TrendingUp,
      tone: 'from-violet-500/10',
      visible: selectedType === 'all' || selectedType === 'financial' || selectedType === 'sales',
    },
    {
      key: 'debt',
      title: t('reports.stats.totalDebt'),
      value: formatCurrency(analytics.debt + analytics.supplierDebt),
      change: analytics.debtChange,
      icon: CreditCard,
      tone: 'from-amber-500/10',
      visible: selectedType === 'all' || selectedType === 'inventory' || selectedType === 'financial',
    },
  ].filter((item) => item.visible);

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.reports')} description={t('reports.description')} />

      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                <Database className="h-3.5 w-3.5" />
                {t('reports.liveSnapshot')}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{t('reports.overviewTitle')}</h2>
                <p className="text-sm text-muted-foreground">{t('reports.overviewDescription')}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">{t('reports.labels.averageReceipt')}</div>
                  <div className="font-semibold">{formatCurrency(analytics.avgReceipt)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('reports.labels.margin')}</div>
                  <div className="font-semibold">{analytics.margin.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('reports.labels.stockLoad')}</div>
                  <div className="font-semibold">{formatCompactNumber(analytics.totalUnitsReceived)}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ReportType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('reports.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allTypes')}</SelectItem>
                  <SelectItem value="sales">{t('reports.types.sales')}</SelectItem>
                  <SelectItem value="inventory">{t('reports.types.inventory')}</SelectItem>
                  <SelectItem value="financial">{t('reports.types.financial')}</SelectItem>
                  <SelectItem value="transfer">{t('reports.types.transfer')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('reports.periods.month')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t('reports.periods.week')}</SelectItem>
                  <SelectItem value="month">{t('reports.periods.month')}</SelectItem>
                  <SelectItem value="quarter">{t('reports.periods.quarter')}</SelectItem>
                  <SelectItem value="year">{t('reports.periods.year')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => void loadReportsData()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('reports.refresh')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                {t('common.export')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          return (
            <Card key={stat.key} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.tone} to-transparent`} />
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="mt-3 text-2xl font-semibold">{loading ? '...' : stat.value}</p>
                    <div className={`mt-2 inline-flex items-center gap-1 text-xs ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {formatPercent(stat.change)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-background/80 p-3 shadow-sm">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.performanceTrend')}</CardTitle>
            <CardDescription>{t('reports.performanceTrendDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="overflow-hidden rounded-2xl border bg-muted/30 p-4">
              <svg viewBox="0 0 100 52" className="h-44 w-full">
                <path d="M 0 44 L 100 44" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.6" />
                <path d={linePath} fill="none" stroke="url(#reportsGradient)" strokeWidth="2.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="reportsGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                {analytics.chartValues.map((value, index) => {
                  const x = analytics.chartValues.length === 1 ? 50 : (index / (analytics.chartValues.length - 1)) * 100;
                  const y = 44 - (value / trendMax) * 44;
                  return <circle key={`${x}-${value}`} cx={x} cy={y} r="1.8" fill="#0f172a" />;
                })}
              </svg>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground md:grid-cols-5 xl:grid-cols-6">
                {analytics.trend.map((point, index) => (
                  <div key={point.label}>
                    <div>{point.label}</div>
                    <div className="mt-1 font-medium text-foreground">{formatCompactNumber(analytics.chartValues[index])}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-sm text-muted-foreground">{t('reports.labels.transactions')}</div>
                <div className="mt-2 text-xl font-semibold">{formatCompactNumber(analytics.salesCount)}</div>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-sm text-muted-foreground">{t('reports.labels.unitsSold')}</div>
                <div className="mt-2 text-xl font-semibold">{formatCompactNumber(analytics.totalUnitsSold)}</div>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-sm text-muted-foreground">{t('reports.labels.supplierDebt')}</div>
                <div className="mt-2 text-xl font-semibold">{formatCurrency(analytics.supplierDebt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.transferFlow')}</CardTitle>
            <CardDescription>{t('reports.transferFlowDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DonutChart
              completed={analytics.transfersByStatus.completed}
              pending={analytics.transfersByStatus.pending}
              rejected={analytics.transfersByStatus.rejected}
              label={t('reports.types.transfer')}
            />
            <div className="space-y-3">
              {[
                { label: t('common.accepted'), value: analytics.transfersByStatus.completed, color: 'bg-emerald-500' },
                { label: t('common.pending'), value: analytics.transfersByStatus.pending, color: 'bg-amber-500' },
                { label: t('transfers.rejected'), value: analytics.transfersByStatus.rejected, color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    {item.label}
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.storePerformance')}</CardTitle>
            <CardDescription>{t('reports.storePerformanceDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.storePerformance.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : (
              analytics.storePerformance.map((store) => (
                <div key={store.id} className="space-y-2 rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{store.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {store.salesCount} {t('nav.sales').toLowerCase()} | {store.transferCount} {t('reports.labels.movements').toLowerCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(store.revenue)}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(store.profit)}</div>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
                      style={{ width: `${Math.max((store.revenue / storeMax) * 100, 8)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.stockMix')}</CardTitle>
            <CardDescription>{t('reports.stockMixDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.stockMix.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : (
              analytics.stockMix.map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                        {index + 1}
                      </span>
                      {item.name}
                    </div>
                    <span className="font-medium">{formatCompactNumber(item.quantity)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                      style={{ width: `${Math.max((item.quantity / stockMax) * 100, 10)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.topProducts')}</CardTitle>
            <CardDescription>{t('reports.topProductsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topSelling.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : (
              analytics.topSelling.map((product, index) => (
                <div key={`${product.name}-${index}`} className="flex items-center justify-between rounded-2xl border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.quantity} {t('reports.labels.units').toLowerCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-medium">{formatCurrency(product.revenue)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.generatedReports')}</CardTitle>
            <CardDescription>{t('reports.generatedReportsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleReports.map((report) => {
              const style = REPORT_TYPE_STYLES[report.type];
              const Icon = style.icon;
              return (
                <div key={report.id} className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${style.soft}`}>
                      <Icon className={`h-5 w-5 ${style.accent}`} />
                    </div>
                    <div>
                      <div className="font-medium">{report.title}</div>
                      <div className="text-sm text-muted-foreground">{report.summary}</div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {report.periodLabel}
                        </span>
                        <span>{formatDateShort(report.generatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                    {t('reports.ready')}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ReportsPage;
