import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../authService';
import { apiClient } from '../api';

vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('authService', () => {
  const mockUser = {
    id: 1,
    full_name: 'Admin',
    role: 'admin',
    phone_number: '+998901234567',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(localStorage.getItem).mockReturnValue(null);
  });

  it('logs in and stores user session data', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockUser });

    const result = await authService.login('+998901234567', 'password');

    expect(apiClient.post).toHaveBeenCalledWith('/users/login/', {
      phone_number: '+998901234567',
      password: 'password',
    });
    expect(apiClient.get).toHaveBeenCalledWith('/users/profile/');
    expect(result).toEqual(mockUser);
    expect(localStorage.setItem).toHaveBeenCalledWith('crm_auth_time', expect.any(String));
  });

  it('clears stored session on logout even if api fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Logout failed'));

    await authService.logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith('crm_auth_time');
  });

  it('returns null for getCurrentUser as it is a legacy method', () => {
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('isAuthenticated reflects stored user presence', () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'crm_auth_time') return Date.now().toString();
      return null;
    });

    expect(authService.isAuthenticated()).toBe(true);
  });

  it('refreshes auth token and returns user profile', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockUser });

    const result = await authService.refreshAuth();

    expect(apiClient.post).toHaveBeenCalledWith('/users/auth/refresh/', undefined, { skipGlobalErrorHandler: true });
    expect(apiClient.get).toHaveBeenCalledWith('/users/profile/', { skipGlobalErrorHandler: true });
    expect(result).toEqual(mockUser);
    expect(localStorage.setItem).toHaveBeenCalledWith('crm_auth_time', expect.any(String));
  });

  it('returns null and clears storage if refresh fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Refresh failed'));

    const result = await authService.refreshAuth();

    expect(result).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith('crm_auth_time');
  });
});
