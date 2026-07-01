import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, ArrowRight, Eye, Search, Check, X, Package, CheckCircle2, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable, type Column } from '../../../components/shared/DataTable';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/Dialog';
import { Input } from '../../../components/ui/Input';
import { transferService } from '../../../services/transferService';
import { storeService } from '../../../services/storeService';
import { formatDate } from '../../../utils';
import { escapeHtml } from '../../../utils/xss';
import type { Transfer, Store } from '../../../types';
import { useProducts } from '../../../context/ProductContext';
import { useAuthStore } from '../../../app/store';
import { handleError } from '../../../utils/errorHandler';

export function TransferListPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const { products } = useProducts();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
  const userStoreId = user?.store_id || (user?.stores && user.stores.length > 0 ? String(user.stores.find(s => s.type === 'b')?.id || user.stores[0].id) : '');
  const [stores, setStores] = useState<Store[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  
  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => {
      map.set(String(product.id), product.name);
    });
    return map;
  }, [products]);

  useEffect(() => {
    loadData(page);
  }, [page]);

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
      handleError(error, { showToast: true, logData: 'Failed to load stores' });
      setStores([]);
    }
  };

  const loadData = async (pageToLoad = page) => {
    try {
      setLoading(true);
      const res = await transferService.getAll({ page: pageToLoad, limit });
      setTransfers(res.data || []);
      setTotal(res.total || 0);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: true, logData: 'Failed to load transfers' });
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
      handleError(error, { showToast: true });
    }
  };

  const handleReject = async (id: number | string) => {
    try {
      await transferService.reject(String(id));
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'r' } : t))
      );
    } catch (error) {
      handleError(error, { showToast: true });
    }
  };

  const handlePrintTransfer = (transfer: Transfer) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const fromStore = fromStoreLabel(transfer);
    const toStore = toStoreLabel(transfer);

    let rows = '';
    if (transfer.items && transfer.items.length > 0) {
      rows = transfer.items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(item.product_name || '-')}</td>
          <td>${escapeHtml(item.sku || item.product_sku || item.product_barcode || '-')}</td>
          <td>${escapeHtml(String(item.purchase_price ?? '-'))}</td>
          <td>${escapeHtml(String(item.quantity))}</td>
          <td style="width:40px;text-align:center;"></td>
        </tr>
      `).join('');
    } else {
      rows = `<tr>
        <td>1</td>
        <td>${escapeHtml(transfer.product_name || '-')}</td>
        <td>-</td>
        <td>${escapeHtml(String(transfer.purchase_price ?? '-'))}</td>
        <td>${escapeHtml(String(transfer.quantity ?? '-'))}</td>
        <td style="width:40px;text-align:center;"></td>
      </tr>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>${t('transfers.title')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 16px; }
  .header { font-size: 12px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 12px; }
  th { font-weight: bold; background: #fff; }
  td:first-child, th:first-child { width: 30px; text-align: center; }
  td:last-child, th:last-child { width: 40px; text-align: center; }
  @media print { body { padding: 8px; } }
</style>
</head>
<body>
  <div class="header">${escapeHtml(dateStr)} &nbsp; ${escapeHtml(fromStore)} → ${escapeHtml(toStore)}</div>
  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>${t('products.title')}</th>
        <th>${t('products.barcode')}</th>
        <th>${t('products.purchasePrice')}</th>
        <th>${t('products.quantity')}</th>
        <th>✓</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
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
      key: 'id',
      header: 'Hujjat №',
      render: (item) => (
        <span className="font-medium text-foreground">
          №{item.id}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Sana',
      render: (item) => (
        <span className="text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString('en-US')}
        </span>
      ),
    },
    {
      key: 'route',
      header: "Yo'nalish",
      render: (item) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{fromStoreLabel(item)}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <span className="font-medium text-foreground">{toStoreLabel(item)}</span>
        </div>
      ),
    },
    {
      key: 'items_count',
      header: 'Tovarlar',
      render: (item) => (
        <span className="text-muted-foreground">
          {item.items?.length || 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      render: (item) => {
        const isApproved = item.status === 'a';
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${
            isApproved 
              ? 'bg-[#00B050] text-white' 
              : item.status === 'r' 
                ? 'bg-red-500 text-white' 
                : 'bg-yellow-500 text-white'
          }`}>
            {isApproved && <CheckCircle2 className="h-3.5 w-3.5" />}
            {getStatusLabel(item.status)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          {item.status === 'p' && (isAdmin || String(item.to_store) === String(userStoreId)) && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(item.id);
                }}
                title={t('transfers.accepted')}
                className="text-green-600 hover:text-green-700 hover:bg-green-100/10 h-8 w-8"
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
                className="text-red-600 hover:text-red-700 hover:bg-red-100/10 h-8 w-8"
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
            className="text-muted-foreground hover:text-foreground"
          >
            <Package className="h-5 w-5" />
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

                  <div className="mt-4 flex flex-col gap-2">
                    {(item.status === 'p' || item.status === 'pending') && (isAdmin || String(item.to_store) === String(userStoreId)) && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 text-green-600 border-green-600 dark:hover:bg-green-950/20 hover:bg-green-50"
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
                          className="flex-1 text-red-600 border-red-600 dark:hover:bg-red-950/20 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(item.id);
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          {t('transfers.rejected')}
                        </Button>
                      </div>
                    )}
                    <Button variant="outline" className="w-full" onClick={() => handleShowDetails(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t('common.view')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && filteredTransfers.length > 0 && Math.ceil(total / limit) > 1 && (
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
              data={filteredTransfers}
              columns={columns}
              loading={loading}
              emptyMessage={t('transfers.noData')}
              loadingMessage={t('common.loading')}
              onRowClick={(item) => handleShowDetails(item)}
              minWidth="900px"
              pagination={{ page, limit, total, onPageChange: setPage }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl sm:max-w-2xl pb-6">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle>{t('transfers.detailsTitle')}</DialogTitle>
                <DialogDescription>
                  {formatDate(selectedTransfer?.created_at || '')}
                </DialogDescription>
              </div>
              {selectedTransfer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintTransfer(selectedTransfer)}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  {t('common.print')}
                </Button>
              )}
            </div>
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
