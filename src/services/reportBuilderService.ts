import { apiClient } from './api';

/**
 * Reports moduli API: meta (hisobot turlari + dinamik filtrlar), generate
 * (filtrlangan jadval, server-side pagination) va export (excel/csv —
 * jadval bilan aynan bir xil filtrlar).
 */

export interface ReportFilterOption {
  value: string;
  label: string;
}

export interface ReportFilterDef {
  param: string;
  type: 'select' | 'daterange';
  label: string;
  options?: ReportFilterOption[];
}

export interface ReportTypeDef {
  key: string;
  label: string;
  search: boolean;
  filters: ReportFilterDef[];
}

export interface ReportColumn {
  key: string;
  label: string;
  kind: 'text' | 'money' | 'int';
}

export interface ReportSummaryItem {
  label: string;
  value: string | number;
  kind: 'money' | 'int';
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary: ReportSummaryItem[];
  total: number;
  page: number;
  limit: number;
}

export type ReportParams = Record<string, string | undefined>;

const cleanParams = (params: ReportParams): string => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) sp.append(k, v);
  });
  return sp.toString();
};

export const reportBuilderService = {
  getMeta: async (): Promise<{ reports: ReportTypeDef[] }> => {
    const response = await apiClient.get<{ reports: ReportTypeDef[] }>('/reports/builder/meta/');
    return response.data;
  },

  generate: async (params: ReportParams): Promise<ReportResult> => {
    const response = await apiClient.get<ReportResult>(`/reports/builder/?${cleanParams(params)}`);
    return response.data;
  },

  /** Jadval bilan AYNAN bir xil filtrlar bilan fayl yuklab olish */
  exportFile: async (params: ReportParams, exportType: 'excel' | 'csv'): Promise<void> => {
    const query = cleanParams({ ...params, export_type: exportType });
    const response = await apiClient.get<Blob>(`/reports/builder/export/?${query}`, {
      responseType: 'blob',
      timeout: 60000,
    });
    const ext = exportType === 'csv' ? 'csv' : 'xlsx';
    const blob = new Blob([response.data], {
      type:
        exportType === 'csv'
          ? 'text/csv;charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${params.report_type || 'hisobot'}_${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
