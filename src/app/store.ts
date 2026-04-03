import { create } from 'zustand';
import { authService } from '../services/authService';
import type { User } from '../types';

interface ThemeStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    return { theme: newTheme };
  }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
}));

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (phone_number: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  isAuthenticated: () => boolean;
  hasRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: authService.getCurrentUser(),
  token: null,
  isLoading: false,
  error: null,

  login: async (phone_number: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.login(phone_number, password);
      set({ user, token: 'session', isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      });
      throw error;
    }
  },

  logout: () => {
    void authService.logout();
    set({ user: null, token: null });
  },

  checkAuth: () => {
    const user = authService.getCurrentUser();
    set({ user, token: user ? 'session' : null });
  },

  isAuthenticated: () => {
    return !!get().user || !!get().token;
  },

  hasRole: (roles: string[]) => {
    const user = get().user;
    if (!user) return false;
    return roles.includes(user.role as string);
  },
}));

