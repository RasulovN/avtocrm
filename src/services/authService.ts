import { apiClient } from './api';
import type { User, ApiResponse } from '../types';

const USER_KEY = 'user';

export const authService = {
  login: async (phone_number: string, password: string): Promise<User> => {
    await apiClient.post('/users/login/', {
      phone_number,
      password,
    });

    const profileResponse = await apiClient.get<ApiResponse<User>>('/users/profile/');
    const user = profileResponse.data.data;
    
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    return user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/users/logout/');
    } catch (error) {
      console.warn('Logout API failed:', error);
    }
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(USER_KEY);
  },

  hasRole: (roles: string[]): boolean => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    return roles.includes(user.role);
  },
};

