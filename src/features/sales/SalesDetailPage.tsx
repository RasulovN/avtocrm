import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User, ShoppingCart, CreditCard, Calendar, Tag, DollarSign, Wallet, Printer, Eye, Package, Barcode, MapPin, Image as ImageIcon, Loader2 } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { salesService } from '../../services/salesService';
import { customerApiService } from '../../services/customerService';
import { productService } from '../../services/productService';
import { API_BASE_URL } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils';
import type { Product, Sale, SaleItem } from '../../types';
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

const getStaticProductLocation = (product?: Product | null, saleItem?: SaleItem | null) => {
  const source = String(product?.id ?? saleItem?.product ?? saleItem?.id ?? '0');
  const code = source.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const zones = ['Asosiy ombor', 'Savdo zal', 'Yuk qabul zonasi', 'Zaxira qator'];
  const shelves = ['A-1', 'B-2', 'C-3', 'D-4', 'E-5', 'F-6'];
  const levels = ['Yuqori qavat', "O'rta qavat", 'Pastki qavat'];

  return {
    zone: zones[code % zones.length],
    shelf: shelves[code % shelves.length],
    level: levels[code % levels.length],
    note: "Statik ma'lumot, backend tayyor bo'lgach real lokatsiya bilan almashtiriladi.",
  };
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
  const [paying, setPaying] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedSaleItem, setSelectedSaleItem] = useState<SaleItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productLocations, setProductLocations] = useState<any[]>([]);
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
  };

  const handleDebtPayment = async () => {
    if (!sale || !paymentAmount || !saleId) return;
    try {
      setPaying(true);
      const parsedAmount = Number(paymentAmount);
      const normalizedAmount = Number.isFinite(parsedAmount)
        ? String(parsedAmount)
        : paymentAmount;
      await customerApiService.createDebtPaymentForSale({
        sale: Number(saleId),
        amount: normalizedAmount,
        type: paymentType,
      });
      setShowPaymentDialog(false);
      setPaymentAmount('');
      
      const res = await salesService.getById(saleId);
      setSale(res);
    } catch {
      // Handle payment error silently
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    const labels = {
      partial: t('common.pending'),
      paid: t('sales.paid'),
      completed: t('common.completed'),
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.paid}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

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

  const handleCloseReceipt = () => {
    setShowReceipt(false);
  };

  const handleOpenProductDialog = async (item: SaleItem) => {
    setSelectedSaleItem(item);
    setSelectedProduct(null);
    setProductLocations([]);
    setProductError('');
    setShowProductDialog(true);

    if (!item.product) {
      setProductError('Mahsulot ID topilmadi.');
      return;
    }

    try {
      setProductLoading(true);
      const product = await productService.getById(String(item.product));
      setSelectedProduct(product);
      console.log('Selected product ID:', product.id);

      // Fetch product data with location
      try {
        const productsRes = await fetch(`${API_BASE_URL}/products/?limit=500`);
        if (productsRes.ok) {
          const products = await productsRes.json();
          console.log('Fetched products:', products);
          const matchedProduct = products.find((p: any) => p.id == product.id);
          if (matchedProduct && matchedProduct.location) {
            setProductLocations([matchedProduct]); // Wrap in array for consistency
          } else {
            setProductLocations([]);
          }
        } else {
          console.error('Failed to fetch products:', productsRes.status);
          setProductLocations([]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProductLocations([]);
      }
    } catch {
      setProductError("Mahsulot detallari yuklanmadi.");
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
    }
  };

  const productImages = getProductImages(selectedProduct);
  const productLocation = getStaticProductLocation(selectedProduct, selectedSaleItem);

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
      <PageHeader 
        title={t('sales.saleDetails')} 
        description={t('sales.receiptDescription')}
        actions={
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Chop etish
          </Button>
        }
      />

      <div className="flex justify-between">
        <Link to={`/${lang}/sales`} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              Mahsulotlar
            </h3>
            <div className="space-y-3">
              {sale.items?.length ? (
                sale.items.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.product_name || `Mahsulot #${item.product}`}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(parseFloat(item.unit_price))}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => void handleOpenProductDialog(item)}
                        aria-label="Mahsulot detalini ko'rish"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{formatCurrency(parseFloat(item.total_price))}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">{t('common.noData')}</p>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Jami</span>
                <span>{formatCurrency(parseFloat(sale.total_amount) + (sale.discount_amount ? parseFloat(sale.discount_amount) : 0))}</span>
              </div>
              {sale.discount_amount && parseFloat(sale.discount_amount) > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Chegirma ({sale.discount_type === 'p' ? `${sale.discount_value}%` : ''})</span>
                  <span>-{formatCurrency(parseFloat(sale.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-gray-700">
                <span>Jami to'lov</span>
                <span className="text-green-600">{formatCurrency(parseFloat(sale.total_amount))}</span>
              </div>
            </div>
          </div>

          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5" />
              To'lovlar
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-muted-foreground mb-1">To'langan</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(parseFloat(sale.paid_amount))}</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm text-muted-foreground mb-1">Qarz</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(Number(sale.debt) || 0)}</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-muted-foreground mb-1">Holat</p>
                <div className="mt-1">{getStatusBadge(sale.status)}</div>
              </div>
            </div>
            {sale.debt && sale.debt > 0 && (
              <Button className="w-full mt-4" onClick={openPaymentDialog}>
                <Wallet className="mr-2 h-4 w-4" />
                Qarzni to'lash
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <User className="h-5 w-5" />
              Mijoz
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{sale.customer_name || sale.customer}</p>
                  <p className="text-sm text-muted-foreground">Mijoz</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5" />
              Sotuvchi
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-medium">{sale.seller_name || sale.seller}</p>
                  <p className="text-sm text-muted-foreground">Sotuvchi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5" />
              Chegirma
            </h3>
            {sale.discount_amount && parseFloat(sale.discount_amount) > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <span className="text-sm text-muted-foreground">Turi</span>
                  <span className="font-medium">{sale.discount_type === 'p' ? 'Foiz (%)' : "So'm"}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <span className="text-sm text-muted-foreground">Qiymati</span>
                  <span className="font-medium">{sale.discount_type === 'p' ? sale.discount_value : formatCurrency(parseFloat(sale.discount_value || '0'))}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-100 dark:bg-red-900/40">
                  <span className="text-sm font-medium">Chegirma summasi</span>
                  <span className="font-bold text-red-600">-{formatCurrency(parseFloat(sale.discount_amount))}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Chegirmaqo'llanmagan</p>
            )}
          </div>

          <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5" />
              Sana
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{formatDate(sale.created_at)}</p>
                <p className="text-sm text-muted-foreground">Sotuv vaqti</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className='pb-6'>
          <DialogHeader>
            <DialogTitle>Qarzni to'lash</DialogTitle>
            <DialogDescription>Quyida qarzni to'lash uchun ma'lumotlarni kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Jami qarz</p>
              <p className="text-xl font-bold text-amber-500">{formatCurrency(Number(sale?.debt) || 0)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To'lov summasi</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Summani kiriting"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To'lov turi</label>
              <Select value={paymentType} onValueChange={(value) => setPaymentType(value as 'cash' | 'card')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Naqd</SelectItem>
                  <SelectItem value="card">Karta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)}>
                Bekor qilish
              </Button>
              <Button className="flex-1" onClick={handleDebtPayment} disabled={paying || !paymentAmount}>
                {paying ? 'To\'lanmoqda...' : 'To\'lash'}
              </Button>
            </div>
          </div>
</DialogContent>
      </Dialog>

      <Dialog open={showProductDialog} onOpenChange={handleProductDialogChange}>
        <DialogContent className="max-w-3xl pb-6">
          <DialogHeader>
            <DialogTitle>Mahsulot tafsilotlari</DialogTitle>
            <DialogDescription>
              Sotuvga qo'shilgan mahsulotning to'liq ma'lumotlari.
            </DialogDescription>
          </DialogHeader>

          {productLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Mahsulot ma'lumotlari yuklanmoqda...</span>
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
                      alt={selectedProduct?.name || selectedSaleItem?.product_name || 'Mahsulot rasmi'}
                      className="h-72 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-72 w-full items-center justify-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="h-10 w-10" />
                        <span>Rasm mavjud emas</span>
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
                          alt={`${selectedProduct?.name || 'Mahsulot'} ${index + 2}`}
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
                    {selectedProduct?.name || selectedSaleItem?.product_name || `Mahsulot #${selectedSaleItem?.product}`}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProduct?.description || "Mahsulot uchun qo'shimcha tavsif kiritilmagan."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="text-sm">Asosiy ma'lumot</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">ID</span>
                        <span className="font-medium">{selectedProduct?.id || selectedSaleItem?.product || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Kategoriya</span>
                        <span className="font-medium text-right">{selectedProduct?.category_name || "Ko'rsatilmagan"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Soni</span>
                        <span className="font-medium">{selectedProduct?.quantity ?? selectedProduct?.total_count ?? selectedSaleItem?.quantity ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <Barcode className="h-4 w-4" />
                      <span className="text-sm">Kod va narxlar</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">SKU</span>
                        <span className="font-medium">{selectedProduct?.sku || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Barcode</span>
                        <span className="font-medium">{selectedProduct?.barcode || selectedProduct?.shtrix_code || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Sotuv narxi</span>
                        <span className="font-medium">{formatCurrency(selectedProduct?.selling_price ? selectedProduct.selling_price : (selectedSaleItem?.unit_price ? Number(selectedSaleItem.unit_price) : 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* productLocation */}
                <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h5 className="font-semibold">Joylashuvi</h5>
                  </div>
                  {productLocations.length > 0 ? (
                    productLocations.map((prod, index) => (
                      <div key={index} className="mb-4 last:mb-0">
                        <div className="grid gap-3 sm:grid-cols-1">
                          <div className="rounded-xl bg-background p-3">
                            <p className="text-xs text-muted-foreground">Zona</p>
                            <p className="mt-1 font-medium">{prod.location ? prod.location.name : 'Noma\'lum'}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">{prod.location ? prod.location.description : 'Tavsif mavjud emas'}</p>
                      </div>
                    ))
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">Mahsulot lokatsiyasi mavjud emas.</p>
                    </div>
                  )}
                </div>
                {/* productLocation end */}
                <div className="rounded-xl border p-4">
                  <h5 className="mb-3 font-semibold">Sotuvdagi ma'lumot</h5>
                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Sotilgan miqdor</p>
                      <p className="mt-1 font-medium">{selectedSaleItem?.quantity ?? 0} dona</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dona narxi</p>
                      <p className="mt-1 font-medium">{formatCurrency(Number(selectedSaleItem?.unit_price) || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jami</p>
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
              <p className="text-sm dark:text-gray-300 print:text-black">Sotuv cheki #{sale.id}</p>
              <p className="text-xs dark:text-gray-400 print:text-black">{formatDate(sale.created_at)}</p>
            </div>
            <div className="text-xs border-b dark:border-gray-600 pb-2 mb-2 dark:text-gray-300">
              {sale.store_name && <div className="flex justify-between print:text-black"><span>Do'kon:</span><span>{sale.store_name}</span></div>}
              {sale.seller_name && <div className="flex justify-between print:text-black"><span>Sotuvchi:</span><span>{sale.seller_name}</span></div>}
              {sale.customer_name && <div className="flex justify-between print:text-black"><span>Mijoz:</span><span>{sale.customer_name}</span></div>}
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
                <span>Chegirma:</span>
                <span>-{formatCurrency(parseFloat(sale.discount_amount))}</span>
              </div>
            )}
            <div className="border-t dark:border-gray-600 pt-2 mt-2">
              <div className="flex justify-between font-bold dark:text-white print:text-black">
                <span>JAMI:</span>
                <span>{formatCurrency(parseFloat(sale.total_amount))}</span>
              </div>
            </div>
        <div className="text-xs border-t dark:border-gray-600 mt-2 pt-2 dark:text-gray-300">
              <div className="flex justify-between print:text-black"><span>Naqd:</span><span>{formatCurrency(parseFloat(sale.paid_amount))}</span></div>
              {sale.debt && Number(sale.debt) > 0 && <div className="flex justify-between text-red-500 print:text-black"><span>Qarz:</span><span>{formatCurrency(Number(sale.debt))}</span></div>}
            </div>
            <div className="text-center text-xs mt-2 dark:text-gray-400 print:text-black">Xaridingiz uchun rahmat!</div>
            <div className="flex gap-2 mt-4 print-hidden print:text-black">
              <Button className="flex-1" onClick={(e) => { e.stopPropagation(); window.print(); }}>Chop etish</Button>
              <Button variant="outline" className="flex-1" onClick={handleCloseReceipt}>Yopish</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// sdfdd
