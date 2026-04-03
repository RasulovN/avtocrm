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
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem.mockReturnValue(null);
  });

  describe('login', () => {
    it('calls API with credentials and stores token', async () => {
      const mockUser = {
        id: '1',
        user_id: 'USR001',
        full_name: 'Admin',
        role: 'admin',
        phone: '+998901234567',
        created_at: new Date().toISOString(),
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          data: {
            token: 'test-token',
            user: mockUser,
          },
        },
      });

      const result = await authService.login('admin', 'password');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        username: 'admin',
        password: 'password',
      });
      expect(result.token).toBe('test-token');
      expect(result.user).toEqual(mockUser);
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    });

    it('stores user in localStorage', async () => {
      const mockUser = {
        id: '1',
        user_id: 'U1',
        full_name: 'Test',
        role: 'admin',
        phone: '',
        created_at: '',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: { token: 't', user: mockUser } },
      });

      await authService.login('user', 'pass');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockUser)
      );
    });

    it('throws error on API failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));

      await expect(authService.login('admin', 'wrong')).rejects.toThrow('Network error');
    });
  });

  describe('logout', () => {
    it('removes token and user from localStorage', () => {
      authService.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('getCurrentUser', () => {
    it('returns user from localStorage', () => {
      const mockUser = { id: '1', full_name: 'Test' };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      const user = authService.getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it('returns null when no user in localStorage', () => {
      localStorage.getItem.mockReturnValue(null);

      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('returns null on invalid JSON', () => {
      localStorage.getItem.mockReturnValue('invalid-json');

      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when token exists', () => {
      localStorage.getItem.mockReturnValue('some-token');

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('returns false when no token', () => {
      localStorage.getItem.mockReturnValue(null);

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('returns true for matching role', () => {
      const mockUser = { id: '1', full_name: 'Test', role: 'admin' };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      expect(authService.hasRole(['admin'])).toBe(true);
    });

    it('returns false for non-matching role', () => {
      const mockUser = { id: '1', full_name: 'Test', role: 'store_user' };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      expect(authService.hasRole(['admin'])).toBe(false);
    });

    it('returns false when no user', () => {
      localStorage.getItem.mockReturnValue(null);

      expect(authService.hasRole(['admin'])).toBe(false);
    });

    it('returns true when role is in allowed list', () => {
      const mockUser = { id: '1', full_name: 'Test', role: 'store_admin' };
      localStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      expect(authService.hasRole(['admin', 'store_admin'])).toBe(true);
    });
  });
});
