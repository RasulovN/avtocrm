import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Plus, FileText, Eye, Printer } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';
import { supplierService } from '../../services/supplierService';
import { formatCurrency, formatDate } from '../../utils';
import type { InventoryItem } from '../../types';
import { BarcodePrintAll } from '../../components/ui/BarcodePrint';

interface DisplayInventory {
  id: string;
  supplier_id: string;
  supplier_name: string;
  store_id: string;
  store_name: string;
  total: number;
  paid: number;
  debt: number;
  status: string;
  created_at: string;
  items: InventoryItem[];
  full_name: string;
}

type DisplayInventoryRow = DisplayInventory & { rowNumber: number };

export function InventoryListPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const [inventory, setInventory] = useState<DisplayInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInventory, setSelectedInventory] = useState<DisplayInventory | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [barcodeItems, setBarcodeItems] = useState<InventoryItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const entries = await inventoryService.getEntries();

      const productCache = new Map<string, { name: string; sku: string; barcode: string; shtrix_code: string }>();

      const fetchProductDetails = async (productId: number) => {
        const key = String(productId);
        if (productCache.has(key)) return productCache.get(key)!;
        try {
          const product = await productService.getById(key);
          const shtrixCode = product.shtrix_code || product.barcode || '';
          const data = {
            name: product.name || key,
            sku: product.sku || '',
            barcode: product.barcode || '',
            shtrix_code: shtrixCode
          };
          productCache.set(key, data);
          return data;
        } catch {
          const data = { name: key, sku: '', barcode: '', shtrix_code: '' };
          productCache.set(key, data);
          return data;
        }
      };

      const mapped: DisplayInventory[] = await Promise.all(
        entries.map(async (entry) => {
          const items: InventoryItem[] = await Promise.all(
            entry.items.map(async (item) => {
              const prod = await fetchProductDetails(item.product);
              const shtrixCode = item.shtrix_code || item.barcode || prod.shtrix_code || '';
              return {
                id: String(item.id),
                product_id: String(item.product),
                product_name: prod.name,
                product_sku: prod.sku,
                product_barcode: item.barcode || prod.barcode,
                shtrix_code: shtrixCode,
                quantity: item.quantity,
                purchase_price: parseFloat(item.purchase_price),
                selling_price: item.selling_price ? parseFloat(item.selling_price) : undefined,
                total: item.quantity * parseFloat(item.purchase_price)
              };
            })
          );
          const total = items.reduce((sum, i) => sum + i.total, 0);
          return {
            id: String(entry.id),
            supplier_id: String(entry.supplier),
            supplier_name: entry.supplier_name || String(entry.supplier),
            store_id: String(entry.store),
            store_name: entry.store_name || String(entry.store),
            total,
            paid: entry.paid_amount ? parseFloat(entry.paid_amount) : 0,
            debt: entry.debt ?? 0,
            status: 'completed',
            created_at: new Date().toISOString(),
            items,
            full_name: entry.full_name
          };
        })
      );
      setInventory(mapped);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShowDetails = (item: DisplayInventory) => {
    setSelectedInventory(item);
    setShowDetails(true);
  };

  const handlePrintBarcodes = (item: DisplayInventory) => {
    setBarcodeItems(item.items || []);
    setShowBarcodeDialog(true);
  };

  const handlePayDebt = () => {
    if (!selectedInventory || !selectedInventory.debt) return;
    setPaymentAmount(String(selectedInventory.debt));
    setShowPaymentDialog(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedInventory || !paymentAmount) return;
    try {
      setPaying(true);
      await supplierService.createPayment({
        supplier: parseInt(selectedInventory.supplier_id),
        entry: parseInt(selectedInventory.id),
        amount: paymentAmount,
      });
      setShowPaymentDialog(false);
      setPaymentAmount('');
      loadData();
    } catch (error) {
      console.error('Failed to create payment:', error);
    } finally {
      setPaying(false);
    }
  };

  const inventoryRows: DisplayInventoryRow[] = inventory.map((item, index) => ({
    ...item,
    rowNumber: index + 1,
  }));

  const columns: Column<DisplayInventoryRow>[] = [
    {
      key: 'rowNumber',
      header: '#',
      render: (item) => item.rowNumber,
    },
    {
      key: 'supplier_name',
      header: t('suppliers.title'),
      render: (item) => item.supplier_name || item.supplier_id,
    },
    {
      key: 'store_name',
      header: t('stores.title'),
      render: (item) => item.store_name || item.store_id,
    },
    {
      key: 'total',
      header: t('common.total'),
      className: 'font-medium',
      render: (item) => formatCurrency(item.total),
    },
    {
      key: 'paid',
      header: t('inventory.paidAmount'),
      render: (item) => formatCurrency(item.paid),
    },
    {
      key: 'debt',
      header: t('suppliers.debt'),
      render: (item) => (
        <span className={item.debt > 0 ? 'text-red-500' : ''}>
          {formatCurrency(item.debt)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: t('common.date'),
      render: (item) => formatDate(item.created_at),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'completed' ? 'bg-green-100 text-green-800' :
            item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
          }`}>
          {item.status === 'completed' ? t('common.completed') :
            item.status === 'pending' ? t('common.pending') : t('common.cancelled')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleShowDetails(item)}>
            <Eye className="h-4 w-4" />
          </Button>
          {item.items && item.items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => handlePrintBarcodes(item)} title="Print Barcodes">
              <Printer className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title={t('inventory.title')}
          description={t('inventory.listDescription')}
        />
        <Link to={`/${lang}/inventory/new`}>
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('inventory.createIncomingStock')}
          </Button>
        </Link>
      </div>

      <div>
        <h2 className="text-base font-semibold">{t('inventory.history')}</h2>
      </div>

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
        <>
          <div className="space-y-3 md:hidden">
            {inventory.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold">{item.supplier_name || item.supplier_id}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.store_name || item.store_id}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {item.status === 'completed' ? t('common.completed') :
                        item.status === 'pending' ? t('common.pending') : t('common.cancelled')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{t('common.total')}</p>
                      <p className="mt-1 font-semibold">{formatCurrency(item.total)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{t('inventory.paidAmount')}</p>
                      <p className="mt-1 font-semibold">{formatCurrency(item.paid)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{t('suppliers.debt')}</p>
                      <p className={`mt-1 font-semibold ${item.debt > 0 ? 'text-red-500' : ''}`}>{formatCurrency(item.debt)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                      <p className="mt-1 font-semibold">{formatDate(item.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="flex-1 min-w-30" onClick={() => handleShowDetails(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t('common.actions')}
                    </Button>
                    {item.items && item.items.length > 0 && (
                      <Button variant="outline" size="sm" className="flex-1 min-w-30" onClick={() => handlePrintBarcodes(item)}>
                        <Printer className="mr-2 h-4 w-4" />
                        {t('products.printBarcode')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={inventoryRows}
              columns={columns}
              loading={loading}
              emptyMessage={t('inventory.noData')}
              loadingMessage={t('common.loading')}
              minWidth="980px"
            />
          </div>
        </>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl pb-6">
          <DialogHeader>
            <DialogTitle>Inventory Details</DialogTitle>
            <DialogDescription>
              {formatDate(selectedInventory?.created_at || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedInventory && (
            <div className="space-y-4 px-1 pb-1">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
                  {selectedInventory.debt > 0 && (
                    <Button variant="outline" size="sm" className="ml-3" onClick={handlePayDebt}>
                      To'lash
                    </Button>
                  )}
                </div>
              </div>

              {selectedInventory.items && selectedInventory.items.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-sm font-semibold">Products</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => handlePrintBarcodes(selectedInventory)}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      {t('products.printBarcode')}
                    </Button>
                  </div>
                  <div className="space-y-3 md:hidden">
                    {selectedInventory.items.map((item, idx) => (
                      <Card key={idx}>
                        <CardContent className="space-y-3 p-4">
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="mt-1 text-xs font-mono text-muted-foreground">{item.product_sku}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">Barcode</p>
                              <p className="mt-1 break-all font-mono text-xs">{item.product_barcode || '-'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">Qty</p>
                              <p className="mt-1 font-semibold">{item.quantity}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">Price</p>
                              <p className="mt-1 font-semibold">{formatCurrency(item.purchase_price)}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="mt-1 font-semibold">{formatCurrency(item.total)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className='pb-6'>
          <DialogHeader>
            <DialogTitle>To'lov</DialogTitle>
            <DialogDescription>
              Taminotchiga qarz to'lash
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Qarz summasi</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(selectedInventory?.debt || 0)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To'lov summasi</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                placeholder="Summa kiriting"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)}>
                Bekor qilish
              </Button>
              <Button className="flex-1" onClick={handleSubmitPayment} disabled={paying || !paymentAmount}>
                {paying ? 'Yuklanmoqda...' : 'To\'lash'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
