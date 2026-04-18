import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useThemeStore, useAuthStore } from './app/store';

// Layout
import { MainLayout } from './components/shared/MainLayout';

// Feature Pages
const LoginPage = lazy(() => import('./features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() =>
  import('./features/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./features/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage }))
);
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const ProductListPage = lazy(() =>
  import('./features/products/ProductListPage').then((module) => ({ default: module.ProductListPage }))
);
const ProductFormPage = lazy(() =>
  import('./features/products/ProductFormPage').then((module) => ({ default: module.ProductFormPage }))
);
const ProductBarcodePage = lazy(() =>
  import('./features/products/ProductBarcodePage').then((module) => ({ default: module.ProductBarcodePage }))
);
const CategoryListPage = lazy(() =>
  import('./features/categories/CategoryListPage').then((module) => ({ default: module.CategoryListPage }))
);
const InventoryListPage = lazy(() =>
  import('./features/inventory/InventoryListPage').then((module) => ({ default: module.InventoryListPage }))
);
const InventoryCreatePage = lazy(() =>
  import('./features/inventory/InventoryCreatePage').then((module) => ({ default: module.InventoryCreatePage }))
);
const TransferListPage = lazy(() =>
  import('./features/transfers/pages/TransferListPage').then((module) => ({ default: module.TransferListPage }))
);
const TransferCreatePage = lazy(() =>
  import('./features/transfers/pages/TransferCreatePage').then((module) => ({ default: module.TransferCreatePage }))
);
const TransferRequestsPage = lazy(() =>
  import('./features/transfers/pages/TransferRequestsPage').then((module) => ({ default: module.TransferRequestsPage }))
);
const SalesListPage = lazy(() =>
  import('./features/sales/SalesListPage').then((module) => ({ default: module.SalesListPage }))
);
const SalesPage = lazy(() => import('./features/sales/SalesPage').then((module) => ({ default: module.SalesPage })));
const SalesDetailPage = lazy(() =>
  import('./features/sales/SalesDetailPage').then((module) => ({ default: module.SalesDetailPage }))
);
const CustomerListPage = lazy(() =>
  import('./features/customers/CustomerListPage').then((module) => ({ default: module.CustomerListPage }))
);
const SupplierListPage = lazy(() =>
  import('./features/suppliers/SupplierListPage').then((module) => ({ default: module.SupplierListPage }))
);
const StoreListPage = lazy(() =>
  import('./features/stores/StoreListPage').then((module) => ({ default: module.StoreListPage }))
);
const UserListPage = lazy(() => import('./features/users/UserListPage').then((module) => ({ default: module.UserListPage })));
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);
const ReportsPage = lazy(() =>
  import('./features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage }))
);

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
    html.lang = i18n.language === 'cyrl' ? 'uz-Cyrl' : 'uz';
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
    }   else if (path.includes('/stores')) {
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
  const user = useAuthStore((state) => state.user);
  const isSuperUser = Boolean(user?.is_superuser);

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

  const requireAuth = (element: React.ReactNode) =>
    isAuthenticated() ? element : <Navigate to="/login" replace />;

  const withLayout = (page: React.ReactNode) =>
    requireAuth(<MainLayout key={currentLang}>{page}</MainLayout>);

  const routeFallback = (
    <main id="main-content" className="flex min-h-screen items-center justify-center" aria-busy="true">
      <div className="text-sm text-muted-foreground">Yuklanmoqda...</div>
    </main>
  );

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
      <Suspense fallback={routeFallback}>
        <Routes key={currentLang}>
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
            withLayout(<DashboardPage />)
          } />
          
          {/* Products */}
          <Route path={`/:lang/products`} element={
            withLayout(<ProductListPage />)
          } />
          
          <Route path={`/:lang/products/new`} element={
            withLayout(<ProductFormPage />)
          } />
          
          <Route path={`/:lang/products/:id/edit`} element={
            withLayout(<ProductFormPage />)
          } />
          
          <Route path={`/:lang/products/:id/barcode`} element={
            withLayout(<ProductBarcodePage />)
          } />
          
          {/* Categories */}
          <Route path={`/:lang/categories`} element={
            withLayout(<CategoryListPage />)
          } />
          
          {/* Inventory (Kirim) - List */}
          <Route path={`/:lang/inventory`} element={
            withLayout(<InventoryListPage />)
          } />
          
          {/* Inventory - Create */}
          <Route path={`/:lang/inventory/new`} element={
            withLayout(<InventoryCreatePage />)
          } />
          
          {/* Transfers - List */}
          <Route path={`/:lang/transfers`} element={
            withLayout(<TransferListPage />)
          } />
          
          {/* Transfers - Create */}
          <Route path={`/:lang/transfers/new`} element={
            withLayout(<TransferCreatePage />)
          } />
          {/* Transfers - Request */}
          <Route path={`/:lang/transfers/requests`} element={
            withLayout(<TransferRequestsPage />)
          } />
          
          {/* Transfer Requests */}
          <Route path={`/:lang/transfer-requests`} element={
            withLayout(<TransferRequestsPage />)
          } />
          
          {/* Sales - List */}
          <Route path={`/:lang/sales`} element={
            withLayout(<SalesListPage />)
          } />
          
          {/* Sales - Detail */}
          <Route path={`/:lang/sales/:id`} element={
            withLayout(<SalesDetailPage />)
          } />

          {/* Sales - Create (POS) */}
          <Route path={`/:lang/sales/new`} element={
            withLayout(<SalesPage />)
          } />

          {/* Customers */}
          <Route path={`/:lang/customers`} element={
            withLayout(<CustomerListPage />)
          } />
          
          {/* Suppliers */}
          <Route path={`/:lang/suppliers`} element={
            withLayout(<SupplierListPage />)
          } />
          
          {/* Stores */}
          <Route path={`/:lang/stores`} element={
            withLayout(<StoreListPage />)
          } />
          
          {/* Users - only for superuser */}
          <Route path={`/:lang/stores/users`} element={
            isSuperUser ? withLayout(<UserListPage />) : <Navigate to={`/${currentLang}/stores`} replace />
          } />
          
          {/* Reports */}
          <Route path={`/:lang/reports`} element={
            withLayout(<ReportsPage />)
          } />
          
          {/* Settings */}
          <Route path={`/:lang/settings`} element={
            withLayout(<SettingsPage />)
          } />
          
          {/* Default route - redirect to /uz/dashboard */}
          <Route path="/" element={requireAuth(<Navigate to={`/${currentLang}/dashboard`} replace />)} />
          <Route path="*" element={requireAuth(<Navigate to={`/${currentLang}/dashboard`} replace />)} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
