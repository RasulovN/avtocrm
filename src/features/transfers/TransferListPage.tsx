import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, FileText, ArrowRight, Eye } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { transferService } from '../../services/transferService';
import { formatDate } from '../../utils';
import type { Transfer } from '../../types';

export function TransferListPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await transferService.getAll();
      setTransfers(res.data || []);
    } catch (error) {
      console.error('Failed to load transfers:', error);
      // Demo data
      setTransfers([
        {
          id: '1',
          from_store_id: '1',
          to_store_id: '2',
          status: 'accepted',
          created_at: new Date().toISOString(),
          items: []
        },
        {
          id: '2',
          from_store_id: '2',
          to_store_id: '1',
          status: 'pending',
          created_at: new Date().toISOString(),
          items: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStoreName = (id: string) => {
    return id === '1' ? 'Omborxona' : id === '2' ? 'Do\'kon 1' : id;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('transfers.title')}
        description={t('transfers.listDescription')}
      />

      <div className="flex justify-end">
        <Link to={`/${lang}/transfers/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('transfers.createTransfer')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('transfers.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('transfers.noData')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('transfers.fromStore')}</TableHead>
                  <TableHead></TableHead>
                  <TableHead>{t('transfers.toStore')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{getStoreName(item.from_store_id)}</TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4" />
                    </TableCell>
                    <TableCell>{getStoreName(item.to_store_id)}</TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status === 'accepted' ? t('common.accepted') : t('common.pending')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
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
