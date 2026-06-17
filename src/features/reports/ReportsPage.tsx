import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingUp, ShoppingCart, Users, Loader2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { useThemeStore } from '../../app/themeStore';
import { useAuthStore } from '../../app/store';
import { reportService } from '../../services/reportService';
import type { DetailedReportsResponse, ReportsFilter } from '../../services/reportService';
import { storeService } from '../../services/storeService';
import type { Store } from '../../types';
import { formatCurrency } from '../../utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#6366f1'];

const TRANSLATIONS: Record<string, { uz: string; cyrl: string }> = {
  'Hisobotlar va tahlillar': { uz: 'Hisobotlar va tahlillar', cyrl: 'Ҳисоботлар ва таҳлиллар' },
  'Batafsil biznes tahlili': { uz: 'Batafsil biznes tahlili', cyrl: 'Батафсил бизнес таҳлили' },
  'Excelga eksport qilish': { uz: 'Excelga eksport qilish', cyrl: 'Excel\'ga экспорт қилиш' },
  'Umumiy tushum': { uz: 'Umumiy tushum', cyrl: 'Умумий тушум' },
  'Sof foyda': { uz: 'Sof foyda', cyrl: 'Соф фойда' },
  'Jami buyurtmalar': { uz: 'Jami buyurtmalar', cyrl: 'Жами буюртмалар' },
  'Mijozlar qarzlari': { uz: 'Mijozlar qarzlari', cyrl: 'Мижозлар қарзлари' },
  'Sotuvlar': { uz: 'Sotuvlar', cyrl: 'Сотувлар' },
  "To'lovlar": { uz: "To'lovlar", cyrl: 'Тўловлар' },
  'Qarzlar': { uz: 'Qarzlar', cyrl: 'Қарзлар' },
  "Do'konlar bo'yicha sotuvlar": { uz: "Do'konlar bo'yicha sotuvlar", cyrl: 'Дўконлар бўйича сотувлар' },
  "Kategoriyalar bo'yicha sotuvlar": { uz: "Kategoriyalar bo'yicha sotuvlar", cyrl: 'Категориялар бўйича сотувлар' },
  "Sotuvlar bo'yicha Top-10 tovarlar": { uz: "Sotuvlar bo'yicha Top-10 tovarlar", cyrl: 'Сотувлар бўйича Топ-10 товарлар' },
  'Tovar': { uz: 'Tovar', cyrl: 'Товар' },
  'Kategoriya': { uz: 'Kategoriya', cyrl: 'Категория' },
  'Sotilgan summa': { uz: 'Sotilgan summa', cyrl: 'Сотилган сумма' },
  "To'lovlar tarkibi": { uz: "To'lovlar tarkibi", cyrl: 'Тўловлар таркиби' },
  "To'lov usuli": { uz: "To'lov usuli", cyrl: 'Тўлов усули' },
  'Sotuvlar soni': { uz: 'Sotuvlar soni', cyrl: 'Сотувлар сони' },
  'Summa': { uz: 'Summa', cyrl: 'Сумма' },
  'Ulushi': { uz: 'Ulushi', cyrl: 'Улуши' },
  'Jami': { uz: 'Jami', cyrl: 'Жами' },
  'Qarzdorligi bor mijozlar': { uz: 'Qarzdorligi bor mijozlar', cyrl: 'Қарздорлиги бор мижозлар' },
  'Mijoz': { uz: 'Mijoz', cyrl: 'Мижоз' },
  'Telefon': { uz: 'Telefon', cyrl: 'Телефон' },
  'Qarzdorlik': { uz: 'Qarzdorlik', cyrl: 'Қарздорлик' },
  'Davr': { uz: 'Davr', cyrl: 'Давр' },
  'Boshlanish sanasi': { uz: 'Boshlanish sanasi', cyrl: 'Бошланиш санаси' },
  'Tugash sanasi': { uz: 'Tugash sanasi', cyrl: 'Тугаш санаси' },
  "Do'kon": { uz: "Do'kon", cyrl: 'Дўкон' },
  "Barcha do'konlar": { uz: "Barcha do'konlar", cyrl: 'Барча дўконлар' },
  'Hafta': { uz: 'Hafta', cyrl: 'Ҳафта' },
  'Oy': { uz: 'Oy', cyrl: 'Ой' },
  'Yil': { uz: 'Yil', cyrl: 'Йил' },
  'Yuklanmoqda...': { uz: 'Yuklanmoqda...', cyrl: 'Юкланмоқда...' },
  'Xatolik yuz berdi': { uz: 'Xatolik yuz berdi', cyrl: 'Хатолик юз берди' },
  'Ushbu oyda': { uz: 'Ushbu oyda', cyrl: 'Ушбу ойда' },
  'Ushbu haftada': { uz: 'Ushbu haftada', cyrl: 'Ушбу ҳафтада' },
  'Ushbu yilda': { uz: 'Ushbu yilda', cyrl: 'Ушбу йилда' },
  'mijoz': { uz: 'mijoz', cyrl: 'мижоз' },
  'Marja': { uz: 'Marja', cyrl: 'Маржа' },
  'Xarajatlar': { uz: 'Xarajatlar', cyrl: 'Харажатлар' },
  'Umumiy xarajatlar': { uz: 'Umumiy xarajatlar', cyrl: 'Умумий харажатлар' },
  'Kategoriyasiz': { uz: 'Kategoriyasiz', cyrl: 'Категориясиз' },
  "Hech qanday ma'lumot topilmadi": { uz: "Hech qanday ma'lumot topilmadi", cyrl: 'Ҳеч қандай маълумот топилмади' },
  'ta': { uz: 'ta', cyrl: 'та' },
  'Yetkazib beruvchilar oldidagi qarzdorlik': { uz: 'Yetkazib beruvchilar oldidagi qarzdorlik', cyrl: 'Етказиб берувчилар олдидаги қарздорлик' },
  'Yetkazib beruvchi': { uz: 'Yetkazib beruvchi', cyrl: 'Етказиб берувчи' },
  'Sof foyda trendi': { uz: 'Sof foyda trendi', cyrl: 'Соф фойда тренди' },
  'Yetkazib beruvchilarga': { uz: 'Yetkazib beruvchilarga', cyrl: 'Етказиб берувчиларга' },
  'Naqd': { uz: 'Naqd', cyrl: 'Нақд' },
  'Karta': { uz: 'Karta', cyrl: 'Карта' },
  'Nasiya': { uz: 'Nasiya', cyrl: 'Насия' },
  'Tozalash': { uz: 'Tozalash', cyrl: 'Тозалаш' }
};


const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
);

export function ReportsPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'uz';
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser || user?.role === 'superuser');
const userStoreId = user?.store_id || (user?.stores && user.stores.length > 0 ? String(user.stores.find(s => s.type === 'b')?.id ?? user.stores[0].id) : '');


  const [activeTab, setActiveTab] = useState('sotuvlar');
  const [filter, setFilter] = useState<ReportsFilter>('monthly');
  const [storeId, setStoreId] = useState<string>(userStoreId || 'all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const [data, setData] = useState<DetailedReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (!isAdmin && userStoreId) {
      setStoreId(userStoreId);
    }
  }, [userStoreId, isAdmin]);

  const getTrans = (key: string) => {
    return TRANSLATIONS[key]?.[lang === 'cyrl' ? 'cyrl' : 'uz'] || key;
  };

  const getPaymentMethodLabel = (method: string) => {
    const m = method.toLowerCase();
    if (m === 'cash' || m === 'naqd') return getTrans('Naqd');
    if (m === 'card' || m === 'karta') return getTrans('Karta');
    if (m === 'debt' || m === 'nasiya') return getTrans('Nasiya');
    return getTrans(method);
  };

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await storeService.getAll({ limit: 100 });
        setStores(res.data);
      } catch (err) {
        console.error('Failed to load stores:', err);
      }
    };
    void fetchStores();
  }, []);

const availableBranches = useMemo(() => {
    // const storeIdStr = String(userStoreId || 'all');

    if (isAdmin) {
      const branchesList = stores.map((s) => {
        const name = lang === 'cyrl' ? (s.name_uz_cyrl || s.name) : s.name;
        return {
          id: String(s.id),
          name: name,
        };
      });
      return [
        { id: 'all', name: getTrans("Barcha do'konlar") },
        ...branchesList,
      ];
    }
    const userStore = stores.find(s => String(s.id) === String(userStoreId));
    let storeName = user?.store_name || (lang === 'cyrl' ? "Менинг филиалим" : "Mening filialim");
    if (userStore) {
      storeName = lang === 'cyrl' ? (userStore.name_uz_cyrl || userStore.name) : userStore.name;
    }
    return [{ id: userStoreId || 'all', name: storeName }];
  }, [isAdmin, stores, userStoreId, user?.store_name, lang]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const fetchReport = async () => {
      try {
        const storeParam = storeId === 'all' ? 'all' : Number(storeId);
        const res = await reportService.getDetailedReport({
          filter,
          store_id: storeParam,
          from: from || undefined,
          to: to || undefined,
        });

        if (active) {
          setData(res);
          setIsLoading(false);
        }
      } catch {
        if (active) {
          setError(getTrans('Xatolik yuz berdi'));
          setIsLoading(false);
        }
      }
    };

    void fetchReport();

    return () => {
      active = false;
    };
  }, [filter, storeId, from, to]);

const getStoreName = (id: number | string, defaultName: string) => {
    const store = stores.find((s) => s.id === id);
    if (store) {
      return lang === 'cyrl' ? (store.name_uz_cyrl || store.name) : store.name;
    }
    return defaultName;
  };

  const summary = useMemo(() => {
    return data?.summary || {
      totalRevenue: 0,
      totalProfit: 0,
      totalExpenses: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalCustomers: 0
    };
  }, [data]);

  const margin = useMemo(() => {
    if (!summary.totalRevenue) return 0;
    return (summary.totalProfit / summary.totalRevenue) * 100;
  }, [summary]);

  const totalCustomerDebt = useMemo(() => {
    if (!data?.debts?.customerDebts) return 0;
    return data.debts.customerDebts.reduce((sum, d) => sum + d.debt, 0);
  }, [data?.debts?.customerDebts]);

  const storeSales = useMemo(() => {
    if (!data?.branchStatistics) return [];
    return data.branchStatistics.map((branch) => {
      const name = getStoreName(branch.store_id, branch.store__name);
      return {
        name: name,
        value: branch.revenue,
        orders: branch.orders,
        customers: branch.customers
      };
    });
  }, [data?.branchStatistics, stores, lang]);

  const categoryStats = useMemo(() => {
    if (!data?.categoryStatistics) return [];
    return data.categoryStatistics.map((cat, index) => {
      const name = (lang === 'cyrl' && cat.categoryName_uz_cyrl) ? cat.categoryName_uz_cyrl : cat.categoryName;
      return {
        name: name || getTrans('Kategoriyasiz'),
        percent: cat.percent,
        revenue: cat.revenue,
        color: COLORS[index % COLORS.length]
      };
    });
  }, [data?.categoryStatistics, lang]);

  const topProducts = useMemo(() => {
    if (!data?.topSellingProducts) return [];
    return data.topSellingProducts.map((prod) => {
      const name = (lang === 'cyrl' && prod.name_uz_cyrl) ? prod.name_uz_cyrl : prod.name;
      const category = (lang === 'cyrl' && prod.category_uz_cyrl) ? prod.category_uz_cyrl : (prod.category || getTrans('Kategoriyasiz'));
      return {
        ...prod,
        name,
        category
      };
    });
  }, [data?.topSellingProducts, lang]);

  const paymentStructure = useMemo(() => {
    return data?.paymentStructure || [];
  }, [data?.paymentStructure]);

  const totalPaymentsCount = useMemo(() => {
    return paymentStructure.reduce((sum, p) => sum + p.count, 0);
  }, [paymentStructure]);

  const totalPaymentsAmount = useMemo(() => {
    return paymentStructure.reduce((sum, p) => sum + p.amount, 0);
  }, [paymentStructure]);

  const customerDebts = useMemo(() => {
    return data?.debts?.customerDebts || [];
  }, [data?.debts?.customerDebts]);

  const supplierDebts = useMemo(() => {
    return data?.debts?.supplierDebts || [];
  }, [data?.debts?.supplierDebts]);

  const getPeriodText = () => {
    if (filter === 'weekly') return getTrans('Ushbu haftada');
    if (filter === 'yearly') return getTrans('Ushbu yilda');
    return getTrans('Ushbu oyda');
  };

  const tabs = useMemo(() => [
    { id: 'sotuvlar', label: getTrans('Sotuvlar') },
    { id: 'tolovlar', label: getTrans("To'lovlar") },
    { id: 'qarzlar', label: getTrans('Qarzlar') }
  ], [lang]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-10 max-w-400 mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {getTrans('Hisobotlar va tahlillar')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {getTrans('Batafsil biznes tahlili')}
          </p>
        </div>
      </div>

      {/* Filters Panel */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-5">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {/* Period Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {getTrans('Davr')}
            </label>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-1 h-10">
              {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${filter === p
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {p === 'weekly' ? getTrans('Hafta') : p === 'monthly' ? getTrans('Oy') : getTrans('Yil')}
                </button>
              ))}
            </div>
          </div>

          {/* Store Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {getTrans("Do'kon")}
            </label>
            <Select value={storeId} onValueChange={setStoreId} disabled={!isAdmin}>
              <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl h-10">
                <SelectValue placeholder={getTrans("Barcha do'konlar")} />
              </SelectTrigger>
              <SelectContent>
                {availableBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {getTrans('Boshlanish sanasi')}
              </label>
              {from && (
                <button
                  type="button"
                  onClick={() => setFrom('')}
                  className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline transition-all"
                >
                  {getTrans('Tozalash')}
                </button>
              )}
            </div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-10 px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-all"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {getTrans('Tugash sanasi')}
              </label>
              {to && (
                <button
                  type="button"
                  onClick={() => setTo('')}
                  className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline transition-all"
                >
                  {getTrans('Tozalash')}
                </button>
              )}
            </div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-10 px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 transition-all"
            />
          </div>
        </div>
      </Card>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 text-sm font-medium rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-slate-100">
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <p className="text-[10px] sm:text-sm font-semibold">{getTrans('Umumiy tushum')}</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 sm:h-8 w-28 sm:w-36 mb-1" />
            ) : (
              <h3 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-0.5 sm:mb-1 whitespace-nowrap">
                {formatCurrency(summary.totalRevenue)}
              </h3>
            )}
            {!isLoading && (
              <p className="text-[9px] sm:text-xs text-emerald-500 flex items-center gap-0.5 sm:gap-1">
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {getTrans('Marja')}: {margin.toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>

        {/* Profit */}
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-slate-100">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <p className="text-[10px] sm:text-sm font-semibold">{getTrans('Sof foyda')}</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 sm:h-8 w-28 sm:w-36 mb-1" />
            ) : (
              <h3 className={`text-base sm:text-xl md:text-2xl font-bold mb-0.5 sm:mb-1 whitespace-nowrap ${summary.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                {formatCurrency(summary.totalProfit)}
              </h3>
            )}
            {!isLoading && (
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">
                {getTrans('Xarajatlar')}: {formatCurrency(summary.totalExpenses)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-slate-100">
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <p className="text-[10px] sm:text-sm font-semibold">{getTrans('Jami buyurtmalar')}</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 sm:h-8 w-16 mb-1" />
            ) : (
              <h3 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-0.5 sm:mb-1">
                {summary.totalOrders.toLocaleString()}
              </h3>
            )}
            {!isLoading && (
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">
                {getPeriodText()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Debts */}
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-slate-100">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <p className="text-[10px] sm:text-sm font-semibold">{getTrans('Mijozlar qarzlari')}</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 sm:h-8 w-28 sm:w-36 mb-1" />
            ) : (
              <h3 className="text-base sm:text-xl md:text-2xl font-bold text-[#ff6b00] dark:text-amber-500 mb-0.5 sm:mb-1 whitespace-nowrap">
                {formatCurrency(totalCustomerDebt)}
              </h3>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-full overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-25 sm:min-w-30 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === 'sotuvlar' && (
          <>
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Store Sales Chart */}
              <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">
                    {getTrans("Do'konlar bo'yicha sotuvlar")}
                  </h3>
                  {isLoading ? (
                    <div className="h-50 sm:h-62.5 w-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : storeSales.length === 0 ? (
                    <div className="h-50 sm:h-62.5 w-full flex items-center justify-center text-xs text-slate-400">
                      {getTrans("Hech qanday ma'lumot topilmadi")}
                    </div>
                  ) : (
                    <div className="h-50 sm:h-62.5 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={storeSales} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} dy={8} />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                            tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)}
                            width={40}
                          />
                          <Tooltip
                            cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                            contentStyle={{
                              backgroundColor: isDark ? '#1e293b' : '#fff',
                              color: isDark ? '#f8fafc' : '#0f172a',
                              borderRadius: '8px',
                              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              fontSize: '12px'
                            }}
                            wrapperStyle={{ zIndex: 100 }}
                            formatter={(value: any) => [formatCurrency(Number(value)), getTrans('Umumiy tushum')]}
                          />
                          <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Sales Chart */}
              <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">
                    {getTrans("Kategoriyalar bo'yicha sotuvlar")}
                  </h3>
                  {isLoading ? (
                    <div className="h-50 sm:h-62.5 w-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : categoryStats.length === 0 ? (
                    <div className="h-50 sm:h-62.5 w-full flex items-center justify-center text-xs text-slate-400">
                      {getTrans("Hech qanday ma'lumot topilmadi")}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 min-h-50 sm:min-h-62.5 py-2">
                      <div className="w-40 h-40 sm:w-48 sm:h-48 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryStats}
                              dataKey="percent"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={0}
                              outerRadius={70}
                              stroke={isDark ? '#0f172a' : '#ffffff'}
                              strokeWidth={2}
                            >
                              {categoryStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: isDark ? '#1e293b' : '#fff',
                                color: isDark ? '#f8fafc' : '#0f172a',
                                borderRadius: '8px',
                                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                fontSize: '12px'
                              }}
                              wrapperStyle={{ zIndex: 100 }}
formatter={(value: any, props: any) => [
                                `${value}% (${formatCurrency(props?.payload?.revenue ?? 0)})`,
                                getTrans('Ulushi')
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-1.5 w-full max-w-55">
                        {categoryStats.map((cat, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                              <span className="text-slate-600 dark:text-slate-400 truncate max-w-30">{cat.name}</span>
                            </div>
                            <span className="font-semibold text-right" style={{ color: cat.color }}>
                              {cat.percent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Products Table */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mt-4 sm:mt-6 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {getTrans("Sotuvlar bo'yicha Top-10 tovarlar")}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-3 sm:px-6 py-2.5 sm:py-4 rounded-tl-xl w-16">#</th>
                      <th className="px-3 sm:px-6 py-2.5 sm:py-4">{getTrans('Tovar')}</th>
                      <th className="px-3 sm:px-6 py-2.5 sm:py-4">{getTrans('Kategoriya')}</th>
                      <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right rounded-tr-xl">{getTrans('Sotilgan summa')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx}>
                          <td className="px-3 sm:px-6 py-3.5"><Skeleton className="h-4 w-6" /></td>
                          <td className="px-3 sm:px-6 py-3.5"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-3 sm:px-6 py-3.5"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-3 sm:px-6 py-3.5 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                        </tr>
                      ))
                    ) : topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 sm:px-6 py-6 text-center text-slate-400">
                          {getTrans("Hech qanday ma'lumot topilmadi")}
                        </td>
                      </tr>
                    ) : (
                      topProducts.map((prod) => (
                        <tr key={prod.rank} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-medium text-slate-900 dark:text-white">{prod.rank}</td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-medium text-slate-900 dark:text-white">
                            <div>
                              <span>{prod.name}</span>
                              <span className="text-[10px] text-slate-500 font-normal ml-2">
                                ({prod.totalSold} {getTrans('ta')})
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4">
                            <span className="inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs rounded-md border border-slate-200 dark:border-slate-700/80">
                              {prod.category}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(prod.totalRevenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Payments Tab */}
        {activeTab === 'tolovlar' && (
          <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {getTrans("To'lovlar tarkibi")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-4 rounded-tl-xl">{getTrans("To'lov usuli")}</th>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right">{getTrans('Sotuvlar soni')}</th>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right">{getTrans('Summa')}</th>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right rounded-tr-xl">{getTrans('Ulushi')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-3 sm:px-6 py-3.5"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-3 sm:px-6 py-3.5 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                        <td className="px-3 sm:px-6 py-3.5 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                        <td className="px-3 sm:px-6 py-3.5 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      </tr>
                    ))
                  ) : paymentStructure.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 sm:px-6 py-6 text-center text-slate-400">
                        {getTrans("Hech qanday ma'lumot topilmadi")}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {paymentStructure.map((pay, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-medium text-slate-900 dark:text-white">
                            {getPaymentMethodLabel(pay.method)}
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-medium text-slate-900 dark:text-white">
                            {pay.count.toLocaleString()}
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(pay.amount)}
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-medium text-slate-900 dark:text-white">
                            {pay.percent}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-slate-800/30 font-bold">
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-slate-900 dark:text-white">
                          {getTrans('Jami')}
                        </td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right text-slate-900 dark:text-white">
                          {totalPaymentsCount.toLocaleString()}
                        </td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right text-slate-900 dark:text-white">
                          {formatCurrency(totalPaymentsAmount)}
                        </td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right text-slate-900 dark:text-white">
                          100%
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Debts Tab */}
        {activeTab === 'qarzlar' && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Customer Debts */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {getTrans('Qarzdorligi bor mijozlar')}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-3 sm:px-6 py-2.5 sm:py-4 rounded-tl-xl">{getTrans('Mijoz')}</th>
                      <th className="px-3 sm:px-6 py-2.5 sm:py-4">{getTrans('Telefon')}</th>
                      <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right rounded-tr-xl">{getTrans('Qarzdorlik')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <tr key={idx}>
                          <td className="px-3 sm:px-6 py-3.5"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-3 sm:px-6 py-3.5"><Skeleton className="h-4 w-28" /></td>
                          <td className="px-3 sm:px-6 py-3.5 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                        </tr>
                      ))
                    ) : customerDebts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 sm:px-6 py-6 text-center text-slate-400">
                          {getTrans("Hech qanday ma'lumot topilmadi")}
                        </td>
                      </tr>
                    ) : (
                      customerDebts.map((debtor, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-medium text-slate-900 dark:text-white">
                            {debtor.customerName}
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-slate-600 dark:text-slate-400">
                            {debtor.phone || '-'}
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-[#ff6b00] dark:text-amber-500">
                            {formatCurrency(debtor.debt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Supplier Debts */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {getTrans('Yetkazib beruvchilar oldidagi qarzdorlik')}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-3 sm:px-6 py-2.5 sm:py-4 rounded-tl-xl">{getTrans('Yetkazib beruvchi')}</th>
                      <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right rounded-tr-xl">{getTrans('Qarzdorlik')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <tr key={idx}>
                          <td className="px-3 sm:px-6 py-3.5"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-3 sm:px-6 py-3.5 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                        </tr>
                      ))
                    ) : supplierDebts.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 sm:px-6 py-6 text-center text-slate-400">
                          {getTrans("Hech qanday ma'lumot topilmadi")}
                        </td>
                      </tr>
                    ) : (
                      supplierDebts.map((debtor, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-medium text-slate-900 dark:text-white">
                            {debtor.supplierName}
                          </td>
                          <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-[#ff6b00] dark:text-amber-500">
                            {formatCurrency(debtor.debt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;
