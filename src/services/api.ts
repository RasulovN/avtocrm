import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleError } from '../utils/errorHandler';
import { isDev } from '../config/environment';

const USER_KEY = 'user';
const BaSE_URL = 'https://autocrm.pythonanywhere.com/api';

export interface ApiRequestConfig extends AxiosRequestConfig {
  expectedErrorStatuses?: number[];
  skipGlobalErrorHandler?: boolean;
}

const removeAuth = () => {
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login';
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BaSE_URL,

  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor - no auth token needed, server uses cookies
api.interceptors.request.use(
  (config) => {
    return config;
  },

  (error) => {
    handleError(error, { showToast: false });
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const errorData = error.response?.data;
    const status = error.response?.status;
    const config = (error.config || {}) as ApiRequestConfig;
    const isExpectedStatus = typeof status === 'number' && config.expectedErrorStatuses?.includes(status);

    if (config.skipGlobalErrorHandler || isExpectedStatus) {
      return Promise.reject(error);
    }
    
    if (status === 401) {
      removeAuth();
      handleError(error, { showToast: false });
    } else {
      const message = errorData?.message || errorData?.msg || error.message || 'Server error';
      handleError(new Error(message), { 
        showToast: !isDev,
        logData: { status, url: error.config?.url }
      });
    }
    
    return Promise.reject(error);
  }
);


// Generic API methods
export const apiClient = {
  get: <T>(url: string, config?: ApiRequestConfig): Promise<AxiosResponse<T>> =>
    api.get<T>(url, config),

  post: <T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<AxiosResponse<T>> =>
    api.post<T>(url, data, config),

  put: <T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<AxiosResponse<T>> =>
    api.put<T>(url, data, config),

  patch: <T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<AxiosResponse<T>> =>
    api.patch<T>(url, data, config),

  delete: <T>(url: string, config?: ApiRequestConfig): Promise<AxiosResponse<T>> =>
    api.delete<T>(url, config),
};

export default api;
