import { apiClient } from './api';
import type { User, ApiResponse } from '../types';

export const authService = {
  login: async (phone_number: string, password: string): Promise<User> => {
    console.log('Login attempt:', phone_number);
    
    // 1. Login - server sets httpOnly cookie
    const loginResponse = await apiClient.post('/api/users/login/', {
      phone_number,
      password,
    });
    console.log('Login response:', loginResponse.status, loginResponse.data);
    
    // 2. Fetch profile - uses server cookie
    const profileResponse = await apiClient.get('/api/users/profile/');
    console.log('Profile response:', profileResponse.status, profileResponse.data);
    
    const user = profileResponse.data;
    
    // 3. Store user in localStorage for UI (persistent)
    localStorage.setItem('crm_user', JSON.stringify(user));
    localStorage.setItem('crm_auth_time', Date.now().toString());
    
    console.log('User stored:', user);
    
    return user;
  },

  logout: async (): Promise<void> => {
    console.log('Logout...');
    try {
      await apiClient.post('/api/users/logout/');
    } catch (error) {
      console.warn('Logout API failed:', error);
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
      const profileResponse = await apiClient.get('/api/users/profile/');
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

