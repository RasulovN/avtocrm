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

    const batch = displayBatches.find(b => `barcode-card-${b.store}-${b.id}` === batchKey);
    const barcodeValue = batch?.barcode || batch?.shtrix_code || '';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body { 
              font-family: 'Consolas', 'Courier New', monospace; 
              margin: 0; 
              padding: 2mm;
              text-align: center;
              font-size: 9px;
            }
            .barcode-card { 
              border: none; 
              padding: 0;
              margin: 0;
              text-align: center;
              width: 54mm;
              box-sizing: border-box;
            }
            .barcode-section { 
              margin-top: 2px; 
            }
            .barcode-value { 
              font-family: 'Consolas', monospace; 
              font-size: 8px; 
              font-weight: bold;
              margin-top: 2px;
              letter-spacing: 2px;
            }
            svg { 
              max-width: 50mm; 
              height: auto; 
              display: block;
              margin: 0 auto;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-card">
            <div class="barcode-section">
              ${barcodeValue ? `
                <svg id="barcode-svg"></svg>
                <div class="barcode-value">${barcodeValue}</div>
              ` : ''}
            </div>
          </div>
          <script>
            window.onload = function() {
              ${barcodeValue ? `
                try {
                  JsBarcode('#barcode-svg', '${barcodeValue}', {
                    format: 'CODE128',
                    width: 1.2,
                    height: 35,
                    displayValue: false,
                    margin: 0,
                  });
                } catch(e) {
                  console.error('Barcode error:', e);
                }
              ` : ''}
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const barcodeCards = displayBatches.map((batch, index) => {
      const barcodeValue = batch.barcode || batch.shtrix_code || '';
      return `
        <div class="barcode-card">
          <div class="barcode-section">
            ${barcodeValue ? `
              <svg id="barcode-svg-${index}"></svg>
              <div class="barcode-value">${barcodeValue}</div>
            ` : ''}
          </div>
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
              margin: 0;
            }
            body {
              font-family: 'Consolas', 'Courier New', monospace;
              margin: 0;
              padding: 2mm;
              text-align: center;
              font-size: 9px;
            }
            .barcode-card {
              border: none;
              padding: 0;
              margin: 0;
              text-align: center;
              width: 54mm;
              box-sizing: border-box;
            }
            .barcode-section { 
              margin-top: 2px; 
            }
            .barcode-value { 
              font-family: 'Consolas', monospace; 
              font-size: 8px; 
              font-weight: bold;
              margin-top: 2px;
              letter-spacing: 2px;
            }
            svg { 
              max-width: 50mm; 
              height: auto; 
              display: block;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          ${barcodeCards}
          <script>
            window.onload = function() {
              ${displayBatches.map((batch, index) => {
                const barcodeValue = batch.barcode || batch.shtrix_code || '';
                return barcodeValue ? `
                  try {
                    JsBarcode('#barcode-svg-${index}', '${barcodeValue}', {
                      format: 'CODE128',
                      width: 1.2,
                      height: 35,
                      displayValue: false,
                      margin: 0,
                    });
                  } catch (error) {
                    console.error('Failed to generate barcode ${index}:', error);
                  }
                ` : '';
              }).join('')}
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
  const fallbackBarcode = product?.barcode || product?.shtrix_code || product?.sku || '';
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
                const barcodeValue = batch.barcode || batch.shtrix_code || '';
                return (
                  <div key={key} className="space-y-3 rounded-lg border p-4">
                    <div id={key} className="barcode-card text-center">
                      {barcodeValue ? (
                        <>
                          <BarcodePrint 
                            value={barcodeValue} 
                            showName={false} 
                            thermalPrinter={true}
                          />
                          <div className="barcode-value mt-1 text-xs font-mono font-medium text-gray-700 dark:text-gray-300">{barcodeValue}</div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">Barcode yo'q</div>
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
