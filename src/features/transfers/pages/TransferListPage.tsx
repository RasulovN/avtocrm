import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, ArrowRight, Eye, Search } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, type Column } from '../../../components/shared/DataTable';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/Dialog';
import { Input } from '../../../components/ui/Input';
import { transferService } from '../../../services/transferService';
import { storeService } from '../../../services/storeService';
import { formatDate } from '../../../utils';
import type { Transfer, Store } from '../../../types';
import { useProducts } from '../../../context/ProductContext';

export function TransferListPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const { products } = useProducts();
  const [stores, setStores] = useState<Store[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => {
      map.set(String(product.id), product.name);
    });
    return map;
  }, [products]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadStores();
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

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await transferService.getAll();
      setTransfers(res.data || []);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (item: Transfer) => {
    setSelectedTransfer(item);
    setShowDetails(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return t('common.accepted');
      case 'rejected':
        return t('common.rejected');
      default:
        return t('common.pending');
    }
  };

  const resolveProductName = (item: Transfer) => {
    if (item.product_name) return item.product_name;
    if (item.product) return productNameById.get(String(item.product)) ?? item.product;
    if (item.items?.[0]?.product_name) return item.items[0].product_name;
    return '-';
  };

  const formatQuantity = (value: Transfer['quantity']) => {
    if (value === null || value === undefined) return '-';
    return typeof value === 'number' ? value.toString() : value;
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

  const filteredTransfers = useMemo(() => {
    if (!searchQuery.trim()) return transfers;
    const query = searchQuery.toLowerCase();
    return transfers.filter((item) => {
      const fromLabel = fromStoreLabel(item).toLowerCase();
      const toLabel = toStoreLabel(item).toLowerCase();
      const productLabel = resolveProductName(item).toLowerCase();
      const statusLabel = getStatusLabel(item.status).toLowerCase();
      return (
        fromLabel.includes(query) ||
        toLabel.includes(query) ||
        productLabel.includes(query) ||
        statusLabel.includes(query)
      );
    });
  }, [searchQuery, transfers, storeNameById]);

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
      key: 'status',
      header: t('common.status'),
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(item.status)}`}>
          {getStatusLabel(item.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleShowDetails(item);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('transfers.title')}
        description={t('transfers.listDescription')}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link to={`/${lang}/transfers/new`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('transfers.createTransfer')}
          </Button>
        </Link>
      </div>

      <Card className='border-none'>
        <CardContent className='p-0'>
          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                {t('transfers.noData')}
              </div>
            ) : (
              filteredTransfers.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">#{index + 1}</p>
                      <p className="font-semibold text-foreground">{fromStoreLabel(item)}</p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="h-4 w-4 shrink-0" />
                        <span>{toStoreLabel(item)}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${getStatusBadge(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{t('products.title')}</p>
                      <p className="mt-1 font-medium">{resolveProductName(item)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{t('products.quantity')}</p>
                      <p className="mt-1 font-medium">{formatQuantity(item.quantity)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 col-span-2">
                      <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                      <p className="mt-1 font-medium">{formatDate(item.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => handleShowDetails(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t('common.view')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={filteredTransfers}
              columns={columns}
              loading={loading}
              emptyMessage={t('transfers.noData')}
              loadingMessage={t('common.loading')}
              onRowClick={(item) => handleShowDetails(item)}
              minWidth="900px"
            />
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('transfers.detailsTitle')}</DialogTitle>
            <DialogDescription>
              {formatDate(selectedTransfer?.created_at || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">{t('transfers.detailsFrom')}:</span>
                  <p className="mt-1 font-medium">{fromStoreLabel(selectedTransfer)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">{t('transfers.detailsTo')}:</span>
                  <p className="mt-1 font-medium">{toStoreLabel(selectedTransfer)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                  <span className="text-muted-foreground">{t('transfers.detailsStatus')}:</span>
                  <p className="mt-1 font-medium">{getStatusLabel(selectedTransfer.status)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">{t('transfers.detailsProduct')}:</span>
                  <p className="mt-1 font-medium">{resolveProductName(selectedTransfer)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">{t('transfers.detailsQuantity')}:</span>
                  <p className="mt-1 font-medium">{formatQuantity(selectedTransfer.quantity)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">{t('transfers.detailsPurchasePrice')}:</span>
                  <p className="mt-1 font-medium">{selectedTransfer.purchase_price ?? '-'}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">{t('transfers.detailsSellingPrice')}:</span>
                  <p className="mt-1 font-medium">{selectedTransfer.selling_price ?? '-'}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                  <span className="text-muted-foreground">{t('transfers.detailsApprovedAt')}:</span>
                  <p className="mt-1 font-medium">
                    {selectedTransfer.approved_at ? formatDate(selectedTransfer.approved_at) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
