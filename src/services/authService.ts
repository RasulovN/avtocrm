import { apiClient } from './api';
import type { User } from '../types';

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
    
    // 3. Store user in localStorage for UI (persistent)
    localStorage.setItem('crm_user', JSON.stringify(user));
    localStorage.setItem('crm_auth_time', Date.now().toString());
    
    return user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/users/logout/');
    } catch {
      // Ignore logout errors
    }
    
    // Clear frontend storage
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_auth_time');
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('crm_user');
    if (!userStr) return null;
    
    try {
      const user = JSON.parse(userStr);
      // Check age < 7 days
      const authTime = localStorage.getItem('crm_auth_time');
      if (authTime && (Date.now() - parseInt(authTime) > 7 * 24 * 60 * 60 * 1000)) {
        localStorage.removeItem('crm_user');
        localStorage.removeItem('crm_auth_time');
        return null;
      }
      return user;
    } catch {
      localStorage.removeItem('crm_user');
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    const user = authService.getCurrentUser();
    return !!user;
  },

  hasRole: (roles: string[]): boolean => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    return roles.includes(user.role as string);
  },

  refreshAuth: async (): Promise<User | null> => {
    try {
      const profileResponse = await apiClient.get<User>('/users/profile/');
      const user = profileResponse.data;
      localStorage.setItem('crm_user', JSON.stringify(user));
      localStorage.setItem('crm_auth_time', Date.now().toString());
      return user;
    } catch {
      localStorage.removeItem('crm_user');
      localStorage.removeItem('crm_auth_time');
      return null;
    }
  }
};

