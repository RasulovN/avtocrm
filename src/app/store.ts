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
  checkAuth: () => Promise<void>;
  isAuthenticated: () => boolean;
  hasRole: (roles: string[]) => boolean;
  isSuperUser: () => boolean;
  isStoreScopedUser: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
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

  checkAuth: async () => {
    set({ isLoading: true });
    const user = await authService.fetchProfile();
    set({ user, token: user ? 'session' : null, isLoading: false });
  },

  isAuthenticated: () => {
    return !!get().user || !!get().token;
  },

  hasRole: (roles: string[]) => {
    const user = get().user;
    if (!user) return false;
    return roles.includes(user.role as string);
  },

  isSuperUser: () => {
    const user = get().user;
    return Boolean(user?.is_superuser || user?.role === 'superuser');
  },

  isStoreScopedUser: () => {
    const user = get().user;
    return Boolean(user) && !Boolean(user?.is_superuser || user?.role === 'superuser');
  },
}));

