import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, FileText, Eye } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { salesService } from '../../services/salesService';
import { useAuthStore } from '../../app/store';
import { formatCurrency, formatDate } from '../../utils';
import type { Sale } from '../../types';

export function SalesListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id;
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
      const scopedSales = isAdmin ? (res.data || []) : (res.data || []).filter((sale) => sale.store_id === userStoreId);
      setSales(scopedSales);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load sales:', error);
      // Demo data
      const fallbackSales: Sale[] = [
        {
          id: '1',
          store_id: '1',
          total_cost: 150000,
          total_price: 250000,
          profit: 100000,
          payment_method: 'cash',
          created_at: new Date().toISOString(),
          items: []
        },
        {
          id: '2',
          store_id: '1',
          total_cost: 110000,
          total_price: 180000,
          profit: 70000,
          payment_method: 'card',
          created_at: new Date().toISOString(),
          items: []
        },
        {
          id: '3',
          store_id: '2',
          total_cost: 270000,
          total_price: 450000,
          profit: 180000,
          payment_method: 'cash',
          created_at: new Date().toISOString(),
          items: []
        }
      ];
      setSales(isAdmin ? fallbackSales : fallbackSales.filter((sale) => sale.store_id === userStoreId));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('sales.title')}
        description={t('sales.listDescription')}
      />

      <div className="flex justify-end">
        <Link to={`/${lang}/sales/new`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('sales.newSale')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sales.history')}</CardTitle>
        </CardHeader>
        <CardContent>
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
                        <p className="font-semibold text-foreground">{t('stores.title')}: {item.store_id}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                        item.payment_method === 'cash' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.payment_method === 'cash' ? t('sales.cash') : t('sales.card')}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">{t('common.total')}</p>
                        <p className="mt-1 font-semibold">{formatCurrency(item.total_price)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">{t('sales.profit')}</p>
                        <p className="mt-1 font-semibold text-green-600">{formatCurrency(item.profit)}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button variant="outline" className="w-full">
                        <Eye className="mr-2 h-4 w-4" />
                        {t('common.view')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('stores.title')}</TableHead>
                      <TableHead>{t('common.total')}</TableHead>
                      <TableHead>{t('sales.profit')}</TableHead>
                      <TableHead>{t('sales.paymentMethod')}</TableHead>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.store_id}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.total_price)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(item.profit)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.payment_method === 'cash' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.payment_method === 'cash' ? t('sales.cash') : t('sales.card')}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
