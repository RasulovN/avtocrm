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

const USER_CACHE_KEY = 'crm_user_cache';

const readCachedUser = (): User | null => {
  try {
    // Faqat auth sessiya belgisi bo'lganda keshdan foydalanamiz
    if (!localStorage.getItem('crm_auth_time')) return null;
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (user: User | null) => {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // storage to'lgan/bloklangan bo'lsa e'tiborsiz qoldiramiz
  }
};

const cachedUser = readCachedUser();
const hasAuthMarker = typeof window !== 'undefined' && Boolean(localStorage.getItem('crm_auth_time'));

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Keshlangan user bilan darhol render qilamiz; profil fonda qayta tekshiriladi.
  user: cachedUser,
  token: cachedUser ? 'session' : null,
  // Faqat sessiya belgisi bor-u kesh yo'q bo'lgandagina bloklaymiz
  isLoading: !cachedUser && hasAuthMarker,
  error: null,

  login: async (phone_number: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.login(phone_number, password);
      writeCachedUser(user);
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
    writeCachedUser(null);
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const hadUser = Boolean(get().user);
    // Keshlangan user bo'lsa UI ni bloklamaymiz — fonda yangilaymiz
    if (!hadUser) {
      set({ isLoading: true });
    }
    const user = await authService.fetchProfile();
    if (user) {
      writeCachedUser(user);
      set({ user, token: 'session', isLoading: false });
    } else if (!hadUser || !localStorage.getItem('crm_auth_time')) {
      // Sessiya haqiqatan tugagan — chiqib ketamiz
      writeCachedUser(null);
      set({ user: null, token: null, isLoading: false });
    } else {
      // Tarmoq xatosi bo'lishi mumkin: keshlangan sessiyani saqlab qolamiz
      set({ isLoading: false });
    }
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
    return user != null && !(user.is_superuser || user.role === 'superuser');
  },
}));

