import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, CircleDot, Package, AlertTriangle } from 'lucide-react';
import type { InventorySession, InventoryStats } from '../../services/inventory.api';

interface InventoryHeaderProps {
  session: InventorySession | null;
  stats: InventoryStats | null;
  onLoadProducts: () => void;
  onComplete: () => void;
  loading: boolean;
  loadingProducts: boolean;
}

export function InventoryHeader({
  session,
  stats,
  onLoadProducts,
  onComplete,
  loading,
  loadingProducts,
}: InventoryHeaderProps) {
  const { t } = useTranslation();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          icon: CircleDot,
          label: t('inventory.statusDraft'),
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
      case 'in_progress':
        return {
          icon: Clock,
          label: t('inventory.statusInProgress'),
          className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          label: t('inventory.statusCompleted'),
          className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        };
      default:
        return {
          icon: CircleDot,
          label: status,
          className: 'bg-gray-100 text-gray-700',
        };
    }
  };

  if (!session) return null;

  const statusConfig = getStatusConfig(session.status);
  const StatusIcon = statusConfig.icon;
  const canLoadProducts = session.status === 'draft';
  const canComplete = session.status === 'in_progress' && stats && stats.total > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className="h-5 w-5" />
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
          {session.store_name && (
            <span className="text-sm text-muted-foreground">{session.store_name}</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onLoadProducts}
            disabled={!canLoadProducts || loadingProducts}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
          >
            {loadingProducts ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('inventory.loading')}
              </>
            ) : (
              t('inventory.loadProducts')
            )}
          </button>

          <button
            onClick={onComplete}
            disabled={!canComplete || loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600 text-white hover:bg-green-700 h-9 px-4 py-2 disabled:bg-gray-300 disabled:text-gray-500"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('common.loading')}
              </>
            ) : (
              t('inventory.complete')
            )}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('inventory.totalItems')}</span>
            </div>
            <p className="mt-1 text-xl font-semibold">{stats.total}</p>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">{t('inventory.matched')}</span>
            </div>
            <p className="mt-1 text-xl font-semibold text-green-600 dark:text-green-400">
              {stats.matched}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">{t('inventory.mismatch')}</span>
            </div>
            <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">
              {stats.mismatch}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">{t('inventory.pending')}</span>
            </div>
            <p className="mt-1 text-xl font-semibold text-yellow-600 dark:text-yellow-400">
              {stats.pending}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
