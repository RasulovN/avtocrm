import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, FileText, Eye } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/Button';
import { salesService } from '../../services/salesService';
import { useAuthStore } from '../../app/store';
import { formatCurrency, formatDate } from '../../utils';
import type { Sale } from '../../types';

type SaleRow = Sale & { id: string; rowNumber: number };

export function SalesListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreIds = user?.stores?.map(s => String(s.id)) || [];
  const params = useParams();
  const lang = params.lang || 'uz';
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await salesService.getAll();
      const allSales = res.data || [];
      
      let scopedSales = allSales;
      if (!isAdmin && userStoreIds.length > 0) {
        scopedSales = allSales.filter((sale) => userStoreIds.includes(String(sale.store)));
      }
      
      setSales(scopedSales);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const salesRows: SaleRow[] = sales.map((item, index) => ({
    ...item,
    id: String(item.id),
    rowNumber: index + 1,
  }));

  const columns: Column<SaleRow>[] = [
    {
      key: 'rowNumber',
      header: '#',
      render: (item) => item.rowNumber,
    },
    {
      key: 'store_name',
      header: t('stores.title'),
      render: (item) => item.store_name || item.store,
    },
    {
      key: 'customer_name',
      header: t('customers.title'),
      render: (item) => item.customer_name || item.customer,
    },
    {
      key: 'total_amount',
      header: t('common.total'),
      className: 'font-medium',
      render: (item) => formatCurrency(parseFloat(item.total_amount)),
    },
    {
      key: 'paid_amount',
      header: t('sales.paid'),
      className: 'text-green-600',
      render: (item) => formatCurrency(parseFloat(item.paid_amount)),
    },
    {
      key: 'debt',
      header: t('suppliers.debt') || 'Qarz',
      className: 'text-red-600',
      render: (item) => (
        <span className={(item.debt ?? 0) > 0 ? 'text-red-500 font-semibold' : ''}>
          {formatCurrency(item.debt ?? 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }`}>
          {item.status === 'partial' ? t('common.pending') : (item.status === 'paid' ? t('sales.paid') : t('common.completed'))}
        </span>
      ),
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
        <div className="flex justify-end">
          <Link to={`/${lang}/sales/${item.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const stats = {
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + parseFloat(s.total_amount || '0'), 0),
    totalDebt: sales.reduce((sum, s) => sum + (parseFloat(s.debt) || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title={t('sales.title')}
          description={t('sales.listDescription')}
        />
        <Link to={`/${lang}/sales/new`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('sales.newSale')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Jami sotuvlar</p>
          <p className="text-2xl font-bold">{stats.totalSales}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Jami sotuvlar summasi</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalAmount)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Jami qarzdorlik</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(stats.totalDebt)}</p>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold">{t('sales.history')}</h2>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('sales.noData')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sales.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">#{index + 1}</p>
                    <p className="font-semibold text-foreground">{t('stores.title')}: {item.store_name || item.store}</p>
                    <p className="text-sm text-muted-foreground">{t('customers.title')}: {item.customer_name || item.customer}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                    {item.status === 'partial' ? t('common.pending') : (item.status === 'paid' ? t('sales.paid') : t('common.completed'))}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('common.total')}</p>
                    <p className="mt-1 font-semibold">{formatCurrency(parseFloat(item.total_amount))}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('sales.paid')}</p>
                    <p className="mt-1 font-semibold text-green-600">{formatCurrency(parseFloat(item.paid_amount))}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">{t('suppliers.debt') || 'Qarz'}</p>
                    <p className={`mt-1 font-semibold ${(item.debt ?? 0) > 0 ? 'text-red-500' : ''}`}>{formatCurrency(item.debt ?? 0)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Link to={`/${lang}/sales/${item.id}`} className="w-full">
                    <Button variant="outline" className="w-full">
                      <Eye className="mr-2 h-4 w-4" />
                      {t('common.view')}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={salesRows}
              columns={columns}
              loading={loading}
              emptyMessage={t('sales.noData')}
              loadingMessage={t('common.loading')}
              minWidth="900px"
            />
          </div>
        </>
      )}
    </div>
  );
}
