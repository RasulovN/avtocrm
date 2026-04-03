# Project Error Fixing - All ESLint/TS/Console Issues

## Current Status
- ESLint: 125 issues (unused vars, any, hooks, etc.)
- Console statements: 42+
- TS runtime issues: unknown assignments
- Build: ✅ passes
- Goal: Zero errors/warnings

## Step-by-Step Plan

### 1. Services Fixes
- [ ] src/services/authService.ts (TS unknown → User|null, remove 6 console.logs, unused ApiResponse)

### 2. Core Components
- [ ] src/components/shared/DataTable.tsx (fix Record<string,unknown> → proper generics)
- [ ] src/components/shared/MainLayout.tsx (fix any types, conditional useEffect → hoist)
- [ ] src/components/ui/Button.tsx (move constants to utils, only export component)
- [ ] src/components/ui/Input.tsx, Table.tsx (add interface members or use Record)

### 3. Page Fixes - Unused Vars/Imports
- [ ] Remove unused: ReactNode (ConfirmDialog), Link/cn (Navbar), icons (SalesListPage, etc.)
- [ ] Remove unused locals: loading (many pages), stores, navigate

### 4. React Hooks Fixes
- [ ] useEffect missing deps: Wrap load* functions in useCallback (Product*, UserListPage, etc.)
- [ ] utils/__tests__/index.test.ts (fix binary expressions)

### 5. Console Cleanup
- [ ] Remove dev console.log (authService)
- [ ] Replace console.error → toast.error('Error: ...') or setErrorState

### 6. Tests & Utils
- [ ] src/services/__tests__/authService.test.ts (fix any)
- [ ] src/utils/cookie.ts (fix any)

### 7. Verification
- [ ] npm run lint (0 errors/warnings)
- [ ] npm run build
- [ ] npm test
- [ ] Final search_files for console.*, any

**Next Step: 1. authService.ts**
