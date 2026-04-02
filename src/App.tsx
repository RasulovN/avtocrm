import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from './app/store';
import { useEffect } from 'react';

// Layout
import { MainLayout } from './components/shared/MainLayout';

// Feature Pages
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProductListPage } from './features/products/ProductListPage';
import { ProductFormPage } from './features/products/ProductFormPage';
import { ProductBarcodePage } from './features/products/ProductBarcodePage';
import { CategoryListPage } from './features/categories/CategoryListPage';
import { InventoryListPage } from './features/inventory/InventoryListPage';
import { InventoryCreatePage } from './features/inventory/InventoryCreatePage';
import { TransferListPage } from './features/transfers/TransferListPage';
import { TransferCreatePage } from './features/transfers/TransferCreatePage';
import { TransferRequestsPage } from './features/transfers/TransferRequestsPage';
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
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Get current language from i18n
  const currentLang = i18n.language || 'uz';

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Language-prefixed routes */}
        <Route path={`/${currentLang}`} element={<Navigate to={`/${currentLang}/dashboard`} replace />} />
        
        {/* Dashboard */}
        <Route path={`/:lang/dashboard`} element={
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        } />
        
        {/* Products */}
        <Route path={`/:lang/products`} element={
          <MainLayout>
            <ProductListPage />
          </MainLayout>
        } />
        
        <Route path={`/:lang/products/new`} element={
          <MainLayout>
            <ProductFormPage />
          </MainLayout>
        } />
        
        <Route path={`/:lang/products/:id/edit`} element={
          <MainLayout>
            <ProductFormPage />
          </MainLayout>
        } />
        
        <Route path={`/:lang/products/:id/barcode`} element={
          <MainLayout>
            <ProductBarcodePage />
          </MainLayout>
        } />
        
        {/* Categories */}
        <Route path={`/:lang/categories`} element={
          <MainLayout>
            <CategoryListPage />
          </MainLayout>
        } />
        
        {/* Inventory (Kirim) - List */}
        <Route path={`/:lang/inventory`} element={
          <MainLayout>
            <InventoryListPage />
          </MainLayout>
        } />
        
        {/* Inventory - Create */}
        <Route path={`/:lang/inventory/new`} element={
          <MainLayout>
            <InventoryCreatePage />
          </MainLayout>
        } />
        
        {/* Transfers - List */}
        <Route path={`/:lang/transfers`} element={
          <MainLayout>
            <TransferListPage />
          </MainLayout>
        } />
        
        {/* Transfers - Create */}
        <Route path={`/:lang/transfers/new`} element={
          <MainLayout>
            <TransferCreatePage />
          </MainLayout>
        } />
        {/* Transfers - Request */}
        <Route path={`/:lang/transfers/requests`} element={
          <MainLayout>
            <TransferRequestsPage />
          </MainLayout>
        } />
        
        {/* Transfer Requests */}
        <Route path={`/:lang/transfer-requests`} element={
          <MainLayout>
            <TransferRequestsPage />
          </MainLayout>
        } />
        
        {/* Sales - List */}
        <Route path={`/:lang/sales`} element={
          <MainLayout>
            <SalesListPage />
          </MainLayout>
        } />
        
        {/* Sales - Create (POS) */}
        <Route path={`/:lang/sales/new`} element={
          <MainLayout>
            <SalesPage />
          </MainLayout>
        } />
        
        {/* Suppliers */}
        <Route path={`/:lang/suppliers`} element={
          <MainLayout>
            <SupplierListPage />
          </MainLayout>
        } />
        
        {/* Stores */}
        <Route path={`/:lang/stores`} element={
          <MainLayout>
            <StoreListPage />
          </MainLayout>
        } />
        
        {/* Users */}
        <Route path={`/:lang/users`} element={
          <MainLayout>
            <UserListPage />
          </MainLayout>
        } />
        
        {/* Reports */}
        <Route path={`/:lang/reports`} element={
          <MainLayout>
            <ReportsPage />
          </MainLayout>
        } />
        
        {/* Settings */}
        <Route path={`/:lang/settings`} element={
          <MainLayout>
            <SettingsPage />
          </MainLayout>
        } />
        
        {/* Default route - redirect to /uz/dashboard */}
        <Route path="/" element={<Navigate to={`/${currentLang}/dashboard`} replace />} />
        <Route path="*" element={<Navigate to={`/${currentLang}/dashboard`} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
