import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Undo2,
  ShoppingCart,
  AlertCircle,
  Search,
  Wallet,
  Minus,
  Plus,
  Receipt,
  CheckCircle2,
  Eraser,
  Phone,
  User,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { CardSplitEditor } from '../../components/shared/CardSplitEditor';
import { useCardSplits } from '../../hooks/useCardSplits';
import { salesService, saleReturnService } from '../../services/salesService';
import { bankCardService } from '../../services/bankCardService';
import { customerApiService, type CustomerFromApi } from '../../services/customerService';
import { useColumnSplitter } from '../../hooks/useColumnSplitter';
import { formatCurrency, formatDate, formatAmountInput, parseAmountInput } from '../../utils';
import { extractErrorMessage } from '../../utils/errorHandler';
import type { Sale, SaleItem, SaleReturnFormItem, SalePaymentInput, BankCard } from '../../types';

/** Itemdan qaytarish mumkin bo'lgan qoldiq (sotilgan - avval qaytarilgan) */
const remainingOf = (item: SaleItem): number =>
  Math.max(0, item.quantity - (item.returned_quantity ?? 0));

const isFullyReturned = (sale: Sale): boolean =>
  Array.isArray(sale.items) &&
  sale.items.length > 0 &&
  sale.items.every((item) => remainingOf(item) === 0);

interface SaleReturnCreatePageProps {
  /** Sotuv sahifasi ichida tab sifatida ishlatilganda: o'z sarlavhasi/orqaga tugmasi ko'rsatilmaydi */
  embedded?: boolean;
}

export function SaleReturnCreatePage({ embedded = false }: SaleReturnCreatePageProps = {}) {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSaleId = searchParams.get('saleId');

  // Panellar orasidagi splitter (Sotuvlar | Mahsulotlar | Xulosa) — faqat xl ekranlarda
  const split = useColumnSplitter({
    storageKey: 'sale_return_panel_widths',
    defaults: [25, 41.67, 33.33],
  });

  // ── Chap ustun: sotuvlar ro'yxati ──────────────────────────────
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotal, setSalesTotal] = useState(0);
  const [loadingSales, setLoadingSales] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ── Markaz: tanlangan sotuv va qaytarish miqdorlari ────────────
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [onlySelected, setOnlySelected] = useState(false);

  // ── O'ng ustun: pul qaytarish va izoh ──────────────────────────
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  // Summalar float xatosiz bo'lishi uchun tiyinda saqlanadi.
  // Naqd/Karta tugmalari tez tanlash uchun; ikkala inputga yozish = aralash taqsimot.
  const [refundCashCents, setRefundCashCents] = useState(0);
  const [refundCardCents, setRefundCardCents] = useState(0);
  // Karta qaytarimini bir nechta kartaga (Uzcard/Humo/...) taqsimlash — sotuvdagi kabi
  const {
    cardSplits,
    activeSplits,
    splitsInvalid,
    updateSplitCard,
    updateSplitAmount,
    addCardSplit,
    removeCardSplit,
  } = useCardSplits(bankCards, Math.round(refundCardCents / 100));

  // Mijoz tafsilotlari modali (xulosadagi "Mijoz" kartasi bosilganda)
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerDetail, setCustomerDetail] = useState<CustomerFromApi | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  const openCustomerModal = async () => {
    const customerId = selectedSale?.customer;
    if (!customerId) return;
    setCustomerModalOpen(true);
    setCustomerLoading(true);
    setCustomerDetail(null);
    try {
      const detail = await customerApiService.getById(Number(customerId));
      setCustomerDetail(detail);
    } catch {
      setCustomerDetail(null);
    } finally {
      setCustomerLoading(false);
    }
  };

  const isNumericSearch = /^\d+$/.test(debouncedSearch);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadSales = useCallback(
    async (pageToLoad: number, search: string, append: boolean) => {
      try {
        setLoadingSales(true);
        const numeric = /^\d+$/.test(search);
        // Matnli qidiruv serverda (mijoz ismi bo'yicha), raqamli — chek raqami sifatida
        const res = await salesService.getAll({
          page: pageToLoad,
          limit: 20,
          search: search && !numeric ? search : undefined,
        });
        let data = res.data || [];

        if (numeric) {
          data = data.filter((sale) => String(sale.id).includes(search));
          // Aniq chek raqami bo'yicha serverdan ham qidiramiz
          try {
            const exact = await salesService.getById(search);
            if (exact && !data.some((sale) => String(sale.id) === String(exact.id))) {
              data = [exact, ...data];
            }
          } catch {
            /* topilmasa — e'tiborsiz */
          }
        }

        setSales((prev) => (append ? [...prev, ...data] : data));
        setSalesTotal(res.total || data.length);
        setSalesPage(pageToLoad);
      } catch {
        if (!append) setSales([]);
      } finally {
        setLoadingSales(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSales(1, debouncedSearch, false);
  }, [debouncedSearch, loadSales]);

  useEffect(() => {
    let cancelled = false;
    // Faqat sotuv bo'limi kartalari (scope=sale/both) — kirim uchun mo'ljallangan
    // "Bank o'tkazmasi" kabi usullar mijozga pul qaytarishda chiqmaydi
    bankCardService
      .getAll({ is_active: true, scope: 'sale' })
      .then((cards) => {
        if (cancelled) return;
        setBankCards(cards);
      })
      .catch(() => setBankCards([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSale = useCallback(async (saleId: string) => {
    if (!saleId) {
      setSelectedSale(null);
      return;
    }
    try {
      setLoadingSale(true);
      const sale = await salesService.getById(saleId);
      setSelectedSale(sale);
      setReturnQuantities({});
      setOnlySelected(false);
      setError('');
    } catch {
      setSelectedSale(null);
      setError(t('common.noData'));
    } finally {
      setLoadingSale(false);
    }
  }, [t]);

  useEffect(() => {
    if (preselectedSaleId) {
      void loadSale(preselectedSaleId);
    }
  }, [preselectedSaleId, loadSale]);

  const handleSelectSale = (sale: Sale) => {
    if (selectedSale && String(selectedSale.id) === String(sale.id)) return;
    void loadSale(String(sale.id));
  };

  // Miqdor har doim [0; qoldiq] oralig'ida qisqartiriladi
  const setItemQty = (item: SaleItem, qty: number) => {
    const clamped = Math.max(0, Math.min(Number.isFinite(qty) ? qty : 0, remainingOf(item)));
    setReturnQuantities((prev) => ({ ...prev, [item.id]: clamped }));
  };

  const returnItems: SaleReturnFormItem[] = useMemo(() => {
    if (!selectedSale) return [];
    return selectedSale.items
      .filter((item) => (returnQuantities[item.id] || 0) > 0)
      .map((item) => ({
        sale_item: item.id,
        quantity: returnQuantities[item.id] || 0,
      }));
  }, [selectedSale, returnQuantities]);

  const hasSelection = returnItems.length > 0;

  // Barcha pul hisoblari tiyinda (butun son) — float xatolari umuman bo'lmaydi
  const toCents = (value: unknown): number => Math.round((Number(value) || 0) * 100);

  const returnTotalCents = useMemo(() => {
    if (!selectedSale) return 0;
    return selectedSale.items.reduce(
      (sum, item) => sum + (returnQuantities[item.id] || 0) * toCents(item.unit_price),
      0,
    );
  }, [selectedSale, returnQuantities]);
  const returnTotal = returnTotalCents / 100;

  // Backend avval qaytarim summasidan sotuv qarzini yopadi — mijozga faqat qolgan pul qaytariladi
  const debtCoveredCents = useMemo(
    () => Math.min(returnTotalCents, toCents(selectedSale?.debt)),
    [returnTotalCents, selectedSale],
  );
  const debtCovered = debtCoveredCents / 100;

  const remainderCents = Math.max(0, returnTotalCents - debtCoveredCents);
  const moneyRemainder = remainderCents / 100;

  // Tez tanlash: Naqd — hammasi naqd, Karta — hammasi karta
  const setAllCash = () => {
    setRefundCashCents(remainderCents);
    setRefundCardCents(0);
  };
  const setAllCard = () => {
    setRefundCashCents(0);
    setRefundCardCents(remainderCents);
  };

  // Qaytariladigan pul o'zgarganda default — hammasi naqd
  useEffect(() => {
    setRefundCashCents(remainderCents);
    setRefundCardCents(0);
  }, [remainderCents]);

  // Bittasiga yozsangiz, ikkinchisi qoldiqqa avtomatik moslashadi —
  // ikkala inputga yozish orqali naqd+karta taqsimoti hosil bo'ladi
  const handleCashInput = (value: string) => {
    const cents = toCents(parseAmountInput(value));
    setRefundCashCents(cents);
    setRefundCardCents(Math.max(0, remainderCents - cents));
  };
  const handleCardInput = (value: string) => {
    const cents = toCents(parseAmountInput(value));
    setRefundCardCents(cents);
    setRefundCashCents(Math.max(0, remainderCents - cents));
  };

  const refundSumCents = refundCashCents + refundCardCents;
  const refundExcess = remainderCents > 0 && refundSumCents > remainderCents;
  const refundShort = remainderCents > 0 && refundSumCents < remainderCents;
  const refundMismatch = refundExcess || refundShort;

  const isValid = useMemo(() => {
    if (!selectedSale || !hasSelection) return false;
    for (const item of selectedSale.items) {
      const qty = returnQuantities[item.id] || 0;
      if (qty > remainingOf(item)) return false;
    }
    // Ortiqcha yoki kam summa — tugma noaktiv
    if (refundMismatch) return false;
    // Karta qaytarimida har faol qatorda karta tanlangan va yig'indi mos bo'lishi shart
    if (refundCardCents > 0 && (bankCards.length === 0 || splitsInvalid)) return false;
    return true;
  }, [selectedSale, returnQuantities, hasSelection, refundMismatch, refundCardCents, bankCards.length, splitsInvalid]);

  const handleSubmit = async () => {
    if (!selectedSale || returnItems.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      // payments[] faqat karta ishlatilganda yuboriladi;
      // yuborilmasa backend eski xatti-harakatni saqlaydi (to'liq naqd).
      // Karta qismi bir nechta kartaga (Uzcard/Humo/...) taqsimlanishi mumkin —
      // har karta alohida qator bo'lib ketadi.
      let payments: SalePaymentInput[] | undefined;
      if (refundCardCents > 0) {
        payments = [];
        if (refundCashCents > 0) {
          payments.push({ type: 'cash', amount: (refundCashCents / 100).toFixed(2) });
        }
        for (const split of activeSplits) {
          payments.push({
            type: 'card',
            amount: split.amount.toFixed(2),
            bank_card: Number(split.bankCardId),
          });
        }
      }
      await saleReturnService.create({
        sale: Number(selectedSale.id),
        items: returnItems,
        payments,
        comment: comment.trim() || undefined,
      });
      navigate(`/${lang}/sales-returns`);
    } catch (err: unknown) {
      // Backend xabarini har qanday DRF shaklidan chiqaradi (massiv, detail,
      // maydon xatolari) — umumiy "400 error" o'rniga aniq sabab ko'rinadi
      const msg = extractErrorMessage(err);
      setError(
        !msg || msg === 'An error occurred' || msg.startsWith('Request failed')
          ? t('saleReturns.createError')
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const visibleItems = useMemo(() => {
    if (!selectedSale) return [];
    if (onlySelected && hasSelection) {
      return selectedSale.items.filter((item) => (returnQuantities[item.id] || 0) > 0);
    }
    return selectedSale.items;
  }, [selectedSale, onlySelected, hasSelection, returnQuantities]);

  const canLoadMore = !isNumericSearch && sales.length < salesTotal;

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title={t('saleReturns.newReturn')}
            description={t('saleReturns.returnSale')}
          />
          <Link to={`/${lang}/sales-returns`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          </Link>
        </div>
      )}

      <div ref={split.containerRef} className="flex flex-col gap-3 xl:h-[calc(100vh-13rem)] xl:flex-row xl:gap-0">
        {/* ───────────── CHAP: sotuvlar ro'yxati ───────────── */}
        <div className="flex min-h-80 flex-col rounded-lg border border-border bg-card p-3 xl:min-h-0" style={split.panelStyle(0)}>
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <Receipt className="h-4 w-4" />
            {t('sales.title')}
          </h2>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('saleReturns.searchSale', 'Chek № yoki mijoz ismi...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[50vh] flex-1 space-y-2 overflow-y-auto pr-1 xl:max-h-none">
            {loadingSales && sales.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
            ) : sales.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('common.noData')}</div>
            ) : (
              <>
                {sales.map((sale) => {
                  const isActive = selectedSale && String(selectedSale.id) === String(sale.id);
                  const returned = isFullyReturned(sale);
                  return (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => handleSelectSale(sale)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-accent/50'
                      } ${returned ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">№{sale.id}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {sale.customer_name || t('sales.guest', 'Mehmon')}
                        {sale.store_name ? ` · ${sale.store_name}` : ''}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(parseFloat(sale.total_amount))}
                        </span>
                        {returned ? (
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('saleReturns.fullyReturned', 'Qaytarilgan')}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {sale.items?.length || 0} {t('common.pcs')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {canLoadMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={loadingSales}
                    onClick={() => void loadSales(salesPage + 1, debouncedSearch, true)}
                  >
                    {loadingSales ? t('common.loading') : t('common.loadMore', 'Ko‘proq yuklash')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {split.splitter(0)}

        {/* ───────────── MARKAZ: qaytariladigan mahsulotlar ───────────── */}
        <div className="flex min-h-80 flex-col rounded-lg border border-border bg-card p-3 xl:min-h-0" style={split.panelStyle(1)}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ShoppingCart className="h-4 w-4" />
              {t('saleReturns.returnItems')}
              {selectedSale && <span className="text-muted-foreground">· №{selectedSale.id}</span>}
            </h2>
            {hasSelection && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant={onlySelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOnlySelected((v) => !v)}
                >
                  {t('saleReturns.onlySelected', 'Faqat tanlanganlar')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReturnQuantities({});
                    setOnlySelected(false);
                  }}
                  title={t('common.clear', 'Tozalash')}
                  aria-label={t('common.clear', 'Tozalash')}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="max-h-[50vh] flex-1 space-y-2 overflow-y-auto pr-1 xl:max-h-none">
            {!selectedSale && !loadingSale ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <Receipt className="h-10 w-10 opacity-40" />
                {t('saleReturns.pickSaleHint', 'Chapdan sotuvni tanlang — mahsulotlari shu yerda chiqadi')}
              </div>
            ) : loadingSale ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
            ) : visibleItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('sales.noProducts')}</div>
            ) : (
              visibleItems.map((item) => {
                const qty = returnQuantities[item.id] || 0;
                const remaining = remainingOf(item);
                const exhausted = remaining === 0;
                const dimmed = !exhausted && hasSelection && qty === 0 && !onlySelected;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 transition-opacity ${
                      qty > 0
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-muted/30'
                    } ${dimmed ? 'opacity-40' : ''} ${exhausted ? 'opacity-50' : ''}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {item.product_name || `${t('products.title')} #${item.product}`}
                        </p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku || '-'}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {formatCurrency(parseFloat(item.unit_price))} × {item.quantity}
                          {(item.returned_quantity ?? 0) > 0 && (
                            <span className="ml-2 text-amber-600 dark:text-amber-400">
                              {t('saleReturns.alreadyReturned', 'qaytarilgan')}: {item.returned_quantity}
                            </span>
                          )}
                        </p>
                      </div>

                      {exhausted ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('saleReturns.fullyReturned', 'Qaytarilgan')}
                        </span>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={qty <= 0}
                            onClick={() => setItemQty(item, qty - 1)}
                            aria-label={t('common.decrease', 'Kamaytirish')}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            max={remaining}
                            value={qty === 0 ? '' : qty}
                            placeholder="0"
                            aria-label={t('sales.quantity', 'Miqdor')}
                            onChange={(e) => setItemQty(item, parseInt(e.target.value, 10) || 0)}
                            className="h-8 w-16 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={qty >= remaining}
                            onClick={() => setItemQty(item, qty + 1)}
                            aria-label={t('common.increase', "Ko'paytirish")}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            disabled={qty >= remaining}
                            onClick={() => setItemQty(item, remaining)}
                            title={`${t('saleReturns.returnAll', 'Hammasi')}: ${remaining}`}
                          >
                            {t('saleReturns.returnAll', 'Hammasi')}
                          </Button>
                        </div>
                      )}
                    </div>
                    {qty > 0 && (
                      <p className="mt-2 border-t border-border/50 pt-2 text-right text-sm font-semibold tabular-nums text-primary">
                        {qty} × {formatCurrency(parseFloat(item.unit_price))} ={' '}
                        {formatCurrency(qty * parseFloat(item.unit_price))}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {split.splitter(1)}

        {/* ───────────── O'NG: qaytarim xulosasi ───────────── */}
        <div className="flex min-h-80 flex-col rounded-lg border border-border bg-card p-3 xl:min-h-0" style={split.panelStyle(2)}>
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <Wallet className="h-4 w-4" />
            {t('saleReturns.summary', 'Qaytarim xulosasi')}
          </h2>

          {!selectedSale ? (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              {t('saleReturns.noSaleSelected', 'Sotuv tanlanmagan')}
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {/* Mijoz kartasi — bosilganda tafsilotlar modali ochiladi */}
                <button
                  type="button"
                  onClick={() => void openCustomerModal()}
                  disabled={!selectedSale.customer}
                  title={selectedSale.customer ? t('customers.viewDetails', 'Mijoz tafsilotlari') : undefined}
                  className={`rounded-lg bg-muted/40 p-2.5 text-left ${
                    selectedSale.customer
                      ? 'cursor-pointer transition-colors hover:bg-accent hover:ring-1 hover:ring-primary/40'
                      : 'cursor-default'
                  }`}
                >
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {t('sales.customer', 'Mijoz')}
                    {selectedSale.customer && <User className="h-3 w-3 text-primary" />}
                  </p>
                  <p className={`truncate font-medium ${selectedSale.customer ? 'text-primary underline decoration-dotted underline-offset-2' : ''}`}>
                    {selectedSale.customer_name || t('sales.guest', 'Mehmon')}
                  </p>
                </button>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                  <p className="font-medium">{formatDate(selectedSale.created_at)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">{t('common.total')}</p>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(parseFloat(selectedSale.total_amount))}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">{t('sales.debt', 'Qarz')}</p>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(Number(selectedSale.debt) || 0)}
                  </p>
                </div>
              </div>

              {/* Tanlangan mahsulotlar */}
              <div className="rounded-lg border border-border">
                <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  {t('saleReturns.selectedItems', 'Qaytariladigan mahsulotlar')} ({returnItems.length})
                </div>
                {hasSelection ? (
                  <div className="max-h-44 divide-y divide-border/60 overflow-y-auto">
                    {selectedSale.items
                      .filter((item) => (returnQuantities[item.id] || 0) > 0)
                      .map((item) => {
                        const qty = returnQuantities[item.id] || 0;
                        return (
                          <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                            <span className="min-w-0 flex-1 truncate">{item.product_name || `#${item.product}`}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">×{qty}</span>
                            <span className="shrink-0 font-medium tabular-nums">
                              {formatCurrency(qty * parseFloat(item.unit_price))}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                    {t('saleReturns.nothingSelected', 'Markazdan mahsulot miqdorini oshiring')}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('saleReturns.returnTotal', 'Jami qaytarim')}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(returnTotal)}</span>
                </div>
                {debtCovered > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>{t('saleReturns.debtCovered', 'Avval qarz yopiladi')}</span>
                    <span className="tabular-nums">−{formatCurrency(debtCovered)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/60 pt-1.5 text-base font-bold">
                  <span>{t('saleReturns.refundRemainder', 'Mijozga qaytariladigan pul')}</span>
                  <span className="tabular-nums text-primary">{formatCurrency(moneyRemainder)}</span>
                </div>
              </div>

              {moneyRemainder > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t('saleReturns.refundMethod', 'Pul qaytarish usuli')}
                  </Label>

                  {/* Tez tanlash tugmalari: ikkalasiga yozib aralash taqsimot ham qilish mumkin */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={refundCashCents > 0 ? 'default' : 'outline'}
                      size="sm"
                      onClick={setAllCash}
                    >
                      {t('sales.cash', 'Naqd')}
                    </Button>
                    <Button
                      type="button"
                      variant={refundCardCents > 0 ? 'default' : 'outline'}
                      size="sm"
                      onClick={setAllCard}
                    >
                      {t('sales.card', 'Karta')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('sales.cash', 'Naqd')}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={refundCashCents > 0 ? formatAmountInput(refundCashCents / 100) : ''}
                        onChange={(e) => handleCashInput(e.target.value)}
                        className={refundMismatch ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('sales.card', 'Karta')}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={refundCardCents > 0 ? formatAmountInput(refundCardCents / 100) : ''}
                        onChange={(e) => handleCardInput(e.target.value)}
                        className={refundMismatch ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                    </div>
                  </div>

                  {/* Karta ishlatilsa — summani kartalarga (Uzcard/Humo/...) taqsimlash */}
                  {refundCardCents > 0 && (
                    <CardSplitEditor
                      bankCards={bankCards}
                      cardSplits={cardSplits}
                      onUpdateCard={updateSplitCard}
                      onUpdateAmount={updateSplitAmount}
                      onAdd={addCardSplit}
                      onRemove={removeCardSplit}
                      disabled={submitting}
                    />
                  )}

                  {refundExcess && (
                    <p className="text-xs font-medium text-red-600">
                      {t('saleReturns.refundExcess', 'Ortiqcha summa kiritildi')}:{' '}
                      +{formatCurrency((refundSumCents - remainderCents) / 100)} (max{' '}
                      {formatCurrency(moneyRemainder)})
                    </p>
                  )}
                  {refundShort && (
                    <p className="text-xs font-medium text-red-600">
                      {t('saleReturns.refundShort', 'Summa yetarli emas')}:{' '}
                      −{formatCurrency((remainderCents - refundSumCents) / 100)} (jami{' '}
                      {formatCurrency(moneyRemainder)} bo‘lishi kerak)
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('saleReturns.comment')}</Label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('saleReturns.comment')}
                  rows={2}
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-auto pt-1">
                <Button className="w-full" disabled={!isValid || submitting} onClick={handleSubmit}>
                  {submitting ? (
                    t('common.saving')
                  ) : (
                    <>
                      <Undo2 className="mr-2 h-4 w-4" />
                      {t('saleReturns.newReturn')}
                      {returnTotal > 0 ? ` · ${formatCurrency(returnTotal)}` : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────────── Mijoz tafsilotlari modali ───────────── */}
      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {customerDetail?.full_name || selectedSale?.customer_name || t('sales.customer', 'Mijoz')}
            </DialogTitle>
          </DialogHeader>

          {customerLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : !customerDetail ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('common.noData')}</div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {t('customers.phone', 'Telefon')}
                  </p>
                  <p className="font-medium">{customerDetail.phone_number || '—'}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">{t('customers.debt', 'Qarz')}</p>
                  <p className={`font-semibold tabular-nums ${(Number(customerDetail.total_debt) || 0) > 0 ? 'text-red-500' : ''}`}>
                    {formatCurrency(Number(customerDetail.total_debt) || 0)}
                  </p>
                </div>
              </div>

              {Array.isArray(customerDetail.store_debts) && customerDetail.store_debts.length > 0 && (
                <div className="rounded-lg border border-border">
                  <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    {t('customers.storeDebts', 'Do‘konlar bo‘yicha qarzlar')}
                  </div>
                  <div className="divide-y divide-border/60">
                    {customerDetail.store_debts.map((entry) => (
                      <div key={entry.store} className="flex items-center justify-between px-3 py-1.5">
                        <span className="min-w-0 flex-1 truncate">{entry.store}</span>
                        <span className={`font-medium tabular-nums ${entry.debt > 0 ? 'text-red-500' : ''}`}>
                          {formatCurrency(entry.debt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(customerDetail.sales) && customerDetail.sales.length > 0 && (
                <div className="rounded-lg border border-border">
                  <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    {t('customers.lastSales', 'So‘nggi sotuvlar')} ({customerDetail.sales.length})
                  </div>
                  <div className="max-h-44 divide-y divide-border/60 overflow-y-auto">
                    {[...customerDetail.sales]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 5)
                      .map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                          <span className="shrink-0 font-medium">№{sale.id}</span>
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {sale.store_name || ''} · {formatDate(sale.created_at)}
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {formatCurrency(parseFloat(String(sale.total_amount ?? 0)))}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerModalOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
