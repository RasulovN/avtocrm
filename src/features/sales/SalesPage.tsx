import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { ScanBarcode, Trash2, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { storeService } from '../../services/storeService';
import { productService } from '../../services/productService';
import type { Store, Product } from '../../types';
import { formatCurrency } from '../../utils';

// Cart item interface for POS
interface CartItem {
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
  const [_loading, _setLoading] = useState(false);
  const [_saving, _setSaving] = useState(false);
  const [barcode, setBarcode] = useState('');

  const [storeId, setStoreId] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    loadData();
    barcodeInputRef.current?.focus();
  }, []);

  const loadData = async () => {
    try {
      _setLoading(true);
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
      _setLoading(false);
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
        purchase_price: product.purchase_price ?? 0,
        selling_price: product.selling_price ?? 0,
        total: product.selling_price ?? 0,
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


  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalPrice = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight dark:text-white">Sotuvlar (POS)</h2>
            <p className="text-sm text-muted-foreground dark:text-gray-400">Panel prodaj</p>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2 lg:gap-3 h-[calc(100vh-11rem)]">
          {/* Katalog (chap panel) */}
          <div className="col-span-5 flex flex-col space-y-2">
            <div className="bg-card border border-gray-900 rounded-lg flex-1 flex flex-col p-3">
              <div className="mb-3">
                <h4 className="text-base font-semibold flex items-center gap-2 dark:text-white mb-2">
                  Katalog tovarov
                </h4>
                <div className="relative py-1">
                  <ScanBarcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground dark:text-gray-400" />
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Poisk: nomi, artikul, shtrixkod"
                    value={barcode}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setBarcode(e.target.value)}
                    onKeyDown={handleBarcodeScan}
                    className="pl-9 h-9 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger className="w-[150px] h-8 dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="Do'kon" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {products.map((product) => (
                  <button
                    key={product.id}
                    className="w-full text-left rounded-lg p-2.5 border border-gray-900 hover:bg-accent dark:hover:bg-gray-900 transition-colors"
                    onClick={() => addProduct(product)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium dark:text-white">{product.name}</div>
                        <div className="text-xs text-muted-foreground dark:text-gray-400">{product.sku}</div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="font-bold dark:text-white">{formatCurrency(product.selling_price ?? 0)}</div>
                        <div className="flex items-center justify-end">
                          <span className="inline-flex items-center rounded bg-primary/10 dark:bg-gray-600 px-1.5 py-0.5 text-xs font-medium dark:text-gray-200">
                            {product.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Chek (o'rta panel) */}
          <div className="col-span-4 flex flex-col space-y-2">
            <div className="bg-card border border-gray-900 rounded-lg flex-1 flex flex-col">
              <div className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold flex items-center gap-2 dark:text-white">
                    <DollarSign className="h-4 w-4" /> Chek
                    <span className="inline-flex items-center rounded bg-secondary dark:bg-gray-800 px-1.5 py-0.5 text-xs font-medium dark:text-gray-200 ml-1">
                      {items.length}
                    </span>
                  </h4>
                  <Button type="button" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-7 px-2 text-sm" onClick={() => setItems([])}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Tozalash
                  </Button>
                </div>
              </div>
              <div className="px-3 flex-1 overflow-y-auto space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-gray-400">
                    <ScanBarcode className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Shtrixkod skanerlang</p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={item.product_id} className="rounded-lg p-2.5 bg-muted/50 dark:bg-gray-900 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1">
                          <div className="font-medium dark:text-white text-sm">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground dark:text-gray-400">{products.find(p => p.id === item.product_id)?.sku}</div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeItem(index)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        <div>
                          <div className="text-muted-foreground dark:text-gray-400 mb-1">Soni</div>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => updateQuantity(index, Number(e.target.value))}
                            className="h-7 text-center text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <div className="text-muted-foreground dark:text-gray-400 mb-1">Narx</div>
                          <div className="h-7 flex items-center justify-center bg-muted dark:bg-gray-600 rounded text-xs dark:text-gray-200">
                            {formatCurrency(item.selling_price)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground dark:text-gray-400 mb-1">Jami</div>
                          <div className="h-7 flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded text-xs font-semibold text-green-700 dark:text-green-400">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 pt-2 space-y-1.5 bg-muted/30 dark:bg-gray-900/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-gray-400">Tovarlar:</span>
                  <span className="font-medium dark:text-gray-200">{items.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-gray-400">Summa:</span>
                  <span className="font-medium dark:text-gray-200">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t dark:border-gray-600">
                  <span className="font-semibold dark:text-white">JAMI:</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Oplata (o'ng panel) */}
          <div className="col-span-3 flex flex-col space-y-2">
            <div className="bg-card border border-gray-900 rounded-lg flex-1 flex flex-col">
              <div className="p-3 pb-2">
                <h4 className="text-base font-semibold dark:text-white">To'lov</h4>
              </div>
              <div className="px-3 flex-1 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground dark:text-gray-400">Tezkor to'lov</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button type="button" variant="outline" className="h-10 text-xs dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900">Naqd</Button>
                    <Button type="button" variant="outline" className="h-10 text-xs dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900">Karta</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs dark:text-gray-300">Naqd</Label>
                    <Input type="number" min="0" placeholder="0" className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white" />
                  </div>
                  <div>
                    <Label className="text-xs dark:text-gray-300">Karta</Label>
                    <Input type="number" min="0" placeholder="0" className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white" />
                  </div>
                  <div>
                    <Label className="text-xs dark:text-gray-300">Chgirma</Label>
                    <Input type="number" min="0" placeholder="0" className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white" />
                  </div>
                </div>
                <div className="rounded-lg p-2.5 bg-muted/50 dark:bg-gray-900 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">To'lanadi:</span>
                    <span className="font-bold dark:text-white">{formatCurrency(totalPrice)}</span>
                  </div>
                   <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">Qarz:</span>
                    <span className="font-bold dark:text-white">{formatCurrency(totalPrice)}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold dark:bg-green-600 dark:hover:bg-green-700" disabled={_saving}>
                  {_saving ? 'Yuklanmoqda...' : `Sotuvni yakunlash — ${formatCurrency(totalPrice)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
