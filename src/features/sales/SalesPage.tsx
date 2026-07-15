import { useState, useEffect, useMemo, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import { ScanBarcode, Trash2, DollarSign, Search, X, UserPlus, Eye, Package, Barcode, MapPin, Image as ImageIcon, Loader2, ArrowLeftRight, Banknote, CreditCard, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { ScannerModal } from '../../components/ScannerModal';
import { storeService } from '../../services/storeService';
import { productService } from '../../services/productService';
import { salesService } from '../../services/salesService';
import { customerApiService } from '../../services/customerService';
import { bankCardService } from '../../services/bankCardService';
import { useAuthStore } from '../../app/store';
import { useProducts } from '../../context/ProductContext';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import type { Store, Product, BankCard, SalePaymentInput } from '../../types';
import { formatCurrency, formatAmountInput, parseAmountInput } from '../../utils';
import { extractErrorMessage } from '../../utils/errorHandler';
import { logger } from '../../utils/logger';
import { useTranslation } from 'react-i18next';
import { extractBarcodeFromUrl } from '../../utils/xss';
import { SaleReturnCreatePage } from './SaleReturnCreatePage';

interface CartItem {
  product_id: string;
  product_name: string;
  store_id: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  wholesale_price: number;
  total: number;
  available_stock: number;
  use_wholesale: boolean;
}

const getProductImages = (product?: Product | null): string[] => {
  if (!product) return [];

  const images: string[] = [];

  if (product.image) images.push(product.image);

  if (product.images) {
    if (Array.isArray(product.images)) {
      const mappedImages = product.images.map((img: any) => {
        if (typeof img === 'string') return img;
        if (typeof img === 'object' && img !== null && typeof img.image === 'string') return img.image;
        return null;
      }).filter(Boolean) as string[];

      images.push(...mappedImages);
    } else if (typeof product.images === 'string') {
      images.push(product.images);
    }
  }

  return [...new Set(images.filter(Boolean))];
};

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
    logger.warn('Audio not supported');

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
    logger.warn('Audio not supported');
  }
};

export function SalesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  // Yuqoridagi tab: sotuv (POS) yoki qaytarish rejimi
  const [mode, setMode] = useState<'sale' | 'return'>('sale');
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
  const userStoreId = user?.store_id || (user?.stores && user.stores.length > 0 ? String(user.stores.find(s => s.type === 'b')?.id || user.stores[0].id) : '');
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  // const { categories } = useCategories();
  const { products: allProducts, loading: productsLoading, refreshProducts } = useProducts();

  // Debug logs
  useEffect(() => {
    if (allProducts.length > 0) {
      logger.info('Sample product:', allProducts[0]);
      logger.info('Unique store IDs:', [...new Set(allProducts.map(p => p.store_id))]);
    }
  }, [allProducts, productsLoading]);

  // Debug: log products when they change
  useEffect(() => {
    // console.log('SalesPage - allProducts loaded:', allProducts.length, 'productsLoading:', productsLoading);
    if (allProducts.length > 0) {
      logger.info('First product:', allProducts[0]);
      logger.info('Store IDs:', [...new Set(allProducts.map(p => p.store_id))]);
    }
  }, [allProducts, productsLoading]);

  const [storeId, setStoreId] = useState(userStoreId);
  const activeStoreId = storeId || userStoreId;
  // Do'kon tanlanganda mahsulotlar backend'dan shu do'kon kesimida keladi:
  // faqat shu do'konda mavjud mahsulotlar, qoldiq bo'yicha kamayish tartibida.
  const [storeProducts, setStoreProducts] = useState<Product[] | null>(null);
  const [storeProductsLoading, setStoreProductsLoading] = useState(false);
  // const [categoryFilter, setCategoryFilter] = useState('');

  const loadStoreProducts = useCallback(async () => {
    if (!activeStoreId) {
      setStoreProducts(null);
      return;
    }
    try {
      setStoreProductsLoading(true);
      const res = await productService.getAll({ store_id: activeStoreId, limit: 100 });
      setStoreProducts(res.data || []);
    } catch (error) {
      logger.error('Failed to load store products:', error);
      setStoreProducts(null);
    } finally {
      setStoreProductsLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    void loadStoreProducts();
  }, [loadStoreProducts]);

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`crm_cart_${user?.id || 'guest'}`);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: Partial<CartItem>) => ({
        wholesale_price: item.wholesale_price ?? 0,
        use_wholesale: item.use_wholesale ?? false,
        product_id: item.product_id ?? '',
        product_name: item.product_name ?? '',
        store_id: item.store_id ?? '',
        quantity: item.quantity ?? 1,
        purchase_price: item.purchase_price ?? 0,
        selling_price: item.selling_price ?? 0,
        total: item.total ?? 0,
        available_stock: item.available_stock ?? 0,
      }));
    } catch {
      return [];
    }
  });

  // Persist cart whenever items change
  useEffect(() => {
    localStorage.setItem(`crm_cart_${user?.id || 'guest'}`, JSON.stringify(items));
  }, [items, user?.id]);

  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [selectedBankCardId, setSelectedBankCardId] = useState<string>('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'p' | 'f'>('f');
  const [showReceipt, setShowReceipt] = useState(false);
  // Faqat naqd va karta rejimlari bor; ikkalasi birga kiritilsa to'lov
  // backendga alohida cash+card bo'lib ketadi (aralash tur yuborilmaydi)
  type PaymentMode = 'cash' | 'card' | null;
  const [activePayment, setActivePayment] = useState<PaymentMode>('cash');
  const [showScanner, setShowScanner] = useState(false);
  const [customers, setCustomers] = useState<{ id: number; full_name: string; phone_number: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [debtDueDate, setDebtDueDate] = useState('');
  // Qarzga sotuvda sana belgilanmagan bo'lsa input qizarib turadi
  const [debtDueDateError, setDebtDueDateError] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');
  const [productLocation, setProductLocation] = useState<{ name?: string; description?: string } | null>(null);

  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeProducts = useMemo(() => (Array.isArray(allProducts) ? allProducts : []), [allProducts]);

  const hydrateProductFromCatalog = useCallback((product: Product): Product => {
    // Ensure product has an id
    const productId = product.id || (product as any).product_id;
    const normalizedProduct = { ...product, id: productId };

    const matchedProduct = allProducts.find((item) =>
      String(item.id) === String(productId) ||
      (product.shtrix_code && item.shtrix_code === product.shtrix_code) ||
      (product.barcode && item.barcode === product.barcode) ||
      (product.sku && item.sku === product.sku)
    );

    const baseProduct = matchedProduct ? { ...matchedProduct, ...normalizedProduct } : normalizedProduct;

    // Apply store-specific values if activeStoreId is selected
    let storeQty = activeStoreId ? 0 : baseProduct.quantity;
    let storePurchasePrice = baseProduct.purchase_price;
    let storeSellingPrice = baseProduct.selling_price;
    let storeWholesalePrice = baseProduct.wholesale_price;
    let storeName = baseProduct.store_name;

    if (activeStoreId && baseProduct.inventory_by_store) {
      const storeInv = baseProduct.inventory_by_store.find(
        (inv) => String(inv.store_id) === String(activeStoreId)
      );
      if (storeInv) {
        storeQty = storeInv.quantity;
        storePurchasePrice = storeInv.purchase_price;
        storeSellingPrice = storeInv.selling_price;
        storeWholesalePrice = storeInv.wholesale_price;
        storeName = storeInv.store_name;
      }
    }

    return {
      ...baseProduct,
      id: baseProduct.id || productId,
      name: product.name || baseProduct.name,
      sku: product.sku || baseProduct.sku,
      barcode: product.barcode || baseProduct.barcode,
      shtrix_code: product.shtrix_code || baseProduct.shtrix_code,
      purchase_price: storePurchasePrice,
      selling_price: storeSellingPrice,
      wholesale_price: storeWholesalePrice,
      quantity: storeQty,
      total_count: baseProduct.total_count ?? storeQty,
      store_id: activeStoreId || baseProduct.store_id,
      store_name: storeName || baseProduct.store_name,
    };
  }, [allProducts, activeStoreId]);

  const addProduct = useCallback((product: Product) => {
    const productId = String(product.id || product.product_id || '');
    if (!productId) {
      toast.error(t('messages.productIdNotFound'));
      return false;
    }

    // Determine available stock for this specific store
    let availableStock = 0;
    if (product.inventory_by_store && activeStoreId) {
      const storeInv = product.inventory_by_store.find(inv => String(inv.store_id) === String(activeStoreId));
      availableStock = storeInv ? storeInv.quantity : 0;
    } else if (product.quantity !== undefined) {
      availableStock = product.quantity;
    } else {
      availableStock = product.total_count ?? 0;
    }

    if (availableStock < 1) {
      if (activeStoreId) {
        toast.error(t('messages.notInYourStore', "Sizning do'koningizda yo'q"));
      } else {
        toast.error(t('messages.insufficientStock', 'Omborda mahsulot yetarli emas!') + ' (0)');
      }
      return false;
    }

    const existingItem = items.find((item) => String(item.product_id) === productId);
    if (existingItem && existingItem.quantity + 1 > availableStock) {
      toast.error(t('messages.insufficientStock', 'Omborda mahsulot yetarli emas!') + ` (${availableStock})`);
      return false;
    }

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => String(item.product_id) === productId);
      if (existingIndex >= 0) {
        const newItems = [...prevItems];
        const existingItem = newItems[existingIndex];
        existingItem.quantity += 1;
        const activePrice = existingItem.use_wholesale ? existingItem.wholesale_price : existingItem.selling_price;
        existingItem.total = activePrice * existingItem.quantity;
        return newItems;
      }

      return [
        ...prevItems,
        {
          product_id: productId,
          product_name: product.name || product.sku || 'Noma\'lum',
          store_id: product.store_id || activeStoreId || '1',
          quantity: 1,
          purchase_price: product.purchase_price ?? 0,
          selling_price: product.selling_price ?? 0,
          wholesale_price: product.wholesale_price ?? 0,
          total: product.selling_price ?? 0,
          available_stock: availableStock,
          use_wholesale: false,
        },
      ];
    });

    return true;
  }, [activeStoreId, items, t]);

  const findProductByBarcode = useCallback(async (barcode: string, isFromScan: boolean = true): Promise<Product | null> => {
    const normalizedBarcode = barcode.trim();
    logger.info('Searching for barcode:', barcode);

    if (!normalizedBarcode) return null;

    const localProduct = safeProducts.find((product) => {
      const cleanShtrix = product.shtrix_code ? extractBarcodeFromUrl(product.shtrix_code) : '';
      return [cleanShtrix, product.barcode, product.sku]
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .some((value) => value.trim() === normalizedBarcode);
    });

    if (localProduct) {
      const hydratedProduct = hydrateProductFromCatalog(localProduct);
      if (!isFromScan) setSearchResults(null);
      return hydratedProduct;
    }

    try {
      const products = await productService.search(normalizedBarcode, activeStoreId || undefined);
      const product = products.find((p) => {
        const cleanShtrix = p.shtrix_code ? extractBarcodeFromUrl(p.shtrix_code) : '';
        return String(p.id) === normalizedBarcode ||
          (p.barcode && String(p.barcode).trim() === normalizedBarcode) ||
          (cleanShtrix && String(cleanShtrix).trim() === normalizedBarcode) ||
          (p.sku && String(p.sku).trim() === normalizedBarcode);
      }) || products[0];

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
    } catch {
      if (!isFromScan) setSearchResults([]);
    }

    return null;
  }, [safeProducts, hydrateProductFromCatalog, activeStoreId]);

  const handleScan = useCallback(async (barcode: string) => {
    const product = await findProductByBarcode(barcode);

    if (product) {
      const success = addProduct(product);
      if (success) {
        playSuccessSound();
      } else {
        playErrorSound();
      }
    } else {
      playErrorSound();
      toast.error(`${t('messages.productNotFound')}: ${barcode}`);
    }
  }, [findProductByBarcode, addProduct, t]);

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
  const roundedTotal = Math.round(totalWithDiscount);
  const totalPaid = useMemo(() => cashAmount + cardAmount, [cashAmount, cardAmount]);
  const change = useMemo(() => Math.max(0, totalPaid - totalWithDiscount), [totalPaid, totalWithDiscount]);
  const debt = useMemo(() => Math.max(0, totalWithDiscount - totalPaid), [totalPaid, totalWithDiscount]);
  const isDebtSale = debt > 0;
  const submitAmount = useMemo(() => (isDebtSale ? debt : totalWithDiscount), [debt, isDebtSale, totalWithDiscount]);
  // Kiritilgan to'lov jami summadan oshsa, sotuvni yakunlash bloklanadi
  const isOverpaid = totalPaid > roundedTotal;
  // Tugma holati: rejim tanlangan yoki shu turdagi summa kiritilgan bo'lsa faol.
  // Ikkalasi birga faol bo'lsa — bo'lingan (naqd + karta) to'lov
  const cashSelected = activePayment === 'cash' || cashAmount > 0;
  const cardSelected = activePayment === 'card' || cardAmount > 0;
  const isSplitPayment = cashAmount > 0 && cardAmount > 0;

  // Tezkor to'lov rejimi tanlangan usul jami summaning qolgan qismini avtomatik qoplaydi
  // (masalan, karta rejimida naqd kiritilsa, karta summasi qoldiqqa moslashadi — aralash to'lov)
  useEffect(() => {
    if (activePayment === 'cash') {
      setCashAmount(Math.max(0, roundedTotal - cardAmount));
    } else if (activePayment === 'card') {
      setCardAmount(Math.max(0, roundedTotal - cashAmount));
    }
  }, [activePayment, roundedTotal, cashAmount, cardAmount]);
  const productImages = getProductImages(selectedProduct);
  const filteredProducts = useMemo(() => {
    // Do'kon tanlangan bo'lsa server allaqachon shu do'kon bo'yicha filtrlab,
    // qoldiq kamayishi tartibida bergan ro'yxat ishlatiladi; aks holda umumiy katalog.
    let result = activeStoreId && storeProducts ? storeProducts : allProducts;
    if (activeStoreId) {
      result = result.map((p) => {
        const storeInventory = p.inventory_by_store?.find(
          (inv) => String(inv.store_id) === String(activeStoreId)
        );
        if (storeInventory) {
          return {
            ...p,
            quantity: storeInventory.quantity,
            purchase_price: storeInventory.purchase_price,
            selling_price: storeInventory.selling_price,
            wholesale_price: storeInventory.wholesale_price,
            store_id: storeInventory.store_id,
            store_name: storeInventory.store_name,
            location_name: storeInventory.location_name,
            location_description: storeInventory.location_description,
          };
        }
        return {
          ...p,
          quantity: 0,
        };
      });
    }
    // if (categoryFilter) {
    //   result = result.filter((p) => String(p.category) === categoryFilter);
    // }
    return result;
  }, [allProducts, storeProducts, activeStoreId]);
  // Miqdori ko'p mahsulotlar ro'yxat tepasida chiqadi
  const displayedProducts = useMemo(() => {
    const source = searchResults ?? filteredProducts;
    return [...source].sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0));
  }, [searchResults, filteredProducts]);

  const loadData = useCallback(async () => {
    try {
      const [storesRes, customersRes] = await Promise.all([
        storeService.getAll(),
        customerApiService.getAll({ limit: 1000 }),
      ]);
      const loadedStores = Array.isArray(storesRes.data) ? storesRes.data : [];
      setStores(isAdmin ? loadedStores : loadedStores.filter((store) => String(store.id) === String(userStoreId)));
      setCustomers(customersRes.data || []);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      logger.error('Failed to load data:', error);
      const fallbackStores = [
        { id: '1', name: 'Main Store', is_warehouse: false, created_at: '' },
      ];
      setStores(isAdmin ? fallbackStores : fallbackStores.filter((store) => String(store.id) === String(userStoreId)));
      setCustomers([]);
    }
  }, [isAdmin, userStoreId]);

  useEffect(() => {
    loadData();
    setTimeout(() => focusBarcodeInput(), 100);
  }, [loadData, focusBarcodeInput]);

  useEffect(() => {
    let cancelled = false;
    const loadBankCards = async () => {
      try {
        // Kassada faqat sotuv bo'limi uchun ruxsat etilgan usullar (scope: sale/both)
        const cards = await bankCardService.getAll({ is_active: true, scope: 'sale' });
        if (cancelled) return;
        setBankCards(cards);
        const defaultCard = cards.find((card) => card.is_default) ?? cards[0];
        setSelectedBankCardId(defaultCard ? String(defaultCard.id) : '');
      } catch (error) {
        logger.error('Failed to load bank cards:', error);
      }
    };
    loadBankCards();
    return () => {
      cancelled = true;
    };
  }, []);

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
        // Do'kon tanlangan bo'lsa qidiruv ham shu do'kon bilan cheklanadi —
        // boshqa do'kondagi mahsulotlar chiqmaydi va sotib bo'lmaydi.
        const products = await productService.search(query, activeStoreId || undefined);
        setSearchResults(products.map(hydrateProductFromCatalog));
      } catch (error) {
        console.error('Product search failed:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [barcodeValue, hydrateProductFromCatalog, activeStoreId]);

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
      toast.success(`${t('messages.productFound')}: ${product.name || barcode}`);
      // Clear any search results and input
      barcodeOnChange({ target: { value: '' } } as ChangeEvent<HTMLInputElement>);
      setSearchResults(null);
      setShowScanner(false);
    } else {
      playErrorSound();
      toast.error(`${t('messages.productNotFound')}: ${barcode}`);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity < 0) return;
    const newItems = [...items];
    const item = newItems[index];

    if (quantity > item.available_stock) {
      toast.error(t('messages.insufficientStock', 'Omborda mahsulot yetarli emas!') + ` (${item.available_stock})`);
      item.quantity = item.available_stock;
    } else {
      item.quantity = quantity;
    }

    const activePrice = item.use_wholesale ? item.wholesale_price : item.selling_price;
    item.total = activePrice * item.quantity;
    setItems(newItems);
  };

  const updatePrice = (index: number, price: number) => {
    if (price < 0) return;
    const newItems = [...items];
    if (newItems[index].use_wholesale) {
      newItems[index].wholesale_price = price;
    } else {
      newItems[index].selling_price = price;
    }
    newItems[index].total = price * newItems[index].quantity;
    setItems(newItems);
  };

  const togglePriceMode = (index: number) => {
    const newItems = [...items];
    const item = newItems[index];
    item.use_wholesale = !item.use_wholesale;
    const activePrice = item.use_wholesale ? item.wholesale_price : item.selling_price;
    item.total = activePrice * item.quantity;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleQuickCash = () => {
    if (activePayment === 'cash') {
      // Qayta bosilsa avto rejim o'chadi
      setActivePayment(null);
      setCashAmount(0);
    } else {
      // Karta rejimidan o'tilsa, avvalgi avto to'ldirilgan karta summasi tozalanadi
      if (activePayment === 'card') setCardAmount(0);
      setActivePayment('cash');
    }
  };
  const handleQuickCard = () => {
    if (activePayment === 'card') {
      setActivePayment(null);
      setCardAmount(0);
    } else {
      if (activePayment === 'cash') setCashAmount(0);
      setActivePayment('card');
    }
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
      logger.error('Failed to create customer:', error);
    }
  };

  const handleFinishSale = async () => {
    if (saving) return;
    if (items.length === 0) return;

    // Check for zero quantities
    if (items.some(item => item.quantity <= 0)) {
      toast.error(t('messages.invalidQuantity'));
      return;
    }

    if (isOverpaid) {
      toast.error(t('sales.overpaidWarning', 'To‘lov summasi jami summadan oshib ketdi'));
      return;
    }

    if (isDebtSale && !selectedCustomerId) {
      toast.error('Qarzga sotuv uchun mijoz tanlang');
      return;
    }

    // Qarzga sotuvda qaytarish sanasi majburiy — backendga yubormasdan oldin tekshiramiz
    if (isDebtSale && !debtDueDate) {
      setDebtDueDateError(true);
      toast.error("Qarzga sotuv uchun qaytarish sanasini belgilang");
      return;
    }

    if (cardAmount > 0 && !selectedBankCardId) {
      toast.error(t('sales.cardRequired', 'Karta to‘lovi uchun bank kartasini tanlang'));
      return;
    }

    try {
      setSaving(true);

      const payments: SalePaymentInput[] = [];
      if (cashAmount > 0) {
        payments.push({ type: 'cash', amount: String(cashAmount) });
      }
      if (cardAmount > 0) {
        payments.push({ type: 'card', amount: String(cardAmount), bank_card: Number(selectedBankCardId) });
      }

      const selectedStoreId = items.length > 0 ? items[0].store_id : activeStoreId || '1';
      const saleData: any = {
        store: parseInt(selectedStoreId),
        items: items.map((item) => ({
          product: parseInt(item.product_id),
          quantity: item.quantity,
          price: String(item.use_wholesale ? item.wholesale_price : item.selling_price),
        })),
        payments,
        discount_type: discountType,
        discount_value: String(discount),
      };

      if (selectedCustomerId) {
        saleData.customer = parseInt(selectedCustomerId);
      }

      if (debtDueDate) {
        saleData.debt_due_date = debtDueDate;
      }

      await salesService.create(saleData);
      try {
        await refreshProducts();
        await loadStoreProducts();
      } catch (err) {
        console.error('Failed to refresh products after sale:', err);
      }

      setShowReceipt(true);
    } catch (error) {
      console.error('Failed to create sale:', error);
      // Backend xatosini foydalanuvchiga aniq ko'rsatamiz (global handler dev rejimda toast bermaydi)
      const data = (error as { response?: { data?: unknown } }).response?.data;
      if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).debt_due_date)) {
        setDebtDueDateError(true);
        toast.error(((data as Record<string, unknown>).debt_due_date as unknown[]).map(String).join(' '));
      } else {
        toast.error(extractErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  };

  const resetSale = () => {
    setShowReceipt(false);
    setItems([]);
    setCashAmount(0);
    setCardAmount(0);
    const defaultCard = bankCards.find((card) => card.is_default) ?? bankCards[0];
    setSelectedBankCardId(defaultCard ? String(defaultCard.id) : '');
    setDiscount(0);
    setDiscountType('f');
    setActivePayment('cash');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setDebtDueDate('');
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
        toast.error(t('messages.productIdNotFound'));
        return;
      }
      addProduct(hydratedProduct);
      barcodeOnChange({ target: { value: '' } } as ChangeEvent<HTMLInputElement>);
      setSearchResults(null);
    } catch {
      toast.error(t('messages.productAddError'));
    }
  };

  const handleOpenProductDialog = useCallback(async (product: Product) => {
    const hydratedProduct = hydrateProductFromCatalog(product);
    setSelectedProduct(hydratedProduct);
    setShowProductDialog(true);
    setProductError('');
    setProductLocation(null);

    if (!hydratedProduct.id) {
      setProductError(t('messages.productIdNotFound'));
      return;
    }

    try {
      setProductLoading(true);
      const fullProduct = await productService.getById(String(hydratedProduct.id));

      // Merge loaded data over existing hydrated data to ensure we don't lose existing context
      setSelectedProduct({
        ...hydratedProduct,
        ...fullProduct,
        // Final safety guarantee for critical identification tokens
        id: fullProduct.id && fullProduct.id.trim() !== "" ? fullProduct.id : String(hydratedProduct.id),
        // Preserve fields if backend didn't return them properly
        sku: fullProduct.sku || hydratedProduct.sku,
        barcode: fullProduct.barcode || hydratedProduct.barcode,
        shtrix_code: fullProduct.shtrix_code || hydratedProduct.shtrix_code,
        category_name: fullProduct.category_name && fullProduct.category_name !== String(fullProduct.category)
          ? fullProduct.category_name
          : hydratedProduct.category_name,
        inventory_by_store: fullProduct.inventory_by_store?.length
          ? fullProduct.inventory_by_store
          : hydratedProduct.inventory_by_store,
        quantity: fullProduct.quantity ?? hydratedProduct.quantity,
        total_count: fullProduct.total_count ?? hydratedProduct.total_count,
        selling_price: fullProduct.selling_price || hydratedProduct.selling_price,
        purchase_price: fullProduct.purchase_price || hydratedProduct.purchase_price,
        wholesale_price: fullProduct.wholesale_price || hydratedProduct.wholesale_price,
        image: fullProduct.image || hydratedProduct.image,
        images: (fullProduct.images && fullProduct.images.length > 0)
          ? fullProduct.images
          : hydratedProduct.images,
      });
      // Productdan location ma'lumotlarini olish
      if (fullProduct.location_id) {
        setProductLocation({
          name: fullProduct.location_name,
          description: fullProduct.location_description,
        });
      }
    } catch {
      setProductError(t('messages.productNotFound'));
    } finally {
      setProductLoading(false);
    }
  }, [hydrateProductFromCatalog]);

  const handleProductDialogChange = useCallback((open: boolean) => {
    setShowProductDialog(open);
    if (!open) {
      setSelectedProduct(null);
      setProductError('');
      setProductLoading(false);
      setProductLocation(null);
    }
  }, []);

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
            color: black;
            print-color-adjust: black;
          }
          .print-hidden { display: none !important; } 
        }
          `}</style>
      {/* /* Main Sales Interface */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight dark:text-white">{t('sales.title')}</h2>
            <p className="text-sm text-muted-foreground dark:text-gray-400">{t('sales.salesPanel')}</p>
          </div>
          {/* Sotuv | Qaytarish tab almashtirgichi */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setMode('sale')}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === 'sale'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              {t('sales.title', 'Sotuv')}
            </button>
            <button
              type="button"
              onClick={() => setMode('return')}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === 'return'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              {t('saleReturns.tab', 'Qaytarish')}
            </button>
          </div>
        </div>

        {mode === 'return' ? (
          <SaleReturnCreatePage embedded />
        ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12 xl:gap-3 xl:h-[calc(100vh-11rem)]">
          <div className="flex min-h-0 flex-col space-y-2 xl:col-span-5 overflow-y-auto">
            <div className="bg-card border border-gray-900 rounded-lg flex min-h-80 flex-col p-3 xl:min-h-0 xl:flex-1">
              <div className="mb-3">
                <h4 className="text-base font-semibold flex items-center gap-2 dark:text-white mb-2">
                  {t('products.title')}
                </h4>
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground dark:text-gray-400 z-10" />
                    <Input
                      ref={inputRef}
                      placeholder={t('placeholders.searchProducts')}
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
                    <ScanBarcode className="w-5 " />
                  </Button>
                </div>
                {scanMessage && (
                  <div
                    className={`mt-2 rounded-lg border px-3 py-2 text-sm ${scanStatus === 'success'
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
                        <SelectValue placeholder={t('placeholders.selectStore')} />
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
                  {/* <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 w-full dark:bg-gray-900 dark:border-gray-600 dark:text-white sm:w-40">
                      <SelectValue placeholder={t('placeholders.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select> */}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {searchLoading || storeProductsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground dark:text-gray-400">
                    {t('common.loading')}
                  </div>
                ) : displayedProducts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground dark:text-gray-400">
                    {t('messages.productNotFound')}
                  </div>
                ) : (
                  displayedProducts.map((product) => {
                    const isNotAvailable = activeStoreId && (product.quantity === undefined || product.quantity <= 0);
                    return (
                      <div
                        key={product.id}
                        className={`w-full text-left rounded-lg p-3 border border-gray-900 hover:bg-accent dark:hover:bg-gray-900 transition-colors cursor-pointer ${
                          isNotAvailable ? 'opacity-70' : ''
                        }`}
                        onClick={() => handleProductClick(product)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleProductClick(product);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium dark:text-white text-sm truncate">
                              {product.name || product.sku || t('sales.unknownProduct')}
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              SKU: {product.sku || '-'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center justify-center rounded text-xs font-bold min-w-[1.75rem] h-5 px-1.5 ${
                                isNotAvailable
                                  ? 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-primary/10 dark:bg-gray-600 dark:text-gray-200'
                              }`}
                            >
                              {isNotAvailable ? '0' : product.quantity}
                            </span>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void handleOpenProductDialog(product);
                              }}
                              aria-label={t('sales.productDetails')}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/40 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-muted-foreground mb-0.5 flex items-center gap-1">
                              <Barcode className="h-3 w-3" /> Shtrix kod
                            </div>
                            <div className="font-semibold tabular-nums text-foreground truncate">
                              {(product.shtrix_code ? extractBarcodeFromUrl(product.shtrix_code) : '') || product.barcode || product.sku || '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-0.5">Sotuv narxi</div>
                            <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(product.selling_price ?? 0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-0.5">Ulgurji narx</div>
                            <div className="font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(product.wholesale_price ?? 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-col space-y-2 xl:col-span-4 overflow-y-auto">
            <div className="bg-card border border-gray-900 rounded-lg flex min-h-80 flex-col xl:flex-1">
              <div className="p-3 pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-semibold flex items-center gap-2 dark:text-white print:hidden ">
                    <DollarSign className="h-4 w-4" /> {t('sales.receipt')}
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
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {t('sales.clear')}
                  </Button>
                </div>
              </div>
              <div className="px-3 flex-1 overflow-y-auto space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-gray-400">
                    <ScanBarcode className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('sales.scanBarcode')}</p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={item.product_id}
                      className="rounded-lg p-2.5 bg-muted/50 dark:bg-gray-900 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium dark:text-white text-sm truncate">{item.product_name}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">Kir: {formatCurrency(item.purchase_price)}</span>
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
                      <div className="grid grid-cols-12 gap-1.5 text-xs items-end">
                        <div className="col-span-4">
                          <div className="text-muted-foreground dark:text-gray-400 mb-1">{t('sales.quantity')}</div>
                          <div className="flex items-center gap-0.5">
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
                              value={item.quantity || ''}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*$/.test(val)) {
                                  updateQuantity(index, val === '' ? 0 : Number(val));
                                }
                              }}
                              className="h-7 w-10 text-center text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                        <div className="col-span-5">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-muted-foreground dark:text-gray-400">{t('sales.price')}</span>
                            <button
                              type="button"
                              onClick={() => togglePriceMode(index)}
                              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                                item.use_wholesale
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              }`}
                              title={item.use_wholesale ? 'Sotuv narxiga o\'tish' : 'Ulgurji narxga o\'tish'}
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                              {item.use_wholesale ? 'Ulgurji' : 'Sotuv'}
                            </button>
                          </div>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatAmountInput(item.use_wholesale ? item.wholesale_price : item.selling_price)}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              updatePrice(index, parseAmountInput(e.target.value));
                            }}
                            className="h-7 text-center text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="text-muted-foreground dark:text-gray-400 mb-1">{t('sales.total')}</div>
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
                  <span className="text-muted-foreground dark:text-gray-400">{t('sales.items')}</span>
                  <span className="font-medium dark:text-gray-200">{items.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-gray-400">{t('sales.amount')}</span>
                  <span className="font-medium dark:text-gray-200">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">
                      {t('sales.discount')} ({discountType === 'p' ? `${discount}%` : ''}):
                    </span>
                    <span className="font-medium dark:text-gray-200">-{formatCurrency(calculatedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t dark:border-gray-600">
                  <span className="font-semibold dark:text-white">{t('sales.totalAmount')}</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(totalWithDiscount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-col space-y-2 xl:col-span-3 overflow-y-auto">
            <div className="bg-card border border-gray-900 rounded-lg flex min-h-80 flex-col xl:flex-1">
              <div className="p-3 pb-2">
                <h4 className="text-base font-semibold dark:text-white">{t('sales.payment', 'Тўлов')}</h4>
              </div>
              <div className="px-3 flex-1 space-y-3">
                <div className="rounded-xl border border-dashed border-gray-300/80 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/60">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-gray-400">{t('sales.customer')}</Label>
                  </div>
                  {/* Mijoz tanlash ixtiyoriy: tanlanmasa oddiy (mijozsiz) sotuv bo'ladi */}
                  <div className="flex gap-2">
                    <SearchableSelect
                      value={selectedCustomerId}
                      onValueChange={setSelectedCustomerId}
                      options={customers.map((customer) => ({
                        value: String(customer.id),
                        label: `${customer.full_name} - ${customer.phone_number}`,
                      }))}
                      placeholder={t('placeholders.selectCustomer')}
                      searchPlaceholder={t('placeholders.searchCustomer', 'Mijozni qidirish...')}
                      emptyMessage={t('messages.customerNotFound', 'Mijoz topilmadi')}
                      countLabel="ta mijoz"
                      className="flex-1 min-w-0"
                    />
                    {selectedCustomerId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isDebtSale}
                        onClick={() => setSelectedCustomerId('')}
                        title="Mijozni bekor qilish"
                        className="h-10 text-sm dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewCustomerDialog(true)}
                      className="h-10 text-sm dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                    </Button>
                  </div>
                  {isDebtSale && (
                    <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                      Qarzga sotuv uchun mijoz tanlash majburiy.
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-dashed border-gray-300/80 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/60">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-gray-400">{t('sales.discount')}</Label>
                  <div className="mt-2 flex gap-1">
                    <Select value={discountType} onValueChange={(val: 'p' | 'f') => setDiscountType(val)}>
                      <SelectTrigger className="h-9 w-20 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="f">{t('sales.uzs')}</SelectItem>
                        <SelectItem value="p">%</SelectItem>
                      </SelectContent>
                    </Select>
                    {discountType === 'p' ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={discount || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value;
                          setDiscount(val === '' ? 0 : Number(val));
                        }}
                        className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white flex-1"
                      />
                    ) : (
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatAmountInput(discount)}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setDiscount(parseAmountInput(e.target.value));
                        }}
                        className="h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white flex-1"
                      />
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-gray-300/80 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/60 space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-gray-400">{t('sales.quickPayment')}</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      variant={cashSelected ? 'default' : 'outline'}
                      title={t('sales.quickCashHint', "Qolgan summani naqd bilan to'lash")}
                      className={`h-12 text-xs flex-col gap-0.5 ${cashSelected
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
                        : 'dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900'
                        }`}
                      onClick={handleQuickCash}
                    >
                      <span className="flex items-center gap-1.5">
                        <Banknote className="h-4 w-4" /> {t('sales.cash')}
                      </span>
                      {cashAmount > 0 && (
                        <span className="text-[10px] font-normal opacity-90 tabular-nums">
                          {formatCurrency(cashAmount)}
                        </span>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant={cardSelected ? 'default' : 'outline'}
                      title={t('sales.quickCardHint', "Qolgan summani karta bilan to'lash")}
                      className={`h-12 text-xs flex-col gap-0.5 ${cardSelected
                        ? 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700'
                        : 'dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900'
                        }`}
                      onClick={handleQuickCard}
                    >
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4" /> {t('sales.card')}
                      </span>
                      {cardAmount > 0 && (
                        <span className="text-[10px] font-normal opacity-90 tabular-nums">
                          {formatCurrency(cardAmount)}
                        </span>
                      )}
                    </Button>
                  </div>
                  {isSplitPayment && (
                    <p className="text-[11px] leading-snug text-muted-foreground dark:text-gray-400">
                      {t('sales.splitPaymentInfo', "To'lov naqd va karta bo'lib qabul qilinadi")}
                    </p>
                  )}
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <Label className="text-xs dark:text-gray-300">{t('sales.cash')}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatAmountInput(cashAmount)}
                        disabled={isOverpaid && cashAmount === 0}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const val = parseAmountInput(e.target.value);
                          if (activePayment === 'card') {
                            // Karta avto rejimda: naqd kiritilsa, karta qoldiqqa moslashadi
                            if (val > roundedTotal) return;
                            setCashAmount(val);
                            return;
                          }
                          if (activePayment === 'cash') setActivePayment(null);
                          if (cardAmount + val > roundedTotal) return;
                          setCashAmount(val);
                        }}
                        className={`h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white ${
                          isOverpaid ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500/30' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs dark:text-gray-300">{t('sales.card')}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatAmountInput(cardAmount)}
                        disabled={isOverpaid && cardAmount === 0}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const val = parseAmountInput(e.target.value);
                          if (activePayment === 'cash') {
                            // Naqd avto rejimda: karta kiritilsa, naqd qoldiqqa moslashadi
                            if (val > roundedTotal) return;
                            setCardAmount(val);
                            return;
                          }
                          if (activePayment === 'card') setActivePayment(null);
                          if (cashAmount + val > roundedTotal) return;
                          setCardAmount(val);
                        }}
                        className={`h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white ${
                          isOverpaid ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500/30' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>
                {cardSelected && (
                  <div className="rounded-xl border border-dashed border-gray-300/80 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/60 space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-gray-400">Karta turi</Label>
                    {bankCards.length === 0 ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 px-3 py-2">
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {t('sales.noBankCards', "Faol bank kartasi yo'q — sozlamalardan qo'shing")}
                        </p>
                      </div>
                    ) : (
                      // Kartalar tugma ko'rinishida — bir bosishda tanlanadi
                      <div className="grid grid-cols-2 gap-2">
                        {bankCards.map((card) => {
                          const isSelected = String(card.id) === selectedBankCardId;
                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => setSelectedBankCardId(String(card.id))}
                              aria-pressed={isSelected}
                              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/40 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : 'border-gray-300 bg-background text-foreground hover:bg-accent dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                              }`}
                            >
                              <CreditCard className={`h-4 w-4 shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                              <span className="truncate">{card.name}</span>
                              {card.is_default && <Star className="h-3 w-3 shrink-0 text-amber-500" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {debt > 0 && selectedCustomerId && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground dark:text-gray-400">
                      Qarz muddati <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={debtDueDate}
                      onChange={(e) => {
                        setDebtDueDate(e.target.value);
                        if (e.target.value) setDebtDueDateError(false);
                      }}
                      aria-invalid={debtDueDateError}
                      className={`h-9 text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white ${
                        debtDueDateError ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500/40' : ''
                      }`}
                    />
                    {debtDueDateError && (
                      <p className="text-[11px] text-red-500">
                        Qarzga sotuv uchun qaytarish sanasi majburiy
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-2.5 dark:border-emerald-800/60 dark:bg-emerald-950/20 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">{t('sales.total')}:</span>
                    <span className="font-bold dark:text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground dark:text-gray-400">
                        {t('sales.discount')} ({discountType === 'p' ? `${discount}%` : ''}):
                      </span>
                      <span className="font-bold dark:text-white">-{formatCurrency(calculatedDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground dark:text-gray-400">{t('inventory.paid')}:</span>
                    <span className="font-bold dark:text-white">{formatCurrency(totalPaid)}</span>
                  </div>
                  {isOverpaid && (
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-red-600 dark:text-red-400">{t('sales.overpaid', 'Ortiqcha summa')}</span>
                      <span className="font-bold text-red-600 dark:text-red-400">+{formatCurrency(totalPaid - roundedTotal)}</span>
                    </div>
                  )}
                  {debt > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground dark:text-gray-400 print:text-black">{t('sales.debt')}</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(debt)}</span>
                    </div>
                  )}
                </div>
                {isOverpaid && (
                  <p className="text-[11px] leading-snug text-red-600 dark:text-red-400">
                    {t('sales.overpaidWarning', 'To‘lov summasi jami summadan oshib ketdi')}
                  </p>
                )}
                <Button
                  type="button"
                  className="w-full h-11 text-sm font-semibold dark:bg-green-600 dark:hover:bg-green-700"
                  onClick={handleFinishSale}
                  disabled={saving || items.length === 0 || isOverpaid || (isDebtSale && !selectedCustomerId) || (cardAmount > 0 && bankCards.length === 0)}
                >
                  {saving ? t('common.loading') : `${t('common.submit')} — ${formatCurrency(submitAmount)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="receipt-modal fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="receipt-content receipt-print bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-600 flex justify-between items-center print:hidden ">
              <h3 className="text-lg font-bold dark:text-white">{t('sales.receipt')}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowReceipt(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center border-b dark:border-gray-600 pb-3">
                <h4 className="text-xl font-bold dark:text-white print:text-black">AvtoCRM</h4>
                <p className="text-sm text-muted-foreground dark:text-gray-400 print:text-black">{t('sales.receipt')}</p>
                <p className="text-xs text-muted-foreground dark:text-gray-400 print:text-black">{new Date().toLocaleString('uz-UZ', { hour12: false })}</p>
              </div>
              <div className="border-b dark:border-gray-600 pb-2 text-sm dark:text-gray-300">
                {selectedCustomerId &&
                  (() => {
                    const customer = customers.find((c) => String(c.id) === selectedCustomerId);
                    return customer ? (
                      <>
                        <div className="flex justify-between print:text-black">
                          <span>{t('sales.customer')}:</span>
                          <span>{customer.full_name}</span>
                        </div>
                        <div className="flex justify-between print:text-black">
                          <span>{t('sales.phone')}:</span>
                          <span>{customer.phone_number}</span>
                        </div>
                      </>
                    ) : null;
                  })()}
              </div>

              <div className="space-y-2 text-sm">
                <div className="font-semibold dark:text-white print:text-black">{t('sales.items')}</div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between dark:text-gray-300 print:text-black">
                    <div className="flex-1 print:text-black ">
                      <span>{item.product_name}</span>
                      <span className="text-muted-foreground dark:text-gray-400 print:text-black"> x{item.quantity}</span>
                    </div>
                    <span>{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t dark:border-gray-600 pt-2 space-y-1 text-sm">
                <div className="flex justify-between dark:text-gray-300 print:text-black">
                  <span>{t('sales.total')}:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between dark:text-gray-300 print:text-black">
                    <span>{t('sales.discount')} ({discountType === 'p' ? `${discount}%` : ''}):</span>
                    <span>-{formatCurrency(calculatedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg dark:text-white print:text-black">
                  <span>{t('sales.totalAmount')}</span>
                  <span>{formatCurrency(receiptTotal)}</span>
                </div>
              </div>

              <div className="border-t dark:border-gray-600 pt-2 space-y-1 text-sm">
                <div className="flex justify-between dark:text-gray-300 print:text-black">
                  <span>{t('sales.cash')}:</span>
                  <span>{formatCurrency(cashAmount)}</span>
                </div>
                <div className="flex justify-between dark:text-gray-300 print:text-black">
                  <span>
                    {t('sales.card')}
                    {cardAmount > 0 && selectedBankCardId
                      ? ` (${bankCards.find((card) => String(card.id) === selectedBankCardId)?.name ?? ''})`
                      : ''}
                    :
                  </span>
                  <span>{formatCurrency(cardAmount)}</span>
                </div>
                <div className="flex justify-between dark:text-gray-300 print:text-black">
                  <span>{t('inventory.paid')}:</span>
                  <span>{formatCurrency(totalPaid)}</span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between text-blue-600 dark:text-blue-400 print:text-black">
                    <span>{t('sales.change')}</span>
                    <span>{formatCurrency(change)}</span>
                  </div>
                )}
                {debt > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400 print:text-black">
                    <span>{t('sales.debt')}</span>
                    <span>{formatCurrency(debt)}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground dark:text-gray-400 pt-3 print:text-black">
                {t('sales.thanks')}
              </div>
            </div>

            <div className="p-4 border-t dark:border-gray-600 flex flex-col gap-2 print:hidden sm:flex-row">
              <Button className="flex-1" onClick={printReceipt}>
                {t('sales.print')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={resetSale}>
                {t('sales.newSale')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ScannerModal open={showScanner} onOpenChange={setShowScanner} onScan={handleScannerScan} />

      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{t('sales.addCustomer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-6">
            <div className="space-y-2">
              <Label>{t('sales.name')}</Label>
              <Input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder={t('placeholders.customerName')} />
            </div>
            <div className="space-y-2">
              <Label>{t('sales.phone')}</Label>
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="+998901234567"
              />
            </div>
            <Button onClick={handleCreateCustomer} className="w-full">
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProductDialog} onOpenChange={handleProductDialogChange}>
        <DialogContent className="max-w-3xl pb-6 max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('sales.productDetails')}</DialogTitle>
          </DialogHeader>

          {productLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('salesDetail.productInfoLoading')}</span>
              </div>
            </div>
          ) : productError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {productError}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border bg-muted">
                  {productImages.length > 0 ? (
                    <img
                      src={productImages[0]}
                      alt={selectedProduct?.name || t('products.image')}
                      className="h-72 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-72 w-full items-center justify-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="h-10 w-10" />
                        <span>{t('sales.noImage')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {productImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {productImages.slice(1, 5).map((image, index) => (
                      <div key={`${image}-${index}`} className="overflow-hidden rounded-xl border bg-muted">
                        <img
                          src={image}
                          alt={`${selectedProduct?.name || t('products.title')} ${index + 2}`}
                          className="h-16 w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-2xl font-semibold">
                    {selectedProduct?.name || t('sales.unknownProduct')}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProduct?.description || t('sales.noDescription')}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="text-sm">{t('salesDetail.basicInfo')}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">ID</span>
                        <span className="font-medium">{selectedProduct?.id || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t('products.category')}</span>
                        <span className="font-medium text-right">{selectedProduct?.category_name || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <Barcode className="h-4 w-4" />
                      <span className="text-sm">{t('sales.codesAndPrices')}</span>
                    </div>
                    <div className="space-y-2 text-sm">

                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t('sales.sellingPrice')}</span>
                        <span className="font-medium">{formatCurrency(selectedProduct?.selling_price ?? 0)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t('sales.purchasePrice')}</span>
                        <span className="font-medium">{formatCurrency(selectedProduct?.purchase_price ?? 0)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t('products.wholesalePrice', 'Ulgurji narx')}</span>
                        <span className="font-medium">{formatCurrency(selectedProduct?.wholesale_price ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h5 className="font-semibold">{t('sales.location')}</h5>
                  </div>
                  {productLocation && productLocation.name ? (
                    <div>
                      <div className="rounded-xl bg-background p-3">
                        <p className="text-xs text-muted-foreground">{t('sales.zone')}</p>
                        <p className="mt-1 font-medium">{productLocation.name}</p>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{productLocation.description || t('sales.noDescription')}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('sales.noLocation')}</p>
                  )}
                </div>

                {/* Stock in other stores */}
                {selectedProduct?.inventory_by_store && selectedProduct.inventory_by_store.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <h5 className="font-semibold text-sm dark:text-white">
                        {t('sales.storeStock', 'Бошқа дўконлардаги қолдиқлар')}
                      </h5>
                    </div>
                    <div className="grid gap-2">
                      {selectedProduct.inventory_by_store.map((inv) => (
                        <div
                          key={inv.store_id}
                          className="rounded-xl border bg-background p-3 text-sm space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-medium">{inv.store_name}</span>
                              {inv.location_name && (
                                <span className="text-xs text-muted-foreground">{inv.location_name}</span>
                              )}
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${inv.quantity > 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                            >
                              {inv.quantity} {t('common.pcs', 'дона')}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-0.5">Sotish narxi</p>
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatCurrency(inv.selling_price ?? 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-0.5">Olish narxi</p>
                              <p className="text-xs font-semibold tabular-nums">
                                {formatCurrency(inv.purchase_price ?? 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-0.5">Ulgurji narx</p>
                              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                {formatCurrency(inv.wholesale_price ?? 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
