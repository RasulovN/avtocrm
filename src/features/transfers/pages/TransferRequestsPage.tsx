import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Search } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, type Column } from '../../../components/shared/DataTable';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { transferService } from '../../../services/transferService';
import { storeService } from '../../../services/storeService';
import { useProducts } from '../../../context/ProductContext';
import { formatDate } from '../../../utils';
import { Input } from '../../../components/ui/Input';
import type { Transfer, Store } from '../../../types';
import type { ReactElement } from 'react';

const formatQuantity = (value: Transfer['quantity']) => {
  if (value === null || value === undefined) return '-';
  return typeof value === 'number' ? value.toString() : value;
};

export function TransferRequestsPage(): ReactElement {
  const { t } = useTranslation();
  const { products } = useProducts();
  const [stores, setStores] = useState<Store[]>([]);
  const [requests, setRequests] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
    if (transfer.product) return productNameById.get(String(transfer.product)) ?? transfer.product;
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
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleApprove(item.id);
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
              handleReject(item.id);
            }}
            title={t('transfers.rejected')}
            className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await transferService.getAll();
      const pending = (res.data || []).filter((item) => item.status === 'pending');
      setRequests(pending);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load transfer requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
                    <div>
                      <p className="text-xs text-muted-foreground">#{request.id}</p>
                      <p className="font-semibold text-foreground">
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

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => handleApprove(request.id)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {t('transfers.accepted')}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleReject(request.id)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t('transfers.rejected')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={filteredRequests}
              columns={columns}
              loading={loading}
              emptyMessage={t('transfers.noData')}
              loadingMessage={t('common.loading')}
              minWidth="900px"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TransferRequestsPage;
