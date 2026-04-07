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
        <Link to={`/${lang}/transfers/new`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
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
            <>
              <div className="space-y-3 md:hidden">
                {transfers.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">#{index + 1}</p>
                        <p className="font-semibold text-foreground">{item.from_store_name || item.from_store_id}</p>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="h-4 w-4 shrink-0" />
                          <span>{item.to_store_name || item.to_store_id}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${getStatusBadge(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                        <p className="mt-1 font-medium">{formatDate(item.created_at)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Products</p>
                        <p className="mt-1 font-medium">{item.items?.length || 0}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleShowDetails(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t('common.view')}
                      </Button>
                      {item.items && item.items.length > 0 && (
                        <Button variant="outline" className="flex-1" onClick={() => handlePrintBarcodes(item)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
            <DialogDescription>
              {formatDate(selectedTransfer?.created_at || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">From:</span>
                  <p className="mt-1 font-medium">{selectedTransfer.from_store_name || selectedTransfer.from_store_id}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">To:</span>
                  <p className="mt-1 font-medium">{selectedTransfer.to_store_name || selectedTransfer.to_store_id}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                  <span className="text-muted-foreground">Status:</span>
                  <p className="mt-1 font-medium">{getStatusLabel(selectedTransfer.status)}</p>
                </div>
              </div>
              
              {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                <>
                  <div className="space-y-3 md:hidden">
                    {selectedTransfer.items.map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-border p-3">
                        <p className="font-medium text-foreground">{item.product_name}</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">SKU</p>
                            <p className="font-mono text-xs">{item.product_sku || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Barcode</p>
                            <p className="font-mono text-xs break-all">{item.product_barcode || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Qty</p>
                            <p className="font-medium">{item.quantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden rounded border md:block">
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
                </>
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
