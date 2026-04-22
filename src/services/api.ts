import axios, { AxiosHeaders } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleError } from '../utils/errorHandler';
import { authService } from './authService';
import { isDev } from '../config/environment';

const rawUrl = import.meta.env.VITE_API_URL || (isDev ? '/api' : 'https://api.avtoyon.uz/api');
const BaSE_URL = rawUrl.replace(/\/$/, '');
export const URL = rawUrl.replace(/\/api\/?$/, '') || (isDev ? '/' : 'https://api.avtoyon.uz');
export const API_BASE_URL = BaSE_URL;
export const API_ORIGIN = rawUrl.replace(/\/api\/?$/, '') || (isDev ? '' : BaSE_URL.replace(/\/api\/?$/, ''));

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
  
  localStorage.removeItem('crm_user');
  localStorage.removeItem('crm_auth_time');
};

const hasStoredAuth = () => Boolean(authService.getCurrentUser());

// Disable axios XHR debug logging
// if (typeof window !== 'undefined' && window.XMLHttpRequest) {
//   const originalOpen = window.XMLHttpRequest.prototype.open;
//   window.XMLHttpRequest.prototype.open = function(...args) {
//     if (args[1] && typeof args[1] === 'string' && !args[1].includes('localhost:5173')) {
//       // Suppress logs for production URLs
//     }
//     return originalOpen.apply(this, args);
//   };
// }

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BaSE_URL,

  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

const normalizeLanguage = (lang: string | null | undefined): 'uz' | 'cyrl' => {
  if (!lang) return 'uz';
  const lower = lang.toLowerCase();
  if (lower.startsWith('uz-cyrl') || lower.startsWith('cyrl')) return 'cyrl';
  if (lower.startsWith('uz')) return 'uz';
  return 'uz';
};

const getCurrentLanguage = (): 'uz' | 'cyrl' => {
  if (typeof window === 'undefined') return 'uz';
  const stored = localStorage.getItem('i18nextLng');
  if (stored) {
    const normalized = normalizeLanguage(stored);
    if (stored !== normalized) {
      localStorage.setItem('i18nextLng', normalized);
    }
    return normalized;
  }
  const htmlLang = document?.documentElement?.lang;
  const normalized = normalizeLanguage(htmlLang || 'uz');
  localStorage.setItem('i18nextLng', normalized);
  return normalized;
};

// Request interceptor - no auth token needed, server uses cookies
api.interceptors.request.use(
  (config) => {
    const lang = getCurrentLanguage();
    const apiLang = lang === 'cyrl' ? 'uz-Cyrl' : 'uz';
    const headers = AxiosHeaders.from(config.headers ?? {});
    headers.set('Accept-Language', apiLang);
    config.headers = headers;

    if (config.data instanceof FormData) {
      headers.delete('Content-Type');
    }
    return config;
  },

  (error) => {
    handleError(error, { showToast: false });
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (no logging on success)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data;
    const status = error.response?.status;
    const config = (error.config || {}) as ApiRequestConfig;
    const isExpectedStatus = typeof status === 'number' && config.expectedErrorStatuses?.includes(status);
    const url = error.config?.url || '';

    // Prevent logout recursion and suppress logging for these endpoints
    if (url.includes('/users/logout/') || url.includes('/products/categories') || url.includes('/debts/')) {
      if (status === 401 || status === 404) {
        return Promise.reject(error);
      }
    }
    
    if (config.skipGlobalErrorHandler || isExpectedStatus) {
      return Promise.reject(error);
    }
    
    if (status === 401) {
      if (!hasStoredAuth()) {
        return Promise.reject(error);
      }
      void removeAuth();
      return Promise.reject(error);
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
