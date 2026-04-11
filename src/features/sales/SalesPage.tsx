import { useState, useEffect, useMemo, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import QrScanner from 'react-qr-barcode-scanner';
import { ScanBarcode, Trash2, DollarSign, Search, X, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { storeService } from '../../services/storeService';
import { productService } from '../../services/productService';
import { salesService } from '../../services/salesService';
import { customerApiService } from '../../services/customerService';
import { useAuthStore } from '../../app/store';
import { useCategories } from '../../context/CategoryContext';
import { useProducts } from '../../context/ProductContext';
import type { Store, Product } from '../../types';
import { formatCurrency } from '../../utils';

// Cart item interface for POS
interface CartItem {
  product_id: string;
  product_name: string;
  store_id: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  total: number;
}

export function SalesPage() {
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id || '';
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState(false);
  const [barcode, setBarcode] = useState('');
  const { categories } = useCategories();
  const { products: allProducts, loading: productsLoading } = useProducts();

  const [storeId, setStoreId] = useState(userStoreId);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);

  // Payment states
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [activePayment, setActivePayment] = useState<'cash' | 'card' | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [customers, setCustomers] = useState<{ id: number; full_name: string; phone_number: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeProducts = useMemo(() => {
    if (productsLoading) return [];
    const filtered = isAdmin ? allProducts : allProducts.filter((p) => p.store_id === userStoreId);
    return filtered;
  }, [allProducts, isAdmin, userStoreId, productsLoading]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const totalWithDiscount = subtotal - discount;
  const totalPaid = useMemo(() => cashAmount + cardAmount, [cashAmount, cardAmount]);
  const change = useMemo(() => Math.max(0, totalPaid - totalWithDiscount), [totalPaid, totalWithDiscount]);
  const debt = useMemo(() => Math.max(0, totalWithDiscount - totalPaid), [totalPaid, totalWithDiscount]);
  const filteredProducts = useMemo(() => {
    let result = safeProducts;
    if (categoryFilter) {
      result = result.filter(p => String(p.category) === categoryFilter);
    }
    return result;
  }, [safeProducts, categoryFilter]);

  const loadData = async () => {
    try {
      const [storesRes, customersRes] = await Promise.all([
        storeService.getAll(),
        customerApiService.getAll()
      ]);
      const loadedStores = Array.isArray(storesRes.data) ? storesRes.data : [];
      setStores(isAdmin ? loadedStores : loadedStores.filter((store) => store.id === userStoreId));
      setCustomers(customersRes || []);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load data:', error);
      const fallbackStores = [
        { id: '1', name: 'Main Store', is_warehouse: false, created_at: '' },
      ];
      setStores(isAdmin ? fallbackStores : fallbackStores.filter((store) => store.id === userStoreId));
      setCustomers([]);
    }
  };

  const addProduct = (product: Product) => {
    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.product_id === product.id);
      if (existingIndex >= 0) {
        const newItems = [...prevItems];
        newItems[existingIndex].quantity += 1;
        newItems[existingIndex].total = newItems[existingIndex].selling_price * newItems[existingIndex].quantity;
        return newItems;
      }
      return [...prevItems, {
        product_id: product.id,
        product_name: product.name,
        store_id: product.store_id || userStoreId || '1',
        quantity: 1,
        purchase_price: product.purchase_price ?? 0,
        selling_price: product.selling_price ?? 0,
        total: product.selling_price ?? 0,
      }];
    });
  };

  useEffect(() => {
    loadData();
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isAdmin && userStoreId) {
      setStoreId(userStoreId);
    }
  }, [isAdmin, userStoreId]);

  const handleBarcodeScan = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcode) {
      await findProductByBarcode(barcode);
      setBarcode('');
    }
  };

  const handleOpenScanner = () => {
    setShowScanner(true);
  };

  const findProductByBarcode = async (barcode: string) => {
    try {
      const product = await productService.getByBarcode(barcode);
      if (product) {
        addProduct(product);
      }
    } catch (error) {
      console.error('Product not found:', error);
    }
  };

  const handleBarcodeScanQr = (result: unknown) => {
    const data = result as string | undefined;
    if (data) {
      findProductByBarcode(data);
      setBarcode('');
      setShowScanner(false);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity < 1) return;
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].total = newItems[index].selling_price * quantity;
    setItems(newItems);
  };

  const updatePrice = (index: number, price: number) => {
    if (price < 0) return;
    const newItems = [...items];
    newItems[index].selling_price = price;
    newItems[index].total = price * newItems[index].quantity;
    setItems(newItems);
  };


  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleQuickCash = () => {
    setCashAmount(totalWithDiscount);
    setCardAmount(0);
    setActivePayment('cash');
  };
  const handleQuickCard = () => {
    setCardAmount(totalWithDiscount);
    setCashAmount(0);
    setActivePayment('card');
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;
    try {
      const newCustomer = await customerApiService.create({
        full_name: newCustomerName,
        phone_number: newCustomerPhone,
      });
      setCustomers(prev => [...prev, { id: newCustomer.id, full_name: newCustomer.full_name, phone_number: newCustomer.phone_number }]);
      setSelectedCustomerId(String(newCustomer.id));
      setShowNewCustomerDialog(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleFinishSale = async () => {
    if (items.length === 0) return;
    if (!selectedCustomerId) return;

    try {
      setSaving(true);

      const payments = [];
      if (cashAmount > 0) {
        payments.push({ type: 'cash', amount: String(cashAmount) });
      }
      if (cardAmount > 0) {
        payments.push({ type: 'card', amount: String(cardAmount) });
      }

      const selectedStoreId = items.length > 0 ? items[0].store_id : (storeId || userStoreId || '1');

      await salesService.create({
        store: parseInt(selectedStoreId),
        customer: parseInt(selectedCustomerId),
        items: items.map(item => ({
          product: parseInt(item.product_id),
          quantity: item.quantity,
          price: String(item.selling_price),
        })),
        payments,
      });

      setShowReceipt(true);
    } catch (error) {
      console.error('Failed to create sale:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetSale = () => {
    setShowReceipt(false);
    setItems([]);
    setCashAmount(0);
    setCardAmount(0);
    setDiscount(0);
    setActivePayment(null);
    setCustomerName('');
    setCustomerPhone('');
    barcodeInputRef.current?.focus();
  };

  const printReceipt = () => {
    window.print();
  };

  const receiptTotal = totalWithDiscount;

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-print, .receipt-print * { visibility: visible; }
          .receipt-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight dark:text-white">Sotuvlar (POS)</h2>
            <p className="text-sm text-muted-foreground dark:text-gray-400">Panel prodaj</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12 xl:gap-3 xl:h-[calc(100vh-11rem)]">
          {/* Katalog (chap panel) */}
          <div className="flex flex-col space-y-2 xl:col-span-5">
            <div className="bg-card border border-gray-900 rounded-lg flex min-h-80 flex-col p-3 xl:min-h-0 xl:flex-1">
              <div className="mb-3">
                <h4 className="text-base font-semibold flex items-center gap-2 dark:text-white mb-2">
                  Katalog tovarov
                </h4>
                <div className='flex flex-col justify-between gap-2 sm:flex-row'>
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground dark:text-gray-400" />
                    <Input
                      ref={barcodeInputRef}
                      placeholder="Poisk: nomi, artikul, shtrixkod"
                      value={barcode}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setBarcode(e.target.value)}
                      onKeyDown={handleBarcodeScan}
                      className="pl-9 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <Button className='w-full px-3 dark:bg-gray-900 dark:border-gray-600 dark:text-white hover:bg-gray-700 sm:w-auto' onClick={handleOpenScanner}>
                    <ScanBarcode className="w-5 text-muted-foreground dark:text-gray-400" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  {isAdmin && <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger className="h-8 w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white sm:w-40">
                      <SelectValue placeholder="Do'kon" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeStores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white sm:w-40">
                      <SelectValue placeholder="Kategoriya" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {filteredProducts.map((product) => (
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
          <div className="flex flex-col space-y-2 xl:col-span-4">
            <div className="bg-card border border-gray-900 rounded-lg flex min-h-80 flex-col xl:flex-1">
              <div className="p-3 pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-semibold flex items-center gap-2 dark:text-white">
                    <DollarSign className="h-4 w-4" /> Chek
                    <span className="inline-flex items-center rounded bg-secondary dark:bg-gray-800 px-1.5 py-0.5 text-xs font-medium dark:text-gray-200 ml-1">
                      {items.length}
                    </span>
                  </h4>
                  <Button type="button" variant="ghost" className="h-7 self-start px-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 sm:self-auto" onClick={() => setItems([])}>
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
                          <div className="text-xs text-muted-foreground dark:text-gray-400">{safeProducts.find((p) => p.id === item.product_id)?.sku}</div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeItem(index)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 sm:gap-1.5">
                        <div>
                          <div className="text-muted-foreground dark:text-gray-400 mb-1">Soni</div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-xs dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <Input
                              type="text"
                              min="1"
                              value={item.quantity}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => updateQuantity(index, Number(e.target.value))}
                              className="h-7 w-12 text-center text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-xs dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground dark:text-gray-400 mb-1">Narx</div>
                          <Input
                            type="number"
                            min="0"
                            value={item.selling_price || ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => updatePrice(index, Number(e.target.value))}
                            className="h-7 text-center text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
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
                  <span className="font-medium dark:text-gray-200">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">Chegirma:</span>
                    <span className="font-medium dark:text-gray-200">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t dark:border-gray-600">
                  <span className="font-semibold dark:text-white">JAMI:</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalWithDiscount)}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Oplata (o'ng panel) */}
          <div className="flex flex-col space-y-2 xl:col-span-3">
            <div className="bg-card border border-gray-900 rounded-lg flex min-h-80 flex-col xl:flex-1">
              <div className="p-3 pb-2">
                <h4 className="text-base font-semibold dark:text-white">To'lov</h4>
              </div>
              <div className="px-3 flex-1 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground dark:text-gray-400">Mijoz</Label>
                  <div className='flex gap-2'>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="Mijozni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={String(customer.id)}>
                            {customer.full_name} - {customer.phone_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewCustomerDialog(true)}
                        className="h-9 text-sm dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground dark:text-gray-400">Tezkor to'lov</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      variant={activePayment === 'cash' ? 'default' : 'outline'}
                      className={`h-10 text-xs ${activePayment === 'cash' ? '' : 'dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900'}`}
                      onClick={handleQuickCash}
                    >
                      Naqd
                    </Button>
                    <Button
                      type="button"
                      variant={activePayment === 'card' ? 'default' : 'outline'}
                      className={`h-10 text-xs ${activePayment === 'card' ? '' : 'dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900'}`}
                      onClick={handleQuickCard}
                    >
                      Karta
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs dark:text-gray-300">Naqd</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={cashAmount || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCashAmount(Number(e.target.value))}
                      className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs dark:text-gray-300">Karta</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={cardAmount || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCardAmount(Number(e.target.value))}
                      className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs dark:text-gray-300">Chegirma</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discount || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setDiscount(Number(e.target.value))}
                      className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div className="rounded-lg p-2.5 bg-muted/50 dark:bg-gray-900 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">Jami:</span>
                    <span className="font-bold dark:text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground dark:text-gray-400">Chegirma:</span>
                      <span className="font-bold dark:text-white">-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">To'landi:</span>
                    <span className="font-bold dark:text-white">{formatCurrency(totalPaid)}</span>
                  </div>
                  {change > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground dark:text-gray-400">Qaytim:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(change)}</span>
                    </div>
                  )}
                  {debt > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground dark:text-gray-400">Qarz:</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(debt)}</span>
                    </div>
                  )}
                </div>
                <Button type="button" className="w-full h-11 text-sm font-semibold dark:bg-green-600 dark:hover:bg-green-700" onClick={handleFinishSale} disabled={saving || items.length === 0 || !selectedCustomerId}>
                  {saving ? 'Yuklanmoqda...' : `Sotuvni yakunlash — ${formatCurrency(totalWithDiscount)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReceipt && (
        <div className="receipt-modal fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="receipt-content receipt-print bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-600 flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">Chek</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowReceipt(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center border-b dark:border-gray-600 pb-3">
                <h4 className="text-xl font-bold dark:text-white">AvtoCRM</h4>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Sotuv cheki</p>
                <p className="text-xs text-muted-foreground dark:text-gray-400">{new Date().toLocaleString()}</p>
              </div>
              <div className="border-b dark:border-gray-600 pb-2 text-sm dark:text-gray-300">
                {selectedCustomerId && (() => {
                  const customer = customers.find(c => String(c.id) === selectedCustomerId);
                  return customer ? (
                    <>
                      <div className="flex justify-between">
                        <span>Mijoz:</span>
                        <span>{customer.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Telefon:</span>
                        <span>{customer.phone_number}</span>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>

              <div className="space-y-2 text-sm">
                <div className="font-semibold dark:text-white">Tovarlar:</div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between dark:text-gray-300">
                    <div className="flex-1">
                      <span>{item.product_name}</span>
                      <span className="text-muted-foreground dark:text-gray-400"> x{item.quantity}</span>
                    </div>
                    <span>{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t dark:border-gray-600 pt-2 space-y-1 text-sm">
                <div className="flex justify-between dark:text-gray-300">
                  <span>Jami:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between dark:text-gray-300">
                    <span>Chegirma:</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg dark:text-white">
                  <span>JAMI:</span>
                  <span>{formatCurrency(receiptTotal)}</span>
                </div>
              </div>

              <div className="border-t dark:border-gray-600 pt-2 space-y-1 text-sm">
                <div className="flex justify-between dark:text-gray-300">
                  <span>Naqd:</span>
                  <span>{formatCurrency(cashAmount)}</span>
                </div>
                <div className="flex justify-between dark:text-gray-300">
                  <span>Karta:</span>
                  <span>{formatCurrency(cardAmount)}</span>
                </div>
                <div className="flex justify-between dark:text-gray-300">
                  <span>Jami to'landi:</span>
                  <span>{formatCurrency(totalPaid)}</span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span>Qaytim:</span>
                    <span>{formatCurrency(change)}</span>
                  </div>
                )}
                {debt > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Qarz:</span>
                    <span>{formatCurrency(debt)}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground dark:text-gray-400 pt-3">
                Xaridingiz uchun rahmat!
              </div>
            </div>
            <div className="p-4 border-t dark:border-gray-600 flex flex-col gap-2 print:hidden sm:flex-row">
              <Button className="flex-1" onClick={printReceipt}>
                Chop etish
              </Button>
              <Button variant="outline" className="flex-1" onClick={resetSale}>
                Yangi sotuv
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Barcode Scanner</DialogTitle>
          </DialogHeader>
          <QrScanner
            onUpdate={(result) => handleBarcodeScanQr(result)}
            onError={(error) => console.error('Scanner error:', error)}
          />
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent size='md'>
          <DialogHeader>
            <DialogTitle>Yangi mijoz qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-6">
            <div className="space-y-2">
              <Label>Ism</Label>
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Mijoz ismi"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="+998901234567"
              />
            </div>
            <Button onClick={handleCreateCustomer} className="w-full">
              Saqlash
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


