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
    expect(localStorage.setItem).toHaveBeenCalledWith('crm_user', JSON.stringify(mockUser));
    expect(localStorage.setItem).toHaveBeenCalledWith('crm_auth_time', expect.any(String));
  });

  it('clears stored session on logout even if api fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Logout failed'));

    await authService.logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith('crm_user');
    expect(localStorage.removeItem).toHaveBeenCalledWith('crm_auth_time');
  });

  it('returns stored user when session is valid', () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'crm_user') return JSON.stringify(mockUser);
      if (key === 'crm_auth_time') return Date.now().toString();
      return null;
    });

    expect(authService.getCurrentUser()).toEqual(mockUser);
  });

  it('returns null for invalid stored user json', () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'crm_user') return 'invalid';
      return null;
    });

    expect(authService.getCurrentUser()).toBeNull();
  });

  it('isAuthenticated reflects stored user presence', () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'crm_user') return JSON.stringify(mockUser);
      if (key === 'crm_auth_time') return Date.now().toString();
      return null;
    });

    expect(authService.isAuthenticated()).toBe(true);
  });
});
