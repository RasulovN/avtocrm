import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, ArrowRight, Eye, Search, Check, X } from 'lucide-react';
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

  const handleApprove = async (id: number | string) => {
    try {
      await transferService.approve(String(id));
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'a' } : t))
      );
    } catch (error) {
      console.error('Failed to approve transfer:', error);
    }
  };

  const handleReject = async (id: number | string) => {
    try {
      await transferService.reject(String(id));
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'r' } : t))
      );
    } catch (error) {
      console.error('Failed to reject transfer:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'a':
        return 'bg-green-100 text-green-800';
      case 'r':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'a':
        return t('common.accepted');
      case 'r':
        return t('common.rejected');
      default:
        return t('common.pending');
    }
  };

  const resolveProductName = (item: Transfer) => {
    if (item.items && item.items.length > 0) {
      const names = item.items.map(i => i.product_name || '-').join(', ');
      return names;
    }
    if (item.product_name) return item.product_name;
    if (item.product) return productNameById.get(String(item.product)) ?? String(item.product);
    return '-';
  };

  const getQuantityDisplay = (item: Transfer) => {
    if (item.items && item.items.length > 0) {
      return item.items.reduce((sum, i) => sum + i.quantity, 0);
    }
    return item.quantity ?? '-';
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
    const raw = item.from_store_name || item.from_store;
    return resolveStoreName(raw ? String(raw) : undefined);
  };
  const toStoreLabel = (item: Transfer) => {
    const raw = item.to_store_name || item.to_store;
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
      key: 'quantity',
      header: t('products.quantity'),
      render: (item) => getQuantityDisplay(item),
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
          {item.status === 'p' && (
            <>
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
            </>
          )}
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
                      <p className="mt-1 font-medium">{getQuantityDisplay(item)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 col-span-2">
                      <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                      <p className="mt-1 font-medium">{formatDate(item.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {item.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(item.id);
                          }}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {t('transfers.accepted')}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(item.id);
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          {t('transfers.rejected')}
                        </Button>
                      </>
                    )}
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
        <DialogContent className="max-w-2xl sm:max-w-2xl pb-6">
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
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">{t('common.status')}:</span>
                  <p className="mt-1 font-medium">{getStatusLabel(selectedTransfer.status)}</p>
                </div>
                {selectedTransfer.approved_by_name && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-muted-foreground">{t('transfers.approvedBy')}:</span>
                    <p className="mt-1 font-medium">{selectedTransfer.approved_by_name}</p>
                  </div>
                )}
                {selectedTransfer.approved_at && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-muted-foreground">{t('transfers.approvedAt')}:</span>
                    <p className="mt-1 font-medium">{formatDate(selectedTransfer.approved_at)}</p>
                  </div>
                )}
              </div>

              {selectedTransfer.items && selectedTransfer.items.length > 0 ? (
                <div className="rounded-lg border border-border">
                  <div className="bg-muted/40 px-3 py-2 text-sm font-medium">{t('products.title')}</div>
                  <div className="divide-y divide-border">
                    {selectedTransfer.items.map((item, index) => (
                      <div key={item.id || index} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{item.product_name || '-'}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('products.quantity')}: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{t('products.purchasePrice')}: {item.purchase_price ?? '-'}</p>
                          <p className="text-xs text-muted-foreground">{t('products.sellingPrice')}: {item.selling_price ?? '-'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-muted-foreground">{t('products.title')}:</span>
                    <p className="mt-1 font-medium">{resolveProductName(selectedTransfer)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-muted-foreground">{t('products.quantity')}:</span>
                    <p className="mt-1 font-medium">{getQuantityDisplay(selectedTransfer)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-muted-foreground">{t('products.purchasePrice')}:</span>
                    <p className="mt-1 font-medium">{selectedTransfer.purchase_price ?? '-'}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-muted-foreground">{t('products.sellingPrice')}:</span>
                    <p className="mt-1 font-medium">{selectedTransfer.selling_price ?? '-'}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
