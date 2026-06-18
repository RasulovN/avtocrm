import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  ArrowRightLeft,
  History,
  RefreshCw,
  Store,
  Package,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { useAuthStore } from '../../app/store';
import { storeService } from '../../services/storeService';
import { lowStockService } from '../../services/lowStockService';
import type { LowStockItem } from '../../types';
import type { Store as StoreType } from '../../types';
import { formatDate } from '../../utils';
import { notificationService } from '../../services/notificationService';

type TabType = 'purchase' | 'transfer' | 'history';

const LIMIT = 20;

const ORDERING_OPTIONS = [
  { value: '-resolved_at', labelKey: 'inventory.ordering.resolvedAtDesc' },
  { value: 'resolved_at',  labelKey: 'inventory.ordering.resolvedAtAsc' },
  { value: '-created_at', labelKey: 'inventory.ordering.createdAtDesc' },
  { value: 'created_at',  labelKey: 'inventory.ordering.createdAtAsc' },
  { value: 'current_quantity', labelKey: 'inventory.ordering.currentQty' },
];

export function LowStockPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const { user } = useAuthStore();

  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser' || user?.role === 'admin' || user?.role === 'su');

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>('purchase');

  // Data
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [stores, setStores] = useState<StoreType[]>([]);
  const [ordering, setOrdering] = useState('-resolved_at');

  // Ref to avoid stale closures in WS listener
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // ─── Load stores ────────────────────────────────────────────────────────────
  const loadStores = useCallback(async () => {
    try {
      const res = await storeService.getAll({ limit: 100 });
      setStores(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadStores();
    } else if (user?.stores && user.stores.length > 0) {
      setStores(
        user.stores.map((s) => ({
          id: String(s.id),
          name: s.name,
          type: s.type as 'b' | 's',
          is_active: s.is_active,
          is_warehouse: s.type === 'b',
          created_at: '',
        }))
      );
      // Auto-select user's store
      if (!selectedStore && user.stores.length > 0) {
        setSelectedStore(String(user.stores[0].id));
      }
    }
  }, [isAdmin, loadStores]);

  // ─── Fetch data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (page = 1, tab: TabType = activeTab) => {
      setLoading(true);
      try {
        const storeId = selectedStore ? Number(selectedStore) : undefined;

        if (tab === 'history') {
          const res = await lowStockService.getHistory({
            store: storeId,
            page,
            limit: LIMIT,
            ordering,
          });
          setItems(res.data);
          setTotal(res.total);
          setTotalPages(res.total_pages);
          setCurrentPage(res.current_page);
        } else {
          const res = await lowStockService.getLowStock({
            action_type: tab,
            store: storeId,
            page,
            limit: LIMIT,
          });
          setItems(res.data);
          setTotal(res.total);
          setTotalPages(res.total_pages);
          setCurrentPage(res.current_page);
        }
      } catch {
        toast.error(t('errors.generic'));
      } finally {
        setLoading(false);
      }
    },
    [selectedStore, ordering, activeTab, t]
  );

  // Fetch whenever tab, store, or ordering changes
  useEffect(() => {
    setCurrentPage(1);
    fetchData(1, activeTab);
  }, [activeTab, selectedStore, ordering]);

  // ─── WebSocket — real-time low stock notifications ───────────────────────────
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notifications) => {
      const latest = notifications[0];
      if (!latest) return;

      const wsType = (latest as unknown as { type?: string }).type;
      if (wsType === 'lp' || wsType === 'lt') {
        const currentTab = activeTabRef.current;
        // Show toast
        toast(latest.message || latest.title, {
          icon: '⚠️',
          style: {
            borderLeft: '4px solid #f59e0b',
          },
        });
        // Refresh purchase tab if lp, transfer tab if lt
        if (wsType === 'lp' && currentTab === 'purchase') {
          fetchData(1, 'purchase');
        } else if (wsType === 'lt' && currentTab === 'transfer') {
          fetchData(1, 'transfer');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    fetchData(page, activeTab);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const getActionTypeBadge = (item: LowStockItem) => {
    if (item.action_type === 'purchase') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
          <ShoppingCart className="h-3 w-3" />
          {t('inventory.purchaseNeeded')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        <ArrowRightLeft className="h-3 w-3" />
        {t('inventory.transferNeeded')}
      </span>
    );
  };

  const getStockLevelClass = (current: number, min: number) => {
    const ratio = min > 0 ? current / min : 1;
    if (ratio === 0) return 'text-red-600 font-bold';
    if (ratio < 0.5) return 'text-orange-600 font-semibold';
    return 'text-yellow-600 font-semibold';
  };

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: 'purchase', label: t('inventory.purchaseNeeded'), icon: ShoppingCart },
    { key: 'transfer', label: t('inventory.transferNeeded'), icon: ArrowRightLeft },
    { key: 'history', label: t('inventory.lowStockHistory'), icon: History },
  ];

  const storeName = (storeId: number) => {
    const found = stores.find((s) => String(s.id) === String(storeId));
    return found?.name || String(storeId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={t('inventory.lowStock')}
          description={t('inventory.lowStockDesc')}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(currentPage, activeTab)}
          disabled={loading}
          className="shrink-0 self-start"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('reports.refresh')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Store filter */}
        {(isAdmin || stores.length > 1) && (
          <Select
            value={selectedStore || '__all__'}
            onValueChange={(v) => setSelectedStore(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="w-full sm:w-56">
              <Store className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder={t('inventory.allStores')} />
            </SelectTrigger>
            <SelectContent>
              {isAdmin && (
                <SelectItem value="__all__">{t('inventory.allStores')}</SelectItem>
              )}
              {stores.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Ordering filter — only for history tab */}
        {activeTab === 'history' && (
          <Select value={ordering} onValueChange={setOrdering}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder={t('inventory.orderingLabel')} />
            </SelectTrigger>
            <SelectContent>
              {ORDERING_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {!isActive && tab.key !== 'history' && (
                <span className="ml-1 hidden rounded-full bg-muted px-1.5 py-0.5 text-xs sm:block">
                  {tab.key === activeTab ? total : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Total count badge */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {t('common.total')}: <span className="font-semibold text-foreground">{total}</span>
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 animate-pulse opacity-40" />
          <p>{t('common.loading')}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Package className="mx-auto mb-4 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">
            {activeTab === 'history' ? t('inventory.noLowStockHistory') : t('inventory.noLowStock')}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid gap-3 md:hidden">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-semibold">{item.product_name}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Store className="h-3.5 w-3.5" />
                        {item.store_name || storeName(item.store)}
                      </p>
                    </div>
                    {getActionTypeBadge(item)}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{t('inventory.currentQty')}</p>
                      <p className={`mt-0.5 text-base ${getStockLevelClass(item.current_quantity, item.min_stock)}`}>
                        {item.current_quantity}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{t('inventory.minStock')}</p>
                      <p className="mt-0.5 text-base font-medium">{item.min_stock}</p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(item.created_at)}</span>
                    {item.status === 'resolved' && item.resolved_at && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        {formatDate(item.resolved_at)}
                      </span>
                    )}
                    {item.status === 'open' && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        {t('inventory.lowStockOpen')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden rounded-lg border md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('inventory.productName')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('inventory.store')}
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      {t('inventory.currentQty')}
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      {t('inventory.minStock')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('common.status')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('inventory.createdAt')}
                    </th>
                    {activeTab === 'history' && (
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t('inventory.resolvedAt')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">#{item.id}</td>
                      <td className="px-4 py-3 font-medium">{item.product_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.store_name || storeName(item.store)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${getStockLevelClass(item.current_quantity, item.min_stock)}`}>
                          {item.current_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {item.min_stock}
                      </td>
                      <td className="px-4 py-3">{getActionTypeBadge(item)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(item.created_at)}</td>
                      {activeTab === 'history' && (
                        <td className="px-4 py-3">
                          {item.resolved_at ? (
                            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              {formatDate(item.resolved_at)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {t('common.showing')} {(currentPage - 1) * LIMIT + 1}–
                {Math.min(currentPage * LIMIT, total)} {t('common.of')} {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
