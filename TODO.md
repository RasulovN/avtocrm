# Sale Return (Vazrat) Feature - Implementation Plan

## Step 1: Add TypeScript Types
- [x] Add `SaleReturnItem`, `SaleReturn`, `SaleReturnFormData` to `src/types/index.ts`

## Step 2: Add API Service Methods
- [x] Add `getSaleReturns()` and `createSaleReturn()` to `src/services/salesService.ts`

## Step 3: Add i18n Translations
- [x] Add `saleReturns` keys to `src/i18n/locales/uz.json`
- [x] Add `saleReturns` keys to `src/i18n/locales/cyrl.json`

## Step 4: Create Pages
- [x] Create `src/features/sales/SaleReturnListPage.tsx`
- [x] Create `src/features/sales/SaleReturnCreatePage.tsx`

## Step 5: Add Routes
- [x] Register routes in `src/App.tsx`

## Step 6: Update Sidebar
- [x] Add nav item in `src/components/shared/Sidebar.tsx`

## Step 7: Update Sales Detail Page
- [x] Add "Vazrat qilish" button in `src/features/sales/SalesDetailPage.tsx`

## Step 8: Build & Test
- [ ] Run build to verify compilation

## Step 9: SaleReturnListPage Eye Icon Modal
- [x] Replace `Link` navigation with modal dialog on Eye icon click
- [x] Add `Dialog` imports from `src/components/ui/Dialog`
- [x] Add state: `detailOpen` and `selectedReturn`
- [x] Add `handleViewDetails` handler
- [x] Implement modal content: sale info, store, seller, customer, refund, comment, items table
- [x] Update mobile card view button to open modal instead of navigating

