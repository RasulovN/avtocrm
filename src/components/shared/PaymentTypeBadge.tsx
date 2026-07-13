import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import type { SalePaymentType } from '../../types';

const VARIANTS: Record<SalePaymentType, 'success' | 'info' | 'warning' | 'danger'> = {
  cash: 'success',
  card: 'info',
  mixed: 'warning',
  debt: 'danger',
};

export function PaymentTypeBadge({ type }: { type?: SalePaymentType | null }) {
  const { t } = useTranslation();
  if (!type || !VARIANTS[type]) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <Badge variant={VARIANTS[type]}>{t(`payment.${type}`)}</Badge>;
}
