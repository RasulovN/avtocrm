# Cookie-based Auth Integration TODO

## Updated Plan (per API feedback)

### 1. Dependencies ✅
- [x] `npm install js-cookie @types/js-cookie`

### 2. Update Types `src/types/index.ts`
- [ ] User: `phone → phone_number`, add `email?: string`, `history?: UserLog[]`, `id: number`
- [ ] Update UserRole to include 'su' etc.

### 3. Create utils/cookie.ts
- [ ] Cookie helpers: getToken(), setToken(), removeAuth(), getUser()

### 4. Update src/services/authService.ts
- [x] Login: POST + GET profile → cookieAuth
- [x] Logout + other methods using cookieAuth

### 5. Update src/services/api.ts
- [x] Interceptors: cookieAuth.getToken() + removeAuth()

### 6. Update src/app/store.ts
- [x] Remove token state, use phone_number param, cookieAuth

### 7. Protected Routes + Navbar

- [ ] Login: POST → set cookie (no token return) → GET /api/users/profile/
- [ ] Logout: POST → remove cookies
- [ ] getCurrentUser(): parse from cookies or profile

### 5. Update src/services/api.ts
- [ ] Interceptor: `Cookies.get('token')` instead localStorage
- [ ] 401: remove cookies → /login

### 6. Update src/app/store.ts
- [ ] Use cookie utils, call profile on checkAuth

### 7. Protected Routes
- [ ] MainLayout: useAuthStore.isAuthenticated() → redirect if not

### 8. Update Tests
- [ ] Mock js-cookie
- [ ] Verify profile calls

**Current Step: 2 - Update types**

