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
  Upload,
  Download,
  Users,
} from 'lucide-react';
import { cn } from '../../utils';
import { useThemeStore, useAuthStore } from '../../app/store';
import { Button } from '../ui/Button';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
}

interface SubNavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { titleKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { titleKey: 'nav.products', href: '/products', icon: Package },
  { titleKey: 'nav.categories', href: '/categories', icon: Tags },
  { titleKey: 'nav.inventory', href: '/inventory', icon: ArrowDownToLine },
  { titleKey: 'nav.transfers', href: '/transfers', icon: ArrowRightLeft },
  { titleKey: 'nav.sales', href: '/sales', icon: DollarSign },
  { titleKey: 'nav.suppliers', href: '/suppliers', icon: Truck },
  { titleKey: 'nav.stores', href: '/stores', icon: Store }, 
  { titleKey: 'nav.reports', href: '/reports', icon: BarChart3 },
  { titleKey: 'nav.settings', href: '/settings', icon: Settings },
];

// Sub-navigation for modules that have both list and create pages
const subNavs: Record<string, SubNavItem[]> = {
  '/inventory': [
    { titleKey: 'inventory.list', href: '/inventory', icon: List },
    { titleKey: 'inventory.createIncomingStock', href: '/inventory/new', icon: Plus },
  ],
  '/transfers': [
    { titleKey: 'transfers.list', href: '/transfers', icon: List },
    { titleKey: 'transfers.createTransfer', href: '/transfers/new', icon: Plus },
    { titleKey: 'transfers.requestTransfer', href: '/transfers/requests', icon: Download },
  ], 
  '/sales': [
    { titleKey: 'sales.list', href: '/sales', icon: List },
    { titleKey: 'sales.newSale', href: '/sales/new', icon: Plus },
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
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const lang = params.lang || i18n.language || 'uz';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSubNav, setShowSubNav] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();

  // Get current path without language prefix
  const currentPath = location.pathname;
  const pathWithoutLang = '/' + currentPath.split('/').slice(2).join('/');
  
  // Check if current path is part of a sub-nav module
  const activeSubNavKey = Object.keys(subNavs).find(key => 
    currentPath.includes(key) && currentPath.startsWith(`/${lang}${key}`)
  );
  const activeSubNav = activeSubNavKey ? subNavs[activeSubNavKey] : null;
  
  // Check if we're on a sub-nav page (but not the main page of that module)
  const isOnSubNavPage = activeSubNavKey && !currentPath.endsWith(`/${lang}${activeSubNavKey}`) && !currentPath.endsWith(`/${lang}${activeSubNavKey}/`);
  
  // Determine if we should show sub-nav sidebar
  const shouldShowSubNav = isOnSubNavPage || showSubNav;

  // Find the parent nav item for back button
  const parentNavItem = activeSubNavKey 
    ? navItems.find(item => item.href === activeSubNavKey) 
    : null;

  // Update showSubNav based on current location
  useEffect(() => {
    if (activeSubNavKey) {
      setShowSubNav(true);
    }
  }, [activeSubNavKey]);

  // Update lang in URL when language changes
  useEffect(() => {
    const currentPath = location.pathname;
    const pathParts = currentPath.split('/').filter(Boolean);
    
    if (pathParts[0] !== 'uz' && pathParts[0] !== 'ru') {
      // Already handled by routing
    } else if (pathParts[0] !== i18n.language) {
      i18n.changeLanguage(pathParts[0]);
    }
  }, [location.pathname, i18n]);

  const switchLanguage = (newLang: string) => {
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
    
    const currentPath = location.pathname;
    const pathParts = currentPath.split('/').filter(Boolean);
    
    if (pathParts[0] === 'uz' || pathParts[0] === 'ru') {
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
    // Navigate to the parent page
    if (activeSubNavKey) {
      navigate(`/${lang}${activeSubNavKey}`);
    }
  };

  const handleMainNavClick = (item: NavItem) => {
    // If this item has sub-nav, show sub-nav mode
    if (subNavs[item.href]) {
      setShowSubNav(true);
    } else {
      setShowSubNav(false);
    }
    setIsSidebarOpen(false);
  };

  const currentUser = user || {
    username: 'Admin',
    role: 'admin',
    phone: '+998 90 123-45-67',
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-card border-r transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
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

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {shouldShowSubNav && activeSubNav ? (
              // Show sub-navigation items
              <>
                {/* Back button */}
                <button
                  onClick={goBackToMainNav}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? t('common.back') : undefined}
                >
                  <ArrowLeft className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{t('common.back')}</span>}
                </button>
                
                <div className="my-2 border-t" />
                
                {/* Parent item */}
                {parentNavItem && !isCollapsed && (
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
                    {t(parentNavItem.titleKey)}
                  </div>
                )}
                
                {/* Sub-nav items */}
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
                      <subItem.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{t(subItem.titleKey)}</span>}
                    </Link>
                  );
                })}
              </>
            ) : (
              // Show main navigation items
              navItems.map((item) => {
                const href = `/${lang}${item.href}`;
                const isActive = location.pathname.startsWith(`/${lang}${item.href}`) ||
                               (item.href === '/dashboard' && location.pathname === `/${lang}`);
                
                // Check if this item has sub-navigation
                const hasSubNav = !!subNavs[item.href];
                
                return (
                  <Link
                    key={item.href}
                    to={href}
                    onClick={() => handleMainNavClick(item)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive && !showSubNav
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? t(item.titleKey) : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
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

          {/* User section */}
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
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{currentUser.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', showProfileMenu && 'rotate-180')} />
                </div>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border rounded-lg shadow-lg p-3 space-y-3">
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <p className="font-medium">{currentUser.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('stores.phone')}:</span>
                        <span>{(currentUser as any).phone || '+998 90 123-45-67'}</span>
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

                {/* Profile Dropdown Menu for collapsed state */}
                {showProfileMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border rounded-lg shadow-lg p-3 space-y-3 z-50">
                    <div className="text-center">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-medium text-sm">{currentUser.username}</p>
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

      {/* Main content */}
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300',
        isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      )}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-accent"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Spacer for mobile */}
            <div className="lg:hidden w-8" />

            {/* Right side - Theme, Language, Notifications */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              </Button>

              {/* Language Switcher */}
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
                    i18n.language === 'ru' && 'bg-accent'
                  )}
                  onClick={() => switchLanguage('ru')}
                >
                  Ru
                </Button>
              </div>

              {/* Theme Toggle */}
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

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
