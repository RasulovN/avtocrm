import { apiClient } from './api';
import type { AuditLogEntry, PaginatedResponse } from '../types';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  user_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export const auditService = {
  getAll: async (filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLogEntry>> => {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== '') {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    const response = await apiClient.get(queryString ? `/users/audit-logs/?${queryString}` : '/users/audit-logs/');
    const payload = response.data as {
      results?: AuditLogEntry[];
      data?: AuditLogEntry[];
      count?: number;
      total?: number;
    };
    const data = payload.results ?? payload.data ?? [];
    return {
      data: Array.isArray(data) ? data : [],
      total: payload.count ?? payload.total ?? (Array.isArray(data) ? data.length : 0),
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 20,
    };
  },
};
