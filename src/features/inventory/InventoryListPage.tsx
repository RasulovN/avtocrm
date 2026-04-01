import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, FileText, Eye } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { inventoryService } from '../../services/inventoryService';
import { formatCurrency, formatDate } from '../../utils';
import type { Inventory } from '../../types';

export function InventoryListPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getAll();
      setInventory(res.data || []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      // Demo data
      setInventory([
        {
          id: '1',
          supplier_id: '1',
          store_id: '1',
          total: 500000,
          paid: 300000,
          debt: 200000,
          status: 'completed',
          created_at: new Date().toISOString(),
          items: []
        },
        {
          id: '2',
          supplier_id: '2',
          store_id: '1',
          total: 1200000,
          paid: 500000,
          debt: 700000,
          status: 'pending',
          created_at: new Date().toISOString(),
          items: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.title')}
        description={t('inventory.listDescription')}
      />

      <div className="flex justify-end">
        <Link to={`/${lang}/inventory/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('inventory.createIncomingStock')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('inventory.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('inventory.noData')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('suppliers.title')}</TableHead>
                  <TableHead>{t('stores.title')}</TableHead>
                  <TableHead>{t('common.total')}</TableHead>
                  <TableHead>{t('inventory.paidAmount')}</TableHead>
                  <TableHead>{t('suppliers.debt')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.supplier_id}</TableCell>
                    <TableCell>{item.store_id}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                    <TableCell>{formatCurrency(item.paid)}</TableCell>
                    <TableCell className={item.debt > 0 ? 'text-red-500' : ''}>
                      {formatCurrency(item.debt)}
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status === 'completed' ? t('common.completed') : t('common.pending')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
