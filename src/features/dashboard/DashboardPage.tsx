import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  Package,
  Store,
  TrendingUp,
  ShoppingCart,
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
  Car
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { useAuthStore } from '../../app/store';
import { formatCurrency } from '../../utils';

// =======================
// STATIC MOCK DATA GENERATOR
// =======================
const generateAutoPartsData = (storeId: string, filter: string) => {
  const isAll = storeId === 'all';
  const seed = isAll ? 5 : String(storeId).charCodeAt(0) || 1;
  const mult = isAll ? 3 : 1 + (seed % 3) * 0.5;

  return {
    kpi: {
      revenue: 285000000 * mult,
      revenueGrowth: 14.5,
      debt: 45000000 * mult,
      debtGrowth: -5.2, // negative is good for debt
      orders: Math.floor(1250 * mult),
      ordersGrowth: 8.4,
      lowStockCount: Math.floor(12 * mult),
    },
    topParts: [
      { id: 'p1', name: 'Motor Moyi Castrol Edge 5W-40 (4L)', sold: Math.floor(210 * mult), rev: Math.floor(94500000 * mult), icon: Droplet, color: 'text-amber-500' },
      { id: 'p2', name: 'Tormoz Kolodka - GM (Cobalt/Gentra)', sold: Math.floor(450 * mult), rev: Math.floor(54000000 * mult), icon: Activity, color: 'text-rose-500' },
      { id: 'p3', name: 'Svecha NGK Iridium', sold: Math.floor(520 * mult), rev: Math.floor(41600000 * mult), icon: Zap, color: 'text-yellow-500' },
      { id: 'p4', name: 'Akkumulyator Delkor 60Ah', sold: Math.floor(65 * mult), rev: Math.floor(39000000 * mult), icon: Battery, color: 'text-emerald-500' },
      { id: 'p5', name: 'Amortizator KYB Excel-G (Old)', sold: Math.floor(85 * mult), rev: Math.floor(34000000 * mult), icon: Cog, color: 'text-blue-500' },
      { id: 'p6', name: 'Havo va Salon filtrlari to\'plami', sold: Math.floor(320 * mult), rev: Math.floor(16000000 * mult), icon: Wrench, color: 'text-slate-500' },
    ],
    lowStock: [
      { id: 'ls1', name: 'Antifriz Felix Carbox 5L', left: 2, status: 'critical' },
      { id: 'ls2', name: 'Moy filtri (GM Original)', left: 5, status: 'warning' },
      { id: 'ls3', name: 'Rul tyagasi (Spark)', left: 1, status: 'critical' },
      { id: 'ls4', name: 'Ksenon lampa H7', left: 4, status: 'warning' },
    ],
    recentSales: [
      { id: 'tx1', client: 'Usta Bahodir (Mator)', amount: 1450000, time: '10 daqiqa oldin', type: 'debt' },
      { id: 'tx2', client: 'Chakana xaridor', amount: 320000, time: '25 daqiqa oldin', type: 'cash' },
      { id: 'tx3', client: 'Avtoservis "Tezkor"', amount: 4500000, time: '1 soat oldin', type: 'transfer' },
      { id: 'tx4', client: 'Usta Alisher (Xodovoy)', amount: 850000, time: '2 soat oldin', type: 'cash' },
    ],
    chart: {
      labels: filter === 'today' ? ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
        : filter === 'weekly' ? ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'] : ['1-5', '6-10', '11-15', '16-20', '21-25', '26-30'],
      data: filter === 'today'
        ? Array.from({length: 7}).map((_, i) => Math.floor(1200000 * mult * (1 + (Math.sin(i+seed) * 0.5))))
        : filter === 'weekly' 
        ? Array.from({length: 7}).map((_, i) => Math.floor(8000000 * mult * (1 + (Math.sin(i+seed) * 0.5)))) 
        : Array.from({length: 6}).map((_, i) => Math.floor(45000000 * mult * (1 + (Math.sin(i+seed) * 0.5))))
    }
  };
};

const getLinePoints = (data: number[], chartWidth = 100, chartHeight = 100): Array<{ x: number; y: number }> => {
  if (data.length === 0) return [];
  const maxVal = Math.max(...data, 1);
  return data.map((val, idx) => ({
    x: (idx / Math.max(1, data.length - 1)) * chartWidth,
    y: chartHeight - (val / maxVal) * chartHeight,
  }));
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

// =======================
// DASHBOARD COMPONENT
// =======================
export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id ? String(user.store_id) : '';

  const [period, setPeriod] = useState<string>('today');
  const [storeId, setStoreId] = useState<string>(userStoreId || 'all');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(() => generateAutoPartsData(storeId, period));

  const availableBranches = isAdmin 
    ? [{ id: 'all', name: 'Barcha filiallarni jamlash' }, { id: '1', name: 'Asosiy filial (Chilonzor)' }, { id: '2', name: 'Sergeli Avtobo\'zor filial' }]
    : [{ id: userStoreId || 'all', name: user?.store_name || 'Mening filialim' }];

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    
    // Simulate network delay for smooth transition
    setTimeout(() => {
      if (active) {
        setData(generateAutoPartsData(storeId, period));
        setIsLoading(false);
      }
    }, 600);

    return () => { active = false; };
  }, [storeId, period]);

  const points = useMemo(() => getLinePoints(data.chart.data), [data.chart.data]);
  const smoothPath = useMemo(() => buildSmoothPath(points), [points]);
  const maxRev = Math.max(...data.topParts.map(p => p.rev));

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Boshqaruv paneli
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Asosiy ko'rsatkichlar va statistika
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-sm">
            <div className="flex items-center px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md text-sm font-medium mr-1">
              <CalendarDays className="w-4 h-4 mr-2" />
              Bugun
            </div>
            <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors" onClick={() => setPeriod('weekly')}>
              Hafta
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors" onClick={() => setPeriod('monthly')}>
              Oy
            </button>
          </div>

          <Select value={storeId} onValueChange={setStoreId} disabled={!isAdmin}>
            <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-lg h-9">
              <SelectValue placeholder="Barcha do'konlar" />
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
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bugungi tushum</p>
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
            Kechagiga nisbatan <span className="text-emerald-600">+{data.kpi.revenueGrowth}%</span>
          </div>
        </div>

        {/* ORDERS */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sotilgan tovarlar</p>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />
          ) : (
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {data.kpi.orders.toLocaleString()} ta
            </h3>
          )}
          <div className="mt-2 text-xs font-medium text-slate-500">
            Sotuv faolligi <span className="text-blue-600">+{data.kpi.ordersGrowth}%</span>
          </div>
        </div>

        {/* TRANSACTIONS / AVG RECEIPT (We used transactions here based on reference) */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tranzaksiyalar</p>
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
            O'rtacha chek: <span className="text-slate-700 dark:text-slate-300 font-semibold">{formatCurrency(Math.floor(data.kpi.revenue / data.kpi.orders))}</span>
          </div>
        </div>

        {/* CLIENT DEBTS */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mijozlar qarzi</p>
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
            Umumiy qarz miqdori
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
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Savdolar Dinamikasi</CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-1">Avto qismlar sotuvi hajmi ({period === 'today' ? 'Bugun' : period === 'monthly' ? 'Oy davomida' : 'Hafta davomida'})</CardDescription>
              </div>
              <div className="hidden sm:flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-xs text-xs font-semibold text-slate-700 dark:text-white">
                  Tushumlar
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
                  <span>{formatCurrency(Math.max(...data.chart.data)).split(' ')[0]}</span>
                  <span>{formatCurrency(Math.max(...data.chart.data) * 0.66).split(' ')[0]}</span>
                  <span>{formatCurrency(Math.max(...data.chart.data) * 0.33).split(' ')[0]}</span>
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
                <div className="absolute left-16 right-0 bottom-0 h-8 flex justify-between items-end text-xs font-semibold text-slate-400">
                  {data.chart.labels.map((lbl, i) => (
                    <div key={i} className="-translate-x-1/2" style={{ marginLeft: i === 0 ? '0' : i === data.chart.labels.length - 1 ? '100%' : '50%' }}>
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
                Tugayotgan mahsulotlar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {data.lowStock.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{item.name}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Omborda: <strong className="font-semibold text-rose-600 dark:text-rose-400">{item.left} dona</strong></p>
                      </div>
                      <button className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Buyurtma
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-center border-t border-slate-100 dark:border-slate-800">
                <button className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center w-full hover:text-indigo-700 transition-colors">
                  Barchasini ko'rish <ArrowRight className="w-4 h-4 ml-1" />
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
              Top Ehtiyot Qismlar (Sotuv bo'yicha)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {data.topParts.map((part, idx) => {
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
                              {idx + 1}. {part.name}
                            </p>
                            <p className="text-xs font-medium text-slate-500">{part.sold} dona sotilgan</p>
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT TRANSACTIONS */}
        <Card className="rounded-3xl border-slate-200/60 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 pt-5">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Clock className="w-5 h-5 text-emerald-500" />
              So'nggi savdolar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {data.recentSales.map((sale) => (
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
                          <Clock className="w-3 h-3" /> {sale.time}
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
                        {sale.type === 'cash' ? 'Naqd' : sale.type === 'debt' ? 'Nasiya' : 'Plastik'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-center border-t border-slate-100 dark:border-slate-800">
              <button className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center w-full hover:text-emerald-700 transition-colors">
                Barcha kvitansiyalar <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

export default DashboardPage;
