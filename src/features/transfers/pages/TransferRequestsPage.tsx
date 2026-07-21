import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, type Column } from '../../../components/shared/DataTable';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { transferService } from '../../../services/transferService';
import { storeService } from '../../../services/storeService';
import { useProducts } from '../../../context/ProductContext';
import { formatDate } from '../../../utils';
import { Input } from '../../../components/ui/Input';
import type { Transfer, Store } from '../../../types';
import type { ReactElement } from 'react';
import { useAuthStore } from '../../../app/store';

const formatQuantity = (value: Transfer['quantity']) => {
  if (value === null || value === undefined) return '-';
  return typeof value === 'number' ? value.toString() : value;
};

export function TransferRequestsPage(): ReactElement {
  const { t } = useTranslation();
  const { products } = useProducts();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
  const userStoreId = user?.store_id || (user?.stores && user.stores.length > 0 ? String(user.stores.find(s => s.type === 'b')?.id || user.stores[0].id) : '');

  const canApprove = (item: Transfer) => {
    if (isAdmin) return true;
    return userStoreId && String(item.to_store) === String(userStoreId);
  };

  const [stores, setStores] = useState<Store[]>([]);
  const [requests, setRequests] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // Qabul qilish / rad etish oldidan modal orqali tasdiq so'raladi
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; transfer: Transfer } | null>(null);
  const limit = 20;
  const safeRequests = useMemo(() => (Array.isArray(requests) ? requests : []), [requests]);

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => {
      map.set(String(product.id), product.name);
    });
    return map;
  }, [products]);

  const resolveProductName = (transfer: Transfer) => {
    if (transfer.product_name) return transfer.product_name;
    if (transfer.product) return productNameById.get(String(transfer.product)) ?? String(transfer.product);
    if (transfer.items?.[0]?.product_name) return transfer.items[0].product_name;
    return '-';
  };

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    stores.forEach((store) => {
      map.set(String(store.id), store.name);
    });
    return map;
  }, [stores]);

  const resolveStoreName = (value?: string) => {
    if (!value) return '-';
    return storeNameById.get(value) ?? value;
  };

  const fromStoreLabel = (item: Transfer) => {
    const raw = item.from_store_name || item.from_store_id || item.from_store;
    return resolveStoreName(raw ? String(raw) : undefined);
  };
  const toStoreLabel = (item: Transfer) => {
    const raw = item.to_store_name || item.to_store_id || item.to_store;
    return resolveStoreName(raw ? String(raw) : undefined);
  };

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return safeRequests;
    const query = searchQuery.toLowerCase();
    return safeRequests.filter((item) => {
      const fromLabel = fromStoreLabel(item).toLowerCase();
      const toLabel = toStoreLabel(item).toLowerCase();
      const productLabel = resolveProductName(item).toLowerCase();
      return (
        fromLabel.includes(query) ||
        toLabel.includes(query) ||
        productLabel.includes(query)
      );
    });
  }, [safeRequests, searchQuery, storeNameById]);

  const columns: Column<Transfer>[] = [
    {
      key: 'from_store',
      header: t('transfers.fromStore'),
      render: (item) => fromStoreLabel(item),
      className: 'font-medium',
    },
    {
      key: 'to_store',
      header: t('transfers.toStore'),
      render: (item) => toStoreLabel(item),
    },
    {
      key: 'product',
      header: t('products.title'),
      render: (item) => resolveProductName(item),
    },
    {
      key: 'quantity',
      header: t('products.quantity'),
      render: (item) => formatQuantity(item.quantity),
    },
    {
      key: 'created_at',
      header: t('common.date'),
      render: (item) => formatDate(item.created_at),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          {canApprove(item) && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmAction({ type: 'approve', transfer: item });
                }}
                title={t('transfers.accepted')}
                className="text-green-600 hover:text-green-700 hover:bg-green-100 h-8 w-8"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmAction({ type: 'reject', transfer: item });
                }}
                title={t('transfers.rejected')}
                className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const loadData = useCallback(async (pageToLoad = page) => {
    try {
      setLoading(true);
      const res = await transferService.getAll({ page: pageToLoad, limit });
      const pending = (res.data || []).filter((item) => item.status === 'pending' || item.status === 'p');
      setRequests(pending);
      setTotal(res.total || 0);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load transfer requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void loadData(page);
  }, [page, loadData]);

  useEffect(() => {
    void loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const storesRes = await storeService.getAll();
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load stores:', error);
      setStores([]);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await transferService.approve(id);
      setRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (error) {
      console.error('Failed to approve transfer:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await transferService.reject(id);
      setRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (error) {
      console.error('Failed to reject transfer:', error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.transferRequests')}
        description={t('transfers.listDescription')}
      />

      <div className="flex items-center gap-4">
        <div className="relative w-full flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className='border-none'>
        <CardContent className='p-0'>
          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                {t('transfers.noData')}
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">#{request.id}</p>
                      <p className="font-semibold text-foreground break-words">
                        {fromStoreLabel(request)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {toStoreLabel(request)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                      {t('transfers.pending')}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{t('products.title')}</p>
                      <p className="mt-1 font-medium">{resolveProductName(request)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{t('products.quantity')}</p>
                      <p className="mt-1 font-medium">{formatQuantity(request.quantity)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 col-span-2">
                      <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                      <p className="mt-1 font-medium">{formatDate(request.created_at)}</p>
                    </div>
                  </div>

                  {canApprove(request) && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => setConfirmAction({ type: 'approve', transfer: request })}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {t('transfers.accepted')}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => setConfirmAction({ type: 'reject', transfer: request })}
                      >
                        <X className="mr-2 h-4 w-4" />
                        {t('transfers.rejected')}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {!loading && filteredRequests.length > 0 && Math.ceil(total / limit) > 1 && (
            <div className="flex items-center justify-between mt-4 p-4 bg-muted/20 border border-border/60 rounded-xl md:hidden">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * limit + 1}-{Math.min(page * limit, total)} / {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page} / {Math.ceil(total / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                  disabled={page === Math.ceil(total / limit)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="hidden md:block">
            <DataTable
              data={filteredRequests}
              columns={columns}
              loading={loading}
              emptyMessage={t('transfers.noData')}
              loadingMessage={t('common.loading')}
              minWidth="900px"
              pagination={{ page, limit, total, onPageChange: setPage }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Qabul qilish / rad etish uchun tasdiqlash modali */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open: boolean) => !open && setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === 'approve') {
            void handleApprove(confirmAction.transfer.id);
          } else {
            void handleReject(confirmAction.transfer.id);
          }
        }}
        title={
          confirmAction?.type === 'approve'
            ? t('transfers.confirmApproveTitle', "O'tkazmani qabul qilish")
            : t('transfers.confirmRejectTitle', "O'tkazmani rad etish")
        }
        description={
          confirmAction
            ? t(
                confirmAction.type === 'approve' ? 'transfers.confirmApproveDesc' : 'transfers.confirmRejectDesc',
                {
                  id: confirmAction.transfer.id,
                  from: fromStoreLabel(confirmAction.transfer),
                  to: toStoreLabel(confirmAction.transfer),
                }
              )
            : ''
        }
        confirmText={
          confirmAction?.type === 'approve'
            ? t('transfers.accepted')
            : t('transfers.rejected')
        }
        cancelText={t('common.cancel')}
        variant={confirmAction?.type === 'reject' ? 'destructive' : 'default'}
      />
    </div>
  );
}

export default TransferRequestsPage;
