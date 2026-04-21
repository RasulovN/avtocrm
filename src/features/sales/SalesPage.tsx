import { useState, useEffect, useMemo, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import { ScanBarcode, Trash2, DollarSign, Search, X, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { ScannerModal } from '../../components/ScannerModal';
import { storeService } from '../../services/storeService';
import { productService } from '../../services/productService';
import { salesService } from '../../services/salesService';
import { customerApiService } from '../../services/customerService';
import { useAuthStore } from '../../app/store';
import { useCategories } from '../../context/CategoryContext';
import { useProducts } from '../../context/ProductContext';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import type { Store, Product } from '../../types';
import { formatCurrency } from '../../utils';

interface CartItem {
  product_id: string;
  product_name: string;
  store_id: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  total: number;
}

const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    console.warn('Audio not supported');

  }
};

const playErrorSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 300;
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    console.warn('Audio not supported');
  }
};

export function SalesPage() {
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id || '';
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const { categories } = useCategories();
  const { products: allProducts, loading: productsLoading } = useProducts();

  const [storeId, setStoreId] = useState(userStoreId);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);

  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'p' | 'f'>('f');
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

  const hydrateProductFromCatalog = useCallback((product: Product): Product => {
    // Ensure product has an id
    const productId = product.id || (product as any).product_id;
    const normalizedProduct = { ...product, id: productId };

    const matchedProduct = safeProducts.find((item) =>
      String(item.id) === String(productId) ||
      (product.shtrix_code && item.shtrix_code === product.shtrix_code) ||
      (product.barcode && item.barcode === product.barcode) ||
      (product.sku && item.sku === product.sku)
    );

    if (!matchedProduct) return normalizedProduct;

    return {
      ...matchedProduct,
      ...normalizedProduct,
      id: matchedProduct.id || productId,
      name: product.name || matchedProduct.name,
      sku: product.sku || matchedProduct.sku,
      barcode: product.barcode || matchedProduct.barcode,
      shtrix_code: product.shtrix_code || matchedProduct.shtrix_code,
      purchase_price: product.purchase_price ?? matchedProduct.purchase_price,
      selling_price: product.selling_price ?? matchedProduct.selling_price,
      quantity: product.quantity ?? matchedProduct.quantity,
      total_count: product.total_count ?? matchedProduct.total_count,
      store_id: product.store_id || matchedProduct.store_id,
      store_name: product.store_name || matchedProduct.store_name,
    };
  }, [safeProducts]);

  const addProduct = useCallback((product: Product) => {
    const productId = String(product.id || product.product_id || '');
    if (!productId) {
      toast.error('Mahsulot ID topilmadi');
      return;
    }

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => String(item.product_id) === productId);
      if (existingIndex >= 0) {
        const newItems = [...prevItems];
        const existingItem = newItems[existingIndex];
        existingItem.quantity += 1;
        existingItem.total = existingItem.selling_price * existingItem.quantity;
        return newItems;
      }
      console.log('Adding product to cart:', product.name );
      return [
        ...prevItems,
        {
          product_id: productId,
          product_name: product.name || product.sku || 'Noma\'lum',
          store_id: product.store_id || userStoreId || '1',
          quantity: 1,
          purchase_price: product.purchase_price ?? 0,
          selling_price: product.selling_price ?? 0,
          total: product.selling_price ?? 0,
        },
      ];
    });
  }, [userStoreId]);

  const findProductByBarcode = useCallback(async (barcode: string, isFromScan: boolean = true): Promise<Product | null> => {
    const normalizedBarcode = barcode.trim();
    console.log('Searching for barcode:', barcode);

    if (!normalizedBarcode) return null;

    const localProduct = safeProducts.find((product) =>
      [product.shtrix_code, product.barcode, product.sku]
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .some((value) => value.trim() === normalizedBarcode)
    );

    if (localProduct) {
      const hydratedProduct = hydrateProductFromCatalog(localProduct);
      if (!isFromScan) setSearchResults(null);
      return hydratedProduct;
    }

    try {
      const product = await productService.getByBarcode(normalizedBarcode);
      if (product) {
        const hydratedProduct = hydrateProductFromCatalog(product);
        // Only show search results if this is manual search, not from barcode scan
        if (!isFromScan) {
          setSearchResults([hydratedProduct]);
        }
        return hydratedProduct;
      } else {
        if (!isFromScan) setSearchResults([]);
      }
    } catch (error) {
      if (!isFromScan) setSearchResults([]);
    }

    return null;
  }, [safeProducts, hydrateProductFromCatalog]);

  const handleScan = useCallback(async (barcode: string) => {
    const product = await findProductByBarcode(barcode);
    
    if (product) {
      addProduct(product);
      playSuccessSound();
    } else {
      playErrorSound();
      toast.error(`Mahsulot topilmadi: ${barcode}`);
    }
  }, [findProductByBarcode, addProduct]);

  const {
    inputRef,
    value: barcodeValue,
    onChange: barcodeOnChange,
    onKeyDown: barcodeOnKeyDown,
    focus: focusBarcodeInput,
    status: scanStatus,
    message: scanMessage,
  } = useBarcodeScanner({
    onScan: handleScan,
    minLength: 4,
    scannerMaxGap: 250,
  });

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const calculatedDiscount = useMemo(() => {
    if (discountType === 'p') {
      return subtotal * (discount / 100);
    }
    return discount;
  }, [subtotal, discount, discountType]);
  const totalWithDiscount = subtotal - calculatedDiscount;
  const totalPaid = useMemo(() => cashAmount + cardAmount, [cashAmount, cardAmount]);
  const change = useMemo(() => Math.max(0, totalPaid - totalWithDiscount), [totalPaid, totalWithDiscount]);
  const debt = useMemo(() => Math.max(0, totalWithDiscount - totalPaid), [totalPaid, totalWithDiscount]);
  const filteredProducts = useMemo(() => {
    let result = safeProducts;
    if (categoryFilter) {
      result = result.filter((p) => String(p.category) === categoryFilter);
    }
    return result;
  }, [safeProducts, categoryFilter]);
  const displayedProducts = searchResults ?? filteredProducts;

  const loadData = useCallback(async () => {
    try {
      const [storesRes, customersRes] = await Promise.all([
        storeService.getAll(),
        customerApiService.getAll(),
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
  }, [isAdmin, userStoreId]);

  useEffect(() => {
    loadData();
    setTimeout(() => focusBarcodeInput(), 100);
  }, [loadData, focusBarcodeInput]);

  useEffect(() => {
  }, [scanStatus, scanMessage]);

  useEffect(() => {
    if (scanStatus === 'searching' || scanStatus === 'success' || scanStatus === 'not_found') {
      focusBarcodeInput();
    }
  }, [scanStatus, focusBarcodeInput]);

  useEffect(() => {
    // When scanner modal closes, ensure search results are cleared
    if (!showScanner) {
      setSearchResults(null);
    }
  }, [showScanner]);

  useEffect(() => {
    if (!isAdmin && userStoreId) {
      setStoreId(userStoreId);
    }
  }, [isAdmin, userStoreId]);

  useEffect(() => {
    const query = barcodeValue.trim();

    if (!query) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);

      try {
        if (/^\d+$/.test(query)) {
          const product = await productService.getByBarcode(query);
          setSearchResults(product ? [hydrateProductFromCatalog(product)] : []);
        } else {
          const products = await productService.search(query);
          setSearchResults(products.map(hydrateProductFromCatalog));
        } 
      } catch (error) {
        console.error('Product search failed:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [barcodeValue, hydrateProductFromCatalog]);

  useEffect(() => {
    focusBarcodeInput();
  }, [focusBarcodeInput]);

  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      const keyEvent = e as unknown as KeyboardEvent;
      if (keyEvent.ctrlKey && keyEvent.key === 's') {
        keyEvent.preventDefault();
        setShowScanner(true);
      }
      
      if (keyEvent.key === 'Escape') {
        setShowScanner(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showScanner]);

  const handleBarcodeManual = (e: KeyboardEvent<HTMLInputElement>) => {
    barcodeOnKeyDown(e);
    
    if (e.key === 'Enter' && barcodeValue.trim()) {
      const isNumeric = /^\d+$/.test(barcodeValue.trim());
      if (isNumeric && searchResults && searchResults.length > 0) {
        addProduct(searchResults[0]);
        barcodeOnChange({ target: { value: '' } } as ChangeEvent<HTMLInputElement>);
        setSearchResults(null);
      }
    }
  };

  const handleOpenScanner = () => {
    // Clear search results when opening scanner
    setSearchResults(null);
    barcodeOnChange({ target: { value: '' } } as ChangeEvent<HTMLInputElement>);
    setShowScanner(true);
  };

  const handleScannerScan = async (barcode: string) => {
    // Camera scanner adds directly to cart (same as device scanner)
    const product = await findProductByBarcode(barcode, true);
    
    if (product) {
      addProduct(product);
      playSuccessSound();
      toast.success(`Mahsulot topildi: ${product.name || barcode}`);
      // Clear any search results and input
      barcodeOnChange({ target: { value: '' } } as ChangeEvent<HTMLInputElement>);
      setSearchResults(null);
      setShowScanner(false);
    } else {
      playErrorSound();
      toast.error(`Mahsulot topilmadi: ${barcode}`);
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
      setCustomers((prev) => [
        ...prev,
        { id: newCustomer.id, full_name: newCustomer.full_name, phone_number: newCustomer.phone_number },
      ]);
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

    try {
      setSaving(true);

      const payments: { type: 'cash' | 'card'; amount: string }[] = [];
      if (cashAmount > 0) {
        payments.push({ type: 'cash', amount: String(cashAmount) });
      }
      if (cardAmount > 0) {
        payments.push({ type: 'card', amount: String(cardAmount) });
      }

      const selectedStoreId = items.length > 0 ? items[0].store_id : storeId || userStoreId || '1';
      const saleData: any = {
        store: parseInt(selectedStoreId),
        items: items.map((item) => ({
          product: parseInt(item.product_id),
          quantity: item.quantity,
          price: String(item.selling_price),
        })),
        payments,
        discount_type: discountType,
        discount_value: String(discount),
      };

      if (selectedCustomerId) {
        saleData.customer = parseInt(selectedCustomerId);
      }

      await salesService.create(saleData);

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
    setDiscountType('f');
    setActivePayment(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
    focusBarcodeInput();
  };

  const printReceipt = () => {
    window.print();
  };

  const receiptTotal = totalWithDiscount;

  const handleProductClick = (product: Product) => {
    try {
      // Ensure product is properly hydrated and has ID
      const hydratedProduct = hydrateProductFromCatalog(product);
      if (!hydratedProduct.id && !(hydratedProduct as any).product_id) {
        toast.error('Mahsulot ID topilmadi. Iltimos, scan qilib yoki katalogdan tanlab ko\'ring.');
        return;
      }
      addProduct(hydratedProduct);
      barcodeOnChange({ target: { value: '' } } as ChangeEvent<HTMLInputElement>);
      setSearchResults(null);
    } catch (error) {
      toast.error('Mahsulot qo\'shishda xatolik yuz berdi');
    }
  };

  return (
    <div>
    <style>{`
         @media print {
          @page { size: 100% auto; margin: 0; }
          body * { visibility: hidden; }
          .receipt-print, .receipt-content, .receipt-print *, .receipt-content * { visibility: visible; }
          .receipt-print, .receipt-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            min-height: auto;
            height: auto;
            background: white;  
            font-size: 6px; 
            overflow: visible;
          }
          .print-hidden { display: none !important; }
        }
        }
          `}</style>
      {/* /* Main Sales Interface */ }
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight dark:text-white">Sotuvlar (POS)</h2>
            <p className="text-sm text-muted-foreground dark:text-gray-400">Panel prodaj</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12 xl:gap-3 xl:h-[calc(100vh-11rem)]">
          <div className="flex flex-col space-y-2 xl:col-span-5">
            <div className="bg-card border border-gray-900 rounded-lg flex min-h-80 flex-col p-3 xl:min-h-0 xl:flex-1">
              <div className="mb-3">
                <h4 className="text-base font-semibold flex items-center gap-2 dark:text-white mb-2">
                  Mahsulotlar                  </h4>
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground dark:text-gray-400 z-10" />
                    <Input
                      ref={inputRef}
                      placeholder="Poisk: nomi, artikul, shtrixkod"
                      value={barcodeValue}
                      onChange={barcodeOnChange}
                      onKeyDown={handleBarcodeManual}
                      className="pl-9 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <Button
                    className="w-full px-3 dark:bg-gray-900 dark:border-gray-600 dark:text-white hover:bg-gray-700 sm:w-auto"
                    onClick={handleOpenScanner}
                    title="Ctrl+S"
                  >
                    <ScanBarcode className="w-5 text-muted-foreground dark:text-gray-400" />
                  </Button>
                </div>
                {scanMessage && (
                  <div
                    className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
                      scanStatus === 'success'
                        ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                        : scanStatus === 'not_found' || scanStatus === 'error'
                        ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
                        : scanStatus === 'searching'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-primary/20 bg-primary/5 text-muted-foreground'
                    }`}
                  >
                    {scanMessage}
                  </div>
                )}
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  {isAdmin && (
                    <Select value={storeId} onValueChange={setStoreId}>
                      <SelectTrigger className="h-8 w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white sm:w-40">
                        <SelectValue placeholder="Do'kon" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeStores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white sm:w-40">
                      <SelectValue placeholder="Kategoriya" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {searchLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground dark:text-gray-400">
                    Qidirilmoqda...
                  </div>
                ) : displayedProducts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground dark:text-gray-400">
                    Mahsulot topilmadi
                  </div>
                ) : (
                  displayedProducts.map((product) => (
                    <button
                      key={product.id}
                      className="w-full text-left rounded-lg p-2.5 border border-gray-900 hover:bg-accent dark:hover:bg-gray-900 transition-colors"
                      onClick={() => handleProductClick(product)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium dark:text-white">
                            {/* {product.name} */}
                            {product.name || product.sku  || "Noma'lum mahsulot"}
                          </div>
                          <div className="text-xs text-muted-foreground dark:text-gray-400">
                            {product.sku ||  product.barcode}
                          </div>
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
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col space-y-2 xl:col-span-4">
            <div className="bg-card border border-gray-900 rounded-lg flex min-h-80 flex-col xl:flex-1">
              <div className="p-3 pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-semibold flex items-center gap-2 dark:text-white print:hidden ">
                    <DollarSign className="h-4 w-4" /> Chek
                    <span className="inline-flex items-center rounded bg-secondary dark:bg-gray-800 px-1.5 py-0.5 text-xs font-medium dark:text-gray-200 ml-1">
                      {items.length}
                    </span>
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 self-start px-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 sm:self-auto"
                    onClick={() => setItems([])}
                  >
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
                    <div
                      key={item.product_id}
                      className="rounded-lg p-2.5 bg-muted/50 dark:bg-gray-900 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1">
                          <div className="font-medium dark:text-white text-sm">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground dark:text-gray-400">
                            {safeProducts.find((p) => p.id === item.product_id)?.sku}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeItem(index)}
                        >
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
                    <span className="text-muted-foreground dark:text-gray-400">
                      Chegirma ({discountType === 'p' ? `${discount}%` : ''}):
                    </span>
                    <span className="font-medium dark:text-gray-200">-{formatCurrency(calculatedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t dark:border-gray-600">
                  <span className="font-semibold dark:text-white">JAMI:</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(totalWithDiscount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col space-y-2 xl:col-span-3">
            <div className="bg-card border border-gray-900 rounded-lg flex min-h-80 flex-col xl:flex-1">
              <div className="p-3 pb-2">
                <h4 className="text-base font-semibold dark:text-white">To'lov</h4>
              </div>
              <div className="px-3 flex-1 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground dark:text-gray-400">Mijoz</Label>
                  <div className="flex gap-2">
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="Mijozni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
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
                      className={`h-10 text-xs ${
                        activePayment === 'cash' ? '' : 'dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900'
                      }`}
                      onClick={handleQuickCash}
                    >
                      Naqd
                    </Button>
                    <Button
                      type="button"
                      variant={activePayment === 'card' ? 'default' : 'outline'}
                      className={`h-10 text-xs ${
                        activePayment === 'card' ? '' : 'dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900'
                      }`}
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
                    <div className="flex gap-1">
                      <Select value={discountType} onValueChange={(val: 'p' | 'f') => setDiscountType(val)}>
                        <SelectTrigger className="h-9 w-20 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="f">So'm</SelectItem>
                          <SelectItem value="p">%</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={discount || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setDiscount(Number(e.target.value))}
                        className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg p-2.5 bg-muted/50 dark:bg-gray-900 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">Jami:</span>
                    <span className="font-bold dark:text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground dark:text-gray-400">
                        Chegirma ({discountType === 'p' ? `${discount}%` : ''}):
                      </span>
                      <span className="font-bold dark:text-white">-{formatCurrency(calculatedDiscount)}</span>
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
                <Button
                  type="button"
                  className="w-full h-11 text-sm font-semibold dark:bg-green-600 dark:hover:bg-green-700"
                  onClick={handleFinishSale}
                  disabled={saving || items.length === 0}
                >
                  {saving ? 'Yuklanmoqda...' : `Sotuvni yakunlash — ${formatCurrency(totalWithDiscount)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

{/* Receipt Modal */}
      {showReceipt && (
        <div className="receipt-modal fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="receipt-content receipt-print bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-600 flex justify-between items-center print:hidden ">
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
                {selectedCustomerId &&
                  (() => {
                    const customer = customers.find((c) => String(c.id) === selectedCustomerId);
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
                    <span>Chegirma ({discountType === 'p' ? `${discount}%` : ''}):</span>
                    <span>-{formatCurrency(calculatedDiscount)}</span>
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

      <ScannerModal open={showScanner} onOpenChange={setShowScanner} onScan={handleScannerScan} />

      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Yangi mijoz qo'shish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-6">
            <div className="space-y-2">
              <Label>Ism</Label>
              <Input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Mijoz ismi" />
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
