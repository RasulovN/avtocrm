import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Label } from '../../components/ui/Label';
import { productService } from '../../services/productService';
import type { Product } from '../../types';
import { formatCurrency } from '../../utils';
import { URL } from '../../services/api';
import { BarcodePrint } from '../../components/ui/BarcodePrint';

export function ProductBarcodePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      const data = await productService.getById(id);
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
    void loadProduct();
  }, [loadProduct]);

  const handlePrint = (batchKey: string) => {
    const printContent = document.getElementById(batchKey);
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            @page {
              size: 58mm auto; /* Xprinter 360B thermal paper width */
              margin: 2mm;
            }
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 2mm;
              text-align: center;
              font-size: 10px;
              line-height: 1.2;
            }
            .barcode-card { 
              border: none; 
              padding: 2mm;
              margin: 0;
              text-align: center;
              width: 54mm; /* Content width for 58mm paper */
              box-sizing: border-box;
            }
            .store-name { 
              font-size: 11px; 
              font-weight: 600; 
              margin-bottom: 3px; 
            }
            .product-name { 
              font-size: 9px; 
              margin-bottom: 2px; 
              word-wrap: break-word;
            }
            .product-price { 
              font-size: 12px; 
              font-weight: bold; 
              margin-bottom: 4px; 
            }
            .barcode-value { 
              font-family: 'Courier New', monospace; 
              font-size: 8px; 
              margin-top: 2px; 
              word-break: break-all;
            }
            svg { 
              max-width: 100%; 
              height: auto; 
              margin: 2px 0;
            }
            img { 
              max-width: 48mm; 
              height: auto; 
              margin: 2px 0;
            }
            /* Hide elements not needed for thermal printing */
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const barcodeCards = displayBatches.map((batch, index) => {
      const key = `barcode-card-${batch.store}-${batch.id}`;
      return `
        <div class="barcode-card">
          <div class="store-name">${batch.store_name}</div>
          <div class="product-name">${product?.name || ''}</div>
          <div class="product-price">${formatCurrency(Number(batch.selling_price || product?.selling_price || 0))}</div>
          <div class="mt-2">
            <svg id="barcode-svg-${index}"></svg>
          </div>
          <div class="barcode-value">${batch.barcode || ''}</div>
        </div>
        ${index < displayBatches.length - 1 ? '<div style="page-break-after: always;"></div>' : ''}
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print All Barcodes</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page {
              size: 58mm auto;
              margin: 2mm;
            }
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 2mm;
              text-align: center;
              font-size: 10px;
              line-height: 1.2;
            }
            .barcode-card {
              border: none;
              padding: 2mm;
              margin: 0;
              text-align: center;
              width: 54mm;
              box-sizing: border-box;
            }
            .store-name {
              font-size: 11px;
              font-weight: 600;
              margin-bottom: 3px;
            }
            .product-name {
              font-size: 9px;
              margin-bottom: 2px;
              word-wrap: break-word;
            }
            .product-price {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .barcode-value {
              font-family: 'Courier New', monospace;
              font-size: 8px;
              margin-top: 2px;
              word-break: break-all;
            }
            svg {
              max-width: 100%;
              height: auto;
              margin: 2px 0;
            }
          </style>
        </head>
        <body>
          ${barcodeCards}
          <script>
            window.onload = function() {
              ${displayBatches.map((batch, index) => `
                try {
                  JsBarcode('#barcode-svg-${index}', '${batch.barcode}', {
                    format: 'CODE128',
                    width: 1.5,
                    height: 45,
                    displayValue: true,
                    fontSize: 10,
                    margin: 2,
                    textMargin: 2,
                  });
                } catch (error) {
                  console.error('Failed to generate barcode ${index}:', error);
                }
              `).join('')}
              setTimeout(function() { window.print(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const batches = product?.batches ?? [];
  const fallbackBarcode = product?.barcode || product?.sku || '';
  const displayBatches = batches.length
    ? batches.map(batch => ({
        ...batch,
        barcode: batch.barcode || batch.shtrix_code || fallbackBarcode,
      }))
    : (fallbackBarcode ? [{
        id: 0,
        product: Number(product?.id || 0),
        store: Number(product?.store_id || 0),
        store_name: product?.store_name || t('products.store'),
        quantity: product?.quantity ?? 0,
        purchase_price: String(product?.purchase_price ?? 0),
        selling_price: String(product?.selling_price ?? 0),
        barcode: fallbackBarcode,
        shtrix_code: product?.shtrix_code ?? null,
      }] : []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('products.barcode')}
        description={t('products.barcode')}
        breadcrumbs={[
          { label: t('nav.products'), href: '/products' },
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
            <Button variant="outline" onClick={() => navigate('/products')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{product?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">SKU</Label>
              <p className="font-mono">{product?.sku}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Category</Label>
              <p>{product?.category_name ?? product?.category}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Selling Price</Label>
              <p className="font-medium">{formatCurrency(product?.selling_price || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='border-none'>
        <CardHeader className='p-0 py-5'>
          <CardTitle>{t('products.barcode')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {displayBatches.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('common.noData')}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {displayBatches.map((batch) => {
                const key = `barcode-card-${batch.store}-${batch.id}`;
                return (
                  <div key={key} className="space-y-3 rounded-lg border p-4">
                    <div id={key} className="barcode-card text-center">
                      <div className="store-name font-medium">{batch.store_name}</div>
                      <div className="product-name text-xs text-muted-foreground">{product?.name}</div>
                      <div className="product-price text-sm font-semibold">{formatCurrency(Number(batch.selling_price || product?.selling_price || 0))}</div>
                      <div className="mt-3">
                        <div className="text-xs font-medium">Shtrix kod</div>
                        {batch.barcode ? (
                          <div className="mt-2 flex justify-center">
                            <BarcodePrint 
                              value={batch.barcode} 
                              showName={false} 
                              thermalPrinter={true}
                            />
                          </div>
                        ) : batch.shtrix_code ? (
                          <img src={`${URL}/${batch.shtrix_code}`} alt="Shtrix kod" className="mx-auto mt-2 max-h-32 object-contain" />
                        ) : (
                          <div className="text-xs text-muted-foreground">Barcode yo'q</div>
                        )}
                        {batch.barcode && (
                          <div className="barcode-value mt-1 text-xs text-muted-foreground">{batch.barcode}</div>
                        )}
                      </div>
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
