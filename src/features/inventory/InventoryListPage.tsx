import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, FileText, Eye, Printer } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { inventoryService } from '../../services/inventoryService';
import { formatCurrency, formatDate } from '../../utils';
import type { Inventory } from '../../types';
import { BarcodePrintAll } from '../../components/ui/BarcodePrint';

export function InventoryListPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [barcodeItems, setBarcodeItems] = useState<Inventory['items']>([]);

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
      setInventory([
        {
          id: '1',
          supplier_id: '1',
          supplier_name: 'Supplier 1',
          store_id: '1',
          store_name: 'Store 1',
          total: 500000,
          paid: 300000,
          debt: 200000,
          status: 'completed',
          created_at: new Date().toISOString(),
          items: [
            { id: '1', product_id: 'p1', product_name: 'Oil Filter', product_sku: 'SKU001', product_barcode: '1234567890123', quantity: 5, purchase_price: 15000, total: 75000 },
            { id: '2', product_id: 'p2', product_name: 'Air Filter', product_sku: 'SKU002', product_barcode: '1234567890124', quantity: 3, purchase_price: 10000, total: 30000 },
          ]
        },
        {
          id: '2',
          supplier_id: '2',
          supplier_name: 'Supplier 2',
          store_id: '1',
          store_name: 'Store 1',
          total: 1200000,
          paid: 500000,
          debt: 700000,
          status: 'pending',
          created_at: new Date().toISOString(),
          items: [
            { id: '3', product_id: 'p3', product_name: 'Brake Pad', product_sku: 'SKU003', product_barcode: '1234567890125', quantity: 10, purchase_price: 25000, total: 250000 },
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (item: Inventory) => {
    setSelectedInventory(item);
    setShowDetails(true);
  };

  const handlePrintBarcodes = (item: Inventory) => {
    setBarcodeItems(item.items || []);
    setShowBarcodeDialog(true);
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
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.supplier_name || item.supplier_id}</TableCell>
                    <TableCell>{item.store_name || item.store_id}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                    <TableCell>{formatCurrency(item.paid)}</TableCell>
                    <TableCell className={item.debt > 0 ? 'text-red-500' : ''}>
                      {formatCurrency(item.debt)}
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status === 'completed' ? t('common.completed') : 
                         item.status === 'pending' ? t('common.pending') : t('common.cancelled')}
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
            <DialogTitle>Inventory Details</DialogTitle>
            <DialogDescription>
              {formatDate(selectedInventory?.created_at || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedInventory && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <span className="ml-2 font-medium">{selectedInventory.supplier_name || selectedInventory.supplier_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Store:</span>
                  <span className="ml-2 font-medium">{selectedInventory.store_name || selectedInventory.store_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium">{selectedInventory.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2 font-medium">{formatCurrency(selectedInventory.total)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="ml-2 font-medium">{formatCurrency(selectedInventory.paid)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Debt:</span>
                  <span className="ml-2 font-medium text-red-500">{formatCurrency(selectedInventory.debt)}</span>
                </div>
              </div>
              
              {selectedInventory.items && selectedInventory.items.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Products</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintBarcodes(selectedInventory)}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      {t('products.printBarcode')}
                    </Button>
                  </div>
                  <div className="border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInventory.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell className="font-mono text-xs">{item.product_sku}</TableCell>
                          <TableCell className="font-mono text-xs">{item.product_barcode || '-'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.purchase_price)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
              Product barcodes for this inventory
            </DialogDescription>
          </DialogHeader>
          <BarcodePrintAll items={barcodeItems} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
