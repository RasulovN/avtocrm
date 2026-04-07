import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { CustomerListPage } from './features/customers/CustomerListPage';
import { SupplierListPage } from './features/suppliers/SupplierListPage';
import { StoreListPage } from './features/stores/StoreListPage';
import { UserListPage } from './features/users/UserListPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ReportsPage } from './features/reports/ReportsPage';

// Styles
import './i18n';

const DEFAULT_META = {
  title: 'AvtoCRM - Avto ehtiyot qismlar boshqaruv tizimi',
  description: "Avto ehtiyot qismlar do'konlari uchun professional CRM tizimi. Mahsulotlar, sotuvlar, kirim-chiqim va hisobotlarni bitta panelda boshqaring.",
};

function DocumentMetaSync() {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    const html = document.documentElement;
    html.lang = i18n.language || 'uz';
    html.dir = 'ltr';

    let title = DEFAULT_META.title;
    let description = DEFAULT_META.description;

    if (path.includes('/dashboard')) {
      title = 'Bosh sahifa - AvtoCRM';
      description = "AvtoCRM bosh sahifasi. Do'konlar, sotuvlar va ombor holatini real vaqtda kuzating.";
    } else if (path.includes('/products')) {
      title = 'Mahsulotlar - AvtoCRM';
      description = "AvtoCRM mahsulotlar bo'limi. Avto ehtiyot qismlar katalogi, barcode va zaxiralarni boshqaring.";
    } else if (path.includes('/sales')) {
      title = 'Sotuvlar - AvtoCRM';
      description = "AvtoCRM sotuvlar bo'limi. Chek, to'lov usullari va buyurtmalar oqimini boshqaring.";
    } else if (path.includes('/reports')) {
      title = 'Hisobotlar - AvtoCRM';
      description = "AvtoCRM hisobotlar bo'limi. Sotuv, kirim, foyda va o'tkazmalar bo'yicha analitik hisobotlarni ko'ring.";
    } else if (path.includes('/inventory')) {
      title = 'Kirim - AvtoCRM';
      description = "AvtoCRM kirim bo'limi. Ta'minotchilardan kelgan mahsulotlar, xarid summasi va qarzdorlikni nazorat qiling.";
    } else if (path.includes('/transfers')) {
      title = "O'tkazmalar - AvtoCRM";
      description = "AvtoCRM o'tkazmalar bo'limi. Do'konlar orasidagi mahsulot harakatini boshqaring.";
    } else if (path.includes('/customers')) {
      title = 'Mijozlar - AvtoCRM';
      description = "AvtoCRM mijozlar bo'limi. Mijozlar ro'yxati, buyurtmalari, to'lovlari va qarz tarixini ko'ring.";
    } else if (path.includes('/categories')) {
      title = 'Kategoriyalar - AvtoCRM';
      description = "AvtoCRM kategoriyalar bo'limi. Mahsulot kategoriyalarini tartibli boshqarish uchun mo'ljallangan sahifa.";
    } else if (path.includes('/stores')) {
      title = "Do'konlar - AvtoCRM";
      description = "AvtoCRM do'konlar bo'limi. Filiallar, do'kon ma'lumotlari va foydalanuvchilarni boshqaring.";
    } else if (path === '/login') {
      title = 'Kirish - AvtoCRM';
      description = "AvtoCRM tizimiga xavfsiz kirish sahifasi.";
    }

    document.title = title;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute('content', description);
    }
  }, [i18n.language, location.pathname]);

  return null;
}

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
    return (
      <main id="main-content" className="flex min-h-screen items-center justify-center" aria-busy="true">
        <div className="text-sm text-muted-foreground">Yuklanmoqda...</div>
      </main>
    );
  }

  const currentLang = i18n.language || 'uz';

  const requireAuth = (element: React.ReactNode) => {
    return isAuthenticated() ? element : <Navigate to="/login" replace />;
  };

  return (
    <BrowserRouter>
      <DocumentMetaSync />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
        }}
        containerStyle={{
          top: 80,
        }}
      />
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

        {/* Customers */}
        <Route path={`/:lang/customers`} element={
          requireAuth(
            <MainLayout>
              <CustomerListPage />
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
