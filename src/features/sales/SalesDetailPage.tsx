import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User, ShoppingCart, CreditCard, Calendar, Tag, DollarSign } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { salesService } from '../../services/salesService';
import { formatCurrency, formatDate } from '../../utils';
import type { Sale } from '../../types';

export function SalesDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const saleId = params.id;
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSale = async () => {
      if (!saleId) {
        setSale(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await salesService.getById(saleId);
        setSale(res);
      } catch (error) {
        console.error('Failed to load sale details:', error);
        setSale(null);
      } finally {
        setLoading(false);
      }
    };

    loadSale();
  }, [saleId]);

  const getStatusBadge = (status: string) => {
    const styles = {
      partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    const labels = {
      partial: t('common.pending'),
      paid: t('sales.paid'),
      completed: t('common.completed'),
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.paid}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('sales.saleDetails')} description={t('sales.receiptDescription')} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('sales.saleDetails')} description={t('sales.receiptDescription')} />
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-muted-foreground text-lg">{t('common.noData')}</div>
          <Link to={`/${lang}/sales`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('sales.saleDetails')} description={t('sales.receiptDescription')} />

      <div className="flex justify-between">
        <Link to={`/${lang}/sales`} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              Mahsulotlar
            </h3>
            <div className="space-y-3">
              {sale.items?.length ? (
                sale.items.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">Mahsulot #{item.product}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(parseFloat(item.unit_price))}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatCurrency(parseFloat(item.total_price))}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">{t('common.noData')}</p>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Jami</span>
                <span>{formatCurrency(parseFloat(sale.total_amount) + (sale.discount_amount ? parseFloat(sale.discount_amount) : 0))}</span>
              </div>
              {sale.discount_amount && parseFloat(sale.discount_amount) > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Chegirma ({sale.discount_type === 'p' ? `${sale.discount_value}%` : ''})</span>
                  <span>-{formatCurrency(parseFloat(sale.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-gray-700">
                <span>Jami to'lov</span>
                <span className="text-green-600">{formatCurrency(parseFloat(sale.total_amount))}</span>
              </div>
            </div>
          </div>

          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5" />
              To'lovlar
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-muted-foreground mb-1">To'langan</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(parseFloat(sale.paid_amount))}</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm text-muted-foreground mb-1">Qarz</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(sale.debt == null ? 0 : sale.debt)}</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-muted-foreground mb-1">Holat</p>
                <div className="mt-1">{getStatusBadge(sale.status)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <User className="h-5 w-5" />
              Mijoz
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{sale.customer_name || sale.customer}</p>
                  <p className="text-sm text-muted-foreground">Mijoz</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5" />
              Sotuvchi
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-medium">{sale.seller_name || sale.seller}</p>
                  <p className="text-sm text-muted-foreground">Sotuvchi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5" />
              Chegirma
            </h3>
            {sale.discount_amount && parseFloat(sale.discount_amount) > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <span className="text-sm text-muted-foreground">Turi</span>
                  <span className="font-medium">{sale.discount_type === 'p' ? 'Foiz (%)' : "So'm"}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <span className="text-sm text-muted-foreground">Qiymati</span>
                  <span className="font-medium">{sale.discount_type === 'p' ? sale.discount_value : formatCurrency(parseFloat(sale.discount_value || '0'))}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-100 dark:bg-red-900/40">
                  <span className="text-sm font-medium">Chegirma summasi</span>
                  <span className="font-bold text-red-600">-{formatCurrency(parseFloat(sale.discount_amount))}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Chegirmaqo'llanmagan</p>
            )}
          </div>

          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5" />
              Sana
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{formatDate(sale.created_at)}</p>
                <p className="text-sm text-muted-foreground">Sotuv vaqti</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}