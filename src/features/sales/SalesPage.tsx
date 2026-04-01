import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { ScanBarcode, Trash2, DollarSign } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { salesService } from '../../services/salesService';
import { storeService } from '../../services/storeService';
import { productService } from '../../services/productService';
import type { Store, Product } from '../../types';
import { formatCurrency } from '../../utils';

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  total: number;
}

export function SalesPage() {
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [barcode, setBarcode] = useState('');

  const [storeId, setStoreId] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    loadData();
    barcodeInputRef.current?.focus();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [storesRes, productsRes] = await Promise.all([
        storeService.getAll(),
        productService.getAll({ limit: 100 }),
      ]);
      setStores(storesRes.data);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setStores([
        { id: '1', name: 'Main Store', is_warehouse: false, created_at: '' },
      ]);
      setProducts([
        { id: '1', name: 'Oil Filter', purchase_price: 15000, selling_price: 25000, category: 'Filters', supplier_id: '1', store_id: '1', sku: 'SKU-001', barcode: '123456789', description: '', quantity: 100, created_at: '', updated_at: '' },
        { id: '2', name: 'Brake Pads', purchase_price: 45000, selling_price: 75000, category: 'Brakes', supplier_id: '1', store_id: '1', sku: 'SKU-002', barcode: '987654321', description: '', quantity: 50, created_at: '', updated_at: '' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcode) {
      const product = products.find(p => p.barcode === barcode || p.sku === barcode);
      if (product) {
        addProduct(product);
      }
      setBarcode('');
    }
  };

  const addProduct = (product: Product) => {
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].total = newItems[existingIndex].selling_price * newItems[existingIndex].quantity;
      setItems(newItems);
    } else {
      setItems([...items, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        purchase_price: product.purchase_price,
        selling_price: product.selling_price,
        total: product.selling_price,
      }]);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].total = newItems[index].selling_price * quantity;
    setItems(newItems);
  };

  const updatePrice = (index: number, selling_price: number) => {
    const newItems = [...items];
    newItems[index].selling_price = selling_price;
    newItems[index].total = selling_price * newItems[index].quantity;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCost = items.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
  const totalPrice = items.reduce((sum, item) => sum + item.total, 0);
  const profit = totalPrice - totalCost;

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!storeId || items.length === 0) return;
    try {
      setSaving(true);
      await salesService.create({
        store_id: storeId,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
        })),
      });
      setItems([]);
    } catch (error) {
      console.error('Failed to create sale:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Point of Sale - Scan barcode to add products"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sale Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Store</Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Scan Barcode</Label>
                  <div className="relative">
                    <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={barcodeInputRef}
                      placeholder="Scan or enter barcode..."
                      value={barcode}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setBarcode(e.target.value)}
                      onKeyDown={handleBarcodeScan}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ScanBarcode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Scan a barcode to add products</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => updateQuantity(index, Number(e.target.value))}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.selling_price}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => updatePrice(index, Number(e.target.value))}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {items.length > 0 && (
              <CardFooter className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-4 w-full">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Price</p>
                    <p className="text-xl font-bold">{formatCurrency(totalPrice)}</p>
                  </div>
                  <div className="p-4 bg-green-100 rounded-lg">
                    <p className="text-sm text-muted-foreground">Profit</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(profit)}</p>
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {saving ? 'Processing...' : `Complete Sale - ${formatCurrency(totalPrice)}`}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}
