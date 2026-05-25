import { apiClient } from './api';
import type { User } from '../types';

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  new_password: string;
  confirm_password: string;
}

interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export const authService = {
  login: async (phone_number: string, password: string): Promise<User> => {
    // 1. Login - server sets httpOnly cookie
    await apiClient.post('/users/login/', {
      phone_number,
      password,
    });
    
    // 2. Fetch profile - uses server cookie
    const profileResponse = await apiClient.get<User>('/users/profile/');
    
    const user = profileResponse.data;
    
    // Store only auth time for UI token expiration checks, no PII
    localStorage.setItem('crm_auth_time', Date.now().toString());
    
    return user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/users/logout/', undefined, { skipGlobalErrorHandler: true });
    } catch {
      // Ignore logout errors
    }
    
    // Clear frontend storage
    localStorage.removeItem('crm_auth_time');
  },



  fetchProfile: async (): Promise<User | null> => {
    try {
      const authTime = localStorage.getItem('crm_auth_time');
      if (authTime && (Date.now() - parseInt(authTime) > 7 * 24 * 60 * 60 * 1000)) {
        localStorage.removeItem('crm_auth_time');
        return null;
      }
      const profileResponse = await apiClient.get<User>('/users/profile/', { skipGlobalErrorHandler: true });
      return profileResponse.data;
    } catch {
      return null;
    }
  },

  getCurrentUser: (): User | null => {
    // Legacy method, user info is no longer stored in localStorage
    return null;
  },

  isAuthenticated: (): boolean => {
    return Boolean(localStorage.getItem('crm_auth_time'));
  },

  refreshAuth: async (): Promise<User | null> => {
    try {
      await apiClient.post('/users/auth/refresh/', undefined, { skipGlobalErrorHandler: true });
      const profileResponse = await apiClient.get<User>('/users/profile/', { skipGlobalErrorHandler: true });
      const user = profileResponse.data;
      localStorage.setItem('crm_auth_time', Date.now().toString());
      return user;
    } catch {
      localStorage.removeItem('crm_auth_time');
      return null;
    }
  },

  forgotPassword: async ({ email }: ForgotPasswordPayload): Promise<void> => {
    await apiClient.post('/users/auth/forgot-password/', { email });
  },

  resetPassword: async (uidb64: string, token: string, payload: ResetPasswordPayload): Promise<void> => {
    await apiClient.post(`/users/auth/reset-password/${uidb64}/${token}/`, payload);
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await apiClient.post('/users/change-password/', payload);
  }
};

