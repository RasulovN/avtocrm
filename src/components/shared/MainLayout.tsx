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
  Download,
  Users,
  ClipboardCheck,
  TriangleAlert,
  LocationEdit,
  Ruler,
  Undo2,
} from 'lucide-react';
import { NotificationProvider } from '../../context/NotificationProvider';
import { NotificationToast } from './NotificationToast';
import { cn } from '../../utils';
import { useThemeStore, useAuthStore } from '../../app/store';
import { Button } from '../ui/Button';
import { useNotifications } from '../../context/NotificationProvider';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  access?: 'superuser' | 'store' | 'all';
}

interface SubNavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { titleKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, access: 'all' },
  { titleKey: 'nav.products', href: '/products', icon: Package, access: 'all' },
  // { titleKey: 'nav.categories', href: '/categories', icon: Tags, access: 'all' },
  { titleKey: 'nav.stockentry', href: '/stockentry', icon: ArrowDownToLine, access: 'superuser' },
  { titleKey: 'nav.inventory', href: '/inventory', icon: ClipboardCheck, access: 'all' },
  { titleKey: 'nav.transfers', href: '/transfers', icon: ArrowRightLeft, access: 'all' },
  { titleKey: 'nav.sales', href: '/sales', icon: DollarSign, access: 'all' },
  { titleKey: 'nav.customers', href: '/customers', icon: Users, access: 'all' },
  { titleKey: 'nav.suppliers', href: '/suppliers', icon: Truck, access: 'superuser' },
  { titleKey: 'nav.stores', href: '/stores', icon: Store, access: 'superuser' },
  { titleKey: 'nav.storeInfo', href: '/stores', icon: Store, access: 'store' },
  { titleKey: 'nav.reports', href: '/reports', icon: BarChart3, access: 'all' },
  { titleKey: 'nav.settings', href: '/settings', icon: Settings, access: 'all' },
];

// Sub-navigation for modules that have both list and create pages
const subNavs: Record<string, SubNavItem[]> = {
  '/stockentry': [
    { titleKey: 'stockentry.list', href: '/stockentry', icon: List },
    { titleKey: 'stockentry.createIncomingStock', href: '/stockentry/new', icon: Plus },
  ],
  '/inventory': [
    { titleKey: 'inventory.inventoryList', href: '/inventory', icon: List },
    { titleKey: 'inventory.inventoryIncoming', href: '/inventory/kirimlar', icon: ArrowDownToLine },
    { titleKey: 'inventory.shortages', href: '/inventory/kamomat', icon: TriangleAlert },
    { titleKey: 'inventory.newInventory', href: '/inventory/new', icon: Plus },
  ],
  '/transfers': [
    { titleKey: 'transfers.list', href: '/transfers', icon: List },
    { titleKey: 'transfers.createTransfer', href: '/transfers/new', icon: Plus },
    { titleKey: 'transfers.requestTransfer', href: '/transfers/requests', icon: Download },
  ], 
  '/sales': [
    { titleKey: 'sales.list', href: '/sales', icon: List },
    { titleKey: 'nav.saleReturns', href: '/sales-returns', icon: Undo2 },
    { titleKey: 'sales.newSale', href: '/sales/new', icon: Plus }
  ],
  '/products': [
    { titleKey: 'products.list', href: '/products', icon: List },
    { titleKey: 'categories.title', href: '/products/categories', icon: Tags },
    { titleKey: 'products.ProductLocatiion', href: '/products/location', icon: LocationEdit },
    { titleKey: 'products.units', href: '/products/units', icon: Ruler }, 
    { titleKey: 'products.addProduct', href: '/products/new', icon: Plus },
  ],
  '/stores': [
    { titleKey: 'stores.list', href: '/stores', icon: List },
    { titleKey: 'stores.manageUsers', href: '/stores/users', icon: Users },
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
  const { user, logout } = useAuthStore();
  const isSuperUser = Boolean(user?.is_superuser);
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
  
  // Filter subNavs based on user role
  const filteredSubNavs = Object.entries(subNavs).reduce((acc, [key, items]) => {
    if (key === '/stores') {
      if (isSuperUser) {
        acc[key] = items;
      }
    } else {
      acc[key] = items;
    }
    return acc;
  }, {} as Record<string, SubNavItem[]>);
  
  // Check if current path is part of a sub-nav module
  const activeSubNavKey = Object.keys(filteredSubNavs).find(key => 
    currentPath.includes(key) && currentPath.startsWith(`/${lang}${key}`)
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
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-100 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-card border-r transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn(
            'p-4 border-b flex items-center justify-between',
            isCollapsed ? 'justify-center' : ''
          )}>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-primary">AvtoCRM</h1>
                <p className="text-xs text-muted-foreground">Auto Spare Parts</p>
              </div>
            )}
            {isCollapsed && (
              <span className="text-xl font-bold text-primary">A</span>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'p-1 rounded hover:bg-accent hidden lg:flex',
                isCollapsed ? 'absolute right-0 translate-x-1/2' : ''
              )}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
            </button>
          </div>

          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {shouldShowSubNav && activeSubNav ? (
              <>
                <button
                  onClick={goBackToMainNav}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? t('common.back') : undefined}
                >
                  <ArrowLeft className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{t('common.back')}</span>}
                </button>
                
                <div className="my-2 border-t" />
                
                {parentNavItem && !isCollapsed && (
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
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
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        isCollapsed && 'justify-center px-2'
                      )}
                      title={isCollapsed ? t(subItem.titleKey) : undefined}
                    >
                      <subItem.icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && <span>{t(subItem.titleKey)}</span>}
                    </Link>
                  );
                })}
              </>
            ) : (
              navItems
              .filter((item) => {
                if (!item.access || item.access === 'all') return true;
                if (item.access === 'superuser') return isSuperUser;
                return !isSuperUser;
              })
              .map((item) => {
                const href = `/${lang}${item.href}`;
                const isActive = location.pathname.startsWith(`/${lang}${item.href}`) ||
                               (item.href === '/dashboard' && location.pathname === `/${lang}`);
                
                const hasSubNav = !!filteredSubNavs[item.href];
                
                return (
                  <Link
                    key={item.href}
                    to={href}
                    onClick={() => handleMainNavClick(item)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive && !shouldShowSubNav
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? t(item.titleKey) : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1">{t(item.titleKey)}</span>
                    )}
                    {!isCollapsed && hasSubNav && (
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    )}
                  </Link>
                );
              })
            )}
          </nav>

          <div className={cn(
            'p-4 border-t',
            isCollapsed ? 'flex justify-center' : ''
          )}>
            {!isCollapsed ? (
              <div className="relative" ref={profileRef}>
                <div 
                  className="flex items-center justify-between mb-3 cursor-pointer"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{currentUser.full_name || currentUser.phone_number}</p>
                      <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', showProfileMenu && 'rotate-180')} />
                </div>

                {showProfileMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border rounded-lg shadow-lg p-3 space-y-3">
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <p className="font-medium">{currentUser.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('stores.phone')}:</span>
                        <span>{currentUser.phone_number || '+998901234567'}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => navigate(`/${lang}/settings`)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {t('nav.settings')}
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="w-full justify-start"
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
                  className="h-8 w-8 rounded-full bg-primary flex items-center justify-center cursor-pointer"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>

                {showProfileMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border rounded-lg shadow-lg p-3 space-y-3 z-50">
                    <div className="text-center">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-medium text-sm">{currentUser.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                    </div>
                    <div className="pt-2 border-t space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => navigate(`/${lang}/settings`)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {t('nav.settings')}
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="w-full justify-start"
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
        </div>
      </aside>

      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300',
        isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      )}>
        <header className="sticky top-0 z-20 h-16 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex h-full items-center justify-end px-4 lg:px-6">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-accent"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="lg:hidden w-8" />

            <div className="flex items-center gap-2">

              <div className="relative" ref={notificationRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setShowNotifications((prev) => !prev)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border bg-background p-3 shadow-lg">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Bildirishnomalar</p>
                        <p className="text-xs text-muted-foreground">
                          {unreadCount > 0 ? `${unreadCount} ta yangi xabar` : 'Yangi xabar yo\'q'}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => notifications.forEach(n => markAsRead(n.id))}
                        >
                          O'qildi
                        </Button>
                      )}
                    </div>
                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                          Bildirishnoma topilmadi
                        </div>
                      ) : (
                        notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className={cn(
                              'w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50',
                              !item.read && 'border-primary/30 bg-primary/5'
                            )}
                          >
                            <div className="mb-1 flex items-start justify-between gap-3">
                              <p className="text-sm font-medium">{item.title}</p>
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

              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 px-2 rounded-r-none',
                    i18n.language === 'uz' && 'bg-accent'
                  )}
                  onClick={() => switchLanguage('uz')}
                >
                  <Globe className="h-4 w-4 mr-1" />
                  Uz
                </Button>
                <div className="w-px h-4 bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 px-2 rounded-l-none',
                    i18n.language === 'cyrl' && 'bg-accent'
                  )}
                  onClick={() => switchLanguage('cyrl')}
                >
                  Кир
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === 'dark' ? t('theme.lightMode') : t('theme.darkMode')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 lg:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}


