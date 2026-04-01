import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from './app/themeStore';
import { useEffect } from 'react';

// Layout
import { MainLayout } from './components/shared/MainLayout';

// Feature Pages
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProductListPage } from './features/products/ProductListPage';
import { ProductFormPage } from './features/products/ProductFormPage';
import { ProductBarcodePage } from './features/products/ProductBarcodePage';
import { CategoryListPage } from './features/categories/CategoryListPage';
import { InventoryCreatePage } from './features/inventory/InventoryCreatePage';
import { TransferCreatePage } from './features/transfers/TransferCreatePage';
import { SalesPage } from './features/sales/SalesPage';
import { SupplierListPage } from './features/suppliers/SupplierListPage';
import { StoreListPage } from './features/stores/StoreListPage';

// Styles
import './i18n';

function App() {
  const { theme } = useThemeStore();
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Dashboard - Direct access without login */}
        <Route path="/dashboard" element={
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        } />
        
        {/* Products - Direct access without login */}
        <Route path="/products" element={
          <MainLayout>
            <ProductListPage />
          </MainLayout>
        } />
        
        <Route path="/products/new" element={
          <MainLayout>
            <ProductFormPage />
          </MainLayout>
        } />
        
        <Route path="/products/:id/edit" element={
          <MainLayout>
            <ProductFormPage />
          </MainLayout>
        } />
        
        <Route path="/products/:id/barcode" element={
          <MainLayout>
            <ProductBarcodePage />
          </MainLayout>
        } />
        
        {/* Categories - Direct access without login */}
        <Route path="/categories" element={
          <MainLayout>
            <CategoryListPage />
          </MainLayout>
        } />
        
        {/* Inventory - Direct access without login */}
        <Route path="/inventory" element={
          <MainLayout>
            <InventoryCreatePage />
          </MainLayout>
        } />
        
        {/* Transfers - Direct access without login */}
        <Route path="/transfers" element={
          <MainLayout>
            <TransferCreatePage />
          </MainLayout>
        } />
        
        {/* Sales - Direct access without login */}
        <Route path="/sales" element={
          <MainLayout>
            <SalesPage />
          </MainLayout>
        } />
        
        {/* Suppliers - Direct access without login */}
        <Route path="/suppliers" element={
          <MainLayout>
            <SupplierListPage />
          </MainLayout>
        } />
        
        {/* Stores - Direct access without login */}
        <Route path="/stores" element={
          <MainLayout>
            <StoreListPage />
          </MainLayout>
        } />
        
        {/* Reports - Direct access without login */}
        <Route path="/reports" element={
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        } />
        
        {/* Settings - Direct access without login */}
        <Route path="/settings" element={
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        } />
        
        {/* Default route  11*/}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
