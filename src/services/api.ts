import axios, { AxiosHeaders } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleError } from '../utils/errorHandler';
import { isDev } from '../config/environment';
import { useAuthStore } from '../app/store';

const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

const apiOriginFromEnv = (ENV_API_BASE_URL && ENV_API_BASE_URL.trim() !== '')
  ? ENV_API_BASE_URL.trim().replace(/\/$/, '')
  : 'https://api.avtoyon.uz';

// Backend endpointlar: http://HOST:8001/api/*
const BaSE_URL = isDev ? '/api' : `${apiOriginFromEnv}/api`;

export const URL = isDev ? '/' : apiOriginFromEnv;
export const MEDIA_URL = apiOriginFromEnv;
export const API_BASE_URL = BaSE_URL;
export const API_ORIGIN = isDev ? '' : `${apiOriginFromEnv}/api`.replace(/\/api\/?$/, '');


export interface ApiRequestConfig extends AxiosRequestConfig {
  expectedErrorStatuses?: number[];
  skipGlobalErrorHandler?: boolean;
  _retry?: boolean;
  _refreshFailed?: boolean;
}

const removeAuth = async () => {
  localStorage.removeItem('crm_auth_time');
  
  // Update the auth store state and call logout API
  useAuthStore.getState().logout();
};

const hasStoredAuth = () => Boolean(localStorage.getItem('crm_auth_time'));

interface FailedRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(null);
    }
  });
  failedQueue = [];
};

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
  // Backend SLA: har bir endpoint <1s da javob berishi kerak (sekinlari
  // backendda 🐌 SLOW warning bilan loglanadi). 15s — sekin tarmoq/sovuq start
  // uchun zaxira; undan uzuni baribir xato deb hisoblanadi va so'rov uziladi.
  // Og'ir amallar (masalan, Excel eksport) o'z konfigida timeout'ni oshirishi mumkin.
  timeout: 15000,
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
    // Ataylab bekor qilingan so'rov (AbortController) xato emas —
    // log/toast'siz jim rad etiladi (masalan, katalog/qidiruv so'rovlari almashganda)
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

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
      if (url.includes('/users/login/') || url.includes('/users/auth/refresh/') || url.includes('/users/logout/')) {
        void removeAuth();
        return Promise.reject(error);
      }

      if (!hasStoredAuth()) {
        return Promise.reject(error);
      }

      const originalRequest = error.config as ApiRequestConfig;
      if (originalRequest && !originalRequest._retry && !originalRequest._refreshFailed) {
        originalRequest._retry = true;

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        isRefreshing = true;

        return new Promise((resolve, reject) => {
          api.post('/users/auth/refresh/', undefined, )
            .then(() => {
              localStorage.setItem('crm_auth_time', Date.now().toString());
              processQueue(null);
              resolve(api(originalRequest));
            })
            .catch((err) => {
              originalRequest._refreshFailed = true;
              processQueue(err);
              void removeAuth();
              reject(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        });
      }

      void removeAuth();
      return Promise.reject(error);
    } else {
      handleError(error, { 
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
