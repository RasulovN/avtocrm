import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../userService';
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

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('fetches users with pagination params', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: '1', full_name: 'User 1' },
            { id: '2', full_name: 'User 2' },
          ],
          total: 2,
          page: 1,
          limit: 10,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await userService.getAll({ page: 1, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/users/?page=1&limit=10');
      expect(result.data).toHaveLength(2);
    });

    it('includes store_id in params when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: [], total: 0, page: 1, limit: 10 },
      });

      await userService.getAll({ page: 1, limit: 10, store_id: 'store-1' });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/users/?page=1&limit=10&store_id=store-1'
      );
    });

    it('works without params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: [], total: 0, page: 1, limit: 10 },
      });

      await userService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/users/?');
    });
  });

  describe('getById', () => {
    it('fetches user by id', async () => {
      const mockUser = { id: '1', full_name: 'Test User' };
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockUser },
      });

      const result = await userService.getById('1');

      expect(apiClient.get).toHaveBeenCalledWith('/users/1/');
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('creates user with form data', async () => {
      const formData = {
        full_name: 'New User',
        phone_number: '+998901234567',
        email: 'test@example.com',
        role: 's' as const,
        password: 'password123',
        confirm_password: 'password123',
        store_id: 'store-1',
      };

      const mockUser = { id: '1', ...formData, user_id: 'USR001', created_at: '' };
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockUser },
      });

      const result = await userService.create(formData);

      expect(apiClient.post).toHaveBeenCalledWith('/users/seller-create/', formData);
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('updates user with partial data', async () => {
      const updateData = { full_name: 'Updated Name' };
      const mockUser = { id: '1', full_name: 'Updated Name' };

      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: mockUser },
      });

      const result = await userService.update('1', updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/users/1/', updateData);
      expect(result).toEqual(mockUser);
    });
  });

  describe('delete', () => {
    it('deletes user by id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      await userService.delete('1');

      expect(apiClient.delete).toHaveBeenCalledWith('/users/1/');
    });
  });

  describe('getByStore', () => {
    it('fetches users by store id', async () => {
      const mockUsers = [
        { id: '1', full_name: 'Store User 1' },
        { id: '2', full_name: 'Store User 2' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockUsers },
      });

      const result = await userService.getByStore('store-1');

      expect(apiClient.get).toHaveBeenCalledWith('/users/?store_id=store-1');
      expect(result).toEqual(mockUsers);
    });
  });
});
