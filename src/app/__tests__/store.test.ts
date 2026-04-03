import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useThemeStore, useAuthStore } from '../store';
import { authService } from '../../services/authService';

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
    hasRole: vi.fn(),
  },
}));

describe('useThemeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useThemeStore.setState({ theme: 'light' });
  });

  it('has default theme as light', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe('light');
  });

  it('toggles theme from light to dark', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('toggles theme from dark to light', () => {
    useThemeStore.setState({ theme: 'dark' });
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('sets theme directly', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('persists theme to localStorage on toggle', () => {
    useThemeStore.getState().toggleTheme();
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('persists theme to localStorage on setTheme', () => {
    useThemeStore.getState().setTheme('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });
});

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
  });

  it('has default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('login succeeds with valid credentials', async () => {
    const mockUser = {
      id: '1',
      user_id: 'USR001',
      full_name: 'Admin',
      role: 'admin' as const,
      phone: '+998901234567',
      created_at: new Date().toISOString(),
    };

    vi.mocked(authService.login).mockResolvedValue({
      token: 'mock-token',
      user: mockUser,
    });

    await useAuthStore.getState().login('admin', 'password');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('mock-token');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('login sets loading state during request', async () => {
    let resolveLogin: (value: unknown) => void;
    vi.mocked(authService.login).mockImplementation(
      () => new Promise((resolve) => { resolveLogin = resolve; })
    );

    const loginPromise = useAuthStore.getState().login('admin', 'pass');
    expect(useAuthStore.getState().isLoading).toBe(true);

    resolveLogin!({ token: 't', user: { id: '1', user_id: 'U1', full_name: 'A', role: 'admin', phone: '', created_at: '' } });
    await loginPromise;

    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('login sets error on failure', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));

    await expect(useAuthStore.getState().login('admin', 'wrong')).rejects.toThrow();
    const state = useAuthStore.getState();
    expect(state.error).toBe('Invalid credentials');
    expect(state.isLoading).toBe(false);
  });

  it('logout clears user and token', () => {
    useAuthStore.setState({
      user: { id: '1', user_id: 'U1', full_name: 'Test', role: 'admin', phone: '', created_at: '' },
      token: 'some-token',
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('isAuthenticated returns true when token exists', () => {
    useAuthStore.setState({ token: 'some-token' });
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false when no token', () => {
    useAuthStore.setState({ token: null });
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it('hasRole returns true for matching role', () => {
    useAuthStore.setState({
      user: { id: '1', user_id: 'U1', full_name: 'Test', role: 'admin', phone: '', created_at: '' },
    });
    expect(useAuthStore.getState().hasRole(['admin'])).toBe(true);
  });

  it('hasRole returns false for non-matching role', () => {
    useAuthStore.setState({
      user: { id: '1', user_id: 'U1', full_name: 'Test', role: 'store_user', phone: '', created_at: '' },
    });
    expect(useAuthStore.getState().hasRole(['admin'])).toBe(false);
  });

  it('hasRole returns false when no user', () => {
    useAuthStore.setState({ user: null });
    expect(useAuthStore.getState().hasRole(['admin'])).toBe(false);
  });

  it('checkAuth loads user from storage', () => {
    const mockUser = { id: '1', user_id: 'U1', full_name: 'Test', role: 'admin', phone: '', created_at: '' };
    vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key === 'token') return 'stored-token';
      return null;
    });

    useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('stored-token');
  });

  it('checkAuth does nothing without stored data', () => {
    vi.mocked(authService.getCurrentUser).mockReturnValue(null);
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });
});
