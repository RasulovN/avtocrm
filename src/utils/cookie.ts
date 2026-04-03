import Cookies from 'js-cookie';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const cookieAuth = {
  getToken(): string | undefined {
    return Cookies.get(TOKEN_KEY);
  },

  setAuth: (token: string, user: string): void => {
    Cookies.set(TOKEN_KEY, token, { expires: 7, secure: true, sameSite: 'strict' });
    Cookies.set(USER_KEY, user, { expires: 7, secure: true, sameSite: 'strict' });
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
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!cookieAuth.getToken();
  }
};

export default cookieAuth;

