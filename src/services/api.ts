import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleError } from '../utils/errorHandler';
import { isDev } from '../config/environment';
import cookieAuth from '../utils/cookie';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = cookieAuth.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    
    if (status === 401) {
      cookieAuth.removeAuth();
      window.location.href = '/login';
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
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.get<T>(url, config),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.post<T>(url, data, config),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.put<T>(url, data, config),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.patch<T>(url, data, config),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    api.delete<T>(url, config),
};

export default api;
