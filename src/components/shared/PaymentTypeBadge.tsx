import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import type { SalePaymentType, SalePayment } from '../../types';

const VARIANTS: Record<SalePaymentType, 'success' | 'info' | 'warning' | 'danger'> = {
  cash: 'success',
  card: 'info',
  mixed: 'warning',
  debt: 'danger',
};

/**
 * To'lov turi belgisi. `payments` berilsa umumiy "Karta"/"Naqd + karta" o'rniga
 * haqiqiy tarkib chiqadi: Naqd / Humo / Uzcard ... — har biri alohida kichik
 * badge bo'lib, tor ekranda ham buzilmasdan (flex-wrap) joylashadi.
 */
export function PaymentTypeBadge({
  type,
  payments,
}: {
  type?: SalePaymentType | null;
  payments?: SalePayment[] | null;
}) {
  const { t } = useTranslation();
  if (!type || !VARIANTS[type]) {
    return <span className="text-muted-foreground">—</span>;
  }

  // To'lov qismlari: naqd bitta, har bir karta (Humo/Uzcard/...) o'z nomi bilan
  const parts: { key: string; label: string; variant: 'success' | 'info' }[] = [];
  const income = (payments || []).filter((p) => !p.is_refund);
  if (income.some((p) => p.type === 'cash')) {
    parts.push({ key: 'cash', label: t('payment.cash', 'Naqd'), variant: 'success' });
  }
  const seenCards = new Set<string>();
  for (const p of income) {
    if (p.type !== 'card') continue;
    const name = p.bank_card_name || t('payment.card', 'Karta');
    if (seenCards.has(name)) continue;
    seenCards.add(name);
    parts.push({ key: `card-${name}`, label: name, variant: 'info' });
  }

  // Qismlar yo'q (to'liq qarz yoki eski yozuv) — avvalgi umumiy belgi
  if (parts.length === 0) {
    return <Badge variant={VARIANTS[type]}>{t(`payment.${type}`)}</Badge>;
  }

  return (
    <div className="flex max-w-44 flex-wrap items-center gap-1">
      {parts.map((part) => (
        <Badge key={part.key} variant={part.variant} className="whitespace-nowrap">
          {part.label}
        </Badge>
      ))}
    </div>
  );
}
