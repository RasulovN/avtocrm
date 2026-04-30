import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Package,
  Clock,
  Search,
  ShoppingCart,
  CornerUpLeft,
  ArrowUpToLine,
  ArrowDownToLine,
  Box,
  Scan,
  AlertTriangle,
  Minus,
  Plus,
  Tag,
  Barcode,
  ClipboardCheck,
  Camera,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ScannerModal } from '../../components/ScannerModal';
import { useInventoryStore } from '../../store/inventory.store';
import { cn } from '../../utils';

export function InventoryDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const sessionId = Number(params.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [showChecked, setShowChecked] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  const {
    currentSessionProducts,
    currentSessionChecked,
    itemsLoading,
    scanningProductId,
    error,
    fetchSessionProducts,
    scanProduct,
    finalizeSession,
    cancelSession,
    clearError,
  } = useInventoryStore();

  useEffect(() => {
    if (sessionId) {
      fetchSessionProducts(sessionId);
    }
  }, [sessionId, fetchSessionProducts]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleQuantityChange = useCallback(
    (productId: number, value: string) => {
      const qty = value === '' ? 0 : parseInt(value, 10);
      if (!isNaN(qty) && qty >= 0) {
        scanProduct(sessionId, productId, qty);
      }
    },
    [sessionId, scanProduct]
  );

  const handleIncrement = useCallback(
    (productId: number, currentValue: number) => {
      const newQty = currentValue + 1;
      scanProduct(sessionId, productId, newQty);
    },
    [sessionId, scanProduct]
  );

  const handleDecrement = useCallback(
    (productId: number, currentValue: number) => {
      const newQty = Math.max(0, currentValue - 1);
      scanProduct(sessionId, productId, newQty);
    },
    [sessionId, scanProduct]
  );

  const handleFinalize = useCallback(async () => {
    try {
      await finalizeSession(sessionId);
      toast.success(t('inventory.completedSuccess'));
      navigate(`/${params.lang || 'uz'}/inventory`);
    } catch {
      toast.error(t('inventory.completeFailed'));
    }
  }, [sessionId, finalizeSession, navigate, t, params.lang]);

  const handleScanSearch = useCallback(async (barcode: string) => {
    setSearchQuery(barcode);
  }, []);

  const handleCancel = useCallback(async () => {
    if (!window.confirm(t('inventory.confirmCancel'))) return;
    try {
      await cancelSession(sessionId);
      toast.success(t('inventory.cancelledSuccess'));
      navigate(`/${params.lang || 'uz'}/inventory`);
    } catch {
      toast.error(t('inventory.cancelFailed'));
    }
  }, [sessionId, cancelSession, navigate, t, params.lang]);

  const allProducts = useMemo(() => {
    const checkedMap = new Map<number, boolean>();
    currentSessionChecked.forEach((p) => checkedMap.set(p.product_id, true));
    return currentSessionProducts.map((p) => ({
      ...p,
      is_check: checkedMap.has(p.product_id) || p.is_check,
    }));
  }, [currentSessionProducts, currentSessionChecked]);

  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (!showChecked) {
      list = list.filter((p) => !p.is_check);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.product_name.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allProducts, showChecked, searchQuery]);

  const stats = useMemo(() => {
    const total = allProducts.length;
    const checked = allProducts.filter((p) => p.is_check).length;
    const pending = total - checked;
    const withDifference = allProducts.filter((p) => p.difference !== 0).length;
    return { total, checked, pending, withDifference };
  }, [allProducts]);

  const progressPercent =
    stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0;

  if (itemsLoading && allProducts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('inventory.countingTitle')}
          description={`#${sessionId}`}
        />
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={t('inventory.countingTitle')}
            description={`${t('inventory.session')} #${sessionId}`}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:p-5">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary sm:p-3">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('inventory.totalItems')}
              </p>
              <p className="text-xl font-bold sm:text-2xl">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:p-5">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 sm:p-3">
              <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('inventory.checked')}
              </p>
              <p className="text-xl font-bold sm:text-2xl text-emerald-600">
                {stats.checked}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:p-5">
            <div className="rounded-xl bg-yellow-50 p-2.5 text-yellow-700 sm:p-3">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('inventory.pending')}
              </p>
              <p className="text-xl font-bold sm:text-2xl text-yellow-600">
                {stats.pending}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 xl:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('common.progress')}
              </p>
              <p className="text-lg font-bold text-primary">
                {progressPercent}%
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-linear-to-r from-primary to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('inventory.searchPlaceholder')}
              className="h-11 pl-9 pr-12 text-base"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              title={t('inventory.barcodeScanner')}
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChecked((v) => !v)}
            >
              {showChecked
                ? t('inventory.hideChecked')
                : t('inventory.showChecked')}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <XCircle className="mr-2 h-4 w-4" />
              {t('inventory.cancelInventory')}
            </Button>
            <Button size="sm" onClick={handleFinalize}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('inventory.finalizeInventory')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="-mx-1 flex gap-2 px-1 pb-1">
        <button
          type="button"
          onClick={() => setShowChecked(true)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            showChecked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-foreground hover:bg-accent'
          )}
        >
          {t('inventory.allProducts')} ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setShowChecked(false)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            !showChecked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-foreground hover:bg-accent'
          )}
        >
          {t('inventory.uncheckedOnly')} ({stats.pending})
        </button>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 lg:hidden">
        {filteredProducts.map((product) => (
          <MobileProductCard
            key={product.product_id}
            product={product}
            onChange={(val) => handleQuantityChange(product.product_id, val)}
            onInc={() => handleIncrement(product.product_id, product.scanned)}
            onDec={() => handleDecrement(product.product_id, product.scanned)}
            isScanning={scanningProductId === product.product_id}
            t={t}
          />
        ))}
        {filteredProducts.length === 0 && !itemsLoading && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery
              ? t('inventory.noSearchResults')
              : t('inventory.noItems')}
          </div>
        )}
        {itemsLoading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {t('common.loading')}
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      <ScannerModal
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={handleScanSearch}
      />

      {/* Desktop Table */}
      <Card className="hidden lg:block">
        <div>
          <table className="w-full table-fixed">
            <thead className="bg-muted/50">
              <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">{t('inventory.productName')}</th>
                <th className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Tag className="h-3 w-3" />
                    {t('inventory.declared')}
                  </div>
                </th>
                <th className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Scan className="h-3 w-3" />
                    {t('inventory.scanned')}
                  </div>
                </th>
                <th className="px-2 py-3 text-center">
                  {t('inventory.difference')}
                </th>
                <th className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    {t('inventory.soldOut')}
                  </div>
                </th>
                <th className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CornerUpLeft className="h-3 w-3" />
                    {t('inventory.returned')}
                  </div>
                </th>
                <th className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ArrowUpToLine className="h-3 w-3" />
                    {t('inventory.transferOut')}
                  </div>
                </th>
                <th className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ArrowDownToLine className="h-3 w-3" />
                    {t('inventory.transferIn')}
                  </div>
                </th>
                <th className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Box className="h-3 w-3" />
                    {t('inventory.entry')}
                  </div>
                </th>
                <th className="px-2 py-3 text-center">
                  {t('inventory.final')}
                </th>
                <th className="px-2 py-3 text-center">
                  {t('inventory.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((product) => (
                <DesktopProductRow
                  key={product.product_id}
                  product={product}
                  onChange={(val) =>
                    handleQuantityChange(product.product_id, val)
                  }
                  onInc={() =>
                    handleIncrement(product.product_id, product.scanned)
                  }
                  onDec={() =>
                    handleDecrement(product.product_id, product.scanned)
                  }
                  isScanning={scanningProductId === product.product_id}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && !itemsLoading && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery
              ? t('inventory.noSearchResults')
              : t('inventory.noItems')}
          </div>
        )}
        {itemsLoading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {t('common.loading')}
          </div>
        )}
      </Card>
    </div>
  );
}

interface MobileProductCardProps {
  product: {
    product_id: number;
    product_name: string;
    barcode: string;
    declared: number;
    scanned: number;
    sold_out: number;
    returned: number;
    transfer_out: number;
    transfer_in: number;
    entry: number;
    final: number;
    difference: number;
    is_check: boolean;
  };
  onChange: (value: string) => void;
  onInc: () => void;
  onDec: () => void;
  isScanning: boolean;
  t: (key: string) => string;
}

function MobileProductCard({
  product,
  onChange,
  onInc,
  onDec,
  isScanning,
  t,
}: MobileProductCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors',
        product.is_check
          ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10'
          : 'border-yellow-200 bg-yellow-50/20 dark:border-yellow-900 dark:bg-yellow-950/10'
      )}
    >
      <CardContent className="p-4">
        {/* Product Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              {product.product_name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Barcode className="h-3 w-3" />
              {product.barcode || '-'}
            </p>
          </div>
          <StatusBadge isCheck={product.is_check} difference={product.difference} />
        </div>

        {/* Movement Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatPill
            icon={<Tag className="h-3 w-3" />}
            label={t('inventory.declared')}
            value={product.declared}
          />
          <StatPill
            icon={<ShoppingCart className="h-3 w-3 text-blue-500" />}
            label={t('inventory.soldOut')}
            value={product.sold_out}
          />
          <StatPill
            icon={<CornerUpLeft className="h-3 w-3 text-purple-500" />}
            label={t('inventory.returned')}
            value={product.returned}
          />
          <StatPill
            icon={<ArrowUpToLine className="h-3 w-3 text-orange-500" />}
            label={t('inventory.transferOut')}
            value={product.transfer_out}
          />
          <StatPill
            icon={<ArrowDownToLine className="h-3 w-3 text-cyan-500" />}
            label={t('inventory.transferIn')}
            value={product.transfer_in}
          />
          <StatPill
            icon={<Box className="h-3 w-3 text-indigo-500" />}
            label={t('inventory.entry')}
            value={product.entry}
          />
        </div>

        {/* Scanned Input + Final/Diff */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={onDec}
              disabled={isScanning || product.scanned <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min={0}
              value={product.scanned || ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={isScanning}
              className="h-9 w-20 text-center text-base font-bold"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={onInc}
              disabled={isScanning}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-end gap-3 text-sm">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('inventory.final')}</p>
              <p className="font-semibold">{product.final}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('inventory.difference')}</p>
              <DifferenceValue value={product.difference} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DesktopProductRowProps {
  product: {
    product_id: number;
    product_name: string;
    barcode: string;
    declared: number;
    scanned: number;
    sold_out: number;
    returned: number;
    transfer_out: number;
    transfer_in: number;
    entry: number;
    final: number;
    difference: number;
    is_check: boolean;
  };
  onChange: (value: string) => void;
  onInc: () => void;
  onDec: () => void;
  isScanning: boolean;
  t: (key: string) => string;
}

function DesktopProductRow({
  product,
  onChange,
  isScanning,
  t,
}: DesktopProductRowProps) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-accent/25',
        product.is_check
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
          : 'bg-yellow-50/20 dark:bg-yellow-950/10'
      )}
    >
      <td className="px-4 py-3">
        <div className="font-medium text-sm">{product.product_name}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Barcode className="h-3 w-3" />
          {product.barcode || '-'}
        </div>
      </td>
      <td className="px-2 py-3 text-center text-sm font-semibold">
        {product.declared}
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center justify-center gap-1">
          <Input
            type="text"
            value={product.scanned || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isScanning}
            className="h-8 w-full text-center text-sm font-bold px-1"
          />
        </div>
      </td>
      <td className="px-2 py-3 text-center text-sm font-semibold">
        <DifferenceValue value={product.difference} />
      </td>
      <td className="px-2 py-3 text-center text-sm ">
        <Button variant="outline" className='w-full'>
          <ShoppingCart className="h-4 w-4 mr-2 text-blue-600" />
          {product.sold_out}
        </Button>
      </td>
      <td className="px-2 py-3 text-center text-sm">
        <Button variant="outline" className='w-full'>
          <CornerUpLeft className="h-4 w-4 mr-2 text-purple-600" />
          {product.returned}
        </Button>
      </td>
      <td className="px-2 py-3 text-center text-sm ">
        <Button variant="outline" className='w-full'>
          <ArrowUpToLine className="h-4 w-4 mr-2 text-orange-600" />
          {product.transfer_out}
        </Button>
      </td>
      <td className="px-2 py-3 text-center text-sm">
        <Button variant="outline" className='w-full'>
          <ArrowDownToLine className="h-4 w-4 mr-2 text-cyan-600" />
          {product.transfer_in}
        </Button>
      </td>
      <td className="px-2 py-3 text-center text-sm ">
        <Button variant="outline" className='w-full'>
          <Box className="h-4 w-4 mr-2 text-indigo-600" />
          {product.entry}
        </Button>
      </td>
      <td className="px-2 py-3 text-center text-sm font-semibold">
        {product.final}
      </td>
      <td className="px-2 py-3 text-center">
        <StatusBadge isCheck={product.is_check} difference={product.difference} />
      </td>
    </tr>
  );
}


function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function DifferenceValue({ value }: { value: number }) {
  return (
    <span
      className={cn(
        'font-semibold',
        value === 0 && 'text-emerald-600',
        value < 0 && 'text-rose-600',
        value > 0 && 'text-amber-600'
      )}
    >
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

function StatusBadge({
  isCheck,
  difference,
}: {
  isCheck: boolean;
  difference: number;
}) {
  if (!isCheck) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
        <Clock className="h-3 w-3" />
      </span>
    );
  }
  if (difference === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900 dark:text-rose-300">
      <AlertTriangle className="h-3 w-3" />
    </span>
  );
}

