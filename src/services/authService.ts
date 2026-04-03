import { apiClient } from './api';
import type { User, ApiResponse } from '../types';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const authService = {
  login: async (phone_number: string, password: string): Promise<User> => {
    // Login request - server sets auth cookie
    await apiClient.post<ApiResponse<{ token: string }>>('/users/login/', {
      phone_number,
      password,
    });

    // Fetch profile to get user data
    const profileResponse = await apiClient.get<ApiResponse<User>>('/users/profile/');
    const user = profileResponse.data.data;

    // Store user and token in localStorage for persistence
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, response.data.data.token);
    
    return user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/users/logout/');
    } catch (error) {
      console.warn('Logout API failed:', error);
    }
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
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

