import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User, ShoppingCart, CreditCard, Calendar, Tag, Wallet, Printer, Eye, Package, Barcode, MapPin, Image as ImageIcon, Loader2, Undo2, Banknote, CheckCircle2, Clock, Store as StoreIcon, Receipt as ReceiptIcon } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { salesService } from '../../services/salesService';
import { customerApiService } from '../../services/customerService';
import { productService } from '../../services/productService';
import { bankCardService } from '../../services/bankCardService';
import { PaymentTypeBadge } from '../../components/shared/PaymentTypeBadge';
import { formatCurrency, formatDate } from '../../utils';
import { handleError } from '../../utils/errorHandler';
import { escapeHtml } from '../../utils/xss';
import { extractBarcodeFromUrl } from '../../utils/xss';
import type { Product, Sale, SaleItem, BankCard } from '../../types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';

const getProductImages = (product?: Product | null): string[] => {
  if (!product) return [];

  const images: string[] = [];

  if (product.image) {
    images.push(product.image);
  }

  if (product.images) {
    if (Array.isArray(product.images)) {
      images.push(...product.images.filter((image): image is string => typeof image === 'string' && Boolean(image)));
    } else if (typeof product.images === 'string') {
      images.push(product.images);
    }
  }

  return [...new Set(images.filter(Boolean))];
};

export function SalesDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const saleId = params.id;
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'card'>('cash');
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [selectedBankCardId, setSelectedBankCardId] = useState<string>('');
  const [paying, setPaying] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedSaleItem, setSelectedSaleItem] = useState<SaleItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productLocation, setProductLocation] = useState<{ name?: string; description?: string } | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');
  const loadRef = useRef(false);

  useEffect(() => {
    const loadSale = async () => {
      if (!saleId || loadRef.current) return;
      loadRef.current = true;
      
      try {
        setLoading(true);
        const res = await salesService.getById(saleId);
        setSale(res);
      } catch {
        setSale(null);
      } finally {
        setLoading(false);
      }
    };

    loadSale();
  }, [saleId]);

  const openPaymentDialog = () => {
    if (!sale || !sale.debt) return;
    setPaymentAmount(String(sale.debt));
    setPaymentType('cash');
    setShowPaymentDialog(true);
    if (bankCards.length === 0) {
      bankCardService
        .getAll({ is_active: true })
        .then((cards) => {
          setBankCards(cards);
          const defaultCard = cards.find((card) => card.is_default) ?? cards[0];
          setSelectedBankCardId(defaultCard ? String(defaultCard.id) : '');
        })
        .catch(() => setBankCards([]));
    }
  };

  // Ortiqcha to'lov himoyasi: kiritilgan summa qarzdan oshsa to'lash bloklanadi
  const saleDebt = Number(sale?.debt) || 0;
  const paymentAmountNum = Number(paymentAmount) || 0;
  const paymentExceedsDebt = paymentAmountNum > saleDebt;
  const paymentInvalid =
    !paymentAmount ||
    paymentAmountNum <= 0 ||
    paymentExceedsDebt ||
    (paymentType === 'card' && !selectedBankCardId);

  const handleDebtPayment = async () => {
    if (!sale || !saleId || paymentInvalid) return;
    try {
      setPaying(true);
      await customerApiService.createDebtPaymentForSale({
        sale: Number(saleId),
        amount: String(paymentAmountNum),
        type: paymentType,
        ...(paymentType === 'card' ? { bank_card: Number(selectedBankCardId) } : {}),
      });
      setShowPaymentDialog(false);
      setPaymentAmount('');

      const res = await salesService.getById(saleId);
      setSale(res);
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Debt payment failed' });
    } finally {
      setPaying(false);
    }
  };

  // NET summalar: qaytarimlar (is_refund) tushumdan ayiriladi
  const cashAmount = useMemo(() => {
    if (!sale?.payments) return 0;
    return sale.payments
      .filter(p => p.type === 'cash')
      .reduce((sum, p) => sum + (p.is_refund ? -1 : 1) * parseFloat(p.amount), 0);
  }, [sale]);

  const cardAmount = useMemo(() => {
    if (!sale?.payments) return 0;
    return sale.payments
      .filter(p => p.type === 'card')
      .reduce((sum, p) => sum + (p.is_refund ? -1 : 1) * parseFloat(p.amount), 0);
  }, [sale]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('sales.saleDetails')} description={t('sales.receiptDescription')} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('sales.saleDetails')} description={t('sales.receiptDescription')} />
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-muted-foreground text-lg">{t('common.noData')}</div>
          <Link to={`/${lang}/sales`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    setShowReceipt(true);
    setTimeout(() => window.print(), 100);
  };

  // Mahsulotlar ro'yxatini jadval ko'rinishida chop etish (qaysi mahsulotdan nechta dona)
  const handlePrintItems = () => {
    if (!sale) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const items = sale.items || [];
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

    const rows = items
      .map(
        (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(item.product_name || `#${item.product}`)}</td>
          <td>${escapeHtml(item.sku || '-')}</td>
          <td style="text-align:right;">${escapeHtml(String(item.quantity))}</td>
          <td style="width:40px;text-align:center;"></td>
        </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>${t('sales.title', 'Sotuv')} №${escapeHtml(String(sale.id))}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 16px; }
  .header { font-size: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 12px; }
  th { font-weight: bold; background: #fff; }
  td:first-child, th:first-child { width: 30px; text-align: center; }
  tfoot td { font-weight: bold; }
  @media print { body { padding: 8px; } }
</style>
</head>
<body>
  <div class="header">
    <span>${t('sales.title', 'Sotuv')} №${escapeHtml(String(sale.id))} &nbsp; ${escapeHtml(formatDate(sale.created_at))}</span>
    <span>${escapeHtml(dateStr)}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>${t('products.title', 'Mahsulot')}</th>
        <th>${t('products.sku', 'SKU')}</th>
        <th style="text-align:right;">${t('products.quantity', 'Miqdor')} (${t('common.pcs', 'dona')})</th>
        <th>✓</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">${t('common.total', 'Jami')}</td>
        <td style="text-align:right;">${escapeHtml(String(totalQty))} ${t('common.pcs', 'dona')}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
  };

  const handleOpenProductDialog = async (item: SaleItem) => {
    setSelectedSaleItem(item);
    setSelectedProduct(null);
    setProductError('');
    setShowProductDialog(true);
    setProductLocation(null);

    if (!item.product) {
      setProductError(t('messages.productIdNotFound'));
      return;
    }

    try {
      setProductLoading(true);
      const product = await productService.getById(String(item.product));
      setSelectedProduct(product);
      // console.log('Selected product ID:', product.id);

      // Product`dan location ma'lumotlarini olish
      if (product.location_id) {
        setProductLocation({
          name: product.location_name,
          description: product.location_description,
        });
      }
    } catch {
      setProductError(t('messages.productAddError', 'Маҳсулот деталлари юкланмади.'));
    } finally {
      setProductLoading(false);
    }
  };

  const handleProductDialogChange = (open: boolean) => {
    setShowProductDialog(open);
    if (!open) {
      setSelectedSaleItem(null);
      setSelectedProduct(null);
      setProductError('');
      setProductLoading(false);
      setProductLocation(null);
    }
  };

  const productImages = getProductImages(selectedProduct);

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { size: 75mm auto; margin: 0; }
          body * { visibility: hidden; }
          .receipt-print, .receipt-content, .receipt-print *, .receipt-content * { visibility: visible; }
          .receipt-print, .receipt-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 75mm; 
            min-height: 100vh;
            height: 100vh;
            background: white;  
            font-size: 8px;
            line-height: 1.3;
            overflow: visible;
            color: black;
            print-color-adjust: black;
          }
          .print-hidden { display: none !important; } 
        }
        }
      `}</style>
      {/* ─── Sarlavha: hujjat raqami dominant, holat va amallar bir qatorda ─── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Link to={`/${lang}/sales`} aria-label={t('common.back')}>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold leading-tight tracking-tight">
                  {t('sales.title', 'Sotuv')} №{sale.id}
                </h2>
                {(() => {
                  const s = String(sale.status);
                  if (s === 'paid')
                    return (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('sales.paid', 'To‘langan')}
                      </span>
                    );
                  if (s === 'r')
                    return (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        <Undo2 className="h-3.5 w-3.5" />
                        {t('sales.returned', 'Qaytarilgan')}
                      </span>
                    );
                  return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" />
                      {s === 'partial' ? t('sales.partial', 'Qisman to‘langan') : t('sales.debt', 'Qarz')}
                    </span>
                  );
                })()}
                <PaymentTypeBadge type={sale.payment_type} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(sale.created_at)}
                </span>
                {sale.store_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <StoreIcon className="h-3.5 w-3.5" />
                    {sale.store_name}
                  </span>
                )}
                {sale.seller_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    {sale.seller_name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              {t('sales.print')}
            </Button>
            <Link to={`/${lang}/sales-returns/new?saleId=${sale.id}`}>
              <Button variant="outline">
                <Undo2 className="mr-2 h-4 w-4" />
                {t('saleReturns.returnSale')}
              </Button>
            </Link>
            {Number(sale.debt) > 0 && (
              <Button onClick={openPaymentDialog}>
                <Wallet className="mr-2 h-4 w-4" />
                {t('customers.payDebt')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Asosiy ko'rsatkichlar ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <ReceiptIcon className="h-3.5 w-3.5" />
            {t('sales.totalAmount', 'Jami summa')}
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums leading-tight">
            {formatCurrency(parseFloat(sale.total_amount))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {t('inventory.paid', 'To‘langan')}
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums leading-tight text-emerald-600">
            {formatCurrency(parseFloat(sale.paid_amount))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-amber-600" />
            {t('sales.debt', 'Qarz')}
          </div>
          <p
            className={`mt-2 text-xl font-bold tabular-nums leading-tight ${
              Number(sale.debt) > 0 ? 'text-amber-600' : 'text-muted-foreground'
            }`}
          >
            {formatCurrency(Number(sale.debt) || 0)}
          </p>
          {sale.debt_due_date && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('sales.debtDueDate', 'Muddat')}: {formatDate(sale.debt_due_date)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            {t('products.title', 'Mahsulotlar')}
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums leading-tight">
            {sale.items?.length || 0}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              {t('saleReturns.kinds', 'xil')} ·{' '}
              {(sale.items || []).reduce((sum, item) => sum + item.quantity, 0)} {t('common.pcs', 'dona')}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border p-5 pb-4">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <ShoppingCart className="h-4 w-4" />
                {t('products.title')}
                <span className="font-normal text-muted-foreground">({sale.items?.length || 0})</span>
              </h3>
              <Button variant="outline" size="sm" onClick={handlePrintItems}>
                <Printer className="mr-2 h-4 w-4" />
                {t('common.print', 'Chop etish')}
              </Button>
            </div>

            {sale.items?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                      <th className="w-12 px-5 py-3 font-semibold">№</th>
                      <th className="px-3 py-3 font-semibold">{t('products.productName', 'Mahsulot')}</th>
                      <th className="px-3 py-3 text-right font-semibold">{t('sales.price', 'Narx')}</th>
                      <th className="px-3 py-3 text-right font-semibold">{t('products.quantity', 'Miqdor')}</th>
                      <th className="px-3 py-3 text-right font-semibold">{t('common.total', 'Jami')}</th>
                      <th className="w-14 px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sale.items.map((item, index) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer transition-colors duration-150 hover:bg-accent/40"
                        onClick={() => void handleOpenProductDialog(item)}
                      >
                        <td className="px-5 py-3 text-muted-foreground tabular-nums">{index + 1}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium leading-tight">
                            {item.product_name || `${t('products.title')} #${item.product}`}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">SKU: {item.sku || '-'}</p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(parseFloat(item.unit_price))}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {item.quantity} {t('common.pcs', 'dona')}
                          {(item.returned_quantity ?? 0) > 0 && (
                            <p className="mt-0.5 text-xs text-amber-600">
                              −{item.returned_quantity} {t('sales.refund', 'qaytarim')}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">
                          {formatCurrency(parseFloat(item.total_price))}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenProductDialog(item);
                            }}
                            aria-label={t('sales.productDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{t('sales.noProducts', 'Mahsulotlar yo‘q')}</p>
              </div>
            )}

            <div className="space-y-2 border-t border-border p-5 pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t('sales.total')}</span>
                <span className="tabular-nums">
                  {formatCurrency(parseFloat(sale.total_amount) + (sale.discount_amount ? parseFloat(sale.discount_amount) : 0))}
                </span>
              </div>
              {sale.discount_amount && parseFloat(sale.discount_amount) > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>
                    {t('sales.discount')}
                    {sale.discount_type === 'p' ? ` (${sale.discount_value}%)` : ''}
                  </span>
                  <span className="tabular-nums">-{formatCurrency(parseFloat(sale.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>{t('sales.totalAmount', 'Yakuniy summa')}</span>
                <span className="tabular-nums text-emerald-600">{formatCurrency(parseFloat(sale.total_amount))}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5 pb-4">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <CreditCard className="h-4 w-4" />
                {t('sales.payment')}
              </h3>
              <PaymentTypeBadge type={sale.payment_type} />
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-600/10 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <Banknote className="h-3.5 w-3.5" />
                    {t('payment.cash', 'Naqd')}
                  </div>
                  <p className="mt-1.5 text-lg font-bold tabular-nums text-emerald-600">{formatCurrency(cashAmount)}</p>
                </div>
                <div className="rounded-lg bg-blue-600/10 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-400">
                    <CreditCard className="h-3.5 w-3.5" />
                    {t('payment.card', 'Karta')}
                  </div>
                  <p className="mt-1.5 text-lg font-bold tabular-nums text-blue-600">{formatCurrency(cardAmount)}</p>
                </div>
              </div>

              {sale.payments && sale.payments.length > 0 && (
                <div className="mt-4 space-y-1.5 border-t border-border pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('sales.paymentHistory', 'To‘lovlar tarixi')}
                  </p>
                  {sale.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        payment.is_refund ? 'bg-red-600/10' : 'bg-muted/40'
                      }`}
                    >
                      {payment.is_refund ? (
                        <Undo2 className="h-4 w-4 shrink-0 text-red-600" />
                      ) : payment.type === 'cash' ? (
                        <Banknote className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <CreditCard className="h-4 w-4 shrink-0 text-blue-600" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {payment.type === 'cash' ? t('payment.cash', 'Naqd') : t('payment.card', 'Karta')}
                        {payment.bank_card_name ? ` — ${payment.bank_card_name}` : ''}
                        {payment.is_refund ? ` (${t('sales.refund', 'Qaytarim')})` : ''}
                      </span>
                      <span
                        className={`shrink-0 font-semibold tabular-nums ${
                          payment.is_refund ? 'text-red-600' : ''
                        }`}
                      >
                        {payment.is_refund ? '−' : ''}
                        {formatCurrency(parseFloat(payment.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {Number(sale.debt) > 0 && (
                <Button className="mt-4 w-full" onClick={openPaymentDialog}>
                  <Wallet className="mr-2 h-4 w-4" />
                  {t('customers.payDebt')} · {formatCurrency(Number(sale.debt) || 0)}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Sotuv ma'lumotlari — bitta ixcham kartada */}
          <div className="rounded-xl border border-border bg-card">
            <h3 className="flex items-center gap-2 border-b border-border p-5 pb-4 text-base font-semibold">
              <User className="h-4 w-4" />
              {t('salesDetail.basicInfo', 'Sotuv ma’lumotlari')}
            </h3>
            <div className="divide-y divide-border/60">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium leading-tight">
                    {sale.customer_name || sale.customer || t('sales.guest', 'Mehmon')}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('sales.customer')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600/10">
                  <Tag className="h-5 w-5 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium leading-tight">{sale.seller_name || sale.seller}</p>
                  <p className="text-xs text-muted-foreground">{t('users.seller')}</p>
                </div>
              </div>
              {sale.store_name && (
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600/10">
                    <StoreIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight">{sale.store_name}</p>
                    <p className="text-xs text-muted-foreground">{t('sales.store', 'Do‘kon')}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{formatDate(sale.created_at)}</p>
                  <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chegirma — faqat mavjud bo'lsa ko'rsatiladi */}
          {sale.discount_amount && parseFloat(sale.discount_amount) > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Tag className="h-4 w-4 text-red-600" />
                {t('sales.discount')}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('stores.type')}</span>
                  <span className="font-medium">
                    {sale.discount_type === 'p' ? `${sale.discount_value}%` : t('sales.fixedAmount', 'So‘m')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="font-medium">{t('sales.discount')}</span>
                  <span className="font-bold tabular-nums text-red-600">
                    −{formatCurrency(parseFloat(sale.discount_amount))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className='pb-6'>
          <DialogHeader>
            <DialogTitle>{t('customers.debtPaymentTitle')}</DialogTitle>
            <DialogDescription>{t('salesDetail.debtPaymentDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">{t('dashboard.totalDebt')}</p>
              <p className="text-xl font-bold text-amber-500">{formatCurrency(Number(sale?.debt) || 0)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('customers.paymentAmount')}</label>
              <Input
                type="number"
                min={0}
                max={saleDebt}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={t('placeholders.enterAmount')}
                className={paymentExceedsDebt ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {paymentExceedsDebt && (
                <p className="text-xs font-medium text-red-600">
                  {t('customers.amountExceedsDebt', 'Summa qarzdan oshib ketdi')} (max {formatCurrency(saleDebt)})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sales.paymentMethod')}</label>
              <Select value={paymentType} onValueChange={(value) => setPaymentType(value as 'cash' | 'card')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('sales.cash')}</SelectItem>
                  <SelectItem value="card">{t('sales.card')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentType === 'card' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('sales.bankCard', 'Bank kartasi')}</label>
                {bankCards.length === 0 ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {t('sales.noBankCards', 'Faol bank kartasi yo‘q — sozlamalardan qo‘shing')}
                  </p>
                ) : (
                  <Select value={selectedBankCardId} onValueChange={setSelectedBankCardId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('sales.selectCard', 'Kartani tanlang')} />
                    </SelectTrigger>
                    <SelectContent>
                      {bankCards.map((card) => (
                        <SelectItem key={card.id} value={String(card.id)}>
                          {card.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleDebtPayment}
                disabled={paying || paymentInvalid}
              >
                {paying ? t('common.loading') : t('customers.payNow')}
              </Button>
            </div>
          </div>
</DialogContent>
      </Dialog>

      <Dialog open={showProductDialog} onOpenChange={handleProductDialogChange}>
        <DialogContent className="max-w-3xl pb-6">
          <DialogHeader>
            <DialogTitle>{t('sales.productDetails')}</DialogTitle>
            <DialogDescription>
              {t('salesDetail.productFullInfo')}
            </DialogDescription>
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
                      alt={selectedProduct?.name || selectedSaleItem?.product_name || t('products.image')}
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
                    {selectedProduct?.name || selectedSaleItem?.product_name || `${t('products.title')} #${selectedSaleItem?.product}`}
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
                        <span className="font-medium">{selectedProduct?.id || selectedSaleItem?.product || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t('sales.category')}</span>
                        <span className="font-medium text-right">{selectedProduct?.category_name || t('common.noData')}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t('sales.quantity')}</span>
                        <span className="font-medium">{selectedProduct?.quantity ?? selectedProduct?.total_count ?? selectedSaleItem?.quantity ?? 0}</span>
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
                        <span className="text-muted-foreground">SKU</span>
                        <span className="font-medium">{selectedProduct?.sku || selectedSaleItem?.sku || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Barcode</span>
                        <span className="font-medium">{selectedProduct?.barcode || (selectedProduct?.shtrix_code ? extractBarcodeFromUrl(selectedProduct.shtrix_code) : '') || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t('sales.sellingPrice')}</span>
                        <span className="font-medium">{formatCurrency(selectedProduct?.selling_price ? selectedProduct.selling_price : (selectedSaleItem?.unit_price ? Number(selectedSaleItem.unit_price) : 0))}</span>
                      </div>
                      {selectedProduct?.shtrix_code && (selectedProduct.shtrix_code.startsWith('http') || selectedProduct.shtrix_code.startsWith('/media/')) && (
                        <div className="mt-3 pt-3 border-t flex flex-col items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{t('products.barcodeImage', 'Barcode rasmi')}</span>
                          <img src={selectedProduct.shtrix_code} alt="Barcode" className="max-h-12 w-auto max-w-full bg-white p-1 rounded border" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* productLocation */}
                <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h5 className="font-semibold">{t('sales.location')}</h5>
                  </div>
                  {productLocation ? (
                    <div>
                      <div className="rounded-xl bg-background p-3">
                        <p className="text-xs text-muted-foreground">{t('sales.zone')}</p>
                        <p className="mt-1 font-medium">{productLocation.name}</p>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{productLocation.description}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('sales.noLocation')}</p>
                  )}
                </div>
                {/* productLocation end */}
                <div className="rounded-xl border p-4">
                  <h5 className="mb-3 font-semibold">{t('salesDetail.saleInfo')}</h5>
                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t('sales.quantity')}</p>
                      <p className="mt-1 font-medium">{selectedSaleItem?.quantity ?? 0} {t('common.pcs')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('sales.price')}</p>
                      <p className="mt-1 font-medium">{formatCurrency(Number(selectedSaleItem?.unit_price) || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('sales.total')}</p>
                      <p className="mt-1 font-medium">{formatCurrency(Number(selectedSaleItem?.total_price) || 0)}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showReceipt && sale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 " onClick={handleCloseReceipt}>
          <div className="receipt-content receipt-print bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="text-center border-b dark:border-gray-600 pb-3 mb-3 ">
              <h4 className="text-xl font-bold dark:text-white print:text-black">AvtoCRM</h4>
              <p className="text-sm dark:text-gray-300 print:text-black">{t('sales.receipt')} #{sale.id}</p>
              <p className="text-xs dark:text-gray-400 print:text-black">{formatDate(sale.created_at)}</p>
            </div>
            <div className="text-xs border-b dark:border-gray-600 pb-2 mb-2 dark:text-gray-300">
              {sale.store_name && <div className="flex justify-between print:text-black"><span>{t('sales.store')}:</span><span>{sale.store_name}</span></div>}
              {sale.seller_name && <div className="flex justify-between print:text-black"><span>{t('users.seller')}:</span><span>{sale.seller_name}</span></div>}
              {sale.customer_name && <div className="flex justify-between print:text-black"><span>{t('sales.customer')}:</span><span>{sale.customer_name}</span></div>}
            </div>
            <div className="space-y-1 text-sm dark:text-gray-300">
              {sale.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between print:text-black">
                  <span>{item.product_name || `#${item.product}`} x{item.quantity}</span>
                  <span>{formatCurrency(parseFloat(item.total_price))}</span>
                </div>
              ))}
            </div>
            {sale.discount_amount && parseFloat(sale.discount_amount) > 0 && (
              <div className="flex justify-between text-red-500 text-xs print:text-black">
                <span>{t('sales.discount')}:</span>
                <span>-{formatCurrency(parseFloat(sale.discount_amount))}</span>
              </div>
            )}
            <div className="border-t dark:border-gray-600 pt-2 mt-2">
              <div className="flex justify-between font-bold dark:text-white print:text-black">
                <span>{t('sales.totalAmount')}</span>
                <span>{formatCurrency(parseFloat(sale.total_amount))}</span>
              </div>
            </div>
        <div className="text-xs border-t dark:border-gray-600 mt-2 pt-2 dark:text-gray-300">
              {cashAmount > 0 && <div className="flex justify-between print:text-black"><span>{t('payment.cash', 'Naqt')}:</span><span>{formatCurrency(cashAmount)}</span></div>}
              {cardAmount > 0 && <div className="flex justify-between print:text-black"><span>{t('payment.card', 'Karta')}:</span><span>{formatCurrency(cardAmount)}</span></div>}
              {sale.debt && Number(sale.debt) > 0 && <div className="flex justify-between text-red-500 print:text-black"><span>{t('sales.debt')}:</span><span>{formatCurrency(Number(sale.debt))}</span></div>}
            </div>
            <div className="text-center text-xs mt-2 dark:text-gray-400 print:text-black">{t('sales.thanks')}</div>
            <div className="flex gap-2 mt-4 print-hidden print:text-black">
              <Button className="flex-1" onClick={(e) => { e.stopPropagation(); window.print(); }}>{t('sales.print')}</Button>
              <Button variant="outline" className="flex-1" onClick={handleCloseReceipt}>{t('common.close')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// sdfdd
