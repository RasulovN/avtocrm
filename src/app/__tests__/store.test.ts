import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useThemeStore, useAuthStore } from '../store';
import { authService } from '../../services/authService';

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

describe('useThemeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeStore.setState({ theme: 'light' });
  });

  it('toggles theme and persists it', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });
});

describe('useAuthStore', () => {
  const mockUser = {
    id: 1,
    full_name: 'Admin',
    role: 'admin',
    phone_number: '+998901234567',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
  });

  it('login updates authenticated state', async () => {
    vi.mocked(authService.login).mockResolvedValue(mockUser);

    await useAuthStore.getState().login(mockUser.phone_number, 'password');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('session');
    expect(state.isAuthenticated()).toBe(true);
  });

  it('logout clears auth state', () => {
    useAuthStore.setState({ user: mockUser, token: 'session' });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('checkAuth restores user from service', () => {
    vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);

    useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('session');
  });
});
