import { apiClient } from './api';

export interface ReportData {
  total_products_in_stock: number;
  monthly_revenue: string;
  total_customer_debt: string;
  total_supplier_debt: string;
  report_date: string;
}

export const reportService = {
  async getReport(): Promise<ReportData | null> {
    try {
      const response = await apiClient.get<ReportData>('/reports/');
      return response.data ?? null;
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
