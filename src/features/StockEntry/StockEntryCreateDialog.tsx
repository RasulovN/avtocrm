import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, Package, Upload, Image as ImageIcon, Tag, Layers, Ruler, AlignLeft, MapPin,
  Check, ChevronLeft, ChevronRight, Loader2, Banknote, CreditCard, Wallet,
  ClipboardCheck, ShoppingCart, PackagePlus, X, RotateCcw,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { storeService } from '../../services/storeService';
import { supplierService } from '../../services/supplierService';
import { bankCardService } from '../../services/bankCardService';
import { purchaseSessionService } from '../../services/purchaseSessionService';
import { useAuthStore } from '../../app/store';
import { useProducts } from '../../context/ProductContext';
import type {
  Store, Supplier, ProductUnit, ProductFormData, CategoryFormData, ProductUnitFormData,
  BankCard, PurchaseSession, PurchaseSessionPayload, PurchaseSessionStatus,
} from '../../types';
import { useCategories } from '../../context/CategoryContext';
import { productUnitService } from '../../services/productUnitService';
import { productService } from '../../services/productService';
import { productLocationService, type ProductLocation } from '../../services/productLocationService';
import { categoryService } from '../../services/categoryService';
import { latinToCyrillic } from '../../utils/transliteration';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/Dialog';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, cn } from '../../utils';
import { handleError } from '../../utils/errorHandler';

interface InventoryFormItem {
  product_id: string;
  product_name: string;
  quantity: number | '';
  purchase_price: number | '';
  selling_price: number | '';
  wholesale_price: number | '';
  total: number;
}

interface ItemErrors {
  product_id?: boolean;
  quantity?: boolean;
  purchase_price?: boolean;
  selling_price?: boolean;
  wholesale_price?: boolean;
}

type WizardStep = 1 | 2 | 3;
type WizardView = 'loading' | 'resume' | 'wizard';
type PaymentMode = 'cash' | 'card' | 'debt' | 'manual' | null;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const emptyItem = (): InventoryFormItem => ({
  product_id: '', product_name: '', quantity: '', purchase_price: '', selling_price: '', wholesale_price: '', total: 0,
});

export function StockEntryCreateDialog({
  open,
  onOpenChange,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
  const userStoreId = user?.store_id || (user?.stores && user.stores.length > 0 ? String(user.stores.find(s => s.type === 'b')?.id || user.stores[0].id) : '');

  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  // Kirim qilinadigan do'kon — mahsulotlar ro'yxati ham shu tanlovga bog'liq
  const [storeId, setStoreId] = useState(isAdmin ? '' : userStoreId);
  const { products: allProducts, loading: productsLoading, refreshProducts } = useProducts();

  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeSuppliers = useMemo(() => (Array.isArray(suppliers) ? suppliers : []), [suppliers]);
  const safeProducts = useMemo(() => {
    if (productsLoading) return [];
    if (isAdmin) return allProducts;
    // Xodim uchun tanlangan (o'z) do'kon mahsulotlari
    const scope = storeId || userStoreId;
    return allProducts.filter((p) => String(p.store_id) === String(scope));
  }, [allProducts, productsLoading, isAdmin, storeId, userStoreId]);

  // Superadmin — barcha faol do'konlarga kirim qila oladi;
  // do'kon xodimi — faqat o'ziga biriktirilgan do'kon(lar)ga
  const selectableStores = useMemo(() => {
    if (isAdmin) return safeStores;
    const ownIds = new Set((user?.stores || []).map((s) => String(s.id)));
    if (userStoreId) ownIds.add(String(userStoreId));
    return safeStores.filter((s) => ownIds.has(String(s.id)));
  }, [isAdmin, safeStores, user, userStoreId]);

  const supplierOptions = useMemo(
    () => safeSuppliers.map((s) => ({
      value: String(s.id),
      label: s.phone_number ? `${s.name} — ${s.phone_number}` : s.name,
    })),
    [safeSuppliers]
  );
  const productOptions = useMemo(
    () => safeProducts.map((p) => ({ value: String(p.id), label: p.name })),
    [safeProducts]
  );

  // ─── Wizard holati ───
  const [view, setView] = useState<WizardView>('loading');
  const [activeSessions, setActiveSessions] = useState<PurchaseSession[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionStatus, setSessionStatus] = useState<PurchaseSessionStatus>('in_progress');
  const [step, setStep] = useState<WizardStep>(1);
  const [stepLoading, setStepLoading] = useState(false);
  const [cancelSessionId, setCancelSessionId] = useState<number | null>(null);
  const [cancellingSession, setCancellingSession] = useState(false);

  // ─── Forma holati ───
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<InventoryFormItem[]>([emptyItem()]);
  const [cashAmount, setCashAmount] = useState<number | ''>('');
  const [cardAmount, setCardAmount] = useState<number | ''>('');
  const [bankCardId, setBankCardId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(null);
  const [supplierError, setSupplierError] = useState(false);
  const [itemErrors, setItemErrors] = useState<ItemErrors[]>([]);

  // ─── Avto-saqlash ───
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (!isAdmin && userStoreId) {
      setStoreId(userStoreId);
    }
  }, [isAdmin, userStoreId]);

  // Product Dialog States
  const { categories, refreshCategories } = useCategories();
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [newProductData, setNewProductData] = useState<ProductFormData>({
    name: '',
    name_uz_cyrl: '',
    category: '',
    unit_measurement: '',
    description: '',
    description_uz_cyrl: '',
    purchase_price: '',
    selling_price: '',
    location: '',
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Category & Unit Dialog states inside Stock Entry
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name_uz: '',
    name_uz_cyrl: '',
    description_uz: '',
    description_uz_cyrl: '',
    image: '',
  });

  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitFormData, setUnitFormData] = useState<ProductUnitFormData>({
    measurement_uz: '',
    measurement_uz_cyrl: '',
  });

  const loadDialogData = useCallback(async () => {
    try {
      const [unitsRes, locationsRes] = await Promise.all([
        productUnitService.getAll(),
        productLocationService.getAll()
      ]);
      setUnits(unitsRes || []);
      setLocations(locationsRes?.data || []);
    } catch (err) {
      console.error('Failed to load dialog reference data', err);
    }
  }, []);

  useEffect(() => {
    if (isProductDialogOpen) {
      void loadDialogData();
    }
  }, [isProductDialogOpen, loadDialogData]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [imagePreviews]);

  // ─── Sessiya payload ───
  const buildSessionPayload = useCallback((currentStep: WizardStep): PurchaseSessionPayload => ({
    supplier: supplierId ? Number(supplierId) : undefined,
    store: storeId ? Number(storeId) : undefined,
    items: items.map((it) => ({
      product: it.product_id ? Number(it.product_id) : null,
      product_name: it.product_name || '',
      quantity: String(it.quantity === '' ? 0 : it.quantity),
      purchase_price: String(it.purchase_price === '' ? 0 : it.purchase_price),
      selling_price: String(it.selling_price === '' ? 0 : it.selling_price),
      wholesale_price: String(it.wholesale_price === '' ? 0 : it.wholesale_price),
    })),
    cash_amount: (cashAmount === '' ? 0 : cashAmount).toFixed(2),
    card_amount: (cardAmount === '' ? 0 : cardAmount).toFixed(2),
    bank_card: bankCardId ? Number(bankCardId) : null,
    current_step: currentStep,
  }), [supplierId, storeId, items, cashAmount, cardAmount, bankCardId]);

  // Avto-saqlash: forma o'zgarganda 800ms dan keyin sessiyaga PATCH
  useEffect(() => {
    if (!open || view !== 'wizard' || !sessionId || stepLoading) return;
    const payload = buildSessionPayload(step);
    const key = JSON.stringify(payload);
    if (key === lastSavedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        setSaveState('saving');
        await purchaseSessionService.update(sessionId, payload);
        lastSavedRef.current = key;
        setSaveState('saved');
      } catch (error) {
        console.error('Failed to autosave purchase session:', error);
        setSaveState('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [open, view, sessionId, step, stepLoading, buildSessionPayload]);

  // Saqlanmagan o'zgarishlarni darhol yuborish (bosqich o'tishlarida)
  const flushSave = useCallback(async (currentStep: WizardStep) => {
    if (!sessionId) return;
    const payload = buildSessionPayload(currentStep);
    const key = JSON.stringify(payload);
    if (key === lastSavedRef.current) return;
    setSaveState('saving');
    await purchaseSessionService.update(sessionId, payload);
    lastSavedRef.current = key;
    setSaveState('saved');
  }, [sessionId, buildSessionPayload]);

  const resetForm = useCallback(() => {
    setSupplierId('');
    setStoreId(isAdmin ? '' : userStoreId);
    setItems([emptyItem()]);
    setCashAmount('');
    setCardAmount('');
    setPaymentMode(null);
    setSupplierError(false);
    setItemErrors([]);
    setSessionId(null);
    setSessionStatus('in_progress');
    setStep(1);
    setSaveState('idle');
    lastSavedRef.current = '';
    const defaultCard = bankCards.find((card) => card.is_default) ?? bankCards[0];
    setBankCardId(defaultCard ? String(defaultCard.id) : '');
  }, [isAdmin, userStoreId, bankCards]);

  const loadData = useCallback(async () => {
    try {
      const [storesRes, suppliersRes, cardsRes] = await Promise.all([
        storeService.getAll(),
        supplierService.getAll(),
        // Kirim bo'limida ko'rinadigan to'lov usullari (scope: purchase/both)
        bankCardService.getAll({ is_active: true, scope: 'purchase' }).catch(() => [] as BankCard[]),
      ]);
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
      setBankCards(cardsRes);
      const defaultCard = cardsRes.find((card) => card.is_default) ?? cardsRes[0];
      setBankCardId((prev) => prev || (defaultCard ? String(defaultCard.id) : ''));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const sessions = await purchaseSessionService.getActive();
      setActiveSessions(sessions);
      return sessions;
    } catch (error) {
      console.error('Failed to load purchase sessions:', error);
      setActiveSessions([]);
      return [] as PurchaseSession[];
    }
  }, []);

  // Dialog ochilganda: ma'lumotlar + faol sessiyalar
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setView('loading');
    resetForm();
    void loadData();
    void loadSessions().then((sessions) => {
      if (cancelled) return;
      setView(sessions.length > 0 ? 'resume' : 'wizard');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Set default store to "Avtoyon" when stores load
  useEffect(() => {
    if (open && isAdmin && stores.length > 0 && !storeId) {
      const avtoyon = stores.find(s => s.name?.toLowerCase().includes('avtoyon'));
      if (avtoyon) setStoreId(avtoyon.id);
    }
  }, [open, isAdmin, stores, storeId]);

  // ─── Sessiyani davom ettirish / yangi boshlash ───
  const loadSessionIntoForm = (s: PurchaseSession) => {
    setSupplierId(String(s.supplier));
    setStoreId(String(s.store));
    const loadedItems: InventoryFormItem[] = (s.items && s.items.length > 0 ? s.items : []).map((it) => {
      const qty = Number(it.quantity) || 0;
      const purchase = Number(it.purchase_price) || 0;
      const selling = Number(it.selling_price) || 0;
      const wholesale = Number(it.wholesale_price) || 0;
      return {
        product_id: it.product ? String(it.product) : '',
        product_name: it.product_name || '',
        quantity: qty || '',
        purchase_price: purchase || '',
        selling_price: selling || '',
        wholesale_price: wholesale || '',
        total: purchase * qty,
      };
    });
    setItems(loadedItems.length > 0 ? loadedItems : [emptyItem()]);
    const cash = Number(s.cash_amount) || 0;
    const card = Number(s.card_amount) || 0;
    setCashAmount(cash || '');
    setCardAmount(card || '');
    if (s.bank_card) setBankCardId(String(s.bank_card));
    setPaymentMode(cash > 0 || card > 0 ? 'manual' : null);
    setSessionId(s.id);
    setSessionStatus(s.status);
    const resumeStep = s.status === 'received' ? 3 : ((s.current_step || 1) as WizardStep);
    setStep(resumeStep);
    lastSavedRef.current = '';
    setSaveState('idle');
    setView('wizard');
  };

  const handleStartNew = () => {
    resetForm();
    setView('wizard');
  };

  const handleCancelSession = async (id: number) => {
    try {
      setCancellingSession(true);
      await purchaseSessionService.cancel(id);
      toast.success(t('purchaseSession.cancelled', 'Sessiya bekor qilindi'));
      const sessions = await loadSessions();
      if (sessions.length === 0 && view === 'resume') {
        handleStartNew();
      }
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setCancellingSession(false);
      setCancelSessionId(null);
    }
  };

  // ─── Bosqich o'tishlari ───

  // 1-bosqich → 2: ta'minotchi/do'kon tanlangan bo'lsa sessiya yaratiladi (yoki yangilanadi)
  const handleStepOneContinue = async () => {
    if (!supplierId) {
      setSupplierError(true);
      toast.error(t('purchaseSession.selectSupplierFirst', "Ta'minotchini tanlang"));
      return;
    }
    if (!storeId) {
      toast.error(t('purchaseSession.selectStoreFirst', "Do'konni tanlang"));
      return;
    }
    try {
      setStepLoading(true);
      if (!sessionId) {
        const created = await purchaseSessionService.create({
          supplier: Number(supplierId),
          store: Number(storeId),
          items: [],
          current_step: 2,
        });
        setSessionId(created.id);
        setSessionStatus(created.status);
        lastSavedRef.current = '';
      } else {
        await flushSave(2);
      }
      setStep(2);
      setSaveState('saved');
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setStepLoading(false);
    }
  };

  // 2-bosqich → 3: "Qabul qilish" — mahsulotlar validatsiyadan o'tadi,
  // sessiya "qabul qilingan (tasdiqlanmagan)" holatga o'tadi
  const handleReceive = async () => {
    let hasError = false;
    const newItemErrors: ItemErrors[] = items.map(item => {
      const errors: ItemErrors = {
        product_id: !item.product_id,
        quantity: item.quantity === '' || Number(item.quantity) <= 0,
        purchase_price: item.purchase_price === '' || Number(item.purchase_price) <= 0,
        selling_price: item.selling_price === '' || Number(item.selling_price) <= 0,
        wholesale_price: item.wholesale_price === '' || Number(item.wholesale_price) <= 0,
      };
      if (errors.product_id || errors.quantity || errors.purchase_price || errors.selling_price || errors.wholesale_price) {
        hasError = true;
      }
      return errors;
    });
    setItemErrors(newItemErrors);

    if (hasError) {
      toast.error(t('errors.validationError', 'Barcha majburiy maydonlarni to\'ldiring'));
      return;
    }
    if (anyPriceRuleError) {
      toast.error(
        t('purchaseSession.priceRuleToast', "Narx qoidasi buzilgan: Xarid narxi ≤ Ulgurji narx ≤ Sotish narxi bo'lishi kerak")
      );
      return;
    }
    if (!sessionId) return;

    try {
      setStepLoading(true);
      await flushSave(2);
      const session = await purchaseSessionService.receive(sessionId);
      setSessionStatus(session.status);
      setStep(3);
      toast.success(
        t('purchaseSession.received', "Mahsulotlar qabul qilindi — to'lov yakunlangach tasdiqlash mumkin")
      );
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setStepLoading(false);
    }
  };

  // 3-bosqich: "Tasdiqlash" — haqiqiy kirim yaratiladi
  const handleConfirm = async () => {
    if (!sessionId) return;
    try {
      setStepLoading(true);
      await flushSave(3);
      const result = await purchaseSessionService.confirm(sessionId);
      toast.success(t('inventory.inventoryCreated', 'Kirim muvaffaqiyatli yaratildi'));
      try {
        await refreshProducts();
      } catch (err) {
        console.error('Failed to refresh products after stock entry:', err);
      }
      console.debug('Purchase session confirmed:', result);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setStepLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
  };

  // ─── Mahsulot qatori boshqaruvi ───
  const handleItemChange = (index: number, field: keyof InventoryFormItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const product = safeProducts.find(p => String(p.id) === String(value));
      if (product) {
        // Mahsulot almashtirilganda: miqdor qayta kiritiladi (eski miqdor qolib ketmasligi uchun),
        // narxlar esa yangi mahsulotning avvalgi kirim narxlaridan olinadi.
        // Avval kirim qilinmagan mahsulotda narx 0 bo'ladi — inputda "0" turib
        // qolmasligi uchun bo'sh qoldiramiz (foydalanuvchi o'zi kiritadi)
        const purchase = Number(product.purchase_price) || 0;
        const selling = Number(product.selling_price) || 0;
        const wholesale = Number(product.wholesale_price) || 0;
        newItems[index] = {
          ...newItems[index],
          product_id: String(value),
          product_name: product.name,
          quantity: '',
          purchase_price: purchase > 0 ? purchase : '',
          selling_price: selling > 0 ? selling : '',
          wholesale_price: wholesale > 0 ? wholesale : '',
          total: 0,
        };
      }
    } else if (field === 'quantity') {
      const qty = value === '' ? '' : Number(value);
      newItems[index] = {
        ...newItems[index],
        quantity: qty,
        total: ((newItems[index].purchase_price || 0) as number) * (qty as number || 0),
      };
    } else if (field === 'purchase_price') {
      const price = value === '' ? '' : Number(value);
      newItems[index] = {
        ...newItems[index],
        purchase_price: price,
        total: (price || 0) * (newItems[index].quantity || 0),
      };
    } else if (field === 'selling_price') {
      newItems[index] = {
        ...newItems[index],
        selling_price: value === '' ? '' : Number(value),
      };
    } else if (field === 'wholesale_price') {
      newItems[index] = {
        ...newItems[index],
        wholesale_price: value === '' ? '' : Number(value),
      };
    }
    setItems(newItems);
  };

  // Fokusda qiymatni belgilash — mavjud "0" ustidan yozganda old raqam qolib ketmasligi uchun
  const selectOnFocus = (e: FocusEvent<HTMLInputElement>) => e.target.select();

  const addItem = () => {
    setItems([...items, emptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setItemErrors(prev => prev.filter((_, i) => i !== index));
  };

  const clearItemError = (index: number, field: keyof ItemErrors) => {
    setItemErrors(prev => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], [field]: false };
      return next;
    });
  };

  // ─── Narx qoidasi: xarid ≤ ulgurji ≤ sotish (backend bilan bir xil) ───
  // Yozish paytida jonli tekshiriladi — buzilgan input qizil bo'lib,
  // ostida tushuntirish chiqadi; "Qabul qilish" ham bloklanadi.
  const getPriceRuleErrors = (item: InventoryFormItem) => {
    const purchase = Number(item.purchase_price) || 0;
    const selling = Number(item.selling_price) || 0;
    const wholesale = Number(item.wholesale_price) || 0;
    return {
      // Sotish narxi xarid narxidan past bo'lmasligi kerak
      sellingBelowPurchase: purchase > 0 && selling > 0 && selling < purchase,
      // Ulgurji narx xarid narxidan past bo'lmasligi kerak
      wholesaleBelowPurchase: purchase > 0 && wholesale > 0 && wholesale < purchase,
      // Ulgurji narx sotish narxidan yuqori bo'lmasligi kerak
      wholesaleAboveSelling: selling > 0 && wholesale > 0 && wholesale > selling,
    };
  };

  const hasPriceRuleError = (e: ReturnType<typeof getPriceRuleErrors>) =>
    e.sellingBelowPurchase || e.wholesaleBelowPurchase || e.wholesaleAboveSelling;

  const anyPriceRuleError = items.some((it) => hasPriceRuleError(getPriceRuleErrors(it)));

  // ─── Hisob-kitoblar ───
  const total = items.reduce((sum, item) => {
    const qty = item.quantity === '' ? 0 : item.quantity;
    const price = item.purchase_price === '' ? 0 : item.purchase_price;
    return sum + (qty as number) * (price as number);
  }, 0);

  const totalPaid = (cashAmount === '' ? 0 : cashAmount) + (cardAmount === '' ? 0 : cardAmount);
  const debt = Math.max(0, total - totalPaid);
  const isOverpaid = totalPaid > total;
  const filledItemsCount = items.filter((it) => it.product_id).length;

  const paymentTouched = paymentMode !== null;
  const cardNeedsBankCard = (cardAmount === '' ? 0 : cardAmount) > 0;
  const confirmDisabled =
    stepLoading ||
    !paymentTouched ||
    isOverpaid ||
    (cardNeedsBankCard && (!bankCardId || bankCards.length === 0));

  // ─── To'lov tez tanlovlari (sotuv qismidagi kabi) ───
  const handleQuickCash = () => {
    setCashAmount(total);
    setCardAmount('');
    setPaymentMode('cash');
  };
  const handleQuickCard = () => {
    setCardAmount(total);
    setCashAmount('');
    setPaymentMode('card');
  };
  const handleQuickDebt = () => {
    setCashAmount('');
    setCardAmount('');
    setPaymentMode('debt');
  };

  // ─── Yangi mahsulot yaratish (2-bosqich, tepadagi tugma) ───
  const handleProductSubmit = async () => {
    if (!newProductData.name || !newProductData.unit_measurement) {
      toast.error(t('errors.validationError', 'Barcha majdonlarni to\'ldiring'));
      return;
    }

    try {
      setProductSaving(true);
      const payload: ProductFormData = {
        ...newProductData,
        images: imageFiles,
        store_id: userStoreId || storeId || undefined,
      };

      const createdProduct = await productService.create(payload);
      toast.success(t('products.productAdded', 'Mahsulot muvaffaqiyatli qo\'shildi'));
      await refreshProducts();

      // Yangi mahsulot birinchi bo'sh qatorga joylanadi, bo'sh qator bo'lmasa yangi qator ochiladi
      const purchasePrice = createdProduct.purchase_price !== null && createdProduct.purchase_price !== undefined
        ? Number(createdProduct.purchase_price)
        : Number(newProductData.purchase_price) || 0;
      const sellingPrice = createdProduct.selling_price !== null && createdProduct.selling_price !== undefined
        ? Number(createdProduct.selling_price)
        : Number(newProductData.selling_price) || 0;

      setItems(prev => {
        const next = [...prev];
        const emptyIndex = next.findIndex((it) => !it.product_id);
        const filled: InventoryFormItem = {
          ...(emptyIndex >= 0 ? next[emptyIndex] : emptyItem()),
          product_id: String(createdProduct.id),
          product_name: createdProduct.name,
          purchase_price: purchasePrice || '',
          selling_price: sellingPrice || '',
        };
        filled.total = (Number(filled.purchase_price) || 0) * (Number(filled.quantity) || 0);
        if (emptyIndex >= 0) {
          next[emptyIndex] = filled;
        } else {
          next.push(filled);
        }
        return next;
      });

      setNewProductData({
        name: '',
        name_uz_cyrl: '',
        category: '',
        unit_measurement: '',
        description: '',
        description_uz_cyrl: '',
        purchase_price: '',
        selling_price: '',
        location: '',
      });
      setImageFiles([]);
      setImagePreviews([]);
      setIsProductDialogOpen(false);
    } catch (error) {
      console.error('Failed to create product:', error);
      toast.error(t('errors.generic', 'Mahsulot qo\'shishda xatolik yuz berdi'));
    } finally {
      setProductSaving(false);
    }
  };

  const handleCategorySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setSavingCategory(true);
      const created = await categoryService.create(categoryFormData);
      toast.success(t('categories.categoryAdded', 'Kategoriya muvaffaqiyatli qo\'shildi'));
      await refreshCategories();
      setNewProductData((prev) => ({ ...prev, category: created.id }));
      setIsCategoryDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error(t('errors.generic', 'Xatolik yuz berdi'));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUnitSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setSavingUnit(true);
      const created = await productUnitService.create(unitFormData);
      toast.success(t('products.unitAdded', 'O\'lchov birligi muvaffaqiyatli qo\'shildi'));
      const unitList = await productUnitService.getAll();
      setUnits(unitList);
      setNewProductData((prev) => ({ ...prev, unit_measurement: created.id }));
      setIsUnitDialogOpen(false);
    } catch (error) {
      console.error('Failed to save unit:', error);
      toast.error(t('errors.generic', 'Xatolik yuz berdi'));
    } finally {
      setSavingUnit(false);
    }
  };

  // ─── UI qismlar ───
  const steps: { key: WizardStep; label: string; icon: typeof ShoppingCart }[] = [
    { key: 1, label: t('purchaseSession.stepPurchase', 'Xarid'), icon: ShoppingCart },
    { key: 2, label: t('purchaseSession.stepProducts', 'Mahsulotlar'), icon: Package },
    { key: 3, label: t('purchaseSession.stepPayment', "To'lov"), icon: Wallet },
  ];

  const renderStepper = () => (
    <div className="flex items-center justify-center gap-0 py-2">
      {steps.map((s, i) => {
        const isDone = step > s.key;
        const isCurrent = step === s.key;
        const Icon = s.icon;
        const clickable = s.key < step;
        return (
          <div key={s.key} className="flex items-center">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setStep(s.key)}
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                isCurrent && 'bg-primary text-primary-foreground shadow-sm',
                isDone && 'text-primary hover:bg-primary/10 cursor-pointer',
                !isCurrent && !isDone && 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-xs shrink-0',
                  isCurrent && 'border-primary-foreground/40 bg-primary-foreground/10',
                  isDone && 'border-primary bg-primary text-primary-foreground',
                  !isCurrent && !isDone && 'border-border'
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn('mx-1 h-px w-6 sm:w-10', step > s.key ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderSaveIndicator = () => {
    if (!sessionId || view !== 'wizard') return null;
    if (saveState === 'saving') {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('purchaseSession.saving', 'Saqlanmoqda…')}
        </span>
      );
    }
    if (saveState === 'saved') {
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <Check className="h-3 w-3" />
          {t('purchaseSession.saved', 'Saqlandi')}
        </span>
      );
    }
    if (saveState === 'error') {
      return (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <X className="h-3 w-3" />
          {t('purchaseSession.saveError', 'Saqlashda xatolik')}
        </span>
      );
    }
    return null;
  };

  const renderResumeView = () => (
    <div className="space-y-4 py-2">
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-800/50 dark:bg-amber-950/20 px-4 py-3">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {t(
            'purchaseSession.resumeHint',
            "Tugallanmagan xaridlaringiz bor. Davom ettirishingiz yoki yangi xarid boshlashingiz mumkin."
          )}
        </p>
      </div>

      <div className="space-y-3">
        {activeSessions.map((s) => (
          <div
            key={s.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 bg-muted/20"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold truncate">{s.supplier_name || `#${s.supplier}`}</p>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground truncate">{s.store_name || `#${s.store}`}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span>{s.items_count ?? s.items?.length ?? 0} {t('purchaseSession.itemsShort', 'ta mahsulot')}</span>
                <span>•</span>
                <span>{formatCurrency(Number(s.total_amount) || 0)}</span>
                {s.updated_at && (
                  <>
                    <span>•</span>
                    <span>{formatDate(s.updated_at)}</span>
                  </>
                )}
              </div>
              <div>
                {s.status === 'received' ? (
                  <Badge variant="warning">
                    {t('purchaseSession.statusReceived', 'Qabul qilingan — tasdiqlanmagan')}
                  </Badge>
                ) : (
                  <Badge variant="info">
                    {t('purchaseSession.statusInProgress', 'Jarayonda')} — {s.current_step}/3
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => loadSessionIntoForm(s)}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                {t('purchaseSession.resume', 'Davom ettirish')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setCancelSessionId(s.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full border-dashed" onClick={handleStartNew}>
        <Plus className="h-4 w-4 mr-2" />
        {t('purchaseSession.startNew', 'Yangi xarid boshlash')}
      </Button>
    </div>
  );

  const renderStepOne = () => (
    // min-h — ta'minotchi qidiruv ro'yxati modal ichida bemalol ochilishi uchun joy
    <div className="space-y-6 py-2 min-h-[360px]">
      <p className="text-sm text-muted-foreground">
        {t(
          'purchaseSession.stepOneHint',
          "Kimdan xarid qilinayotgani (ta'minotchi) va qaysi omborga kirim qilinishini tanlang."
        )}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={supplierError ? 'text-red-500' : ''}>
            {t('suppliers.title', "Ta'minotchi")} <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            value={supplierId}
            onValueChange={(v) => { setSupplierId(v); setSupplierError(false); }}
            options={supplierOptions}
            placeholder={t('inventory.selectSupplier', 'Tanlang')}
            searchPlaceholder={t('purchaseSession.searchSupplier', "Ta'minotchini qidirish…")}
            emptyMessage={t('purchaseSession.noSupplierFound', "Ta'minotchi topilmadi")}
            countLabel={t('purchaseSession.suppliersCount', "ta ta'minotchi")}
            className={cn(supplierError && '[&>button]:border-red-500 [&>button]:focus:ring-red-500/30')}
          />
          {supplierError && (
            <p className="text-xs text-red-500">{t('purchaseSession.selectSupplierFirst', "Ta'minotchini tanlang")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>{t('stores.title', "Do'kon")}</Label>
          {/* Superadmin — istalgan do'konga; xodim — faqat o'z do'kon(lar)iga */}
          <Select
            value={storeId}
            onValueChange={setStoreId}
            disabled={!isAdmin && selectableStores.length <= 1}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder={t('inventory.selectLocation', 'Tanlang')} />
            </SelectTrigger>
            <SelectContent>
              {selectableStores.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              {t('purchaseSession.ownStoreHint', "Kirim faqat o'zingizga biriktirilgan do'konga qilinadi")}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-medium">{t('products.title', 'Mahsulotlar')}</h3>
        {/* Yangi mahsulot yaratish — katalogda yo'q mahsulot uchun */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsProductDialogOpen(true)}
        >
          <PackagePlus className="h-4 w-4 mr-2" />
          {t('purchaseSession.createNewProduct', "Yangi mahsulot qo'shish")}
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const priceErrors = getPriceRuleErrors(item);
          return (
          <div
            key={index}
            className={cn(
              'rounded-lg border p-4 bg-muted/20 relative',
              hasPriceRuleError(priceErrors) && 'border-red-300 dark:border-red-800/60'
            )}
          >
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label className={cn('text-xs', itemErrors[index]?.product_id && 'text-red-500')}>
                  {t('products.title', 'Mahsulot')}
                </Label>
                <SearchableSelect
                  value={item.product_id}
                  onValueChange={(v: string) => {
                    handleItemChange(index, 'product_id', v);
                    clearItemError(index, 'product_id');
                  }}
                  options={productOptions}
                  placeholder={t('inventory.selectProduct', 'Tanlang')}
                  searchPlaceholder={t('purchaseSession.searchProduct', 'Mahsulotni qidirish…')}
                  emptyMessage={t('purchaseSession.noProductFound', 'Mahsulot topilmadi')}
                  className={cn(itemErrors[index]?.product_id && '[&>button]:border-red-500 [&>button]:focus:ring-red-500/30')}
                />
              </div>
              <div className="space-y-2">
                <Label className={cn('text-xs', itemErrors[index]?.quantity && 'text-red-500')}>{t('inventory.quantity', 'Miqdor')}</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={item.quantity}
                  onFocus={selectOnFocus}
                  className={itemErrors[index]?.quantity ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    handleItemChange(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value));
                    clearItemError(index, 'quantity');
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className={cn('text-xs', itemErrors[index]?.purchase_price && 'text-red-500')}>{t('inventory.purchasePrice', 'Xarid narxi')}</Label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={item.purchase_price}
                  onFocus={selectOnFocus}
                  className={itemErrors[index]?.purchase_price ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    handleItemChange(index, 'purchase_price', e.target.value === '' ? '' : Number(e.target.value));
                    clearItemError(index, 'purchase_price');
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label
                  className={cn(
                    'text-xs',
                    (itemErrors[index]?.selling_price || priceErrors.sellingBelowPurchase) && 'text-red-500'
                  )}
                >
                  {t('products.sellingPrice', 'Sotuv narxi')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={item.selling_price}
                  onFocus={selectOnFocus}
                  className={cn(
                    (itemErrors[index]?.selling_price || priceErrors.sellingBelowPurchase) &&
                      'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                  )}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    handleItemChange(index, 'selling_price', e.target.value === '' ? '' : Number(e.target.value));
                    clearItemError(index, 'selling_price');
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label
                  className={cn(
                    'text-xs',
                    (itemErrors[index]?.wholesale_price || priceErrors.wholesaleBelowPurchase || priceErrors.wholesaleAboveSelling) && 'text-red-500'
                  )}
                >
                  {t('products.wholesalePrice', 'Ulgurji narx')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={item.wholesale_price}
                  onFocus={selectOnFocus}
                  className={cn(
                    (itemErrors[index]?.wholesale_price || priceErrors.wholesaleBelowPurchase || priceErrors.wholesaleAboveSelling) &&
                      'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                  )}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    handleItemChange(index, 'wholesale_price', e.target.value === '' ? '' : Number(e.target.value));
                    clearItemError(index, 'wholesale_price');
                  }}
                />
              </div>
            </div>

            {/* Narx qoidasi buzilganda tushuntirish xabarlari */}
            {hasPriceRuleError(priceErrors) && (
              <div className="mt-2 space-y-0.5">
                {priceErrors.sellingBelowPurchase && (
                  <p className="text-xs font-medium text-red-500">
                    {t('purchaseSession.priceRuleSelling', "Sotish narxi xarid narxidan past bo'lmasligi kerak")}
                  </p>
                )}
                {priceErrors.wholesaleBelowPurchase && (
                  <p className="text-xs font-medium text-red-500">
                    {t('purchaseSession.priceRuleWholesaleLow', "Ulgurji narx xarid narxidan past bo'lmasligi kerak")}
                  </p>
                )}
                {priceErrors.wholesaleAboveSelling && (
                  <p className="text-xs font-medium text-red-500">
                    {t('purchaseSession.priceRuleWholesaleHigh', "Ulgurji narx sotish narxidan yuqori bo'lmasligi kerak")}
                  </p>
                )}
              </div>
            )}
            {Number(item.quantity) > 0 && Number(item.purchase_price) > 0 && (
              <p className="mt-2 text-xs text-muted-foreground text-right">
                {t('common.total', 'Jami')}: <span className="font-semibold text-foreground">{formatCurrency(item.total)}</span>
              </p>
            )}
          </div>
          );
        })}
      </div>

      {/* Qator qo'shish — ro'yxat pastida */}
      <Button type="button" variant="outline" className="w-full border-dashed" onClick={addItem}>
        <Plus className="h-4 w-4 mr-2" />
        {t('inventory.addProduct', "Mahsulot qo'shish")}
      </Button>

      {/* Narx qoidasi buzilgan qatorlar bo'lsa umumiy ogohlantirish */}
      {anyPriceRuleError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 px-4 py-2.5">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {t(
              'purchaseSession.priceRuleBanner',
              "Narx qoidasi: Xarid narxi ≤ Ulgurji narx ≤ Sotish narxi. Qizil belgilangan qatorlarni to'g'rilang."
            )}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {filledItemsCount} {t('purchaseSession.itemsShort', 'ta mahsulot')}
        </span>
        <span className="text-base font-bold">{t('common.total', 'Jami')}: {formatCurrency(total)}</span>
      </div>
    </div>
  );

  const renderStepThree = () => {
    const cardValue = cardAmount === '' ? 0 : cardAmount;
    return (
      <div className="space-y-4 py-2">
        {sessionStatus === 'received' && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-800/50 dark:bg-amber-950/20 px-4 py-2.5">
            <ClipboardCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {t(
                'purchaseSession.receivedBanner',
                "Mahsulotlar qabul qilingan, lekin hali tasdiqlanmagan. To'lovni belgilab, tasdiqlang."
              )}
            </p>
          </div>
        )}

        {/* Tez tanlov — sotuv qismidagi kabi */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('payment.title', "To'lov")}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={paymentMode === 'cash' ? 'default' : 'outline'}
              className={cn(
                'h-12 text-xs flex-col gap-0.5',
                paymentMode === 'cash' && 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
              onClick={handleQuickCash}
            >
              <span className="flex items-center gap-1.5">
                <Banknote className="h-4 w-4" /> {t('payment.cash', 'Naqd')}
              </span>
              {paymentMode === 'cash' && (
                <span className="text-[10px] font-normal opacity-90 tabular-nums">{formatCurrency(total)}</span>
              )}
            </Button>
            <Button
              type="button"
              variant={paymentMode === 'card' ? 'default' : 'outline'}
              className={cn(
                'h-12 text-xs flex-col gap-0.5',
                paymentMode === 'card' && 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
              onClick={handleQuickCard}
            >
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" /> {t('payment.card', 'Karta')}
              </span>
              {paymentMode === 'card' && (
                <span className="text-[10px] font-normal opacity-90 tabular-nums">{formatCurrency(total)}</span>
              )}
            </Button>
            <Button
              type="button"
              variant={paymentMode === 'debt' ? 'default' : 'outline'}
              className={cn(
                'h-12 text-xs flex-col gap-0.5',
                paymentMode === 'debt' && 'bg-red-600 hover:bg-red-700 text-white'
              )}
              onClick={handleQuickDebt}
            >
              <span className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4" /> {t('purchaseSession.onDebt', 'Qarzga')}
              </span>
              {paymentMode === 'debt' && (
                <span className="text-[10px] font-normal opacity-90 tabular-nums">{formatCurrency(total)}</span>
              )}
            </Button>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {t('purchaseSession.mixedHint', "Aralash to'lov uchun summalarni qo'lda kiriting")}
          </p>
        </div>

        {/* Summalar — qarzga rejimida to'lov kiritilmaydi, shuning uchun yashirin */}
        {paymentMode !== 'debt' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {t('payment.cash', 'Naqd')}
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0.00"
                value={cashAmount}
                onFocus={selectOnFocus}
                className={isOverpaid ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setCashAmount(val);
                  setPaymentMode('manual');
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {t('payment.card', 'Karta')}
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0.00"
                value={cardAmount}
                onFocus={selectOnFocus}
                className={isOverpaid ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setCardAmount(val);
                  setPaymentMode('manual');
                }}
              />
            </div>
          </div>
        )}

        {/* To'lov usuli — karta summasi kiritilganda tugmalar orqali tanlanadi */}
        {paymentMode !== 'debt' && cardValue > 0 && (
          <div className="rounded-xl border border-dashed p-3 bg-muted/10 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('purchaseSession.paymentMethod', "To'lov usuli / karta")}
            </Label>
            {bankCards.length === 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 px-3 py-2">
                <p className="text-xs text-red-600 dark:text-red-400">
                  {t('purchaseSession.noBankCards', "Kirim uchun faol to'lov usuli yo'q — sozlamalardan qo'shing")}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {bankCards.map((card) => {
                  const selected = bankCardId === String(card.id);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setBankCardId(String(card.id))}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        selected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      {card.name}
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Xulosa */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/20 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('common.total', 'Jami')}:</span>
            <span className="font-bold">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('inventory.paid', "To'langan")}:</span>
            <span className="font-bold">{formatCurrency(totalPaid)}</span>
          </div>
          {isOverpaid ? (
            <div className="flex justify-between text-sm">
              <span className="font-medium text-red-600 dark:text-red-400">{t('sales.overpaid', 'Ortiqcha summa')}</span>
              <span className="font-bold text-red-600 dark:text-red-400">+{formatCurrency(totalPaid - total)}</span>
            </div>
          ) : debt > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('suppliers.debt', 'Qarz')}:</span>
              <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(debt)}</span>
            </div>
          ) : paymentTouched ? (
            <div className="flex justify-between text-sm">
              <span className="font-medium text-green-600">{t('common.paid', "To'langan")}</span>
              <Check className="h-4 w-4 text-green-600" />
            </div>
          ) : null}
        </div>

        {isOverpaid && (
          <p className="text-[11px] leading-snug text-red-600 dark:text-red-400">
            {t('sales.overpaidWarning', "To'lov summasi jami summadan oshib ketdi")}
          </p>
        )}
        {!paymentTouched && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {t(
              'purchaseSession.confirmHint',
              "Tasdiqlash uchun avval to'lov turini tanlang (naqd, karta, qarzga yoki aralash)."
            )}
          </p>
        )}
      </div>
    );
  };

  const renderFooter = () => {
    if (view !== 'wizard') return null;
    return (
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {sessionId
              ? t('purchaseSession.closeDraft', 'Yopish (saqlanadi)')
              : t('common.cancel', 'Bekor qilish')}
          </Button>
          {step > 1 && (
            <Button type="button" variant="ghost" onClick={handleBack} disabled={stepLoading}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('common.back', 'Orqaga')}
            </Button>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          {step === 1 && (
            <Button type="button" onClick={handleStepOneContinue} disabled={stepLoading}>
              {stepLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              {t('purchaseSession.continue', 'Davom etish')}
            </Button>
          )}
          {step === 2 && (
            <Button
              type="button"
              onClick={handleReceive}
              disabled={stepLoading || filledItemsCount === 0 || anyPriceRuleError}
            >
              {stepLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-2" />
              )}
              {t('purchaseSession.receiveProducts', 'Qabul qilish')}
            </Button>
          )}
          {step === 3 && (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={confirmDisabled}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {stepLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {t('purchaseSession.confirm', 'Tasdiqlash')}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-8">
              <DialogTitle>{t('inventory.createIncomingStock', 'Kirim yaratish')}</DialogTitle>
              {renderSaveIndicator()}
            </div>
          </DialogHeader>

          {view === 'loading' && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t('common.loading', 'Yuklanmoqda...')}
            </div>
          )}

          {view === 'resume' && renderResumeView()}

          {view === 'wizard' && (
            <div className="space-y-2">
              {renderStepper()}
              {step === 1 && renderStepOne()}
              {step === 2 && renderStepTwo()}
              {step === 3 && renderStepThree()}
              {renderFooter()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sessiyani bekor qilish tasdig'i */}
      <ConfirmDialog
        open={cancelSessionId !== null}
        onOpenChange={(o: boolean) => !o && setCancelSessionId(null)}
        onConfirm={() => {
          if (cancelSessionId !== null) {
            void handleCancelSession(cancelSessionId);
          }
        }}
        title={t('purchaseSession.cancelTitle', 'Sessiyani bekor qilish')}
        description={t(
          'purchaseSession.cancelConfirm',
          "Bu xarid qoralamasi bekor qilinadi. Omborga hech qanday o'zgarish kirmagan."
        )}
        confirmText={t('common.delete', "O'chirish")}
        variant="destructive"
        loading={cancellingSession}
      />

      {/* Nested Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent size="lg" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Package className="h-6 w-6 text-primary" />
              {t('purchaseSession.createNewProduct', "Yangi mahsulot qo'shish")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Mahsulot nomi */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {t('products.name', 'Mahsulot nomi')} <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={t('placeholders.enterProductName', 'Tovar nomini kiriting...')}
                value={newProductData.name}
                onChange={(e) => setNewProductData({
                  ...newProductData,
                  name: e.target.value,
                  name_uz_cyrl: latinToCyrillic(e.target.value)
                })}
                required
              />
            </div>

            {/* Kategoriya & O'lchov birligi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  {t('categories.title', 'Kategoriya')}
                </Label>
                <div className="flex gap-2">
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={newProductData.category}
                    onChange={(e) => setNewProductData({ ...newProductData, category: e.target.value })}
                  >
                    <option value="">{t('categories.selectCategory', 'Kategoriyani tanlang')}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setIsCategoryDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  {t('products.unit', 'O\'lchov birligi')}
                </Label>
                <div className="flex gap-2">
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={newProductData.unit_measurement}
                    onChange={(e) => setNewProductData({ ...newProductData, unit_measurement: e.target.value })}
                  >
                    <option value="">{t('products.selectUnit', 'O\'lchov birligini tanlang')}</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.measurement_uz}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setIsUnitDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tavsif */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                {t('products.description', 'Tavsif')}
              </Label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('placeholders.enterProductDescription', 'Tovar tavsifini kiriting...')}
                value={newProductData.description}
                onChange={(e) => setNewProductData({
                  ...newProductData,
                  description: e.target.value,
                  description_uz_cyrl: latinToCyrillic(e.target.value)
                })}
              />
            </div>

            {/* Mahsulot joylashuvi */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {t('products.location', 'Mahsulot joylashuvi')}
              </Label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={newProductData.location}
                onChange={(e) => setNewProductData({ ...newProductData, location: e.target.value })}
              >
                <option value="">{t('products.selectLocation', 'Joylashuvni tanlang')}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.location_uz}</option>
                ))}
              </select>
            </div>

            {/* Rasm */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                {t('products.image', 'Rasm')}
              </Label>
              <div className="relative border border-dashed border-border rounded-xl p-4 hover:bg-muted/30 transition-colors cursor-pointer bg-muted/10">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    imagePreviews.forEach((preview) => {
                      if (preview.startsWith('blob:')) {
                        URL.revokeObjectURL(preview);
                      }
                    });
                    const previews = files.map((file) => URL.createObjectURL(file));
                    setImageFiles(files);
                    setImagePreviews(previews);
                  }}
                />
                {imagePreviews.length > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={imagePreviews[0]}
                      alt="Preview"
                      className="h-24 w-auto rounded-lg object-contain border border-border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFiles([]);
                        setImagePreviews([]);
                      }}
                    >
                      {t('common.delete', 'Rasm o\'chirish')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground/60" />
                    <span className="text-sm font-medium">{t('products.uploadImage', 'Rasm')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button onClick={handleProductSubmit} disabled={productSaving}>
              {productSaving ? t('common.loading', 'Yuklanmoqda...') : `+ ${t('purchaseSession.createNewProduct', "Yangi mahsulot qo'shish")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Category Dialog inside Stock Entry */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('categories.addCategory', 'Kategoriya qo\'shish')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat_name">{t('categories.categoryName', 'Kategoriya nomi')}</Label>
                <Input
                  id="cat_name"
                  value={categoryFormData.name_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCategoryFormData({
                    ...categoryFormData,
                    name_uz: e.target.value,
                    name_uz_cyrl: latinToCyrillic(e.target.value)
                  })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_name_cyrl">{t('categories.categoryName', 'Kategoriya nomi')} (Cyrillic)</Label>
                <Input
                  id="cat_name_cyrl"
                  value={categoryFormData.name_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCategoryFormData((prev) => ({ ...prev, name_uz_cyrl: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_description">{t('common.description', 'Tavsif')}</Label>
                <Input
                  id="cat_description"
                  value={categoryFormData.description_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCategoryFormData({
                    ...categoryFormData,
                    description_uz: e.target.value,
                    description_uz_cyrl: latinToCyrillic(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat_description_cyrl">{t('common.description', 'Tavsif')} (Cyrillic)</Label>
                <Input
                  id="cat_description_cyrl"
                  value={categoryFormData.description_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCategoryFormData((prev) => ({ ...prev, description_uz_cyrl: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                {t('common.cancel', 'Bekor qilish')}
              </Button>
              <Button type="submit" disabled={savingCategory}>
                {savingCategory ? t('common.loading', 'Yuklanmoqda...') : t('common.save', 'Saqlash')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nested Unit Dialog inside Stock Entry */}
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('products.addUnit', 'O\'lchov birligi qo\'shish')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUnitSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="unit_name">{t('products.unitName', 'Birlik nomi')}</Label>
                <Input
                  id="unit_name"
                  value={unitFormData.measurement_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setUnitFormData({
                    ...unitFormData,
                    measurement_uz: e.target.value,
                    measurement_uz_cyrl: latinToCyrillic(e.target.value)
                  })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_name_cyrl">{t('products.unitName', 'Birlik nomi')} (Cyrillic)</Label>
                <Input
                  id="unit_name_cyrl"
                  value={unitFormData.measurement_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setUnitFormData((prev) => ({ ...prev, measurement_uz_cyrl: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
                {t('common.cancel', 'Bekor qilish')}
              </Button>
              <Button type="submit" disabled={savingUnit}>
                {savingUnit ? t('common.loading', 'Yuklanmoqda...') : t('common.save', 'Saqlash')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
