import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, FileText, Eye, EyeOff, ChevronLeft, ChevronRight, Trash2, Archive, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { DateRangeFilter } from '../../components/shared/DateRangeFilter';
import { ExportButton } from '../../components/shared/ExportButton';
import { PaymentTypeBadge } from '../../components/shared/PaymentTypeBadge';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { salesService, type SaleStatistics, type ArchivedSale } from '../../services/salesService';
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
  // To'lov turlari ko'p bo'lsa kartada faqat bir qismi ko'rinadi, qolgani modalda
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // O'chirish (faqat superadmin): checkbox bilan tanlash + tasdiqlash + arxiv
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archive, setArchive] = useState<ArchivedSale[]>([]);
  const [restoringId, setRestoringId] = useState<number | null>(null);

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
      // Sahifa/filtr o'zgarganda eski tanlov qolib ketmasin
      setSelectedIds(new Set());
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

  // ─── Tanlash (faqat superadmin) ───
  const pageIds = salesRows.map((r) => r.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(pageIds));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      setDeleting(true);
      const res = await salesService.bulkDelete([...selectedIds]);
      toast.success(
        t('sales.deletedToArchive', "{{count}} ta sotuv arxivga o'tkazildi", { count: res.archived })
      );
      setSelectedIds(new Set());
      await loadData();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setDeleting(false);
    }
  };

  const openArchive = async () => {
    setArchiveOpen(true);
    try {
      setArchiveLoading(true);
      const res = await salesService.getArchive();
      setArchive(res.results || []);
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      setRestoringId(id);
      await salesService.restore([id]);
      toast.success(t('sales.restoredMsg', 'Sotuv ro‘yxatga qaytarildi'));
      setArchive((prev) => prev.filter((a) => a.id !== id));
      await loadData();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setRestoringId(null);
    }
  };

  // Checkbox ustuni — faqat superadmin uchun; sarlavhadagi checkbox sahifadagi
  // hammasini tanlaydi/bekor qiladi. stopPropagation — qator bosilganda
  // detail sahifaga o'tib ketmasligi uchun.
  const selectColumn: Column<SaleRow> = {
    key: 'select',
    header: (
      <input
        type="checkbox"
        checked={allSelected}
        onChange={toggleSelectAll}
        onClick={(e) => e.stopPropagation()}
        aria-label={t('sales.selectAllSales', 'Hammasini tanlash')}
        className="h-4 w-4 cursor-pointer accent-primary align-middle"
      />
    ),
    className: 'w-10',
    render: (item) => (
      <input
        type="checkbox"
        checked={selectedIds.has(item.id)}
        onChange={() => toggleSelect(item.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={t('sales.selectSale', 'Sotuvni tanlash')}
        className="h-4 w-4 cursor-pointer accent-primary align-middle"
      />
    ),
  };

  const columns: Column<SaleRow>[] = [
    ...(isAdmin ? [selectColumn] : []),
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
      render: (item) => <PaymentTypeBadge type={item.payment_type} payments={item.payments} />,
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
            <Button variant="ghost" size="sm" aria-label={t('common.view', "Ko'rish")}>
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {isAdmin && (
            <Button variant="outline" className="w-full sm:w-auto" onClick={openArchive}>
              <Archive className="h-4 w-4 mr-2" />
              {t('sales.archive', 'Arxiv')}
            </Button>
          )}
          <ExportButton
            direct
            endpoint="/sales/export/"
            filename="sotuvlar.xlsx"
            className="w-full sm:w-auto"
            params={{
              store: storeFilter || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            }}
          />
          <Button
            variant="outline"
            className="w-full sm:w-auto"
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

      {/* Filtrlar: davr (standart — bugun) va do'kon.
          Mobilda hamma element ustma-ust to'liq enda, kengroq ekranda bir qatorda */}
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
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
                className="w-full sm:w-auto"
              >
                {label}
              </Button>
            ))}
          </div>
          {/* Dan–gacha: bitta kalendarda oraliq bo'yalgan holda tanlanadi */}
          <div className="flex w-full flex-col gap-1 sm:w-64">
            <label className="text-xs font-medium text-muted-foreground">
              {t('common.dateRange', 'Sana oralig‘i')}
            </label>
            <DateRangeFilter
              from={dateFrom}
              to={dateTo}
              onChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
                setPreset('custom');
                setPage(1);
              }}
              className="w-full"
            />
          </div>
          {isAdmin && (
            <div className="flex w-full flex-col gap-1 sm:w-56">
              <label className="text-xs font-medium text-muted-foreground">
                {t('products.filterByStore', 'Do‘kon bo‘yicha filtr')}
              </label>
              <select
                aria-label={t('products.filterByStore', 'Do‘kon bo‘yicha filtr')}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
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
      </div>

      {showStats && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 transition-all duration-300 ease-in-out">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm card-hover-lift">
            <p className="text-sm text-muted-foreground">{t('dashboard.totalSales')}</p>
            <p className="text-2xl font-bold">{stats.total_sales}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm card-hover-lift">
            <p className="text-sm text-muted-foreground">{t('dashboard.totalRevenue')}</p>
            {/* Sof savdo — qaytarib berilgan summa ayirilgan */}
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(parseFloat(stats.total_net ?? stats.total_amount ?? '0'))}
            </p>
            {stats.total_net !== undefined &&
              parseFloat(stats.total_returned || '0') > 0 && (
                <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                  {t('sales.grossBeforeReturns', 'Qaytarimlardan oldin')}:{' '}
                  <span className="font-semibold">{formatCurrency(parseFloat(stats.total_amount || '0'))}</span>
                </p>
              )}
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm card-hover-lift">
            <p className="text-sm text-muted-foreground">{t('sales.paid', 'To‘langan')}</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(parseFloat(stats.total_paid || '0'))}</p>
            {(stats.paid_breakdown?.length ?? 0) > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2.5">
                {/* Kartada faqat dastlabki 3 tasi — dizayn buzilmasligi uchun */}
                {stats.paid_breakdown!.slice(0, 3).map((row, index) => (
                  <div key={`${row.type}-${row.name ?? index}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.type === 'cash' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                      />
                      <span className="truncate">
                        {row.type === 'cash'
                          ? t('sales.cash', 'Naqd')
                          : row.name || t('sales.unknownCard', 'Noma’lum karta')}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatCurrency(parseFloat(row.amount || '0'))}
                    </span>
                  </div>
                ))}
                {stats.paid_breakdown!.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setBreakdownOpen(true)}
                    className="w-full pt-0.5 text-left text-xs font-medium text-primary hover:underline"
                  >
                    {t('sales.morePaymentTypes', '+{{count}} ta to‘lov turi', {
                      count: stats.paid_breakdown!.length - 3,
                    })}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm card-hover-lift">
            <p className="text-sm text-muted-foreground">{t('saleReturns.totalRefund', 'Qaytarilgan summa')}</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(parseFloat(stats.total_returned || '0'))}</p>
            {/* Tanlangan davrda qaytarim bo'lmasa ham umumiy summa ko'rinib turadi —
                sales-returns sahifasidagi jami bilan mos */}
            {stats.total_returned_all !== undefined &&
              parseFloat(stats.total_returned_all || '0') !== parseFloat(stats.total_returned || '0') && (
                <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                  {t('export.all', 'Hammasi')}:{' '}
                  <span className="font-semibold text-amber-600">
                    {formatCurrency(parseFloat(stats.total_returned_all))}
                  </span>
                </p>
              )}
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm card-hover-lift">
            <p className="text-sm text-muted-foreground">{t('dashboard.totalDebt')}</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(parseFloat(stats.total_debt || '0'))}</p>
            {/* Oxirgi qarz to'lovlari: jami summa + qismlari (naqd / Humo / Uzcard ...) */}
            {(stats.recent_debt_payments?.length ?? 0) > 0 && (
              <div className="mt-3 space-y-2 border-t border-border/60 pt-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('sales.recentDebtPayments', "Oxirgi qarz to'lovlari")}
                </p>
                {stats.recent_debt_payments!.map((g, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-muted-foreground">
                        #{g.sale} · {formatDate(g.created_at)}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-emerald-600">
                        +{formatCurrency(parseFloat(g.amount || '0'))}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                      {g.parts.map((p, j) => (
                        <span key={j} className="inline-flex items-center gap-1 whitespace-nowrap">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.type === 'cash' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                          />
                          {p.type === 'cash' ? t('sales.cash', 'Naqd') : p.name || t('sales.card', 'Karta')}:{' '}
                          {formatCurrency(parseFloat(p.amount || '0'))}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* To'lov turlari bo'yicha to'liq taqsimot modali */}
      <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('sales.paidBreakdownTitle', 'To‘langan — to‘lov turlari')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">{t('common.total', 'Jami')}</span>
              <span className="font-bold tabular-nums text-emerald-600">
                {formatCurrency(parseFloat(stats?.total_paid || '0'))}
              </span>
            </div>
            <div className="max-h-72 divide-y divide-border/50 overflow-y-auto">
              {(stats?.paid_breakdown ?? []).map((row, index) => (
                <div
                  key={`${row.type}-${row.name ?? index}`}
                  className="flex items-center justify-between gap-3 px-1 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${row.type === 'cash' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                    />
                    <span className="truncate">
                      {row.type === 'cash'
                        ? t('sales.cash', 'Naqd')
                        : row.name || t('sales.unknownCard', 'Noma’lum karta')}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatCurrency(parseFloat(row.amount || '0'))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t('sales.history')}</h2>
        {/* Mobil uchun "hammasini tanlash" — desktopda jadval sarlavhasidagi checkbox bor */}
        {isAdmin && salesRows.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground md:hidden cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            {t('sales.selectAllSales', 'Hammasini tanlash')}
          </label>
        )}
      </div>

      {/* Tanlangan sotuvlar paneli — o'chirish tasdiqlash bilan */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800/50 dark:bg-red-950/20">
          <span className="text-sm font-medium">
            {t('sales.selectedCount', '{{count}} ta sotuv tanlandi', { count: selectedIds.size })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {t('common.delete', "O'chirish")}
            </Button>
          </div>
        </div>
      )}

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
                  <div className="flex items-start gap-3 min-w-0">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(String(item.id))}
                        onChange={() => toggleSelect(String(item.id))}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t('sales.selectSale', 'Sotuvni tanlash')}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">#{index + 1}</p>
                      <p className="font-semibold text-foreground">{t('stores.title')}: {item.store_name || String(item.store)}</p>
                      <p className="text-sm text-muted-foreground">{t('customers.title')}: {item.customer_name || String(item.customer)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                      {item.status === 'partial' ? t('common.pending') : (item.status === 'paid' ? t('sales.paid') : t('common.completed'))}
                    </span>
                    <PaymentTypeBadge type={item.payment_type} payments={item.payments} />
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
                aria-label={t('common.previous', 'Oldingi sahifa')}
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
                aria-label={t('common.next', 'Keyingi sahifa')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* O'chirishni tasdiqlash — sotuvlar avval arxivga tushadi */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleBulkDelete}
        title={t('sales.deleteConfirmTitle', "Sotuvlarni o'chirish")}
        description={t(
          'sales.deleteConfirmDesc',
          "{{count}} ta sotuv arxivga o'tkaziladi va ro'yxatdan yashiriladi. Arxivda 30 kun saqlanadi, keyin avtomatik butunlay o'chib ketadi. Davom etasizmi?",
          { count: selectedIds.size }
        )}
        confirmText={t('common.delete', "O'chirish")}
        cancelText={t('common.cancel', 'Bekor qilish')}
        variant="destructive"
        loading={deleting}
      />

      {/* Arxiv — o'chirilgan sotuvlar, tiklash imkoniyati bilan */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('sales.archiveTitle', "O'chirilgan sotuvlar arxivi")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {t(
              'sales.archiveHint',
              "O'chirilgan sotuvlar arxivda 30 kun saqlanadi, so'ng avtomatik butunlay o'chiriladi. Tiklangan sotuv ro'yxatga qaytadi."
            )}
          </p>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {archiveLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : archive.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('sales.archiveEmpty', 'Arxiv bo‘sh')}
              </p>
            ) : (
              archive.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold">
                      №{item.id} — {item.store_name || '-'}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {item.customer_name || '-'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('common.total', 'Jami')}: <span className="font-medium text-foreground">{formatCurrency(parseFloat(item.total_amount || '0'))}</span>
                      {' • '}
                      {t('sales.deletedAt', "O'chirilgan sana")}: {formatDate(item.deleted_at)}
                    </p>
                    <p className="text-xs font-medium text-amber-600">
                      {t('sales.daysLeft', "Butunlay o'chirilishiga {{count}} kun qoldi", { count: item.days_left })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={restoringId === item.id}
                    onClick={() => handleRestore(item.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    {restoringId === item.id ? t('common.loading') : t('sales.restore', 'Tiklash')}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
