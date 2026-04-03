import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, FileText, ArrowRight, Eye, Printer } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/Dialog';
import { transferService } from '../../../services/transferService';
import { formatDate } from '../../../utils';
import type { Transfer } from '../../../types';
import { BarcodePrintAll } from '../../../components/ui/BarcodePrint';

export function TransferListPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [barcodeItems, setBarcodeItems] = useState<Transfer['items']>([]);

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
      setTransfers([
        {
          id: '1',
          from_store_id: '1',
          from_store_name: 'Omborxona',
          to_store_id: '2',
          to_store_name: 'Do\'kon 1',
          status: 'accepted',
          created_at: new Date().toISOString(),
          items: [
            { id: 't1', product_id: 'p1', product_name: 'Oil Filter', product_sku: 'SKU001', product_barcode: '1234567890123', quantity: 5 },
            { id: 't2', product_id: 'p2', product_name: 'Air Filter', product_sku: 'SKU002', product_barcode: '1234567890124', quantity: 3 },
          ]
        },
        {
          id: '2',
          from_store_id: '2',
          from_store_name: 'Do\'kon 1',
          to_store_id: '1',
          to_store_name: 'Omborxona',
          status: 'pending',
          created_at: new Date().toISOString(),
          items: [
            { id: 't3', product_id: 'p3', product_name: 'Brake Pad', product_sku: 'SKU003', product_barcode: '1234567890125', quantity: 10 },
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (item: Transfer) => {
    setSelectedTransfer(item);
    setShowDetails(true);
  };

  const handlePrintBarcodes = (item: Transfer) => {
    setBarcodeItems(item.items || []);
    setShowBarcodeDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted':
        return t('common.accepted');
      case 'rejected':
        return t('common.rejected');
      default:
        return t('common.pending');
    }
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
                    <TableCell>{item.from_store_name || item.from_store_id}</TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4" />
                    </TableCell>
                    <TableCell>{item.to_store_name || item.to_store_id}</TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleShowDetails(item)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.items && item.items.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => handlePrintBarcodes(item)} title="Print Barcodes">
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
            <DialogDescription>
              {formatDate(selectedTransfer?.created_at || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">From:</span>
                  <span className="ml-2 font-medium">{selectedTransfer.from_store_name || selectedTransfer.from_store_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">To:</span>
                  <span className="ml-2 font-medium">{selectedTransfer.to_store_name || selectedTransfer.to_store_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium">{getStatusLabel(selectedTransfer.status)}</span>
                </div>
              </div>
              
              {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                <div className="border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransfer.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell className="font-mono text-xs">{item.product_sku || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{item.product_barcode || '-'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Print Dialog */}
      <Dialog open={showBarcodeDialog} onOpenChange={setShowBarcodeDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Print Barcodes</DialogTitle>
            <DialogDescription>
              Product barcodes for this transfer
            </DialogDescription>
          </DialogHeader>
          <BarcodePrintAll items={barcodeItems} />
        </DialogContent>
      </Dialog>
    </div>
  );
}