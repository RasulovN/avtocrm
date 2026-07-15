import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { supplierService, type SupplierTransactionRecord, type SupplierStats } from '../../services/supplierService';
import { formatCurrency, formatDateShort } from '../../utils';
import { handleError } from '../../utils/errorHandler';

interface SupplierPaymentsTabProps {
  supplierId: string;
  stats: SupplierStats | null;
  refreshKey: number;
}

// HH:MM:SS ko'rinishida vaqt (ro'yxatda sana alohida ko'rsatiladi)
function formatTime(date: string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function SupplierPaymentsTab({ supplierId, stats, refreshKey }: SupplierPaymentsTabProps) {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<SupplierTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierService.getAllPayments(supplierId, { page, limit });
      setPayments(res.data);
      setTotal(res.total);
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Failed to load supplier payments' });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [supplierId, page, limit]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments, refreshKey]);

  // Kun bo'yicha guruhlash — har guruh sanasi ajratuvchi chiziq bilan ko'rsatiladi
  const groups = useMemo(() => {
    const byDay = new Map<string, SupplierTransactionRecord[]>();
    for (const payment of payments) {
      const day = payment.created_at ? formatDateShort(payment.created_at) : '—';
      const list = byDay.get(day) ?? [];
      list.push(payment);
      byDay.set(day, list);
    }
    return Array.from(byDay.entries());
  }, [payments]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const summaryCards = [
    {
      label: t('suppliers.purchasesSum', 'Kirimlar summasi'),
      value: Number(stats?.total_purchase_amount) || 0,
      accent: 'text-primary',
    },
    {
      label: t('suppliers.paymentsSum', 'To‘lovlar summasi'),
      value: Number(stats?.total_paid_amount) || 0,
      accent: 'text-primary',
    },
    {
      label: t('suppliers.debtSum', 'Qarz summasi'),
      value: Number(stats?.total_debt) || 0,
      accent: Number(stats?.total_debt) > 0 ? 'text-red-500' : 'text-green-600',
    },
    {
      label: t('suppliers.balance', 'Balans'),
      value: Number(stats?.balance) || 0,
      accent: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
      {/* To'lovlar ro'yxati */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              {t('suppliers.noPaymentsYet', 'Hali to‘lovlar yo‘q')}
            </p>
          </div>
        ) : (
          groups.map(([day, dayPayments]) => (
            <div key={day} className="space-y-2">
              {/* Sana ajratuvchisi */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-dashed border-border" />
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                  {day}
                </span>
                <div className="flex-1 border-t border-dashed border-border" />
              </div>

              {dayPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold tabular-nums text-primary">
                      {formatCurrency(Number(payment.amount) || 0)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      {payment.payment_method === 'card' ? (
                        <>
                          <CreditCard className="h-3.5 w-3.5 shrink-0" />
                          {payment.bank_card_name || t('sales.card', 'Karta')}
                        </>
                      ) : (
                        <>
                          <Banknote className="h-3.5 w-3.5 shrink-0" />
                          {t('sales.cash', 'Naqd')}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-muted-foreground">
                      {payment.created_at ? formatDateShort(payment.created_at) : '—'}
                      <span className="mx-1 text-border">|</span>
                      {formatTime(payment.created_at)}
                    </p>
                    {payment.entry ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('suppliers.entryNumber', 'Kirim')} №{payment.entry}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}

        {/* Pagination + sahifa hajmi */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-8 rounded-lg border border-border px-2.5 py-1 text-center text-sm font-medium">
                {page}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {t('suppliers.showPerPage', '{{count}} tadan ko‘rsatish', { count: n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* O'ng ustun: jamlanma kartalar */}
      <div className="space-y-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${card.accent}`}>
              {formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
