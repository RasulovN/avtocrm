import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuthStore } from '../../app/store';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils';

export function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    if (pathname.startsWith('/dashboard')) return t('nav.dashboard');
    if (pathname.startsWith('/products')) return t('nav.products');
    if (pathname.startsWith('/categories')) return t('nav.categories');
    if (pathname.startsWith('/inventory')) return t('nav.inventory');
    if (pathname.startsWith('/transfers')) return t('nav.transfers');
    if (pathname.startsWith('/sales')) return t('nav.sales');
    if (pathname.startsWith('/suppliers')) return t('nav.suppliers');
    if (pathname.startsWith('/stores')) return t('nav.stores');
    if (pathname.startsWith('/reports')) return t('nav.reports');
    if (pathname.startsWith('/settings')) return t('nav.settings');
    return '';
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <button
        className="lg:hidden"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="flex-1">
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        
        <div className="hidden md:flex items-center gap-3 ml-2 border-l pl-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">{user?.full_name || user?.phone_number}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-md hover:bg-accent text-muted-foreground"
            title={t('auth.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

