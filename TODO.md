# AvtoCRM Login API Integration TODO

## Plan Implementation Steps

### 1. ✅ Planning Complete
- [x] Analyzed files and created detailed edit plan
- [x] User confirmed plan

### 2. Update src/services/authService.ts
- [x] Change login endpoint to `/api/users/login/`
- [x] Change payload: `username` → `phone_number` 
- [x] Add logout API call `POST /api/users/logout/`

### 3. Update src/features/auth/LoginPage.tsx  
- [x] Rename `username` → `phone_number` (state, label, placeholder)
- [x] Update form field for phone input

### 4. Update src/services/__tests__/authService.test.ts
- [x] Update login tests: endpoint and payload
- [x] Add logout API test
- [x] Run `npm test` to verify ✓ (14/14 passed)

### 5. Testing & Verification
- [x] Tests passed - logic verified
- [ ] Manual testing: run dev server → test login/logout

### 6. Completion

- [ ] Update this TODO with completion status
- [ ] Run `attempt_completion`

**Current Step: 2 - Editing authService.ts**

