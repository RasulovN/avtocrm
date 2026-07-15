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
const ProductUnitPage = lazy(() =>
  import('./features/products/ProductUnit').then((module) => ({ default: module.default }))
);
const CategoryListPage = lazy(() =>
  import('./features/categories/CategoryListPage').then((module) => ({ default: module.CategoryListPage }))
);
const ProductLocationPage = lazy(() =>
  import('./features/product-location/ProductLocationPage').then((module) => ({ default: module.ProductLocationPage }))
);
const StockEntryListPage = lazy(() =>
  import('./features/StockEntry/StockEntryListPage').then((module) => ({ default: module.StockEntryListPage }))
);

const InventorySessionsListPage = lazy(() =>
  import('./features/inventory/InventoryListPage').then((module) => ({ default: module.InventorySessionsListPage }))
); 
const InventoryDetailPage = lazy(() =>
  import('./features/inventory/InventoryDetailPage').then((module) => ({ default: module.InventoryDetailPage }))
);
const InventoryShortagesPage = lazy(() =>
  import('./features/inventory/InventoryShortagesPage').then((module) => ({ default: module.InventoryShortagesPage }))
);
const LowStockPage = lazy(() =>
  import('./features/inventory/LowStockPage').then((module) => ({ default: module.LowStockPage }))
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
const SaleReturnListPage = lazy(() =>
  import('./features/sales/SaleReturnListPage').then((module) => ({ default: module.SaleReturnListPage }))
);
const SaleReturnCreatePage = lazy(() =>
  import('./features/sales/SaleReturnCreatePage').then((module) => ({ default: module.SaleReturnCreatePage }))
);
const CustomerListPage = lazy(() =>
  import('./features/customers/CustomerListPage').then((module) => ({ default: module.CustomerListPage }))
);
const SupplierListPage = lazy(() =>
  import('./features/suppliers/SupplierListPage').then((module) => ({ default: module.SupplierListPage }))
);
const SupplierDetailPage = lazy(() =>
  import('./features/suppliers/SupplierDetailPage').then((module) => ({ default: module.SupplierDetailPage }))
);
const StoreListPage = lazy(() =>
  import('./features/stores/StoreListPage').then((module) => ({ default: module.StoreListPage }))
);
const UserListPage = lazy(() => import('./features/users/UserListPage').then((module) => ({ default: module.UserListPage })));
const RolesPage = lazy(() => import('./features/roles/RolesPage').then((module) => ({ default: module.RolesPage })));
const AuditLogPage = lazy(() => import('./features/audit/AuditLogPage').then((module) => ({ default: module.AuditLogPage })));
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);
const BankCardsPage = lazy(() =>
  import('./features/settings/BankCardsPage').then((module) => ({ default: module.BankCardsPage }))
);
const ReportsPage = lazy(() =>
  import('./features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage }))
);

const InventoryPage = lazy(() => import('./features/inventory/InventoryPage'));

// Styles
import './i18n/index';

// const DEFAULT_META = {
//   title: 'AvtoCRM - Avto ehtiyot qismlar boshqaruv tizimi',
//   description: "Avto ehtiyot qismlar do'konlari uchun professional CRM tizimi. Mahsulotlar, sotuvlar, kirim-chiqim va hisobotlarni bitta panelda boshqaring.",
// };

function DocumentMetaSync() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    const html = document.documentElement;
    html.lang = i18n.language === 'cyrl' ? 'uz-Cyrl' : 'uz';
    html.dir = 'ltr';

    let title = t('seo.defaultTitle');
    let description = t('seo.defaultDesc');

    if (path.includes('/dashboard')) {
      title = t('seo.dashboardTitle');
      description = t('seo.dashboardDesc');
    } else if (path.includes('/products')) {
      title = t('seo.productsTitle');
      description = t('seo.productsDesc');
    } else if (path.includes('/sales')) {
      title = t('seo.salesTitle');
      description = t('seo.salesDesc');
    } else if (path.includes('/reports')) {
      title = t('seo.reportsTitle');
      description = t('seo.reportsDesc');
    } else if (
      path.includes('/inventory') ||
      path === '/inventory-sessions' ||
      path.includes('/inventory-session/')
    ) {
      title = t('seo.inventoryTitle');
      description = t('seo.inventoryDesc');
    } else if (path.includes('/stockentry') || path.includes('/inventory/kirimlar')) {
      title = t('seo.stockEntryTitle');
      description = t('seo.stockEntryDesc');
    } else if (path.includes('/transfers')) {
      title = t('seo.transfersTitle');
      description = t('seo.transfersDesc');
    } else if (path.includes('/customers')) {
      title = t('seo.customersTitle');
      description = t('seo.customersDesc');
    }   else if (path.includes('/stores')) {
      title = t('seo.storesTitle');
      description = t('seo.storesDesc');
    } else if (path === '/login') {
      title = t('seo.loginTitle');
      description = t('seo.loginDesc');
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
  const { t, i18n } = useTranslation();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const isSuperUser = Boolean(user?.is_superuser || user?.role === 'superuser');

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
        <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
      </main>
    );
  }

  const currentLang = i18n.language || 'cyrl';

  const requireAuth = (element: React.ReactNode) =>
    isAuthenticated() ? element : <Navigate to="/login" replace />;

  const withLayout = (page: React.ReactNode) =>
    requireAuth(<MainLayout key={currentLang}>{page}</MainLayout>);

  const requireNoSeller = (element: React.ReactNode) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }
    // Legacy sotuvchi bloki faqat tizim roli YO'Q userlar uchun:
    // tizim roli borlarni permission tekshiruvi boshqaradi
    if (user?.role === 's' && !Array.isArray(user?.permissions)) {
      return <Navigate to={`/${currentLang}/dashboard`} replace />;
    }
    return element;
  };

  const withLayoutNoSeller = (page: React.ReactNode) =>
    requireNoSeller(<MainLayout key={currentLang}>{page}</MainLayout>);

  // RBAC: rol biriktirilgan user faqat permission'i bor sahifalarga kira oladi.
  // Superuser va rolsiz (legacy) userlar cheklanmaydi.
  const userHasPermission = (code: string) => {
    if (!user) return false;
    if (isSuperUser) return true;
    if (user.permissions == null) return true;
    return user.permissions.includes(code);
  };

  const requirePermission = (element: React.ReactNode, code: string) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }
    if (!userHasPermission(code)) {
      return <Navigate to={`/${currentLang}/dashboard`} replace />;
    }
    return element;
  };

  const withLayoutPermission = (page: React.ReactNode, code: string) =>
    requirePermission(<MainLayout key={currentLang}>{page}</MainLayout>, code);

  // users/roles sahifalari uchun qat'iy tekshiruv: rolsiz oddiy user ham kira olmaydi
  // (legacy'da bu sahifalar faqat superuser uchun edi)
  const rbacAllows = (code: string) => {
    if (isSuperUser) return true;
    if (Array.isArray(user?.permissions)) return user.permissions.includes(code);
    return false;
  };

  const routeFallback = (
    <main id="main-content" className="flex min-h-screen items-center justify-center" aria-busy="true">
      <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
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
            withLayoutPermission(<ProductListPage />, 'products.view')
          } />

          <Route path={`/:lang/products/new`} element={
            withLayoutPermission(<ProductFormPage />, 'products.create')
          } />

          <Route path={`/:lang/products/:id/edit`} element={
            withLayoutPermission(<ProductFormPage />, 'products.edit')
          } />

          <Route path={`/:lang/products/:id/barcode`} element={
            withLayoutPermission(<ProductBarcodePage />, 'products.view')
          } />
          <Route path={`/:lang/products/units`} element={
            withLayoutPermission(<ProductUnitPage />, 'products.view')
          } />

          {/* Categories */}
          <Route path={`/:lang/products/categories`} element={
            withLayoutPermission(<CategoryListPage />, 'categories.view')
          } />
          <Route path={`/:lang/products/location`} element={
            withLayoutPermission(<ProductLocationPage />, 'products.view')
          } />

          {/* Stock entry (Kirim) - List */}
          <Route path={`/:lang/stockentry`} element={
            withLayoutPermission(<StockEntryListPage />, 'stockentry.view')
          } />
          

          {/* Inventorizatsiya */}
          <Route path={`/:lang/inventory`} element={
            requirePermission(withLayoutNoSeller(<InventorySessionsListPage />), 'inventory.view')
          } />
          <Route path={`/:lang/inventory/new`} element={
            requirePermission(withLayoutNoSeller(<InventoryPage />), 'inventory.create')
          } />


          <Route path={`/:lang/inventory/kirimlar`} element={
            requirePermission(withLayoutNoSeller(<StockEntryListPage />), 'stockentry.view')
          } />

          <Route path={`/:lang/inventory/kamomat`} element={
            requirePermission(withLayoutNoSeller(<InventoryShortagesPage />), 'inventory.view')
          } />

          {/* Low Stock — Kam Zaxira (Xarid submenusidagi asosiy manzil) */}
          <Route path={`/:lang/stockentry/low-stock`} element={
            requirePermission(withLayoutNoSeller(<LowStockPage />), 'inventory.view')
          } />
          {/* Eski manzil ham ishlashda davom etadi */}
          <Route path={`/:lang/inventory/low-stock`} element={
            requirePermission(withLayoutNoSeller(<LowStockPage />), 'inventory.view')
          } />

          {/* Inventory Sessions - List */}
          <Route path={`/:lang/inventory-sessions`} element={
            requirePermission(withLayoutNoSeller(<InventorySessionsListPage />), 'inventory.view')
          } />

          {/* Inventory Session - Detail */}
          <Route path={`/:lang/inventory-session/:id`} element={
            requirePermission(withLayoutNoSeller(<InventoryDetailPage />), 'inventory.view')
          } />

          {/* Transfers - List */}
          <Route path={`/:lang/transfers`} element={
            withLayoutPermission(<TransferListPage />, 'transfers.view')
          } />

          {/* Transfers - Create */}
          <Route path={`/:lang/transfers/new`} element={
            withLayoutPermission(<TransferCreatePage />, 'transfers.create')
          } />
          {/* Transfers - Request */}
          <Route path={`/:lang/transfers/requests`} element={
            withLayoutPermission(<TransferRequestsPage />, 'transfers.view')
          } />

          {/* Transfer Requests */}
          <Route path={`/:lang/transfer-requests`} element={
            withLayoutPermission(<TransferRequestsPage />, 'transfers.view')
          } />

          {/* Sales - Create (POS) */}
          <Route path={`/:lang/sales/new`} element={
            withLayoutPermission(<SalesPage />, 'sales.create')
          } />
          {/* Sales - List */}
          <Route path={`/:lang/sales`} element={
            withLayoutPermission(<SalesListPage />, 'sales.view')
          } />

          {/* Sales - Detail */}
          <Route path={`/:lang/sales/:id`} element={
            withLayoutPermission(<SalesDetailPage />, 'sales.view')
          } />


          {/* Sale Returns - List */}
          <Route path={`/:lang/sales-returns`} element={
            withLayoutPermission(<SaleReturnListPage />, 'sales.view')
          } />

          {/* Sale Returns - Create */}
          <Route path={`/:lang/sales-returns/new`} element={
            withLayoutPermission(<SaleReturnCreatePage />, 'sales.create')
          } />

          {/* Customers */}
          <Route path={`/:lang/customers`} element={
            withLayoutPermission(<CustomerListPage />, 'customers.view')
          } />

          {/* Suppliers */}
          <Route path={`/:lang/suppliers`} element={
            withLayoutPermission(<SupplierListPage />, 'suppliers.view')
          } />

          {/* Supplier detail (dashboard / kirimlar / to'lovlar / ma'lumotlar / tovarlar) */}
          <Route path={`/:lang/suppliers/:id`} element={
            withLayoutPermission(<SupplierDetailPage />, 'suppliers.view')
          } />

          {/* Stores */}
          <Route path={`/:lang/stores`} element={
            withLayoutPermission(<StoreListPage />, 'stores.view')
          } />

          {/* Users - superuser yoki users.view permission'li rol */}
          <Route path={`/:lang/stores/users`} element={
            rbacAllows('users.view') ? withLayout(<UserListPage />) : <Navigate to={`/${currentLang}/stores`} replace />
          } />

          {/* Roles (RBAC) - superuser yoki roles.view permission'li rol */}
          <Route path={`/:lang/stores/roles`} element={
            rbacAllows('roles.view') ? withLayout(<RolesPage />) : <Navigate to={`/${currentLang}/stores`} replace />
          } />

          {/* Reports */}
          <Route path={`/:lang/reports`} element={
            withLayoutPermission(<ReportsPage />, 'reports.view')
          } />
          
          {/* Settings */}
          <Route path={`/:lang/settings`} element={
            withLayout(<SettingsPage />)
          } />

          {/* Settings submenu: to'lov turlari, foydalanuvchilar, rollar */}
          <Route path={`/:lang/settings/payments`} element={
            withLayout(<BankCardsPage />)
          } />
          <Route path={`/:lang/settings/users`} element={
            rbacAllows('users.view') ? withLayout(<UserListPage />) : <Navigate to={`/${currentLang}/settings`} replace />
          } />
          <Route path={`/:lang/settings/roles`} element={
            rbacAllows('roles.view') ? withLayout(<RolesPage />) : <Navigate to={`/${currentLang}/settings`} replace />
          } />
          <Route path={`/:lang/settings/audit`} element={
            rbacAllows('audit.view') ? withLayout(<AuditLogPage />) : <Navigate to={`/${currentLang}/settings`} replace />
          } />

          {/* Bank Cards */}
          <Route path={`/:lang/bank-cards`} element={
            withLayout(<BankCardsPage />)
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
