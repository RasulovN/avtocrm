import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowRightLeft,
  DollarSign,
  Truck,
  Store,
  Users,
  LogOut,
  Menu,
  X,
  FileText,
  Settings,
  Send,
  ChevronDown,
  ChevronRight,
  ClipboardCheck, 
  TriangleAlert,
  Plus,
  List,
} from 'lucide-react';
import { cn } from '../../utils';
import { useAuthStore } from '../../app/store';
import { useTranslation } from 'react-i18next';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  roles?: ('admin' | 'store_user' | 'store_admin')[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { titleKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { titleKey: 'nav.products', href: '/products', icon: Package },
  // { titleKey: 'nav.categories', href: '/categories', icon: Folder },
  { titleKey: 'nav.stockentry', href: '/stockentry', icon: ArrowDownToLine, roles: ['admin'] },
  {
    titleKey: 'nav.inventory',
    href: '/inventory',
    icon: ClipboardCheck,
    children: [
      { titleKey: 'inventory.inventoryList', href: '/inventory', icon: List },
      { titleKey: 'inventory.inventoryIncoming', href: '/inventory/kirimlar', icon: ArrowDownToLine },
      { titleKey: 'inventory.shortages', href: '/inventory/kamomat', icon: TriangleAlert },
      { titleKey: 'inventory.newInventory', href: '/inventory/new', icon: Plus },
    ],
  },
  { titleKey: 'nav.transfers', href: '/transfers', icon: ArrowRightLeft },
  { titleKey: 'nav.transferRequests', href: '/transfer-requests', icon: Send },
  { titleKey: 'nav.sales', href: '/sales', icon: DollarSign },
  { titleKey: 'nav.suppliers', href: '/suppliers', icon: Truck, roles: ['admin'] },
  { 
    titleKey: 'nav.stores', 
    href: '/stores', 
    icon: Store, 
    roles: ['admin'],
    children: [
      { titleKey: 'nav.stores', href: '/stores', icon: Store },
      { titleKey: 'nav.users', href: '/users', icon: Users },
    ]
  },
  { titleKey: 'nav.reports', href: '/reports', icon: FileText },
  { titleKey: 'nav.settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const isMenuActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some(child => location.pathname.startsWith(`/${lang}${child.href}`));
    }
    return location.pathname.startsWith(`/${lang}${item.href}`) || 
           (location.pathname === `/${item.href}` && item.href === '/dashboard');
  };

  const getInitialExpandedMenus = () => {
    return navItems
      .filter(item => item.children && isMenuActive(item))
      .map(item => item.titleKey);
  };

  const [expandedMenus, setExpandedMenus] = useState<string[]>(getInitialExpandedMenus);

  const toggleMenu = (titleKey: string) => {
    setExpandedMenus(prev => 
      prev.includes(titleKey) 
        ? prev.filter(k => k !== titleKey)
        : [...prev, titleKey]
    );
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    const userRole = user?.role as 'admin' | 'store_user' | 'store_admin';
    return user && item.roles.includes(userRole);
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold">AvtoCRM</h1>
            <p className="text-sm text-muted-foreground">Auto Spare Parts</p>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const href = `/${lang}${item.href}`;
              const isActive = location.pathname.startsWith(`/${lang}${item.href}`) || 
                             (location.pathname === `/${item.href}` && item.href === '/dashboard');
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus.includes(item.titleKey);

              if (hasChildren) {
                const isParentActive = isMenuActive(item);
                return (
                  <div key={item.titleKey} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.titleKey)}
                      className={cn(
                        'flex items-center justify-between w-full gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isParentActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {t(item.titleKey)}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="pl-6 space-y-1">
                        {item.children?.map((child) => {
                          const childHref = `/${lang}${child.href}`;
                          const childIsActive = location.pathname.startsWith(childHref);
                          return (
                            <Link
                              key={child.href}
                              to={childHref}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                childIsActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              {t(child.titleKey)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  to={href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {t(item.titleKey)}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm text-primary-foreground">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role || 'admin'}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-md hover:bg-accent text-muted-foreground"
                title={t('nav.logout')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
