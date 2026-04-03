import { useEffect, useRef, useState, useCallback, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer, ArrowLeft } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { productService } from '../../services/productService';
import type { Product } from '../../types';
import { formatCurrency } from '../../utils';

export function ProductBarcodePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [barcodeValue, setBarcodeValue] = useState('');

  useEffect(() => {
    if (barcodeRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error('Failed to generate barcode:', error);
      }
    }
  }, [barcodeValue]);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      const data = await productService.getById(id);
      setProduct(data);
      setBarcodeValue(data.barcode || data.sku);
    } catch (error) {
      console.error('Failed to load product:', error);
      // Mock data
      setProduct({
        id: '1',
        name: 'Oil Filter',
        description: 'Premium oil filter',
        purchase_price: 15000,
        selling_price: 25000,
        category: 'Filters',
        supplier_id: '1',
        store_id: '1',
        sku: 'SKU-001',
        barcode: '1234567890123',
        quantity: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setBarcodeValue('1234567890123');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const handlePrint = () => {
    const printContent = document.getElementById('barcode-print-area');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .product-name { font-size: 14px; margin-bottom: 5px; }
            .product-price { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            svg { max-width: 100%; height: auto; }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <p>{product?.category}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Selling Price</Label>
                <p className="font-medium">{formatCurrency(product?.selling_price || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('products.barcode')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('products.barcode')}</Label>
              <Input
                value={barcodeValue}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBarcodeValue(e.target.value)}
              />
            </div>
            <div id="barcode-print-area" className="flex flex-col items-center p-4 border rounded-lg">
              <p className="product-name font-medium">{product?.name}</p>
              <p className="product-price">{formatCurrency(product?.selling_price || 0)}</p>
              <svg ref={barcodeRef}></svg>
            </div>
            <Button onClick={handlePrint} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              {t('products.printBarcode')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
