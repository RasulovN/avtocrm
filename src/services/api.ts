import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleError } from '../utils/errorHandler';
import { authService } from './authService';
import { isDev } from '../config/environment';

const USER_KEY = 'crm_user';
const BaSE_URL = 'https://autocrm.pythonanywhere.com/api';
export const API_BASE_URL = BaSE_URL;
export const API_ORIGIN = BaSE_URL.replace(/\/api\/?$/, '');

export interface ApiRequestConfig extends AxiosRequestConfig {
  expectedErrorStatuses?: number[];
  skipGlobalErrorHandler?: boolean;
}

const removeAuth = async () => {
  try {
    await authService.logout();
  } catch (error) {
    console.warn('Logout API call failed:', error);
  }
  
  // Clear localStorage - triggers route guard re-evaluation
  localStorage.removeItem('crm_user');
  localStorage.removeItem('crm_auth_time');
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
    if (config.data instanceof FormData) {
      if (config.headers) {
        const headers = config.headers as unknown as Record<string, string>;
        delete headers['Content-Type'];
      }
    }
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

    // Prevent logout recursion
    if (error.config?.url?.includes('/users/logout/') && status === 401) {
      return Promise.reject(error);
    }
    
    if (config.skipGlobalErrorHandler || isExpectedStatus) {
      return Promise.reject(error);
    }
    
    if (status === 401) {
      void removeAuth();
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
