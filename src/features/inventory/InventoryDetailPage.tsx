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
  const [activeTab, setActiveTab] = useState<'all' | 'shortage' | 'excess'>('all');

  const {
    sessions,
    currentSessionProducts,
    currentSessionChecked,
    currentSessionShorts,
    currentSessionOvers,
    itemsLoading,
    scanningProductId,
    error,
    fetchSessions,
    fetchSessionProducts,
    fetchSessionShorts,
    fetchSessionOvers,
    scanProduct,
    finalizeSession,
    cancelSession,
    clearError,
  } = useInventoryStore();

  const currentSession = useMemo(() => 
    sessions.find((s) => s.id === sessionId),
    [sessions, sessionId]
  );

  const isCompleted = currentSession?.status === 'completed' || currentSession?.status === 'e';

  useEffect(() => {
    if (sessions.length === 0) {
      fetchSessions();
    }
  }, [sessions.length, fetchSessions]);

  useEffect(() => {
    if (sessionId) {
      fetchSessionProducts(sessionId);
      fetchSessionShorts(sessionId);
      fetchSessionOvers(sessionId);
    }
  }, [sessionId, fetchSessionProducts, fetchSessionShorts, fetchSessionOvers]);

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

  const filteredShorts = useMemo(() => {
    let list = currentSessionShorts;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => p.product_name.toLowerCase().includes(q));
    }
    return list;
  }, [currentSessionShorts, searchQuery]);

  const filteredOvers = useMemo(() => {
    let list = currentSessionOvers;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => p.product_name.toLowerCase().includes(q));
    }
    return list;
  }, [currentSessionOvers, searchQuery]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Main Tabs (All, Shortage, Excess) */}
      <div className="border-b border-border/60">
        <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar scrollbar-none pb-px">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors shrink-0',
              activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t('inventory.allProducts')}
          </button>
          <button
            onClick={() => setActiveTab('shortage')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 shrink-0',
              activeTab === 'shortage'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t('inventory.shortages')}
            <span className="bg-rose-50 text-rose-700 text-xs px-2 py-0.5 rounded-full dark:bg-rose-950/40">
              {currentSessionShorts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('excess')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 shrink-0',
              activeTab === 'excess'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t('inventory.excesses')}
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full dark:bg-emerald-950/40">
              {currentSessionOvers.length}
            </span>
          </button>
        </div>
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
            {!isCompleted && activeTab === 'all' && (
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                title={t('inventory.barcodeScanner')}
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>
          {!isCompleted && activeTab === 'all' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChecked((v) => !v)}
                className="w-full sm:w-auto"
              >
                {showChecked
                  ? t('inventory.hideChecked')
                  : t('inventory.showChecked')}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleCancel} className="w-full sm:w-auto">
                <XCircle className="mr-2 h-4 w-4" />
                {t('inventory.cancelInventory')}
              </Button>
              <Button size="sm" onClick={handleFinalize} className="w-full sm:w-auto">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('inventory.finalizeInventory')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter Tabs (only for "all" tab and not completed) */}
      {activeTab === 'all' && !isCompleted && (
        <div className="-mx-1 flex gap-2 px-1 pb-1 overflow-x-auto no-scrollbar scrollbar-none">
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
      )}

      {/* Mobile Cards */}
      <div className="space-y-3 lg:hidden">
        {activeTab === 'all' && filteredProducts.map((product) => (
          <MobileProductCard
            key={product.product_id}
            product={product}
            onChange={(val) => handleQuantityChange(product.product_id, val)}
            onInc={() => handleIncrement(product.product_id, product.scanned)}
            onDec={() => handleDecrement(product.product_id, product.scanned)}
            isScanning={scanningProductId === product.product_id}
            t={t}
            readOnly={isCompleted}
          />
        ))}
        
        {activeTab === 'shortage' && filteredShorts.map((item) => (
          <ShortageExcessMobileCard
            key={item.id}
            item={item}
            t={t}
          />
        ))}

        {activeTab === 'excess' && filteredOvers.map((item) => (
          <ShortageExcessMobileCard
            key={item.id}
            item={item}
            t={t}
          />
        ))}

        {((activeTab === 'all' && filteredProducts.length === 0) ||
          (activeTab === 'shortage' && filteredShorts.length === 0) ||
          (activeTab === 'excess' && filteredOvers.length === 0)) && !itemsLoading && (
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
              {activeTab === 'all' ? (
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
              ) : (
                <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">{t('inventory.productName')}</th>
                  <th className="px-4 py-3">{t('products.category')}</th>
                  <th className="px-4 py-3 text-center">{t('inventory.expectedQty')}</th>
                  <th className="px-4 py-3 text-center">{t('inventory.countedQty')}</th>
                  <th className="px-4 py-3 text-center">{t('inventory.difference')}</th>
                  <th className="px-4 py-3 text-right">{t('common.status')}</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y">
              {activeTab === 'all' && filteredProducts.map((product) => (
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
                  readOnly={isCompleted}
                />
              ))}
              
              {activeTab === 'shortage' && filteredShorts.map((item) => (
                <ShortageExcessDesktopRow
                  key={item.id}
                  item={item}
                  t={t}
                />
              ))}

              {activeTab === 'excess' && filteredOvers.map((item) => (
                <ShortageExcessDesktopRow
                  key={item.id}
                  item={item}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>
        {((activeTab === 'all' && filteredProducts.length === 0) ||
          (activeTab === 'shortage' && filteredShorts.length === 0) ||
          (activeTab === 'excess' && filteredOvers.length === 0)) && !itemsLoading && (
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
  readOnly?: boolean;
}

function MobileProductCard({
  product,
  onChange,
  onInc,
  onDec,
  isScanning,
  t,
  readOnly = false,
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/40">
          {!readOnly ? (
            <div className="flex items-center justify-center gap-1.5 self-center sm:self-auto">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
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
                className="h-9 w-20 text-center text-base font-bold shrink-0"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                onClick={onInc}
                disabled={isScanning}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 px-3 py-1.5 text-center self-center sm:self-auto">
              <p className="text-xs text-muted-foreground">{t('inventory.scanned')}</p>
              <p className="text-sm font-bold text-primary">{product.scanned}</p>
            </div>
          )}
          <div className="flex items-center justify-center sm:justify-end gap-6 text-sm pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-border/40 sm:border-none">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('inventory.final')}</p>
              <p className="font-semibold text-sm">{product.final}</p>
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
  readOnly?: boolean;
}

function DesktopProductRow({
  product,
  onChange,
  isScanning,
  readOnly = false,
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
          {!readOnly ? (
            <Input
              type="text"
              value={product.scanned || ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={isScanning}
              className="h-8 w-full text-center text-sm font-bold px-1"
            />
          ) : (
            <span className="text-sm font-bold text-primary">{product.scanned}</span>
          )}
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
    <div className="rounded-lg bg-muted/50 p-1.5 sm:p-2 text-center min-w-0">
      <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-0.5">
        <span className="shrink-0">{icon}</span>
        <span className="truncate" title={label}>{label}</span>
      </div>
      <p className="text-xs sm:text-sm font-semibold truncate">{value}</p>
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

interface ShortageExcessCardRowProps {
  item: import('../../services/inventory.api').ShortageExcessProduct;
  t: (key: string) => string;
}

function ShortageExcessMobileCard({ item, t }: ShortageExcessCardRowProps) {
  const isShortage = item.status === 'l';
  return (
    <Card className={cn(
      'overflow-hidden border',
      isShortage ? 'border-rose-200 bg-rose-50/20' : 'border-emerald-200 bg-emerald-50/20'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{item.product_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.category_name || '-'}
            </p>
          </div>
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            isShortage ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
          )}>
            {isShortage ? t('inventory.shortages') : t('inventory.excesses')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatPill
            icon={<Tag className="h-3 w-3" />}
            label={t('inventory.expectedQty')}
            value={item.system_quantity}
          />
          <StatPill
            icon={<Scan className="h-3 w-3 text-blue-500" />}
            label={t('inventory.countedQty')}
            value={item.counted_quantity}
          />
          <div className="rounded-lg bg-muted/50 p-2 text-center flex flex-col justify-center">
            <span className="text-xs text-muted-foreground mb-0.5">{t('inventory.difference')}</span>
            <DifferenceValue value={item.diff} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ShortageExcessDesktopRow({ item, t }: ShortageExcessCardRowProps) {
  const isShortage = item.status === 'l';
  return (
    <tr className="hover:bg-muted/30 border-b transition-colors">
      <td className="px-4 py-3 font-medium text-sm">{item.product_name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{item.category_name || '-'}</td>
      <td className="px-4 py-3 text-center text-sm font-semibold">{item.system_quantity}</td>
      <td className="px-4 py-3 text-center text-sm font-semibold">{item.counted_quantity}</td>
      <td className="px-4 py-3 text-center text-sm font-bold">
        <DifferenceValue value={item.diff} />
      </td>
      <td className="px-4 py-3 text-right">
        <span className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
          isShortage ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
        )}>
          {isShortage ? t('inventory.shortages') : t('inventory.excesses')}
        </span>
      </td>
    </tr>
  );
}

