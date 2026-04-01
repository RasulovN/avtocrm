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
  Folder,
} from 'lucide-react';
import { cn } from '../../utils';
import { useAuthStore } from '../../app/store';
import { useTranslation } from 'react-i18next';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  roles?: ('admin' | 'store_user')[];
}

const navItems: NavItem[] = [
  { titleKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { titleKey: 'nav.products', href: '/products', icon: Package },
  { titleKey: 'nav.categories', href: '/categories', icon: Folder },
  { titleKey: 'nav.inventory', href: '/inventory', icon: ArrowDownToLine, roles: ['admin'] },
  { titleKey: 'nav.transfers', href: '/transfers', icon: ArrowRightLeft },
  { titleKey: 'nav.sales', href: '/sales', icon: DollarSign },
  { titleKey: 'nav.suppliers', href: '/suppliers', icon: Truck, roles: ['admin'] },
  { titleKey: 'nav.stores', href: '/stores', icon: Store, roles: ['admin'] },
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

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
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
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.username || 'User'}</p>
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
