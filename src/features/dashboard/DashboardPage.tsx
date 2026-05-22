import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Wrench,
  Droplet,
  Zap,
  Cog,
  Battery,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { useAuthStore } from '../../app/store';
import { formatCurrency } from '../../utils';
import { reportService } from '../../services/reportService';
import type { DashboardReportData } from '../../services/reportService';
import { storeService } from '../../services/storeService';
import type { Store } from '../../types';


// generateFallbackData was removed to only show database data

const getLinePoints = (data: (number | null)[], chartWidth = 100, chartHeight = 100): Array<{ x: number; y: number }> => {
  if (data.length === 0) return [];
  const validData = data.filter((val): val is number => val !== null);
  const maxVal = validData.length > 0 ? Math.max(...validData, 1) : 1;
  return data
    .map((val, idx) => {
      if (val === null) return null;
      return {
        x: (idx / Math.max(1, data.length - 1)) * chartWidth,
        y: chartHeight - (val / maxVal) * chartHeight,
      };
    })
    .filter((p): p is { x: number; y: number } => p !== null);
};

const buildSmoothPath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cX = (points[i].x + points[i + 1].x) / 2;
    path += ` C ${cX} ${points[i].y}, ${cX} ${points[i + 1].y}, ${points[i + 1].x} ${points[i + 1].y}`;
  }
  return path;
};

const initialDashboardData: DashboardReportData = {
  kpi: {
    revenue: 0,
    revenueGrowth: 0,
    debt: 0,
    debtGrowth: 0,
    orders: 0,
    ordersGrowth: 0,
    lowStockCount: 0
  },
  topParts: [],
  lowStock: [],
  recentSales: [],
  chart: {
    labels: [],
    data: []
  }
};

const iconsList = [Droplet, Activity, Zap, Battery, Cog, Wrench];
const colorsList = ['text-amber-500', 'text-rose-500', 'text-yellow-500', 'text-emerald-500', 'text-blue-500', 'text-slate-500'];

const latinToCyrillicMap: Record<string, string> = {
  // Weekdays (Full)
  'Dushanba': 'Душанба',
  'Seshanba': 'Сешанба',
  'Chorshanba': 'Чоршанба',
  'Payshanba': 'Пайшанба',
  'Juma': 'Жума',
  'Shanba': 'Шанба',
  'Yakshanba': 'Якшанба',
  
  // Weekdays (Short)
  'Du': 'Ду',
  'Se': 'Се',
  'Ch': 'Чо',
  'Pa': 'Па',
  'Ju': 'Жу',
  'Sh': 'Ша',
  'Ya': 'Як',

  // Months (Full)
  'Yanvar': 'Январ',
  'Fevral': 'Феврал',
  'Mart': 'Март',
  'Aprel': 'Апрел',
  'May': 'Май',
  'Iyun': 'Июн',
  'Iyul': 'Июл',
  'Avgust': 'Август',
  'Sentabr': 'Сентябр',
  'Sentyabr': 'Сентябр',
  'Oktabr': 'Октябр',
  'Oktyabr': 'Октябр',
  'Noyabr': 'Ноябр',
  'Dekabr': 'Декабр',

  // Months (Short)
  'Yan': 'Янв',
  'Feb': 'Фев',
  'Mar': 'Мар',
  'Apr': 'Апр',
  'Avg': 'Авг',
  'Sen': 'Сен',
  'Okt': 'Окт',
  'Noy': 'Ноя',
  'Dek': 'Дек',
};

// =======================
// DASHBOARD COMPONENT
// =======================
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id || (user?.stores && user.stores.length > 0 ? String(user.stores.find(s => s.type === 'b')?.id || user.stores[0].id) : '');

  const [period, setPeriod] = useState<string>('monthly');
  const [storeId, setStoreId] = useState<string>(userStoreId || 'all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardReportData>(initialDashboardData);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (!isAdmin && userStoreId) {
      setStoreId(userStoreId);
    }
  }, [userStoreId, isAdmin]);

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
    const lang = i18n.language || 'uz';
    if (isAdmin) {
      const branchesList = stores.map((s) => {
        const name = lang === 'cyrl' ? (s.name_uz_cyrl || s.name) : s.name;
        return {
          id: String(s.id),
          name: name,
        };
      });
      return [
        { id: 'all', name: t('dashboard.allBranches', 'Barcha filiallarni jamlash') },
        ...branchesList,
      ];
    }
    const userStore = stores.find(s => String(s.id) === String(userStoreId));
    let storeName = user?.store_name || t('common.myBranch', 'Mening filialim');
    if (userStore) {
      storeName = lang === 'cyrl' ? (userStore.name_uz_cyrl || userStore.name) : userStore.name;
    }
    return [{ id: userStoreId || 'all', name: storeName }];
  }, [isAdmin, stores, userStoreId, user?.store_name, t, i18n.language]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const fetchDashboard = async () => {
      try {
        const storeParam = storeId === 'all' ? 'all' : Number(storeId);
        const res = await reportService.getDashboardData({
          period,
          store_id: storeParam
        });

        if (active) {
          if (res) {
            setData(res);
          } else {
            setError(t('errors.requestFailed', 'Ma\'lumotlarni serverdan olishda xatolik yuz berdi'));
            setData(initialDashboardData);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(t('errors.generic', 'Tizimda xatolik yuz berdi'));
          setData(initialDashboardData);
          setIsLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => { active = false; };
  }, [storeId, period, t]);

  const chartData = useMemo(() => {
    return data.chart || { labels: [], data: [] };
  }, [data.chart]);

  const localizedChartLabels = useMemo(() => {
    const lang = i18n.language || 'uz';
    if (lang === 'cyrl') {
      return chartData.labels.map(lbl => latinToCyrillicMap[lbl] || lbl);
    }
    return chartData.labels;
  }, [chartData.labels, i18n.language]);

  const points = useMemo(() => getLinePoints(chartData.data), [chartData.data]);
  const smoothPath = useMemo(() => buildSmoothPath(points), [points]);

  const maxChartVal = useMemo(() => {
    const validData = chartData.data.filter((val): val is number => val !== null);
    return validData.length > 0 ? Math.max(...validData) : 0;
  }, [chartData.data]);

  const lowStockItems = useMemo(() => {
    return data.lowStock || [];
  }, [data.lowStock]);

  const topPartsItems = useMemo(() => {
    const list = data.topParts || [];
    return list.map((part, idx) => ({
      ...part,
      icon: iconsList[idx % iconsList.length],
      color: colorsList[idx % colorsList.length],
    }));
  }, [data.topParts]);

  const recentSalesItems = useMemo(() => {
    return data.recentSales || [];
  }, [data.recentSales]);

  const formatRelativeTime = (timeStr: string, minutesAgo?: number) => {
    const lang = i18n.language || 'uz';
    if (lang === 'cyrl') {
      if (minutesAgo !== undefined && minutesAgo !== null) {
        if (minutesAgo < 60) {
          return `${minutesAgo} дақиқа олдин`;
        } else {
          const hours = Math.floor(minutesAgo / 60);
          return `${hours} соат олдин`;
        }
      }
      let trans = timeStr;
      trans = trans.replace(/daqiqa/g, 'дақиқа');
      trans = trans.replace(/soat/g, 'соат');
      trans = trans.replace(/oldin/g, 'олдин');
      return trans;
    }
    return timeStr;
  };

  const maxRev = useMemo(() => {
    return topPartsItems.length > 0 ? Math.max(...topPartsItems.map(p => p.rev)) : 1;
  }, [topPartsItems]);

  const avgReceipt = useMemo(() => {
    return data.kpi.orders > 0 ? Math.floor(data.kpi.revenue / data.kpi.orders) : 0;
  }, [data.kpi.revenue, data.kpi.orders]);

  const getGrowthText = () => {
    if (period === 'weekly') return t('dashboard.comparedToLastWeek', 'O\'tgan haftaga nisbatan');
    if (period === 'yearly') return t('dashboard.comparedToLastYear', 'O\'tgan yilga nisbatan');
    return t('dashboard.comparedToLastMonth', 'O\'tgan oyga nisbatan');
  };

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* ERROR / OFFLINE ALERTS */}
      {error && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-sm font-medium rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          <span>{error}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('dashboard.pageTitle', 'Boshqaruv paneli')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('dashboard.mainStats', 'Asosiy ko\'rsatkichlar va statistika')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setPeriod('weekly')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === 'weekly'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              {t('common.week', 'Hafta')}
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === 'monthly'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('common.month', 'Oy')}
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === 'yearly'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('reports.periods.year', 'Yil')}
            </button>
          </div>

          <Select value={storeId} onValueChange={setStoreId} disabled={!isAdmin}>
            <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-lg h-9">
              <SelectValue placeholder={t('placeholders.allStores', 'Barcha do\'konlar')} />
            </SelectTrigger>
            <SelectContent>
              {availableBranches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* REVENUE */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {period === 'weekly' 
                ? t('dashboard.weeklyRevenue', 'Haftalik tushum') 
                : period === 'yearly' 
                  ? t('dashboard.yearlyRevenue', 'Yillik tushum') 
                  : t('dashboard.monthlyRevenue', 'Oylik tushum')}
            </p>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          {isLoading ? (
            <div className="h-8 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />
          ) : (
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(data.kpi.revenue)}
            </h3>
          )}
          <div className="mt-2 text-xs font-medium text-slate-500">
            {getGrowthText()}{' '}
            <span className={data.kpi.revenueGrowth >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {data.kpi.revenueGrowth >= 0 ? '+' : ''}{data.kpi.revenueGrowth}%
            </span>
          </div>
        </div>

        {/* ORDERS */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.totalProducts', 'Sotilgan tovarlar')}</p>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />
          ) : (
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {data.kpi.orders.toLocaleString()} {t('common.qtyUnits', 'ta')}
            </h3>
          )}
          <div className="mt-2 text-xs font-medium text-slate-500">
            {t('dashboard.salesActivity', 'Sotuv faolligi')}{' '}
            <span className={data.kpi.ordersGrowth >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {data.kpi.ordersGrowth >= 0 ? '+' : ''}{data.kpi.ordersGrowth}%
            </span>
          </div>
        </div>

        {/* TRANSACTIONS / AVG RECEIPT */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('reports.labels.transactions', 'Tranzaksiyalar')}</p>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />
          ) : (
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {Math.floor(data.kpi.orders * 0.45).toLocaleString()}
            </h3>
          )}
          <div className="mt-2 text-xs font-medium text-slate-500">
            {t('reports.labels.averageReceipt', 'O\'rtacha chek')}:{' '}
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {formatCurrency(avgReceipt)}
            </span>
          </div>
        </div>

        {/* CLIENT DEBTS */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.totalDebt', 'Mijozlar qarzi')}</p>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          {isLoading ? (
            <div className="h-8 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />
          ) : (
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(data.kpi.debt)}
            </h3>
          )}
          <div className="mt-2 text-xs font-medium text-slate-500">
            {t('dashboard.totalDebtAmount', 'Umumiy qarz miqdori')}{' '}
            {data.kpi.debtGrowth !== 0 && (
              <span className={data.kpi.debtGrowth < 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                ({data.kpi.debtGrowth > 0 ? '+' : ''}{data.kpi.debtGrowth}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CHARTS AND LISTS */}
      <div className="grid gap-6 lg:grid-cols-7">

        {/* MAIN CHART */}
        <Card className="lg:col-span-5 rounded-3xl border-slate-200/60 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="pb-0 pt-6 px-6 sm:px-8 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.salesDynamics', 'Savdolar Dinamikasi')}</CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-1">
                  {t('dashboard.partsSalesVolume', 'Avto qismlar sotuvi hajmi')} ({
                    period === 'weekly' ? t('dashboard.duringWeek', 'Hafta davomida') :
                      period === 'yearly' ? t('reports.periods.year', 'Yil') + ' davomida' :
                        t('dashboard.duringMonth', 'Oy davomida')
                  })
                </CardDescription>
              </div>
              <div className="hidden sm:flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-xs text-xs font-semibold text-slate-700 dark:text-white">
                  {t('dashboard.revenues', 'Tushumlar')}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 px-6 sm:px-8 pb-6">
            {isLoading ? (
              <div className="h-[320px] w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ) : (
              <div className="h-[320px] w-full relative">
                {/* Y-Axis */}
                <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs font-semibold text-slate-400 text-right pr-4">
                  <span>{formatCurrency(maxChartVal).split(' ')[0]}</span>
                  <span>{formatCurrency(maxChartVal * 0.66).split(' ')[0]}</span>
                  <span>{formatCurrency(maxChartVal * 0.33).split(' ')[0]}</span>
                  <span>0</span>
                </div>

                {/* SVG Chart */}
                <div className="absolute left-16 right-0 top-0 bottom-8">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0, 33, 66, 100].map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" className="text-slate-200 dark:text-slate-800" vectorEffect="non-scaling-stroke" />
                    ))}

                    {/* Area path */}
                    {points.length > 1 && (
                      <path
                        d={`${smoothPath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`}
                        fill="url(#chartGradient)"
                        className="transition-all duration-1000 ease-in-out"
                      />
                    )}

                    {/* Line path */}
                    {points.length > 0 && (
                      <path
                        d={smoothPath}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        filter="url(#glow)"
                        className="transition-all duration-1000 ease-in-out"
                      />
                    )}

                    {/* Points */}
                    {points.map((p, i) => (
                      <g key={i} className="group transition-all">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="1.5"
                          fill="#ffffff"
                          stroke="#3b82f6"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                          className="transition-all duration-300 group-hover:r-[2.5]"
                        />
                      </g>
                    ))}
                  </svg>
                </div>

                {/* X-Axis */}
                <div className="absolute left-16 right-0 bottom-0 h-8 text-xs font-semibold text-slate-400">
                  {localizedChartLabels.map((lbl, i) => (
                    <div
                      key={i}
                      className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-center"
                      style={{ left: `${(i / Math.max(1, localizedChartLabels.length - 1)) * 100}%` }}
                    >
                      {lbl}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LOW STOCK & ALERTS */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <Card className="rounded-3xl border-slate-200/60 dark:border-slate-800 shadow-xs flex-1 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-rose-50/50 dark:bg-rose-500/5 pb-4 border-b border-rose-100 dark:border-rose-900/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                {t('dashboard.lowStockProducts', 'Tugayotgan mahsulotlar')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-200">
                          {(i18n.language === 'cyrl' && item.name_uz_cyrl) ? item.name_uz_cyrl : item.name}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {t('dashboard.inStock', 'Omborda')}: <strong className="font-semibold text-rose-600 dark:text-rose-400">{item.left} {t('common.pcs', 'dona')}</strong>
                        </p>
                      </div>
                      <button className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        {t('dashboard.order', 'Buyurtma')}
                      </button>
                    </div>
                  ))}
                  {lowStockItems.length === 0 && (
                    <div className="p-6 text-center text-sm text-slate-500">
                      {t('common.noData', 'Ma\'lumotlar mavjud emas')}
                    </div>
                  )}
                </div>
              )}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-center border-t border-slate-100 dark:border-slate-800">
                <button className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center w-full hover:text-indigo-700 transition-colors">
                  {t('common.viewAll', 'Barchasini ko\'rish')} <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BOTTOM SECTION: TOP PRODUCTS & RECENT TRANSACTIONS */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* TOP SELLING PARTS */}
        <Card className="rounded-3xl border-slate-200/60 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 pt-5">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Package className="w-5 h-5 text-indigo-500" />
              {t('dashboard.topSellingParts', 'Top Ehtiyot Qismlar (Sotuv bo\'yicha)')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {topPartsItems.map((part, idx) => {
                  const Icon = part.icon;
                  const pct = Math.max((part.rev / maxRev) * 100, 2);
                  return (
                    <div key={part.id} className="group relative">
                      <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 ${part.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                              {idx + 1}. {(i18n.language === 'cyrl' && part.name_uz_cyrl) ? part.name_uz_cyrl : part.name}
                            </p>
                            <p className="text-xs font-medium text-slate-500">{part.sold} {t('dashboard.piecesSold', 'dona sotilgan')}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                          {formatCurrency(part.rev)}
                        </p>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out relative"
                          style={{ width: `${pct}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {topPartsItems.length === 0 && (
                  <div className="text-center py-6 text-sm text-slate-500">
                    {t('common.noData', 'Ma\'lumotlar mavjud emas')}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT TRANSACTIONS */}
        <Card className="rounded-3xl border-slate-200/60 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 pt-5">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Clock className="w-5 h-5 text-emerald-500" />
              {t('dashboard.recentSales', 'So\'nggi savdolar')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {recentSalesItems.map((sale) => (
                  <div key={sale.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        sale.type === 'cash' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                          sale.type === 'debt' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                            'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                      }`}>
                        {sale.type === 'cash' ? <DollarSign className="w-6 h-6" /> :
                          sale.type === 'debt' ? <Users className="w-6 h-6" /> :
                            <CreditCard className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">{sale.client}</p>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {formatRelativeTime(sale.time, sale.minutesAgo)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(sale.amount)}</p>
                      <p className={`text-xs font-medium mt-1 ${
                        sale.type === 'cash' ? 'text-emerald-500' :
                          sale.type === 'debt' ? 'text-amber-500' :
                            'text-blue-500'
                      }`}>
                        {sale.type === 'cash' ? t('sales.cash', 'Naqd') : sale.type === 'debt' ? t('customers.debt', 'Nasiya') : t('sales.card', 'Plastik')}
                      </p>
                    </div>
                  </div>
                ))}
                {recentSalesItems.length === 0 && (
                  <div className="text-center py-6 text-sm text-slate-500">
                    {t('common.noData', 'Ma\'lumotlar mavjud emas')}
                  </div>
                )}
              </div>
            )}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-center border-t border-slate-100 dark:border-slate-800">
              <button className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center w-full hover:text-emerald-700 transition-colors">
                {t('dashboard.allReceipts', 'Barcha kvitansiyalar')} <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

export default DashboardPage;
