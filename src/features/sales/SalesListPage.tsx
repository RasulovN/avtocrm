import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, FileText, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { DateRangeFilter } from '../../components/shared/DateRangeFilter';
import { ExportButton } from '../../components/shared/ExportButton';
import { PaymentTypeBadge } from '../../components/shared/PaymentTypeBadge';
import { Button } from '../../components/ui/Button';
import { salesService, type SaleStatistics } from '../../services/salesService';
import { storeService } from '../../services/storeService';
import { useAuthStore } from '../../app/store';
import { formatCurrency, formatDate } from '../../utils';
import { handleError } from '../../utils/errorHandler';
import type { Sale, Store } from '../../types';

type SaleRow = Sale & { id: string; rowNumber: number };

type DatePreset = 'today' | 'week' | 'month' | 'all' | 'custom';

// Mahalliy vaqt bo'yicha YYYY-MM-DD (toISOString UTC bo'lgani uchun kechqurun sana suriladi)
const toLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const presetRange = (preset: DatePreset): { from: string; to: string } => {
  const today = new Date();
  const to = toLocalDate(today);
  if (preset === 'today') return { from: to, to };
  if (preset === 'week') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { from: toLocalDate(d), to };
  }
  if (preset === 'month') {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return { from: toLocalDate(d), to };
  }
  return { from: '', to: '' }; // all
};

export function SalesListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
  const params = useParams();
  const lang = params.lang || 'uz';
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(() => localStorage.getItem('sales_list_show_stats') !== 'false');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filtrlar: standart — BUGUN (statistika va ro'yxat bugunniki chiqadi)
  const [preset, setPreset] = useState<DatePreset>('today');
  const [dateFrom, setDateFrom] = useState(() => presetRange('today').from);
  const [dateTo, setDateTo] = useState(() => presetRange('today').to);
  // Do'kon filtri — faqat superadmin uchun ('' = barcha do'konlar)
  const [storeFilter, setStoreFilter] = useState('');
  const [stores, setStores] = useState<Store[]>([]);

  // Statistika — serverdan, butun filtrlangan davr bo'yicha
  const [stats, setStats] = useState<SaleStatistics | null>(null);

  const applyPreset = (next: DatePreset) => {
    setPreset(next);
    const range = presetRange(next);
    setDateFrom(range.from);
    setDateTo(range.to);
    setPage(1);
  };

  // Superadmin uchun do'konlar ro'yxati (filtr select'i)
  useEffect(() => {
    if (!isAdmin) return;
    storeService.getAll({ page: 1, limit: 100 })
      .then((res) => setStores(Array.isArray(res.data) ? res.data : []))
      .catch(() => setStores([]));
  }, [isAdmin]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        store: storeFilter || undefined,
      };
      const [res, statsRes] = await Promise.all([
        salesService.getAll({ page, limit, ...filters }),
        salesService.getStatistics(filters),
      ]);
      setSales(res.data || []);
      setTotal(res.total ?? 0);
      setStats(statsRes);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: true, logData: 'Failed to load sales' });
      setSales([]);
      setTotal(0);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [page, limit, dateFrom, dateTo, storeFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
      render: (item) => item.store_name || String(item.store),
    },
    {
      key: 'customer_name',
      header: t('customers.title'),
      render: (item) => item.customer_name || String(item.customer),
    },
    {
      key: 'total_amount',
      header: t('common.total'),
      className: 'font-medium',
      render: (item) => formatCurrency(parseFloat(item.total_amount || '0')),
    },
    {
      key: 'paid_amount',
      header: t('sales.paid'),
      className: 'text-green-600',
      render: (item) => formatCurrency(parseFloat(item.paid_amount || '0')),
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
      key: 'debt_due_date',
      header: t('sales.debtDueDate', 'Qarz muddati'),
      render: (item) => item.debt_due_date ? (
        <span className="text-muted-foreground text-xs">{formatDate(item.debt_due_date)}</span>
      ) : '—',
    },
    {
      key: 'payment_type',
      header: t('sales.paymentType', 'To‘lov turi'),
      render: (item) => <PaymentTypeBadge type={item.payment_type} />,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${item.status === 'partial' ? 'badge-warning' : 'badge-success'
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <PageHeader
          title={t('sales.title')}
          description={t('sales.listDescription')}
        />
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          <ExportButton
            direct
            endpoint="/sales/export/"
            filename="sotuvlar.xlsx"
            params={{
              store: storeFilter || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              setShowStats(prev => {
                const newVal = !prev;
                localStorage.setItem('sales_list_show_stats', String(newVal));
                return newVal;
              });
            }}
          >
            {showStats ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                {t('common.hideStats', 'Statistikani yashirish')}
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                {t('common.showStats', 'Statistikani ko\'rsatish')}
              </>
            )}
          </Button>
          <Link to={`/${lang}/sales/new`} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {t('sales.newSale')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtrlar: davr (standart — bugun) va do'kon */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {([
            ['today', t('export.today', 'Bugun')],
            ['week', t('export.last7', 'Oxirgi 7 kun')],
            ['month', t('export.last30', 'Oxirgi 1 oy')],
            ['all', t('export.all', 'Hammasi')],
          ] as [DatePreset, string][]).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={preset === key ? 'default' : 'outline'}
              onClick={() => applyPreset(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        {/* Dan–gacha: bitta kalendarda oraliq bo'yalgan holda tanlanadi */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t('common.dateRange', 'Sana oralig‘i')}</label>
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
              setPreset('custom');
              setPage(1);
            }}
            className="w-64"
          />
        </div>
        {isAdmin && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('products.filterByStore', 'Do‘kon bo‘yicha filtr')}</label>
            <select
              className="h-9 px-3 border rounded-md bg-background text-sm min-w-44"
              value={storeFilter}
              onChange={(e) => { setStoreFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t('dashboard.allBranches', 'Barcha do‘konlar')}</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showStats && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-300 ease-in-out">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm card-hover-lift">
            <p className="text-sm text-muted-foreground">{t('dashboard.totalSales')}</p>
            <p className="text-2xl font-bold">{stats.total_sales}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm card-hover-lift">
            <p className="text-sm text-muted-foreground">{t('dashboard.totalRevenue')}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(parseFloat(stats.total_amount || '0'))}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm card-hover-lift">
            <p className="text-sm text-muted-foreground">{t('sales.paid', 'To‘langan')}</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(parseFloat(stats.total_paid || '0'))}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm card-hover-lift">
            <p className="text-sm text-muted-foreground">{t('dashboard.totalDebt')}</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(parseFloat(stats.total_debt || '0'))}</p>
          </div>
        </div>
      )}

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
              <div
                key={item.id}
                className="cursor-pointer rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:bg-accent/30"
                onClick={() => navigate(`/${lang}/sales/${item.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">#{index + 1}</p>
                    <p className="font-semibold text-foreground">{t('stores.title')}: {item.store_name || String(item.store)}</p>
                    <p className="text-sm text-muted-foreground">{t('customers.title')}: {item.customer_name || String(item.customer)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                      {item.status === 'partial' ? t('common.pending') : (item.status === 'paid' ? t('sales.paid') : t('common.completed'))}
                    </span>
                    <PaymentTypeBadge type={item.payment_type} />
                  </div>
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
                    {item.debt_due_date && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t('sales.debtDueDate', 'Qarz muddati')}: {formatDate(item.debt_due_date)}
                      </p>
                    )}
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
              onRowClick={(item) => navigate(`/${lang}/sales/${item.id}`)}
              minWidth="900px"
              pagination={{
                page,
                limit,
                total,
                onPageChange: setPage,
                onLimitChange: setLimit,
              }}
            />
          </div>

          {/* Mobile Pagination */}
          <div className="md:hidden flex flex-col gap-4 py-4 border-t border-border mt-4">
            <div className="text-sm text-muted-foreground font-medium text-center">
              {(page - 1) * limit + 1}-{Math.min(page * limit, total)} / {total}
            </div>
            
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium px-2">
                Sahifa {page} / {Math.ceil(total / limit) || 1}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0"
                onClick={() => setPage(page + 1)}
                disabled={page === Math.ceil(total / limit) || total === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
