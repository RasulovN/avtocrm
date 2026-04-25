import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, Eye, Undo2 } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/Dialog';
import { saleReturnService } from '../../services/salesService';
import { formatCurrency } from '../../utils';
import type { SaleReturn } from '../../types';

type ReturnRow = Omit<SaleReturn, 'id'> & { id: string; rowNumber: number };

export function SaleReturnListPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await saleReturnService.getAll();
      setReturns(data);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load sale returns:', error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (item: ReturnRow) => {
    const original = returns.find((r) => r.id === Number(item.id));
    if (original) {
      setSelectedReturn(original);
      setDetailOpen(true);
    }
  };

  const returnRows: ReturnRow[] = returns.map((item, index) => ({
    ...item,
    id: String(item.id),
    rowNumber: index + 1,
  }));

  const columns: Column<ReturnRow>[] = [
    {
      key: 'rowNumber',
      header: '#',
      render: (item) => item.rowNumber,
    },
    {
      key: 'store_name',
      header: t('stores.title'),
      render: (item) => item.store_name || String(item.store),
    },
    {
      key: 'seller_name',
      header: t('sales.saleDetails'),
      render: (item) => (
        <div>
          <p className="font-medium">{item.seller_name || String(item.seller)}</p>
          <p className="text-xs text-muted-foreground">Sotuv #{item.sale}</p>
        </div>
      ),
    },
    {
      key: 'total_refund',
      header: t('saleReturns.totalRefund'),
      className: 'font-medium text-red-600',
      render: (item) => formatCurrency(parseFloat(item.total_refund || '0')),
    },
    {
      key: 'comment',
      header: t('saleReturns.comment'),
      render: (item) => item.comment || '-',
    },
    {
      key: 'items',
      header: t('sales.items'),
      render: (item) => `${item.items?.length || 0} ta`,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(item)}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    totalReturns: returns.length,
    totalRefund: returns.reduce((sum, r) => sum + parseFloat(r.total_refund || '0'), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title={t('saleReturns.title')}
          description={t('saleReturns.listDescription')}
        />
        <Link to={`/${lang}/sales-returns/new`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('saleReturns.newReturn')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('saleReturns.history')}</p>
          <p className="text-2xl font-bold">{stats.totalReturns}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('saleReturns.totalRefund')}</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalRefund)}</p>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold">{t('saleReturns.history')}</h2>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : returns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Undo2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('saleReturns.noData')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {returns.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">#{index + 1}</p>
                    <p className="font-semibold text-foreground">{t('stores.title')}: {item.store_name || String(item.store)}</p>
                    <p className="text-sm text-muted-foreground">Sotuv #{item.sale}</p>
                    <p className="text-sm text-muted-foreground">{item.seller_name || String(item.seller)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('saleReturns.totalRefund')}</p>
                    <p className="mt-1 font-semibold text-red-600">{formatCurrency(parseFloat(item.total_refund || '0'))}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('sales.items')}</p>
                    <p className="mt-1 font-semibold">{item.items?.length || 0} ta</p>
                  </div>
                </div>

                {item.comment && (
                  <p className="mt-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                    {item.comment}
                  </p>
                )}

                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedReturn(item);
                      setDetailOpen(true);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {t('common.view')}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={returnRows}
              columns={columns}
              loading={loading}
              emptyMessage={t('saleReturns.noData')}
              loadingMessage={t('common.loading')}
              minWidth="700px"
            />
          </div>
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {t('saleReturns.title')} #{selectedReturn?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('sales.saleDetails')}</p>
                  <p className="font-medium">Sotuv #{selectedReturn.sale}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('stores.title')}</p>
                  <p className="font-medium">
                    {selectedReturn.store_name || String(selectedReturn.store)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('users.seller')}</p>
                  <p className="font-medium">
                    {selectedReturn.seller_name || String(selectedReturn.seller)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('customers.title')}</p>
                  <p className="font-medium">
                    {selectedReturn.customer || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('saleReturns.totalRefund')}</p>
                  <p className="font-medium text-red-600">
                    {formatCurrency(parseFloat(selectedReturn.total_refund || '0'))}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">{t('saleReturns.comment')}</p>
                  <p className="font-medium">
                    {selectedReturn.comment || '-'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {t('saleReturns.returnItems')}
                </h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">
                          {t('products.productName')}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t('products.quantity')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReturn.items?.map((returnItem) => (
                        <tr key={returnItem.id} className="border-t">
                          <td className="px-3 py-2">
                            {returnItem.product_name || String(returnItem.product)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {returnItem.quantity}
                          </td>
                        </tr>
                      ))}
                      {(!selectedReturn.items || selectedReturn.items.length === 0) && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-2 text-center text-muted-foreground"
                          >
                            {t('common.noData')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

