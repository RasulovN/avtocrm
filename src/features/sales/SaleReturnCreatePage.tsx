import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, ShoppingCart, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { salesService, saleReturnService } from '../../services/salesService';
import { formatCurrency } from '../../utils';
import type { Sale, SaleItem, SaleReturnFormItem } from '../../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';

export function SaleReturnCreatePage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSaleId = searchParams.get('saleId');

  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<string>(preselectedSaleId || '');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [comment, setComment] = useState('');
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingSale, setLoadingSale] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    if (preselectedSaleId) {
      loadSale(preselectedSaleId);
    }
  }, [preselectedSaleId]);

  const loadSales = async () => {
    try {
      setLoadingSales(true);
      const res = await salesService.getAll();
      setSales(res.data || []);
    } catch {
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  };

  const loadSale = async (saleId: string) => {
    if (!saleId) {
      setSelectedSale(null);
      return;
    }
    try {
      setLoadingSale(true);
      const sale = await salesService.getById(saleId);
      setSelectedSale(sale);
      setReturnQuantities({});
      setError('');
    } catch {
      setSelectedSale(null);
      setError(t('common.noData'));
    } finally {
      setLoadingSale(false);
    }
  };

  const handleSaleChange = (value: string) => {
    setSelectedSaleId(value);
    loadSale(value);
  };

  const handleQuantityChange = (saleItemId: number, value: string) => {
    const qty = parseInt(value, 10);
    setReturnQuantities((prev) => ({
      ...prev,
      [saleItemId]: isNaN(qty) ? 0 : qty,
    }));
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

  const isValid = useMemo(() => {
    if (!selectedSale || returnItems.length === 0) return false;
    for (const item of selectedSale.items) {
      const qty = returnQuantities[item.id] || 0;
      if (qty > item.quantity) return false;
    }
    return true;
  }, [selectedSale, returnQuantities, returnItems]);

  const handleSubmit = async () => {
    if (!selectedSale || returnItems.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await saleReturnService.create({
        sale: Number(selectedSale.id),
        items: returnItems,
        comment: comment.trim() || undefined,
      });
      navigate(`/${lang}/sales-returns`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || t('saleReturns.createError');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('saleReturns.newReturn')}
        description={t('saleReturns.returnSale')}
      />

      <div className="flex justify-between">
        <Link to={`/${lang}/sales-returns`} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
      </div>

      <div className="bg-card dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="space-y-2">
          <Label>{t('saleReturns.selectSale')}</Label>
          {loadingSales ? (
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <Select value={selectedSaleId} onValueChange={handleSaleChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('saleReturns.selectSale')} />
              </SelectTrigger>
              <SelectContent>
                {sales.map((sale) => (
                  <SelectItem key={sale.id} value={String(sale.id)}>
                    #{sale.id} - {sale.store_name || String(sale.store)} - {formatCurrency(parseFloat(sale.total_amount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {loadingSale && (
          <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
        )}

        {selectedSale && !loadingSale && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 dark:bg-gray-800/50">
                <p className="text-sm text-muted-foreground">{t('stores.title')}</p>
                <p className="font-semibold">{selectedSale.store_name || String(selectedSale.store)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 dark:bg-gray-800/50">
                <p className="text-sm text-muted-foreground">{t('sales.saleDetails')}</p>
                <p className="font-semibold">{selectedSale.seller_name || String(selectedSale.seller)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 dark:bg-gray-800/50">
                <p className="text-sm text-muted-foreground">{t('common.total')}</p>
                <p className="font-semibold">{formatCurrency(parseFloat(selectedSale.total_amount))}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t('saleReturns.returnItems')}
              </h3>

              {selectedSale.items?.length ? (
                <div className="space-y-3">
                  {selectedSale.items.map((item) => (
                    <SaleItemRow
                      key={item.id}
                      item={item}
                      returnQty={returnQuantities[item.id] || 0}
                      onChange={(val) => handleQuantityChange(item.id, val)}
                      t={t}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">{t('sales.noProducts')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('saleReturns.comment')}</Label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('saleReturns.comment')}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Link to={`/${lang}/sales-returns`} className="flex-1">
            <Button variant="outline" className="w-full">
              {t('common.cancel')}
            </Button>
          </Link>
          <Button
            className="flex-1"
            disabled={!isValid || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              t('common.saving')
            ) : (
              <>
                <Undo2 className="mr-2 h-4 w-4" />
                {t('saleReturns.newReturn')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SaleItemRow({
  item,
  returnQty,
  onChange,
  t,
}: {
  item: SaleItem;
  returnQty: number;
  onChange: (val: string) => void;
  t: (key: string) => string;
}) {
  const isInvalid = returnQty > item.quantity;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border ${isInvalid ? 'border-red-300 bg-red-50' : 'bg-muted/50 dark:bg-gray-800/50'}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
          {item.product}
        </div>
        <div>
          <p className="font-medium">{item.product_name || `Mahsulot #${item.product}`}</p>
          <p className="text-sm text-muted-foreground">
            {t('sales.quantity')}: {item.quantity} x {formatCurrency(parseFloat(item.unit_price))} = {formatCurrency(parseFloat(item.total_price))}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-full sm:w-40">
          <Label className="text-xs text-muted-foreground mb-1 block">{t('saleReturns.returnQuantity')}</Label>
          <Input
            type="number"
            min={0}
            max={item.quantity}
            value={returnQty || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            className={isInvalid ? 'border-red-300 focus-visible:ring-red-300' : ''}
          />
        </div>
      </div>
      {isInvalid && (
        <p className="text-xs text-red-600 sm:ml-2">{t('saleReturns.invalidQuantity')}</p>
      )}
    </div>
  );
}

