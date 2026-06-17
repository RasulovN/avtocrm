import { apiClient } from './api';

export interface ReportData {
  total_products_in_stock: number;
  monthly_revenue: string;
  total_customer_debt: string;
  total_supplier_debt: string;
  report_date: string;
}

export type ReportsFilter = 'monthly' | 'weekly' | 'yearly';

export interface ReportsQueryParams {
  filter?: ReportsFilter;
  from?: string;
  to?: string;
  store_id?: string | number;
  storeId?: string | number;
  period?: string;
}

export interface ReportsSummary {
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
}

export interface BranchStatistic {
  store_id: number;
  store__name: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface ChartSeries {
  labels: string[];
  data: number[];
}

export interface TopSellingProduct {
  rank: number;
  productId: number;
  name: string;
  name_uz_cyrl?: string;
  category?: string;
  category_uz_cyrl?: string;
  totalSold: number;
  totalRevenue: number;
}

export interface CustomerDebt {
  customerName: string;
  phone?: string;
  debt: number;
}

export interface SupplierDebt {
  supplierName: string;
  debt: number;
}

export interface CategoryStatistic {
  categoryName: string;
  categoryName_uz_cyrl?: string;
  revenue: number;
  percent: number;
}

export interface PaymentStructureItem {
  method: string;
  count: number;
  amount: number;
  percent: string;
}

export interface DetailedReportsResponse {
  filters: Record<string, unknown>;
  summary: ReportsSummary;
  branchStatistics: BranchStatistic[];
  categoryStatistics: CategoryStatistic[];
  paymentStructure: PaymentStructureItem[];
  charts: {
    profitTrend: ChartSeries;
  };
  topSellingProducts: TopSellingProduct[];
  debts: {
    customerDebts: CustomerDebt[];
    supplierDebts: SupplierDebt[];
  };
}

export interface DashboardTopProduct {
  id: string;
  name: string;
  sold: number;
  revenue: number;
}

// Unified Live Dashboard Report interfaces
export interface DashboardTopPart {
  id: string;
  name: string;
  name_uz_cyrl?: string;
  sold: number;
  rev: number;
}

export interface DashboardLowStock {
  id: string;
  name: string;
  name_uz_cyrl?: string;
  left: number;
  status: 'critical' | 'warning' | 'normal';
}

export interface DashboardRecentSale {
  id: string;
  client: string;
  amount: number;
  time: string;
  type: 'cash' | 'card' | 'debt' | string;
  minutesAgo?: number;
}

export interface DashboardChartData {
  labels: string[];
  data: (number | null)[];
}

export interface DashboardKpi {
  revenue: number;
  revenueGrowth: number;
  debt: number;
  debtGrowth: number;
  orders: number;
  ordersGrowth: number;
  lowStockCount: number;
}

export interface DashboardReportData {
  kpi: DashboardKpi;
  topParts: DashboardTopPart[];
  lowStock: DashboardLowStock[];
  recentSales: DashboardRecentSale[];
  chart: DashboardChartData;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item ?? '')) : [];

const normalizeChartSeries = (value: unknown): ChartSeries => {
  if (!value || typeof value !== 'object') {
    return { labels: [], data: [] };
  }
  const chart = value as { labels?: unknown; data?: unknown };
  const labels = toStringList(chart.labels);
  const data = Array.isArray(chart.data) ? chart.data.map((item) => toNumber(item)) : [];
  return { labels, data };
};

const normalizeDetailedReportsResponse = (payload: unknown): DetailedReportsResponse => {
  const source = (payload ?? {}) as {
    filters?: unknown;
    summary?: unknown;
    branchStatistics?: unknown;
    categoryStatistics?: unknown;
    paymentStructure?: unknown;
    charts?: unknown;
    topSellingProducts?: unknown;
    debts?: unknown;
  };

  const summaryRaw = (source.summary ?? {}) as Record<string, unknown>;
  const branchStatisticsRaw = Array.isArray(source.branchStatistics) ? source.branchStatistics : [];
  const categoryStatisticsRaw = Array.isArray(source.categoryStatistics) ? source.categoryStatistics : [];
  const paymentStructureRaw = Array.isArray(source.paymentStructure) ? source.paymentStructure : [];
  const chartsRaw = (source.charts ?? {}) as { profitTrend?: unknown };
  const topProductsRaw = Array.isArray(source.topSellingProducts) ? source.topSellingProducts : [];
  const debtsRaw = (source.debts ?? {}) as { customerDebts?: unknown; supplierDebts?: unknown };
  const customerDebtsRaw = Array.isArray(debtsRaw.customerDebts) ? debtsRaw.customerDebts : [];
  const supplierDebtsRaw = Array.isArray(debtsRaw.supplierDebts) ? debtsRaw.supplierDebts : [];

  return {
    filters: source.filters && typeof source.filters === 'object' ? (source.filters as Record<string, unknown>) : {},
    summary: {
      totalRevenue: toNumber(summaryRaw.totalRevenue),
      totalProfit: toNumber(summaryRaw.totalProfit),
      totalExpenses: toNumber(summaryRaw.totalExpenses),
      totalOrders: toNumber(summaryRaw.totalOrders),
      averageOrderValue: toNumber(summaryRaw.averageOrderValue),
      totalCustomers: toNumber(summaryRaw.totalCustomers),
    },
    branchStatistics: branchStatisticsRaw.map((item) => {
      const branch = (item ?? {}) as Record<string, unknown>;
      return {
        store_id: toNumber(branch.store_id),
        store__name: String(branch.store__name ?? ''),
        revenue: toNumber(branch.revenue),
        orders: toNumber(branch.orders),
        customers: toNumber(branch.customers),
      };
    }),
    categoryStatistics: categoryStatisticsRaw.map((item) => {
      const cat = (item ?? {}) as Record<string, unknown>;
      return {
        categoryName: String(cat.categoryName ?? cat.category_name ?? cat.name ?? ''),
        categoryName_uz_cyrl: cat.categoryName_uz_cyrl || cat.category_name_uz_cyrl || cat.name_uz_cyrl ? String(cat.categoryName_uz_cyrl || cat.category_name_uz_cyrl || cat.name_uz_cyrl) : undefined,
        revenue: toNumber(cat.revenue),
        percent: toNumber(cat.percent),
      };
    }),
    paymentStructure: paymentStructureRaw.map((item) => {
      const pay = (item ?? {}) as Record<string, unknown>;
      return {
        method: String(pay.method ?? ''),
        count: toNumber(pay.count),
        amount: toNumber(pay.amount),
        percent: String(pay.percent ?? ''),
      };
    }),
    charts: {
      profitTrend: normalizeChartSeries(chartsRaw.profitTrend),
    },
    topSellingProducts: topProductsRaw.map((item) => {
      const product = (item ?? {}) as Record<string, unknown>;
      return {
        rank: toNumber(product.rank),
        productId: toNumber(product.productId),
        name: String(product.name ?? ''),
        name_uz_cyrl: product.name_uz_cyrl ? String(product.name_uz_cyrl) : undefined,
        category: product.category ? String(product.category) : undefined,
        category_uz_cyrl: product.category_uz_cyrl ? String(product.category_uz_cyrl) : undefined,
        totalSold: toNumber(product.totalSold),
        totalRevenue: toNumber(product.totalRevenue),
      };
    }),
    debts: {
      customerDebts: customerDebtsRaw.map((item) => {
        const debt = (item ?? {}) as Record<string, unknown>;
        return {
          customerName: String(debt.customerName ?? ''),
          phone: debt.phone ? String(debt.phone) : undefined,
          debt: toNumber(debt.debt),
        };
      }),
      supplierDebts: supplierDebtsRaw.map((item) => {
        const debt = (item ?? {}) as Record<string, unknown>;
        return {
          supplierName: String(debt.supplierName ?? ''),
          debt: toNumber(debt.debt),
        };
      }),
    },
  };
};

const normalizeDashboardReportData = (payload: unknown): ReportData => {
  const source = (payload ?? {}) as Record<string, unknown>;
  
  const dashboard = (source.dashboard ?? source.reports ?? source) as Record<string, unknown>;
  const reports = (dashboard.reports ?? dashboard ?? source) as Record<string, unknown>;
  
  return {
    total_products_in_stock: toNumber(reports.total_products_in_stock ?? reports.totalProducts ?? reports.total_products),
    monthly_revenue: String(reports.monthly_revenue ?? reports.totalRevenue ?? reports.total_revenue ?? reports.turnover ?? '0'),
    total_customer_debt: String(reports.total_customer_debt ?? reports.totalDebt ?? reports.customer_debt ?? '0'),
    total_supplier_debt: String(reports.supplier_debt ?? reports.supplierDebt ?? '0'),
    report_date: String(source.report_date ?? source.date ?? ''),
  };
};

const normalizeDashboardData = (payload: unknown): DashboardReportData => {
  const source = (payload ?? {}) as Record<string, unknown>;

  // Normalize KPI
  const kpiRaw = (source.kpi ?? {}) as Record<string, unknown>;
  const kpi: DashboardKpi = {
    revenue: toNumber(kpiRaw.revenue ?? kpiRaw.total_revenue ?? kpiRaw.monthly_revenue),
    revenueGrowth: toNumber(kpiRaw.revenueGrowth ?? kpiRaw.revenue_growth ?? kpiRaw.growth_revenue ?? kpiRaw.growthRatio ?? 0),
    debt: toNumber(kpiRaw.debt ?? kpiRaw.total_customer_debt ?? kpiRaw.customer_debt ?? 0),
    debtGrowth: toNumber(kpiRaw.debtGrowth ?? kpiRaw.debt_growth ?? kpiRaw.growth_debt ?? 0),
    orders: toNumber(kpiRaw.orders ?? kpiRaw.total_orders ?? kpiRaw.ordersCount ?? 0),
    ordersGrowth: toNumber(kpiRaw.ordersGrowth ?? kpiRaw.orders_growth ?? kpiRaw.growth_orders ?? 0),
    lowStockCount: toNumber(kpiRaw.lowStockCount ?? kpiRaw.low_stock_count ?? kpiRaw.lowStockProductsCount ?? kpiRaw.low_stock ?? 0),
  };

  // Normalize Top Parts
  const topPartsRaw = Array.isArray(source.topParts) 
    ? source.topParts 
    : Array.isArray(source.top_parts) 
      ? source.top_parts 
      : Array.isArray(source.topSellingProducts) 
        ? source.topSellingProducts 
        : [];
  
  const topParts = topPartsRaw.map((item: unknown, index: number) => {
    const part = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(part.id ?? part.productId ?? part.product_id ?? index),
      name: String(part.name ?? part.productName ?? part.product_name ?? ''),
      name_uz_cyrl: part.name_uz_cyrl ? String(part.name_uz_cyrl) : undefined,
      sold: toNumber(part.sold ?? part.totalSold ?? part.total_sold ?? part.quantity),
      rev: toNumber(part.rev ?? part.revenue ?? part.totalRevenue ?? part.total_revenue),
    };
  });

  // Normalize Low Stock
  const lowStockRaw = Array.isArray(source.lowStock) 
    ? source.lowStock 
    : Array.isArray(source.low_stock) 
      ? source.low_stock 
      : Array.isArray(source.lowStockProducts) 
        ? source.lowStockProducts 
        : [];

  const lowStock = lowStockRaw.map((item: unknown, index: number) => {
    const part = (item ?? {}) as Record<string, unknown>;
    const left = toNumber(part.left ?? part.quantity ?? part.inStock ?? part.in_stock ?? part.stock);
    let status = part.status || 'warning';
    if (left <= 2) {
      status = 'critical';
    } else if (left <= 5) {
      status = 'warning';
    } else {
      status = 'normal';
    }
    return {
      id: String(part.id ?? part.productId ?? part.product_id ?? index),
      name: String(part.name ?? part.productName ?? part.product_name ?? ''),
      name_uz_cyrl: part.name_uz_cyrl ? String(part.name_uz_cyrl) : undefined,
      left,
      status: status as 'critical' | 'warning' | 'normal',
    };
  });

  // Normalize Recent Sales
  const recentSalesRaw = Array.isArray(source.recentSales) 
    ? source.recentSales 
    : Array.isArray(source.recent_sales) 
      ? source.recent_sales 
      : Array.isArray(source.recentTransactions) 
        ? source.recentTransactions 
        : Array.isArray(source.recent_transactions) 
          ? source.recent_transactions 
          : [];

  const recentSales = recentSalesRaw.map((item: unknown, index: number) => {
    const sale = (item ?? {}) as Record<string, unknown>;
    let timeStr = '';
    const mins = sale.minutesAgo !== undefined && sale.minutesAgo !== null ? toNumber(sale.minutesAgo) : null;
    if (mins !== null && mins > 0) {
      if (mins < 60) {
        timeStr = `${mins} daqiqa oldin`;
      } else {
        const hours = Math.floor(mins / 60);
        timeStr = `${hours} soat oldin`;
      }
    } else {
      timeStr = String(sale.time ?? sale.createdAt ?? sale.created_at ?? sale.date ?? '');
    }

    return {
      id: String(sale.id ?? index),
      client: String(sale.client ?? sale.clientName ?? sale.customerName ?? sale.customer ?? 'Chakana xaridor'),
      amount: toNumber(sale.amount ?? sale.totalPrice ?? sale.total_price ?? sale.sum ?? sale.revenue),
      time: timeStr,
      type: String(sale.type ?? sale.paymentMethod ?? sale.payment_method ?? 'cash'),
      minutesAgo: mins !== null ? mins : undefined,
    };
  });

  // Normalize Chart
  const chartRaw = (source.chart ?? source.charts ?? source.salesChart ?? source.sales_chart ?? {}) as Record<string, unknown>;
  const chart: DashboardChartData = {
    labels: Array.isArray(chartRaw.labels) ? chartRaw.labels.map(lbl => String(lbl ?? '')) : [],
    data: Array.isArray(chartRaw.data) ? chartRaw.data.map(val => val === null ? null : toNumber(val)) : [],
  };

  return {
    kpi,
    topParts,
    lowStock,
    recentSales,
    chart,
  };
};

const buildReportQueryParams = (params?: ReportsQueryParams): Record<string, string | number> => {
  if (!params) return {};
  const query: Record<string, string | number> = {};
  if (params.filter) query.filter = params.filter;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.period) query.period = params.period;

  const resolvedStoreId = params.store_id ?? params.storeId;
  if (resolvedStoreId !== undefined && resolvedStoreId !== null && String(resolvedStoreId).trim() !== '') {
    query.store_id = resolvedStoreId;
  }
  return query;
};

const normalizeDashboardTopProducts = (payload: unknown): DashboardTopProduct[] => {
  const source = (payload ?? {}) as Record<string, unknown>;
  
  const topProductsWrapper = source.topProducts ?? source.top_products ?? source.results;
  const rawList = Array.isArray(topProductsWrapper) 
    ? topProductsWrapper 
    : Array.isArray(payload) 
      ? payload 
      : [];

  return rawList
    .map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const id = row.id ?? row.product_id ?? row.productId ?? index + 1;
      const name = row.name ?? row.product_name ?? row.productName ?? `#${id}`;
      return {
        id: String(id),
        name: String(name),
        sold: toNumber(row.sold ?? row.total_sold ?? row.totalSold ?? row.quantity),
        revenue: toNumber(row.revenue ?? row.total_revenue ?? row.totalRevenue),
      };
    })
    .sort((a, b) => b.sold - a.sold);
};

export const reportService = {
  async getReport(): Promise<ReportData | null> {
    return this.getDashboardReport();
  },

  async getDashboardReport(params?: ReportsQueryParams): Promise<ReportData | null> {
    try {
      const response = await apiClient.get<unknown>('/reports/dashboard/', {
        params: buildReportQueryParams(params),
        skipGlobalErrorHandler: true,
      });
      return normalizeDashboardReportData(response.data);
    } catch {
      try {
        const fallback = await apiClient.get<unknown>('/reports/', {
          params: buildReportQueryParams(params),
          skipGlobalErrorHandler: true,
        });
        return normalizeDashboardReportData(fallback.data);
      } catch {
        return null;
      }
    }
  },

  async getDashboardData(params?: ReportsQueryParams): Promise<DashboardReportData | null> {
    try {
      const response = await apiClient.get<unknown>('/reports/dashboard/', {
        params: buildReportQueryParams(params),
        skipGlobalErrorHandler: true,
      });
      return normalizeDashboardData(response.data);
    } catch {
      return null;
    }
  },

  async getTopProducts(params?: ReportsQueryParams): Promise<DashboardTopProduct[]> {
    const query = buildReportQueryParams(params);
    try {
      const response = await apiClient.get<unknown>('/reports/top-products/', {
        params: query,
        skipGlobalErrorHandler: true,
      });
      return normalizeDashboardTopProducts(response.data);
    } catch {
      try {
        const fallback = await apiClient.get<unknown>('/top-products/', {
          params: query,
          skipGlobalErrorHandler: true,
        });
        return normalizeDashboardTopProducts(fallback.data);
      } catch {
        return [];
      }
    }
  },

  async getDetailedReport(params: ReportsQueryParams): Promise<DetailedReportsResponse> {
    const requestParams = buildReportQueryParams(params);
    try {
      const response = await apiClient.get<unknown>('/reports/', {
        params: requestParams,
        skipGlobalErrorHandler: true,
      });
      return normalizeDetailedReportsResponse(response.data);
    } catch {
      return normalizeDetailedReportsResponse(null);
    }
  },
};
