import { apiClient } from './api';

export const exportService = {
  /**
   * Backend eksport endpointidan .xlsx faylni yuklab oladi.
   * params ichidagi bo'sh/undefined qiymatlar yuborilmaydi.
   */
  downloadExcel: async (
    endpoint: string,
    params: Record<string, string | undefined>,
    filename: string,
  ): Promise<void> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value);
    });
    const queryString = searchParams.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    const response = await apiClient.get<Blob>(url, { responseType: 'blob' });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  },
};
