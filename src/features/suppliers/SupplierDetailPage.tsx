import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Wallet,
  ShoppingCart,
  Banknote,
  HandCoins,
  Package,
  FileText,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { supplierService, type SupplierStats } from '../../services/supplierService';
import { SupplierPayDialog } from './SupplierPayDialog';
import { SupplierEntriesTab } from './SupplierEntriesTab';
import { SupplierPaymentsTab } from './SupplierPaymentsTab';
import { SupplierProductsTab } from './SupplierProductsTab';
import { formatCurrency, formatDateShort } from '../../utils';
import { handleError } from '../../utils/errorHandler';
import { latinToCyrillic, cyrillicToLatin } from '../../utils/transliteration';
import type { Supplier, SupplierFormData } from '../../types';

type TabKey = 'dashboard' | 'entries' | 'payments' | 'info' | 'products';

const TAB_KEYS: TabKey[] = ['dashboard', 'entries', 'payments', 'info', 'products'];

export function SupplierDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const lang = params.lang || 'uz';
  const supplierId = params.id || '';

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'dashboard';

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  // To'lovdan keyin tab ichidagi ro'yxatlarni qayta yuklash uchun signal
  const [refreshKey, setRefreshKey] = useState(0);

  const setActiveTab = (tab: TabKey) => {
    setSearchParams(tab === 'dashboard' ? {} : { tab }, { replace: true });
  };

  const loadSupplier = useCallback(async () => {
    if (!supplierId) return;
    try {
      const [supplierRes, statsRes] = await Promise.all([
        supplierService.getById(supplierId),
        supplierService.getStats(supplierId).catch(() => null),
      ]);
      setSupplier(supplierRes);
      setStats(statsRes);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      if (axiosErr.response?.status === 404) {
        setNotFound(true);
        return;
      }
      handleError(error, { showToast: true, logData: 'Failed to load supplier' });
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  const handlePaid = () => {
    setRefreshKey((key) => key + 1);
    void loadSupplier();
  };

  // "Qo'shilgan 25.06.2026 • 20 kun oldin"
  const createdInfo = useMemo(() => {
    const createdAt = supplier?.created_at || stats?.created_at;
    if (!createdAt) return null;
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return null;
    const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86_400_000));
    const ago =
      days === 0
        ? t('suppliers.addedToday', 'bugun')
        : t('suppliers.daysAgo', '{{count}} kun oldin', { count: days });
    return `${t('suppliers.added', 'Qo‘shilgan')} ${formatDateShort(created)} • ${ago}`;
  }, [supplier, stats, t]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'dashboard', label: t('suppliers.tabDashboard', 'Umumiy') },
    { key: 'entries', label: t('suppliers.tabEntries', 'Kirimlar') },
    { key: 'payments', label: t('suppliers.tabPayments', 'To‘lovlar') },
    { key: 'info', label: t('suppliers.tabInfo', 'Ma’lumotlar') },
    { key: 'products', label: t('suppliers.tabProducts', 'Tovarlar') },
  ];

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !supplier) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{t('suppliers.notFound', 'Ta’minotchi topilmadi')}</p>
        <Button variant="outline" onClick={() => navigate(`/${lang}/suppliers`)}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t('suppliers.backToList', 'Ro‘yxatga qaytish')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ───────── Sarlavha ───────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => navigate(`/${lang}/suppliers`)}
            aria-label={t('suppliers.backToList', 'Ro‘yxatga qaytish')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-foreground">
              {supplier.name_uz || supplier.name}
            </h1>
            {createdInfo && <p className="mt-0.5 text-sm text-muted-foreground">{createdInfo}</p>}
          </div>
        </div>
        <Button onClick={() => setPayOpen(true)}>
          <Wallet className="mr-2 h-4 w-4" />
          {t('suppliers.addPayment', 'To‘lov qilish')}
        </Button>
      </div>

      {/* ───────── Tablar ───────── */}
      <div>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1 sm:grid-cols-3 lg:grid-cols-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2.5 text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border border-border bg-background font-semibold text-foreground shadow-sm'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-5 border-t border-dashed border-border" />
      </div>

      {/* ───────── Tab kontenti ───────── */}
      {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
      {activeTab === 'entries' && (
        <SupplierEntriesTab supplierId={supplierId} stats={stats} refreshKey={refreshKey} />
      )}
      {activeTab === 'payments' && (
        <SupplierPaymentsTab supplierId={supplierId} stats={stats} refreshKey={refreshKey} />
      )}
      {activeTab === 'info' && <InfoTab supplier={supplier} onSaved={() => void loadSupplier()} />}
      {activeTab === 'products' && <SupplierProductsTab supplierId={supplierId} />}

      <SupplierPayDialog supplier={supplier} open={payOpen} onOpenChange={setPayOpen} onPaid={handlePaid} />
    </div>
  );
}

/* ───────────────────── Dashboard tabi ───────────────────── */

function DashboardTab({ stats }: { stats: SupplierStats | null }) {
  const { t } = useTranslation();

  if (!stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-muted/30" />
        ))}
      </div>
    );
  }

  const debt = Number(stats.total_debt) || 0;
  const pcs = t('suppliers.pcs', 'dona');

  const cards: {
    label: string;
    value: string;
    icon: typeof Wallet;
    accent?: string;
    sub?: string;
  }[] = [
    {
      label: t('suppliers.balance', 'Balans'),
      value: formatCurrency(Number(stats.balance) || 0),
      icon: Wallet,
    },
    {
      label: t('suppliers.paidEntries', 'To‘langan kirimlar'),
      value: `${stats.paid_entries_count} ${t('suppliers.entriesShort', 'ta kirim')}`,
      icon: ShoppingCart,
    },
    {
      label: t('suppliers.unpaidEntries', 'To‘lanmagan kirimlar'),
      value: `${stats.unpaid_entries_count} ${t('suppliers.entriesShort', 'ta kirim')}`,
      icon: ShoppingCart,
      accent: stats.unpaid_entries_count > 0 ? 'text-red-500' : undefined,
      sub:
        stats.partial_entries_count > 0
          ? `+${stats.partial_entries_count} ${t('suppliers.statusPartial', 'Qisman to‘langan').toLowerCase()}`
          : undefined,
    },
    {
      label: t('suppliers.purchasesSum', 'Kirimlar summasi'),
      value: formatCurrency(Number(stats.total_purchase_amount) || 0),
      icon: Banknote,
    },
    {
      label: t('suppliers.paymentsSum', 'To‘lovlar summasi'),
      value: formatCurrency(Number(stats.total_paid_amount) || 0),
      icon: HandCoins,
    },
    {
      label: t('suppliers.debtSum', 'Qarz summasi'),
      value: formatCurrency(debt),
      icon: Banknote,
      accent: debt > 0 ? 'text-red-500' : 'text-green-600',
    },
    {
      label: t('suppliers.itemsReceived', 'Qabul qilingan tovarlar'),
      value: `${stats.items_total_quantity} ${pcs}`,
      icon: Package,
    },
    {
      label: t('suppliers.entriesCount', 'Kirimlar soni'),
      value: `${stats.entries_count} ${t('suppliers.entriesShort', 'ta kirim')}`,
      icon: FileText,
    },
    {
      label: t('suppliers.ordersFrequency', 'Kirimlar chastotasi'),
      value: `${stats.orders_per_month} ${t('suppliers.perMonth', 'kirim/oy')}`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className={`mt-1 truncate text-xl font-bold tabular-nums ${card.accent || 'text-primary'}`}>
              {card.value}
            </p>
            {card.sub && <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>}
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted/60">
            <card.icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────── Ma'lumotlar tabi ───────────────────── */

function InfoTab({ supplier, onSaved }: { supplier: Supplier; onSaved: () => void }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<SupplierFormData>({
    name_uz: supplier.name_uz || supplier.name || '',
    name_uz_cyrl: supplier.name_uz_cyrl || '',
    description_uz: supplier.description_uz || supplier.description || '',
    description_uz_cyrl: supplier.description_uz_cyrl || '',
    address_uz: supplier.address_uz || supplier.address || '',
    address_uz_cyrl: supplier.address_uz_cyrl || '',
    phone_number: supplier.phone_number || supplier.phone || '',
    inn: supplier.inn || '',
  });
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const nameMissing = !formData.name_uz.trim() && !formData.name_uz_cyrl.trim();
  const phoneMissing = !formData.phone_number.trim();

  // Lotin ↔ kirill ikki tomonlama sinxron: qaysi maydonga yozilsa,
  // ikkinchisi avtomatik transliteratsiya qilinadi.
  const syncPair = (latin: keyof SupplierFormData, cyrl: keyof SupplierFormData, value: string, fromLatin: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [fromLatin ? latin : cyrl]: value,
      [fromLatin ? cyrl : latin]: fromLatin ? latinToCyrillic(value) : cyrillicToLatin(value),
    }));
  };

  const handleSave = async () => {
    if (nameMissing || phoneMissing) {
      setShowErrors(true);
      toast.error(t('suppliers.fillRequired', 'Majburiy (*) maydonlarni to‘ldiring'));
      return;
    }
    try {
      setSaving(true);
      await supplierService.update(supplier.id, formData);
      toast.success(t('suppliers.supplierUpdated', "Ta'minotchi muvaffaqiyatli yangilandi"));
      onSaved();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Asosiy */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">{t('suppliers.mainInfo', 'Asosiy')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {t('suppliers.supplierName')} (lotin) <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.name_uz}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                syncPair('name_uz', 'name_uz_cyrl', e.target.value, true)
              }
              className={showErrors && nameMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label>
              {t('suppliers.supplierName')} (kirill) <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.name_uz_cyrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                syncPair('name_uz', 'name_uz_cyrl', e.target.value, false)
              }
              className={showErrors && nameMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('common.description')} (lotin)</Label>
            <Input
              value={formData.description_uz}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                syncPair('description_uz', 'description_uz_cyrl', e.target.value, true)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t('common.description')} (kirill)</Label>
            <Input
              value={formData.description_uz_cyrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                syncPair('description_uz', 'description_uz_cyrl', e.target.value, false)
              }
            />
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-border" />

      {/* Rekvizitlar */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">{t('suppliers.requisites', 'Rekvizitlar')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {t('suppliers.phone')} <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="+998901234567"
              value={formData.phone_number}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, phone_number: e.target.value }))
              }
              className={showErrors && phoneMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {showErrors && phoneMissing && (
              <p className="text-xs text-red-600">
                {t('suppliers.phoneRequired', 'Telefon raqami kiritilishi shart!')}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>
              {t('suppliers.inn')}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({t('common.optional', 'ixtiyoriy')})
              </span>
            </Label>
            <Input
              inputMode="numeric"
              value={formData.inn}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, inn: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t('suppliers.address')} (lotin)</Label>
            <Input
              value={formData.address_uz}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                syncPair('address_uz', 'address_uz_cyrl', e.target.value, true)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t('suppliers.address')} (kirill)</Label>
            <Input
              value={formData.address_uz_cyrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                syncPair('address_uz', 'address_uz_cyrl', e.target.value, false)
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </div>
  );
}
