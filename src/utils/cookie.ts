import Cookies from 'js-cookie';
import type { User } from '../types';

const USER_KEY = 'user';

export const cookieAuth = {
  getUser(): User | Record<string, unknown> | null {
    const userStr = Cookies.get(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  setAuth: (userStr: string): void => {
    Cookies.set(USER_KEY, userStr, { expires: 7, path: '/', sameSite: 'lax' });
  },

  removeAuth(): void {
    Cookies.remove(USER_KEY, { path: '/' });
  },

  isAuthenticated(): boolean {
    return !!cookieAuth.getUser();
  }
};

export default cookieAuth;


