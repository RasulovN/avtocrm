import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader'; 
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Label } from '../../components/ui/Label';
import { useAuthStore } from '../../app/store';
import { productService } from '../../services/productService';
import type { Product } from '../../types';
import { formatCurrency } from '../../utils';
import { BarcodePrint } from '../../components/ui/BarcodePrint';
import { generateBarcodePrintHtml, generateBarcodeDataUrl, escapeHtml } from '../../utils/xss';
import { useProducts } from '../../context/ProductContext';

export function ProductBarcodePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'uz';
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const { products } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      let data = await productService.getById(id);
      
      // Fallback: if data has no barcode and no batches, fetch using getAll to get nested batches
      if ((!data.batches || data.batches.length === 0) && !data.barcode) {
        const response = await productService.getAll({ limit: 100 });
        const matched = response.data.find(p => String(p.id) === String(id));
        if (matched) {
          data = matched;
        }
      }
      setProduct(data);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && products && products.length > 0) {
      const cached = products.find(p => String(p.id) === String(id));
      if (cached) {
        setProduct(cached);
        setLoading(false);
      }
    }
  }, [id, products]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const handlePrint = (batchKey: string) => {
    const printContent = document.getElementById(batchKey);
    if (!printContent) return;

    const batch = displayBatches.find(b => `barcode-card-${b.store}-${b.id}` === batchKey);
    const barcodeValue = batch?.barcode || batch?.shtrix_code || '';
    if (!barcodeValue) return;
    
    const html = generateBarcodePrintHtml(barcodeValue);
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  };

  const handlePrintAll = () => {
    const barcodeCards = displayBatches.map((batch) => {
      const barcodeValue = batch.barcode || batch.shtrix_code || '';
      if (!barcodeValue) return '';
      
      const dataUrl = generateBarcodeDataUrl(barcodeValue, {
        width: 1.5,
        height: 50,
        displayValue: false
      });
      
      return `
        <div class="barcode-card">
          <img src="${dataUrl}" alt="Barcode" />
          <div class="barcode-value">${escapeHtml(barcodeValue)}</div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Print All Barcodes</title>
          <style>
            @page {
              size: A4;
              margin: 3mm;
            }
            body {
              font-family: 'Consolas', monospace;
              margin: 0;
              padding: 5px;
              text-align: center;
            }
            .barcode-container {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 3mm;
            }
            .barcode-card { 
              width: 32mm;
              height: 18mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 1mm;
            }
            .barcode-value { 
              font-family: 'Consolas', monospace; 
              font-size: 6px; 
              margin-top: 1px;
            }
            img { 
              width: 28mm; 
              height: auto; 
              max-height: 12mm;
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${barcodeCards}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const batches = product?.batches ?? [];
  const firstBatchBarcode = batches.find(b => b.barcode || b.shtrix_code)?.barcode 
    || batches.find(b => b.barcode || b.shtrix_code)?.shtrix_code 
    || '';
  const fallbackBarcode = product?.barcode || product?.shtrix_code || product?.sku || firstBatchBarcode || '';
  const resolvedUserStoreId = user?.store_id
    ? String(user.store_id)
    : user?.stores && user.stores.length > 0
      ? String(user.stores.find(s => s.type === 'b')?.id || user.stores[0].id)
      : (user as any)?.store?.id !== undefined
        ? String((user as any).store.id)
        : undefined;
  const userStoreId = resolvedUserStoreId;
  const canViewAllStores = Boolean(user?.is_superuser || user?.role === 'superuser' || user?.role === 'admin');
  const visibleBatches = canViewAllStores
    ? batches
    : batches.filter((batch) => userStoreId ? String(batch.store) === userStoreId : false);

  const allowFallbackBarcode = true;
  const displayBatches = visibleBatches.length
    ? visibleBatches.map(batch => ({
        ...batch,
        barcode: batch.barcode || batch.shtrix_code || fallbackBarcode,
      }))
    : (allowFallbackBarcode && fallbackBarcode ? [{
        id: 0,
        product: Number(product?.id || 0),
        store: Number(userStoreId || product?.store_id || 0),
        store_name: user?.stores?.find(s => s.type === 'b')?.name || user?.stores?.[0]?.name || product?.store_name || t('products.store'),
        quantity: product?.quantity ?? 0,
        purchase_price: String(product?.purchase_price ?? 0),
        selling_price: String(product?.selling_price ?? 0),
        barcode: fallbackBarcode,
        shtrix_code: product?.shtrix_code ?? null,
      }] : []);
  const noVisibleBatchesForStore = !canViewAllStores && batches.length > 0 && visibleBatches.length === 0;
  const imageUrls = product?.images && (Array.isArray(product.images) ? product.images.map((img: any) => typeof img === 'string' ? img : img.image).filter(Boolean) : [product.images]).filter(Boolean) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('products.barcode')}
        description={t('products.barcode')}
        breadcrumbs={[
          { label: t('nav.products'), href: `/${lang}/products` },
          { label: t('products.barcode') },
        ]}
        actions={
          <div className="flex gap-2">
            {displayBatches.length > 1 && (
              <Button variant="outline" onClick={handlePrintAll}>
                <Printer className="h-4 w-4 mr-2" />
                {t('products.printAllBarcodes')}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/${lang}/products`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('products.productInfo', 'Маҳсулот маълумотлари')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground text-sm">{t('common.name')}</Label>
              <p className="font-semibold text-lg">{product?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">{t('products.category')}</Label>
              <p className="font-medium">{product?.category_name ?? product?.category}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">{t('common.status')}</Label>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${product?.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
                {product?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">{t('products.sellingPrice')}</Label>
              <p className="font-semibold text-xl">{formatCurrency(product?.selling_price || 0)}</p>
            </div>
            {product?.created_at && (
              <div>
                <Label className="text-muted-foreground text-sm">{t('common.createdAt')}</Label>
                <p className="text-sm text-muted-foreground">{formatDate(product.created_at)}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {product?.description && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">{t('common.description')}</Label>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Images Gallery */}
          {imageUrls.length > 0 && (
            <div>
              <Label className="text-muted-foreground text-sm mb-3 block">
                <ImageIcon className="h-4 w-4 inline mr-1" />
                Images ({imageUrls.length})
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {imageUrls.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={img} 
                      alt={`Product image ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className='border-none'>
        <CardHeader className='p-0 py-5'>
          <CardTitle>{t('products.barcode')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {displayBatches.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {noVisibleBatchesForStore
                ? "Sizning do'konga tegishli barcode yoki partiya topilmadi."
                : t('common.noData')}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {displayBatches.map((batch) => {
                const key = `barcode-card-${batch.store}-${batch.id}`;
                const barcodeValue = batch.barcode || batch.shtrix_code || '';
                return (
                  <div key={key} className="space-y-3 rounded-lg border p-4">
                    <div id={key} className="barcode-card text-center">
                      {barcodeValue ? (
                        <>
                          <BarcodePrint 
                            value={barcodeValue} 
                            showName={false} 
                            thermalPrinter={false}
                          />
                          <div className="barcode-value mt-1 text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{barcodeValue}</div>
                          <div className="mt-2 text-sm text-muted-foreground space-y-1">
                            <div><strong>{t('products.store')}:</strong> {batch.store_name}</div>
                            <div><strong>{t('products.quantity') || 'Quantity'}:</strong> {batch.quantity}</div>
                            <div className="flex gap-2 text-xs pt-1">
                              <span className="text-muted-foreground"><strong>Purchase:</strong> {formatCurrency(Number(batch.purchase_price))}</span>
                              <span><strong>Sell:</strong> {formatCurrency(Number(batch.selling_price))}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">{t('messages.barcodeMissing')}</div>
                      )}
                    </div>
                    <Button onClick={() => handlePrint(key)} className="w-full">
                      <Printer className="h-4 w-4 mr-2" />
                      {t('products.printBarcode')}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}