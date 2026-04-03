import { apiClient } from './api';
import cookieAuth from '../utils/cookie';
import type { User, ApiResponse } from '../types';

export const authService = {
  login: async (phone_number: string, password: string): Promise<User> => {
    // Login - server sets cookie
    await apiClient.post('/api/users/login/', {
      phone_number,
      password,
    });

    // Fetch profile to get user data
    const profileResponse = await apiClient.get<ApiResponse<User>>('/api/users/profile/');
    const user = profileResponse.data.data;
    
    // Store user in cookie (token already in cookie from login)
    cookieAuth.setAuth('', JSON.stringify(user)); 
    
    return user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/api/users/logout/');
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

