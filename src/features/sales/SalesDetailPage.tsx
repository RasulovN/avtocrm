import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('sales.saleDetails')}
        description={t('sales.receiptDescription')}
      />

      <div className="flex justify-between">
        <Link to={`/${lang}/sales`} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sales.saleInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : !sale ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.noData')}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t('stores.title')}</p>
                  <p className="mt-1 font-semibold">{sale.store_name || sale.store}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t('users.seller')}</p>
                  <p className="mt-1 font-semibold">{sale.seller_name || sale.seller}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t('customers.title')}</p>
                  <p className="mt-1 font-semibold">{sale.customer_name || sale.customer}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t('common.status')}</p>
                  <p className="mt-1 font-semibold">
                    {sale.status === 'partial' ? t('common.pending') : (sale.status === 'paid' ? t('sales.paid') : t('common.completed'))}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t('common.total')}</p>
                  <p className="mt-1 font-semibold">{formatCurrency(parseFloat(sale.total_amount))}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t('sales.paid')}</p>
                  <p className="mt-1 font-semibold text-green-600">{formatCurrency(parseFloat(sale.paid_amount))}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t('inventory.debt')}</p>
                  <p className="mt-1 font-semibold text-amber-600">{formatCurrency(sale.debt == null ? 0 : sale.debt)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                  <p className="mt-1 font-semibold">{formatDate(sale.created_at)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">{t('sales.products')}</h3>
                </div>
                <div className="p-4">
                  {sale.items?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>{t('sales.products')}</TableHead>
                          <TableHead>{t('sales.quantity')}</TableHead>
                          <TableHead>{t('sales.sellingPrice')}</TableHead>
                          <TableHead>{t('common.total')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale.items.map((saleItem, index) => (
                          <TableRow key={saleItem.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>#{saleItem.product}</TableCell>
                            <TableCell>{saleItem.quantity}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(saleItem.unit_price))}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(saleItem.total_price))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground">{t('common.noData')}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
