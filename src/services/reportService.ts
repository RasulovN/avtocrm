import { apiClient } from './api';

export interface ReportData {
  total_products_in_stock: number;
  monthly_revenue: string;
  total_customer_debt: string;
  total_supplier_debt: string;
  report_date: string;
}

export type ReportsFilter = 'monthly' | 'weekly';

export interface ReportsQueryParams {
  filter?: ReportsFilter;
  from?: string;
  to?: string;
  store_id?: string | number;
  storeId?: string | number;
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
  totalSold: number;
  totalRevenue: number;
}

export interface CustomerDebt {
  customerName: string;
  debt: number;
}

export interface SupplierDebt {
  supplierName: string;
  debt: number;
}

export interface DetailedReportsResponse {
  filters: Record<string, unknown>;
  summary: ReportsSummary;
  branchStatistics: BranchStatistic[];
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
    charts?: unknown;
    topSellingProducts?: unknown;
    debts?: unknown;
  };

  const summaryRaw = (source.summary ?? {}) as Record<string, unknown>;
  const branchStatisticsRaw = Array.isArray(source.branchStatistics) ? source.branchStatistics : [];
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
    charts: {
      profitTrend: normalizeChartSeries(chartsRaw.profitTrend),
    },
    topSellingProducts: topProductsRaw.map((item) => {
      const product = (item ?? {}) as Record<string, unknown>;
      return {
        rank: toNumber(product.rank),
        productId: toNumber(product.productId),
        name: String(product.name ?? ''),
        totalSold: toNumber(product.totalSold),
        totalRevenue: toNumber(product.totalRevenue),
      };
    }),
    debts: {
      customerDebts: customerDebtsRaw.map((item) => {
        const debt = (item ?? {}) as Record<string, unknown>;
        return {
          customerName: String(debt.customerName ?? ''),
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

const buildReportQueryParams = (params?: ReportsQueryParams): Record<string, string | number> => {
  if (!params) return {};
  const query: Record<string, string | number> = {};
  if (params.filter) query.filter = params.filter;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

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
        expectedErrorStatuses: [404],
      });
      return normalizeDashboardReportData(response.data);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        try {
          const fallback = await apiClient.get<unknown>('/reports/', {
            params: buildReportQueryParams(params),
            expectedErrorStatuses: [404],
          });
          return normalizeDashboardReportData(fallback.data);
        } catch (fallbackError: unknown) {
          const fallbackAxiosError = fallbackError as { response?: { status?: number } };
          if (fallbackAxiosError.response?.status === 404) {
            return null;
          }
          throw fallbackError;
        }
      }
      throw error;
    }
  },

  async getTopProducts(params?: ReportsQueryParams): Promise<DashboardTopProduct[]> {
    const query = buildReportQueryParams(params);
    try {
      const response = await apiClient.get<unknown>('/reports/top-products/', {
        params: query,
        expectedErrorStatuses: [404],
      });
      return normalizeDashboardTopProducts(response.data);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status !== 404) {
        throw error;
      }

      const fallback = await apiClient.get<unknown>('/top-products/', {
        params: query,
      });
      return normalizeDashboardTopProducts(fallback.data);
    }
  },

  async getDetailedReport(params: ReportsQueryParams): Promise<DetailedReportsResponse> {
    const requestParams = buildReportQueryParams(params);
    const response = await apiClient.get<unknown>('/reports/', {
      params: requestParams,
    });
    return normalizeDetailedReportsResponse(response.data);
  },
};
