import api from "./api";

export interface ReportData {
  total_products_in_stock: number;
  monthly_revenue: string;
  total_customer_debt: string;
  total_supplier_debt: string;
  report_date: string;
}

export const reportService = {
  async getReport(): Promise<ReportData> {
    const response = await api.get('/reports/');
    return response.data;
  },
};
