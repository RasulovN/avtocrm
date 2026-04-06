import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useThemeStore, useAuthStore } from './app/store';
import { useEffect } from 'react';

// Layout
import { MainLayout } from './components/shared/MainLayout';

// Feature Pages
import { LoginPage } from './features/auth/LoginPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProductListPage } from './features/products/ProductListPage';
import { ProductFormPage } from './features/products/ProductFormPage';
import { ProductBarcodePage } from './features/products/ProductBarcodePage';
import { CategoryListPage } from './features/categories/CategoryListPage';
import { InventoryListPage } from './features/inventory/InventoryListPage';
import { InventoryCreatePage } from './features/inventory/InventoryCreatePage';
import { TransferListPage } from './features/transfers/pages/TransferListPage';
import { TransferCreatePage } from './features/transfers/pages/TransferCreatePage';
import { TransferRequestsPage } from './features/transfers/pages/TransferRequestsPage';
import { SalesListPage } from './features/sales/SalesListPage';
import { SalesPage } from './features/sales/SalesPage';
import { SupplierListPage } from './features/suppliers/SupplierListPage';
import { StoreListPage } from './features/stores/StoreListPage';
import { UserListPage } from './features/users/UserListPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ReportsPage } from './features/reports/ReportsPage';

// Styles
import './i18n';

function App() {
  const { theme } = useThemeStore();
  const { i18n } = useTranslation();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  if (isAuthLoading) {
    return null;
  }

  const currentLang = i18n.language || 'uz';

  const requireAuth = (element: React.ReactNode) => {
    return isAuthenticated() ? element : <Navigate to="/login" replace />;
  };

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Login - accessible without auth */}
        <Route path="/login" element={
          isAuthenticated() ? <Navigate to={`/${currentLang}/dashboard`} replace /> : <LoginPage />
        } />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:uidb64/:token" element={<ResetPasswordPage />} />
        
        {/* Language-prefixed routes */}
        <Route path={`/${currentLang}`} element={requireAuth(<Navigate to={`/${currentLang}/dashboard`} replace />)} />
        
        {/* Dashboard */}
        <Route path={`/:lang/dashboard`} element={
          requireAuth(
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          )
        } />
        
        {/* Products */}
        <Route path={`/:lang/products`} element={
          requireAuth(
            <MainLayout>
              <ProductListPage />
            </MainLayout>
          )
        } />
        
        <Route path={`/:lang/products/new`} element={
          requireAuth(
            <MainLayout>
              <ProductFormPage />
            </MainLayout>
          )
        } />
        
        <Route path={`/:lang/products/:id/edit`} element={
          requireAuth(
            <MainLayout>
              <ProductFormPage />
            </MainLayout>
          )
        } />
        
        <Route path={`/:lang/products/:id/barcode`} element={
          requireAuth(
            <MainLayout>
              <ProductBarcodePage />
            </MainLayout>
          )
        } />
        
        {/* Categories */}
        <Route path={`/:lang/categories`} element={
          requireAuth(
            <MainLayout>
              <CategoryListPage />
            </MainLayout>
          )
        } />
        
        {/* Inventory (Kirim) - List */}
        <Route path={`/:lang/inventory`} element={
          requireAuth(
            <MainLayout>
              <InventoryListPage />
            </MainLayout>
          )
        } />
        
        {/* Inventory - Create */}
        <Route path={`/:lang/inventory/new`} element={
          requireAuth(
            <MainLayout>
              <InventoryCreatePage />
            </MainLayout>
          )
        } />
        
        {/* Transfers - List */}
        <Route path={`/:lang/transfers`} element={
          requireAuth(
            <MainLayout>
              <TransferListPage />
            </MainLayout>
          )
        } />
        
        {/* Transfers - Create */}
        <Route path={`/:lang/transfers/new`} element={
          requireAuth(
            <MainLayout>
              <TransferCreatePage />
            </MainLayout>
          )
        } />
        {/* Transfers - Request */}
        <Route path={`/:lang/transfers/requests`} element={
          requireAuth(
            <MainLayout>
              <TransferRequestsPage />
            </MainLayout>
          )
        } />
        
        {/* Transfer Requests */}
        <Route path={`/:lang/transfer-requests`} element={
          requireAuth(
            <MainLayout>
              <TransferRequestsPage />
            </MainLayout>
          )
        } />
        
        {/* Sales - List */}
        <Route path={`/:lang/sales`} element={
          requireAuth(
            <MainLayout>
              <SalesListPage />
            </MainLayout>
          )
        } />
        
        {/* Sales - Create (POS) */}
        <Route path={`/:lang/sales/new`} element={
          requireAuth(
            <MainLayout>
              <SalesPage />
            </MainLayout>
          )
        } />
        
        {/* Suppliers */}
        <Route path={`/:lang/suppliers`} element={
          requireAuth(
            <MainLayout>
              <SupplierListPage />
            </MainLayout>
          )
        } />
        
        {/* Stores */}
        <Route path={`/:lang/stores`} element={
          requireAuth(
            <MainLayout>
              <StoreListPage />
            </MainLayout>
          )
        } />
        
        {/* Users */}
        <Route path={`/:lang/stores/users`} element={
          requireAuth(
            <MainLayout>
              <UserListPage />
            </MainLayout>
          )
        } />
        
        {/* Reports */}
        <Route path={`/:lang/reports`} element={
          requireAuth(
            <MainLayout>
              <ReportsPage />
            </MainLayout>
          )
        } />
        
        {/* Settings */}
        <Route path={`/:lang/settings`} element={
          requireAuth(
            <MainLayout>
              <SettingsPage />
            </MainLayout>
          )
        } />
        
        {/* Default route - redirect to /uz/dashboard */}
        <Route path="/" element={requireAuth(<Navigate to={`/${currentLang}/dashboard`} replace />)} />
        <Route path="*" element={requireAuth(<Navigate to={`/${currentLang}/dashboard`} replace />)} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
