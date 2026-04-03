import { apiClient } from './api';
import cookieAuth from '../utils/cookie';
import type { User, ApiResponse } from '../types';

export const authService = {
  login: async (phone_number: string, password: string): Promise<User> => {
    await apiClient.post('/users/login/', {
      phone_number,
      password,
    });

    const profileResponse = await apiClient.get<ApiResponse<User>>('/users/profile/');
    const user = profileResponse.data.data;
    
    cookieAuth.setAuth(JSON.stringify(user));
    
    return user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/users/logout/');
    } catch (error) {
      console.warn('Logout API failed:', error);
    }
    cookieAuth.removeAuth();
  },

  getCurrentUser: (): User | null => {
    return cookieAuth.getUser() as User | null;
  },

  isAuthenticated: (): boolean => {
    return cookieAuth.isAuthenticated();
  },

  hasRole: (roles: string[]): boolean => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    return roles.includes(user.role);
  },
};

