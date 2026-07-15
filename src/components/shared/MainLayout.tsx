import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  Tags,
  ArrowDownToLine,
  ArrowRightLeft,
  DollarSign,
  Truck,
  Store,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  User,
  Bell,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  ChevronRight,
  Plus,
  List,
  ArrowLeft, 
  Users,
  ClipboardCheck, 
  LocationEdit,
  Ruler,
  Undo2,
  X,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  ScrollText,
} from 'lucide-react';
import { NotificationProvider } from '../../context/NotificationProvider';
import { NotificationToast } from './NotificationToast';
import { cn, getPreferredStore } from '../../utils';
import { useThemeStore, useAuthStore } from '../../app/store';
import { Button } from '../ui';
import { useNotifications } from '../../context/NotificationProvider';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  access?: 'superuser' | 'store' | 'all';
  // RBAC: roli bor user uchun shu permission bo'lmasa menyu ko'rinmaydi
  permission?: string;
}

interface SubNavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  // Legacy rejimda (tizim rolisiz userlar) faqat superuser ko'radi
  superuserOnly?: boolean;
}

const navItems: NavItem[] = [
  { titleKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, access: 'all', permission: 'dashboard.view' },
  { titleKey: 'nav.sales', href: '/sales', icon: DollarSign, access: 'all', permission: 'sales.view' },
  { titleKey: 'nav.transfers', href: '/transfers', icon: ArrowRightLeft, access: 'all', permission: 'transfers.view' },
  { titleKey: 'nav.products', href: '/products', icon: Package, access: 'all', permission: 'products.view' },
  // { titleKey: 'nav.categories', href: '/categories', icon: Tags, access: 'all' },
  // Xarid (kirim): do'kon paneli ham ko'radi — backend xodimni faqat o'z do'koniga kirim qilishiga cheklaydi.
  // Kam Zaxira ham shu bo'limning submenusida
  { titleKey: 'nav.stockentry', href: '/stockentry', icon: ArrowDownToLine, access: 'all', permission: 'stockentry.view' },
  { titleKey: 'nav.reports', href: '/reports', icon: BarChart3, access: 'superuser', permission: 'reports.view' },
  { titleKey: 'nav.inventory', href: '/inventory', icon: ClipboardCheck, access: 'all', permission: 'inventory.view' },
  { titleKey: 'nav.customers', href: '/customers', icon: Users, access: 'all', permission: 'customers.view' },
  { titleKey: 'nav.suppliers', href: '/suppliers', icon: Truck, access: 'superuser', permission: 'suppliers.view' },
  // nav.stores (superuser) endi alohida menyu emas — Sozlamalar submenusi ichida
  { titleKey: 'nav.storeInfo', href: '/stores', icon: Store, access: 'store', permission: 'stores.view' },
  { titleKey: 'nav.settings', href: '/settings', icon: Settings, access: 'all' },
];

// Sub-navigation for modules that have both list and create pages
const subNavs: Record<string, SubNavItem[]> = {
  // Xarid submenu: kirimlar ro'yxati + kam zaxira
  '/stockentry': [
    { titleKey: 'nav.stockentryList', href: '/stockentry', icon: List, permission: 'stockentry.view' },
    { titleKey: 'nav.lowStock', href: '/stockentry/low-stock', icon: AlertTriangle, permission: 'inventory.view' },
  ],
  // '/inventory': removed — standalone link, no submenu
  // '/transfers': [
  //   { titleKey: 'transfers.list', href: '/transfers', icon: List },
  //   { titleKey: 'transfers.createTransfer', href: '/transfers/new', icon: Plus },
  //   // { titleKey: 'transfers.requestTransfer', href: '/transfers/requests', icon: Download },
  // ],
  '/sales': [
    { titleKey: 'sales.newSale', href: '/sales/new', icon: Plus, permission: 'sales.create' },
    { titleKey: 'sales.list', href: '/sales', icon: List, permission: 'sales.view' },
    { titleKey: 'nav.saleReturns', href: '/sales-returns', icon: Undo2, permission: 'sales.view' }
  ],
  '/products': [
    { titleKey: 'products.list', href: '/products', icon: List, permission: 'products.view' },
    { titleKey: 'categories.title', href: '/products/categories', icon: Tags, permission: 'categories.view' },
    { titleKey: 'products.ProductLocatiion', href: '/products/location', icon: LocationEdit, permission: 'products.view' },
    { titleKey: 'products.units', href: '/products/units', icon: Ruler, permission: 'products.view' },
    // { titleKey: 'products.addProduct', href: '/products/new', icon: Plus },
  ],
  // Sozlamalar submenu: do'konlar + to'lov turlari + foydalanuvchi/rol boshqaruvi + amallar jurnali
  '/settings': [
    { titleKey: 'nav.settings', href: '/settings', icon: Settings },
    { titleKey: 'nav.stores', href: '/stores', icon: Store, permission: 'stores.view', superuserOnly: true },
    { titleKey: 'nav.paymentTypes', href: '/settings/payments', icon: CreditCard },
    { titleKey: 'stores.manageUsers', href: '/settings/users', icon: Users, permission: 'users.view', superuserOnly: true },
    { titleKey: 'nav.roles', href: '/settings/roles', icon: ShieldCheck, permission: 'roles.view', superuserOnly: true },
    { titleKey: 'nav.auditLog', href: '/settings/audit', icon: ScrollText, permission: 'audit.view', superuserOnly: true },
  ],
};

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <NotificationProvider>
      <NotificationToast />
      <MainLayoutContent>{children}</MainLayoutContent>
    </NotificationProvider>
  );
}

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const lang = params.lang || i18n.language || 'uz';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout, hasPermission } = useAuthStore();
  const isSuperUser = Boolean(user?.is_superuser || user?.role === 'superuser');
  // RBAC: userga rol biriktirilgan bo'lsa, menyular permission bo'yicha filtrlanadi
  const hasRbacRole = !isSuperUser && Array.isArray(user?.permissions);
  const { notifications, unreadCount, markAsRead } = useNotifications();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Get current path without language prefix
  const currentPath = location.pathname;

  // Filter subNavs based on user role / RBAC permissions
  const filteredSubNavs = Object.entries(subNavs).reduce((acc, [key, items]) => {
    let visible: SubNavItem[];
    if (hasRbacRole) {
      // RBAC rejimi: har bir bandni permission bo'yicha filtrlaymiz
      visible = items.filter((item) => !item.permission || hasPermission(item.permission));
    } else {
      // Legacy rejim: superuserOnly bandlar faqat superuserga ko'rinadi
      visible = items.filter((item) => !item.superuserOnly || isSuperUser);
    }
    if (visible.length > 0) {
      acc[key] = visible;
    }
    return acc;
  }, {} as Record<string, SubNavItem[]>);

  // Check if current path is part of a sub-nav module.
  // Submenu bandi o'z bo'limi yo'lidan tashqarida ham bo'lishi mumkin
  // (masalan, Sozlamalar ichidagi Do'konlar → /stores) — shunda ham
  // tegishli submenu ochiq qoladi va band aktiv belgilanadi.
  const activeSubNavKey = Object.keys(filteredSubNavs).find(
    (key) =>
      currentPath.startsWith(`/${lang}${key}`) ||
      filteredSubNavs[key].some((item) => currentPath.startsWith(`/${lang}${item.href}`))
  );
  const activeSubNav = activeSubNavKey ? filteredSubNavs[activeSubNavKey] : null;

  // Check if we're on a sub-nav page (but not the main page of that module)
  const isOnSubNavPage = activeSubNavKey && !currentPath.endsWith(`/${lang}${activeSubNavKey}`) && !currentPath.endsWith(`/${lang}${activeSubNavKey}/`);
  const [showSubNav, setShowSubNav] = useState(() => Boolean(activeSubNavKey));

  // Determine if we should show sub-nav sidebar
  const shouldShowSubNav = isOnSubNavPage || showSubNav;

  // Find the parent nav item for back button
  const parentNavItem = activeSubNavKey
    ? navItems.find(item => item.href === activeSubNavKey)
    : null;

  // Keep sub-navigation open when the current route is inside a submenu page.
  useEffect(() => {
    if (isOnSubNavPage) {
      setShowSubNav(true);
    }
  }, [isOnSubNavPage]);

  // Update lang in URL when language changes
  useEffect(() => {
    const currentPath = location.pathname;
    const pathParts = currentPath.split('/').filter(Boolean);

    if (pathParts[0] !== 'uz' && pathParts[0] !== 'cyrl') {
      // Already handled by routing
    } else if (pathParts[0] !== i18n.language) {
      i18n.changeLanguage(pathParts[0]);
    }
  }, [location.pathname, i18n]);

  if (!user) {
    return null;
  }

  const switchLanguage = (newLang: string) => {
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);

    const currentPath = location.pathname;
    const pathParts = currentPath.split('/').filter(Boolean);

    if (pathParts[0] === 'uz' || pathParts[0] === 'cyrl') {
      pathParts[0] = newLang;
      navigate('/' + pathParts.join('/'));
    } else {
      navigate(`/${newLang}${currentPath}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goBackToMainNav = () => {
    setShowSubNav(false);
    if (activeSubNavKey) {
      navigate(`/${lang}${activeSubNavKey}`);
    }
  };

  const handleMainNavClick = (item: NavItem) => {
    if (subNavs[item.href]) {
      setShowSubNav(true);
    } else {
      setShowSubNav(false);
    }
    setIsSidebarOpen(false);
  };

  const currentUser = user || {
    full_name: 'Admin',
    role: 'admin',
    is_superuser: true,
    phone_number: '+998901234567',
  };

  return (
    <div className="app-shell flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-100 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ═══════ Sidebar ═══════ */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-sidebar border-r border-border/60 transition-all duration-300 flex flex-col',
          isCollapsed ? 'w-[68px]' : 'w-[260px]',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          'h-16 flex items-center border-b border-border/60 shrink-0',
          isCollapsed ? 'justify-center px-2' : 'px-5 justify-between'
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                A
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground tracking-tight">AvtoCRM</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">Auto Spare Parts</p>
              </div>
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
              A
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'p-1.5 rounded-lg hover:bg-muted hidden lg:flex items-center justify-center transition-colors',
              isCollapsed && 'absolute -right-3 top-5 z-50 bg-card border shadow-sm'
            )}
          >
            <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform text-muted-foreground', isCollapsed && 'rotate-180')} />
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {shouldShowSubNav && activeSubNav ? (
            <>
              <button
                onClick={goBackToMainNav}
                className={cn(
                  'sidebar-nav-item w-full',
                  isCollapsed && 'justify-center px-2'
                )}
                title={isCollapsed ? t('common.back') : undefined}
              >
                <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
                {!isCollapsed && <span>{t('common.back')}</span>}
              </button>

              <div className="my-2 mx-2 border-t border-border/60" />

              {parentNavItem && !isCollapsed && (
                <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t(parentNavItem.titleKey)}
                </div>
              )}

              {activeSubNav.map((subItem) => {
                const href = `/${lang}${subItem.href}`;
                const isActive = location.pathname === href;
                return (
                  <Link
                    key={subItem.href}
                    to={href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      'sidebar-nav-item',
                      isActive && 'active',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? t(subItem.titleKey) : undefined}
                  >
                    <subItem.icon className="h-[18px] w-[18px] shrink-0" />
                    {!isCollapsed && <span>{t(subItem.titleKey)}</span>}
                  </Link>
                );
              })}
            </>
          ) : (
            navItems
              .filter((item) => {
                if (hasRbacRole) {
                  // RBAC rejimi: rol biriktirilgan user faqat permission'i bor menyularni ko'radi.
                  // storeInfo varianti (access==='store') tashlab yuboriladi — dublikat bo'lmasligi uchun.
                  if (item.access === 'store') return false;
                  return !item.permission || hasPermission(item.permission);
                }
                if (item.href === '/inventory' && user?.role === 's') return false;
                if (!item.access || item.access === 'all') return true;
                if (item.access === 'superuser') return isSuperUser;
                return !isSuperUser;
              })
              .map((item) => {
                const hasSubNav = !!filteredSubNavs[item.href];
                const defaultHref = hasSubNav && filteredSubNavs[item.href]?.length
                  ? filteredSubNavs[item.href][0].href
                  : item.href;
                const href = `/${lang}${defaultHref}`;
                const currentPath = `/${lang}${item.href}`;
                const pathMatches = location.pathname.startsWith(currentPath) ||
                  (item.href === '/dashboard' && location.pathname === `/${lang}`);
                // Don't mark active if a more specific nav item also matches this path
                const hasMoreSpecificMatch = pathMatches && navItems.some(
                  (other) =>
                    other.href !== item.href &&
                    other.href.startsWith(item.href + '/') &&
                    location.pathname.startsWith(`/${lang}${other.href}`)
                );
                const isActive = pathMatches && !hasMoreSpecificMatch;

                return (
                  <Link
                    key={item.href}
                    to={href}
                    onClick={() => handleMainNavClick(item)}
                    className={cn(
                      'sidebar-nav-item',
                      isActive && !shouldShowSubNav && 'active',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? t(item.titleKey) : undefined}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1">{t(item.titleKey)}</span>
                    )}
                    {!isCollapsed && hasSubNav && (
                      <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </Link>
                );
              })
          )}
        </nav>

        {/* User Profile Section */}
        <div className={cn(
          'border-t border-border/60 p-3',
          isCollapsed ? 'flex justify-center' : ''
        )}>
          {!isCollapsed ? (
            <div className="relative" ref={profileRef}>
              <div
                className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors hover:bg-muted"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-foreground">{currentUser.full_name || currentUser.phone_number}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{currentUser.role}</p>
                </div>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', showProfileMenu && 'rotate-180')} />
              </div>

              {showProfileMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border/60 rounded-xl shadow-xl p-4 space-y-3 animate-fade-in-up">
                  <div className="text-center pb-3 border-b border-border/60">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground">{currentUser.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between px-1">
                      <span className="text-muted-foreground">{t('stores.phone')}:</span>
                      <span className="font-medium">{currentUser.phone_number || '+998901234567'}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg h-9 text-sm"
                      onClick={() => navigate(`/${lang}/settings`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {t('nav.settings')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-lg h-9 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('auth.logout')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative" ref={profileRef}>
              <div
                className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/15 transition-colors"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <User className="h-4 w-4 text-primary" />
              </div>

              {showProfileMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-52 bg-card border border-border/60 rounded-xl shadow-xl p-4 space-y-3 z-50 animate-fade-in-up">
                  <div className="text-center pb-3 border-b border-border/60">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-semibold text-sm">{currentUser.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                  </div>
                  <div className="pt-1 space-y-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start rounded-lg"
                      onClick={() => navigate(`/${lang}/settings`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {t('nav.settings')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('auth.logout')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ═══════ Main Content Area ═══════ */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        isCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[260px]'
      )}>
        {/* ═══════ Top Header Bar ═══════ */}
        <header className="sticky top-0 z-20 h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            {/* Left: Mobile menu + Store badge */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 bg-primary/5 px-3.5 py-2 rounded-xl border border-primary/10">
                <Store className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-xs sm:text-sm text-primary truncate max-w-[150px] sm:max-w-[250px]">
                  {getPreferredStore(user)?.name || (isSuperUser ? t('stores.admin', 'Barcha filiallar') : '')}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-xl h-9 w-9"
                  onClick={() => setShowNotifications((prev) => !prev)}
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border/60 bg-card p-4 shadow-xl animate-fade-in-up">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{t("notifications.title")}</p>
                        <p className="text-xs text-muted-foreground">
                          {unreadCount > 0 ? t('notifications.newMessages', { count: unreadCount }) : t('notifications.noNewMessages')}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-xs"
                          onClick={() => notifications.forEach(n => markAsRead(n.id))}
                        >
                          {t('notifications.markAsRead')}
                        </Button>
                      )}
                    </div>
                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                          {t('notifications.notFound')}
                        </div>
                      ) : (
                        notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className={cn(
                              'w-full rounded-xl border p-3 text-left transition-all hover:bg-accent/50',
                              !item.read && 'border-primary/20 bg-primary/5'
                            )}
                          >
                            <div className="mb-1 flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold">{item.title}</p>
                              {!item.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-destructive" />}
                            </div>
                            <p className="text-xs text-muted-foreground">{item.message}</p>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Language Switcher */}
              <div className="flex items-center bg-muted/50 rounded-xl p-0.5">
                <button
                  className={cn(
                    'flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium transition-all',
                    i18n.language === 'uz'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => switchLanguage('uz')}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Uz
                </button>
                <button
                  className={cn(
                    'h-8 px-2.5 rounded-lg text-xs font-medium transition-all',
                    i18n.language === 'cyrl'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => switchLanguage('cyrl')}
                >
                  Кир
                </button>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9"
                onClick={toggleTheme}
                title={theme === 'dark' ? t('theme.lightMode') : t('theme.darkMode')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-[18px] w-[18px]" />
                ) : (
                  <Moon className="h-[18px] w-[18px]" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* ═══════ Page Content ═══════ */}
        <main id="main-content" className="flex-1 p-4 lg:p-6 min-w-0" tabIndex={-1}>
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 