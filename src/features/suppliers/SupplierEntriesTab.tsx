import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle2, Banknote, CreditCard } from 'lucide-react';
import { DataTable, type Column } from '../../components/shared/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { inventoryService } from '../../services/inventoryService';
import { supplierService, type SupplierTransactionRecord, type SupplierStats } from '../../services/supplierService';
import { formatCurrency, formatDate } from '../../utils';
import { handleError } from '../../utils/errorHandler';
import type { ContractEntry } from '../../types';

type PaymentStatus = 'all' | 'unpaid' | 'partial' | 'paid';

interface SupplierEntriesTabProps {
  supplierId: string;
  stats: SupplierStats | null;
  /** To'lovdan keyin ro'yxatni qayta yuklash uchun signal */
  refreshKey: number;
}

const toCents = (value: unknown): number => Math.round((Number(value) || 0) * 100);

// Kirimning to'liq summasi va jami to'langani.
// Eslatma: total_in/total_paid tranzaksiyalari faqat QARZ qismini aks ettiradi,
// kirim paytida darhol to'langani paid_amount'da saqlanadi.
const entryTotal = (entry: ContractEntry) =>
  toCents(entry.total_amount) || toCents(entry.paid_amount) + toCents(entry.total_in);
const entryPaid = (entry: ContractEntry) => toCents(entry.paid_amount) + toCents(entry.total_paid);

// Kirim holati: to'langan / qisman / to'lanmagan (backend payment_status filtri bilan mos)
function entryStatus(entry: ContractEntry): Exclude<PaymentStatus, 'all'> {
  const debtCents = toCents(entry.total_in) - toCents(entry.total_paid);
  if (debtCents <= 0) return 'paid';
  if (entryPaid(entry) <= 0) return 'unpaid';
  return 'partial';
}

export function SupplierEntriesTab({ supplierId, stats, refreshKey }: SupplierEntriesTabProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ContractEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('all');

  // Kirim tafsilotlari dialogi
  const [viewingEntry, setViewingEntry] = useState<ContractEntry | null>(null);
  const [entryTransactions, setEntryTransactions] = useState<SupplierTransactionRecord[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getEntries({
        supplier: supplierId,
        page,
        limit,
        ordering: '-created_at',
        payment_status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setEntries(res.data || []);
      setTotal(res.total);
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Failed to load supplier entries' });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [supplierId, page, statusFilter]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries, refreshKey]);

  const openEntryDetails = async (entry: ContractEntry) => {
    setViewingEntry(entry);
    setLoadingTransactions(true);
    try {
      setEntryTransactions(await supplierService.getPayments(entry.id));
    } catch {
      setEntryTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const chips: { key: PaymentStatus; label: string; count: number | null }[] = [
    { key: 'all', label: t('suppliers.entriesAll', 'Hammasi'), count: stats?.entries_count ?? null },
    { key: 'unpaid', label: t('suppliers.statusUnpaid', 'To‘lanmagan'), count: stats?.unpaid_entries_count ?? null },
    { key: 'partial', label: t('suppliers.statusPartial', 'Qisman to‘langan'), count: stats?.partial_entries_count ?? null },
    { key: 'paid', label: t('suppliers.statusPaid', 'To‘langan'), count: stats?.paid_entries_count ?? null },
  ];

  const statusBadge = (entry: ContractEntry) => {
    const status = entryStatus(entry);
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:border-green-900/30 dark:bg-green-900/20">
          <CheckCircle2 className="h-3 w-3" />
          {t('suppliers.statusPaid', 'To‘langan')}
        </span>
      );
    }
    if (status === 'partial') {
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:border-amber-900/30 dark:bg-amber-900/20">
          {t('suppliers.statusPartial', 'Qisman to‘langan')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:border-red-900/30 dark:bg-red-900/20">
        {t('suppliers.statusUnpaid', 'To‘lanmagan')}
      </span>
    );
  };

  const columns: Column<ContractEntry>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (item) => <span className="font-medium">№{item.id}</span>,
    },
    {
      key: 'store_name',
      header: t('sales.store', 'Do‘kon'),
      render: (item) => (
        <div className="min-w-0">
          <p>{item.store_name || '—'}</p>
          {item.note && (
            <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-muted-foreground" title={item.note}>
              📝 {item.note}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('common.status', 'Holat'),
      render: (item) => statusBadge(item),
    },
    {
      key: 'quantity',
      header: t('suppliers.quantityTotal', 'Miqdor'),
      render: (item) => (
        <span className="tabular-nums">
          {(item.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)}{' '}
          {t('suppliers.pcs', 'dona')}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: t('common.total', 'Jami'),
      render: (item) => <span className="font-semibold tabular-nums">{formatCurrency(entryTotal(item) / 100)}</span>,
    },
    {
      key: 'total_paid',
      header: t('inventory.paid', 'To‘langan'),
      render: (item) => (
        <span className="tabular-nums text-green-600">{formatCurrency(entryPaid(item) / 100)}</span>
      ),
    },
    {
      key: 'debt',
      header: t('suppliers.debt', 'Qarzdorlik'),
      render: (item) => {
        const debtCents = toCents(item.debt);
        if (debtCents <= 0) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center rounded bg-[#ff6b00] px-2 py-0.5 text-xs font-semibold text-white">
            {formatCurrency(debtCents / 100)}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: t('common.date', 'Sana'),
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.created_at ? formatDate(item.created_at) : '—'}</span>
      ),
    },
    {
      key: 'full_name',
      header: t('suppliers.createdBy', 'Yaratdi'),
      render: (item) => <span className="text-sm">{item.full_name || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Holat bo'yicha filtr chiplari */}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => {
              setStatusFilter(chip.key);
              setPage(1);
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === chip.key
                ? 'bg-foreground text-background'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {chip.label}
            {chip.count !== null ? ` (${chip.count})` : ''}
          </button>
        ))}
      </div>

      <DataTable
        data={entries}
        columns={columns}
        loading={loading}
        onRowClick={(item) => void openEntryDetails(item)}
        emptyMessage={t('suppliers.noEntries', 'Bu ta’minotchidan kirimlar yo‘q')}
        pagination={{ page, limit, total, onPageChange: setPage }}
      />

      {/* ───────── Kirim tafsilotlari dialogi ───────── */}
      <Dialog open={!!viewingEntry} onOpenChange={(o) => !o && setViewingEntry(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('suppliers.entryDetails', 'Kirim tafsilotlari')} — №{viewingEntry?.id}
            </DialogTitle>
            <DialogDescription>
              {viewingEntry?.created_at ? formatDate(viewingEntry.created_at) : ''}
              {viewingEntry?.store_name ? ` · ${viewingEntry.store_name}` : ''}
              {viewingEntry?.full_name ? ` · ${viewingEntry.full_name}` : ''}
            </DialogDescription>
          </DialogHeader>

          {viewingEntry && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">{t('common.total', 'Jami')}</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(entryTotal(viewingEntry) / 100)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">{t('inventory.paid', 'To‘langan')}</p>
                  <p className="font-semibold tabular-nums text-green-600">
                    {formatCurrency(entryPaid(viewingEntry) / 100)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">{t('suppliers.debt', 'Qarzdorlik')}</p>
                  <p className={`font-semibold tabular-nums ${toCents(viewingEntry.debt) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {formatCurrency(toCents(viewingEntry.debt) / 100)}
                  </p>
                </div>
              </div>

              {/* Izoh (kirim yaratishda kiritilgan bo'lsa) */}
              {viewingEntry.note && (
                <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('purchaseSession.note', 'Izoh')}</p>
                  <p className="mt-1 whitespace-pre-wrap">{viewingEntry.note}</p>
                </div>
              )}

              {/* Mahsulotlar */}
              <div className="rounded-lg border border-border">
                <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  {t('products.title', 'Mahsulotlar')} ({viewingEntry.items?.length || 0})
                </div>
                <div className="max-h-56 divide-y divide-border/60 overflow-y-auto">
                  {(viewingEntry.items || []).map((item, idx) => (
                    <div key={item.id ?? idx} className="flex items-center justify-between gap-2 px-3 py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.product_name || `#${item.product}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku ? `SKU: ${item.sku} · ` : ''}
                          {formatCurrency(parseFloat(item.purchase_price || '0'))} × {item.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatCurrency(parseFloat(item.purchase_price || '0') * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* To'lovlar tarixi */}
              <div className="rounded-lg border border-border">
                <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  {t('suppliers.paymentsHistory', 'To‘lovlar tarixi')}
                </div>
                {loadingTransactions ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">{t('common.loading')}</p>
                ) : (
                  (() => {
                    const payments = entryTransactions.filter((tx) => tx.type === 'pay');
                    if (payments.length === 0) {
                      return (
                        <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                          {t('suppliers.noPayments', 'Hali to‘lov qilinmagan')}
                        </p>
                      );
                    }
                    return (
                      <div className="max-h-44 divide-y divide-border/60 overflow-y-auto">
                        {payments.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {tx.created_at ? formatDate(tx.created_at) : '—'}
                            </span>
                            <span className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 truncate text-xs">
                              {tx.payment_method === 'card' ? (
                                <>
                                  <CreditCard className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  {tx.bank_card_name || t('sales.card', 'Karta')}
                                </>
                              ) : (
                                <>
                                  <Banknote className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  {t('sales.cash', 'Naqd')}
                                </>
                              )}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-green-600">
                              {formatCurrency(Number(tx.amount) || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
