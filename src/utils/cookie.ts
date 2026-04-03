import Cookies from 'js-cookie';
import { isDev } from '../config/environment';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const cookieOptions: Cookies.CookieAttributes = isDev 
  ? { expires: 7, path: '/' }
  : { expires: 7, secure: true, sameSite: 'strict', path: '/' };

export const cookieAuth = {
  getToken(): string | undefined {
    return Cookies.get(TOKEN_KEY);
  },

  setAuth: (userStr: string, token?: string): void => {
    if (token) {
      Cookies.set(TOKEN_KEY, token, cookieOptions);
    }
    Cookies.set(USER_KEY, userStr, cookieOptions);
  },

  getUser(): any | null {
    const userStr = Cookies.get(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  removeAuth(): void {
    Cookies.remove(TOKEN_KEY, { path: '/' });
    Cookies.remove(USER_KEY, { path: '/' });
  },

  isAuthenticated(): boolean {
    return !!cookieAuth.getUser();
  }
};

export default cookieAuth;

