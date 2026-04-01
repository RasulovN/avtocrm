import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  X,
  ChevronLeft,
  User,
} from 'lucide-react';
import { cn } from '../../utils';

interface NavItem {
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

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Default user for demo mode
  const currentUser = {
    username: 'Admin',
    role: 'admin',
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
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? t(item.titleKey) : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{t(item.titleKey)}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className={cn(
            'p-4 border-t',
            isCollapsed ? 'flex justify-center' : ''
          )}>
            {!isCollapsed && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{currentUser.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                  </div>
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
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
        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
