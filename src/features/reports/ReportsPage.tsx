import { useState } from 'react';
import { DollarSign, TrendingUp, ShoppingCart, Users, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { useThemeStore } from '../../app/themeStore';

const TABS = [
  { id: 'sotuvlar', label: 'Sotuvlar' },
  { id: 'tolovlar', label: 'To\'lovlar' },
  { id: 'qarzlar', label: 'Qarzlar' }
];

const TOP_PRODUCTS = [
  { rank: 1, name: 'Аккумулятор 60Ah 540A', category: 'Электрика', revenue: 2900 },
  { rank: 2, name: 'Амортизатор передний газомасляный', category: 'Подвеска', revenue: 2900 },
  { rank: 3, name: 'Масло моторное 5W-40 синтетика 4л', category: 'Масла и жидкости', revenue: 2400 },
  { rank: 4, name: 'Тормозные колодки передние (комплект)', category: 'Тормозная система', revenue: 950 },
  { rank: 5, name: 'Коврики салона EVA (комплект)', category: 'Салон', revenue: 750 },
  { rank: 6, name: 'Свечи зажигания иридиевые (4 шт)', category: 'Двигатель', revenue: 480 },
  { rank: 7, name: 'Антифриз G12 красный 5л', category: 'Масла и жидкости', revenue: 420 },
  { rank: 8, name: 'Фильтр масляный универсальный', category: 'Фильтры', revenue: 200 },
  { rank: 9, name: 'Ремень ГРМ с роликами', category: 'Двигатель', revenue: 0 },
  { rank: 10, name: 'Дворники бескаркасные 55см (пара)', category: 'Аксессуары', revenue: 0 },
];

const PAYMENT_STRUCTURE = [
  { method: 'Naqd', count: 2, amount: 3500, percent: '31.8%' },
  { method: 'O\'tkazma', count: 1, amount: 3850, percent: '35.0%' },
  { method: 'Qarz', count: 2, amount: 3650, percent: '33.2%' }
];

const DEBTORS = [
  { name: 'Каримов Бахтиёр', phone: '+998901111002', debt: 150000 },
  { name: 'Холматов Шухрат', phone: '+998901111005', debt: 120000 },
  { name: 'Усманов Фарход', phone: '+998901111004', debt: 75000 },
];

const CATEGORY_STATS = [
  { name: 'Двигатель', percent: 29, color: '#3b82f6' },
  { name: 'Масла и жидкости', percent: 22, color: '#10b981' },
  { name: 'Тормозная система', percent: 17, color: '#f59e0b' },
  { name: 'Электрика', percent: 15, color: '#ef4444' },
  { name: 'Подвеска', percent: 9, color: '#8b5cf6' },
  { name: 'Аксессуары', percent: 8, color: '#ec4899' },
];

const STORE_SALES = [
  { name: 'Чиланзар', value: 2600 },
  { name: 'Юнусабад', value: 3700 },
  { name: 'Мирабад', value: 900 }
];

export function ReportsPage() {
   const [activeTab, setActiveTab] = useState('sotuvlar');
   const { theme } = useThemeStore();
   const isDark = theme === 'dark';

   return (
     <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-10">
       {/* Header */}
       <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
         <div>
           <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Hisobotlar va tahlillar</h1>
           <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Batafsil biznes tahlili</p>
         </div>
         <Button variant="default" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs sm:text-sm">
           <Download className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
           Excelga eksport qilish
         </Button>
       </div>

       {/* 4 Cards requested by user */}
       <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
         <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
           <CardContent className="p-3 sm:p-5">
             <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-slate-100">
               <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
               <p className="text-[10px] sm:text-sm font-semibold">Umumiy tushum</p>
             </div>
             <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mb-0.5 sm:mb-1">11 000 SO'M</h3>
             <p className="text-[9px] sm:text-xs text-emerald-500 flex items-center gap-0.5 sm:gap-1">
               <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
               Marja: -93.3%
             </p>
           </CardContent>
         </Card>

         <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
           <CardContent className="p-3 sm:p-5">
             <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-slate-100">
               <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
               <p className="text-[10px] sm:text-sm font-semibold">Sof foyda</p>
             </div>
             <h3 className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-500 mb-0.5 sm:mb-1">-154 150 SO'M</h3>
             <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">-93.3% marjadorlik</p>
           </CardContent>
         </Card>

         <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
           <CardContent className="p-3 sm:p-5">
             <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-slate-100">
               <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
               <p className="text-[10px] sm:text-sm font-semibold">Jami buyurtmalar</p>
             </div>
             <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mb-0.5 sm:mb-1">324</h3>
             <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">Ushbu oyda</p>
           </CardContent>
         </Card>

         <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
           <CardContent className="p-3 sm:p-5">
             <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-slate-100">
               <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
               <p className="text-[10px] sm:text-sm font-semibold">Mijozlar qarzlari</p>
             </div>
             <h3 className="text-lg sm:text-2xl font-bold text-[#ff6b00] dark:text-amber-500 mb-0.5 sm:mb-1">345 000 SO'M</h3>
             <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400">3 mijoz</p>
           </CardContent>
         </Card>
       </div>

       {/* Tabs */}
       <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-full overflow-x-auto hide-scrollbar">
         {TABS.map((tab) => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`flex-1 min-w-[100px] sm:min-w-[120px] px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-medium transition-all duration-200 ${activeTab === tab.id
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
               <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                 <CardContent className="p-4 sm:p-6">
                   <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">Do'konlar bo'yicha sotuvlar</h3>
                   <div className="h-[200px] sm:h-[250px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={STORE_SALES} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} dy={8} />
                         <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} domain={[0, 3800]} ticks={[0, 950, 1900, 2850, 3800]} width={35} />
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
                         />
                         <Bar dataKey="value" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={50} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                 </CardContent>
               </Card>

               <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                 <CardContent className="p-4 sm:p-6">
                   <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">Kategoriyalar bo'yicha sotuvlar</h3>
                   <div className="flex flex-col items-center justify-center gap-4 min-h-[200px] sm:min-h-[250px] py-2">
                     <div className="w-40 h-40 sm:w-48 sm:h-48 shrink-0">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={CATEGORY_STATS}
                             dataKey="percent"
                             nameKey="name"
                             cx="50%"
                             cy="50%"
                             innerRadius={0}
                             outerRadius={70}
                             stroke="none"
                           >
                             {CATEGORY_STATS.map((entry, index) => (
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
                             formatter={(value: any) => [`${value}%`, 'Ulushi']}
                           />
                         </PieChart>
                       </ResponsiveContainer>
                     </div>
                     <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
                       {CATEGORY_STATS.map((cat, i) => (
                         <div key={i} className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                             <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                           </div>
                           <span className="font-medium" style={{ color: cat.color }}>{cat.percent}%</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </div>

             <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mt-4 sm:mt-6 overflow-hidden">
               <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                 <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Sotuvlar bo'yicha Top-10 tovarlar</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-xs sm:text-sm text-left">
                   <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider">
                     <tr>
                       <th className="px-3 sm:px-6 py-2.5 sm:py-4 rounded-tl-xl">#</th>
                       <th className="px-3 sm:px-6 py-2.5 sm:py-4">Tovar</th>
                       <th className="px-3 sm:px-6 py-2.5 sm:py-4">Kategoriya</th>
                       <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right rounded-tr-xl">Sotilgan summa</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                     {TOP_PRODUCTS.map((prod) => (
                       <tr key={prod.rank} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                         <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-medium text-slate-900 dark:text-white">{prod.rank}</td>
                         <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-medium text-slate-900 dark:text-white">{prod.name}</td>
                         <td className="px-3 sm:px-6 py-2.5 sm:py-4">
                           <span className="inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs rounded-md border border-slate-200 dark:border-slate-700/80">
                             {prod.category}
                           </span>
                         </td>
                         <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                           {prod.revenue} SO'M
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </Card>
           </>
         )}

{activeTab === 'tolovlar' && (
           <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
             <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
               <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">To'lovlar tarkibi</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-xs sm:text-sm text-left">
                 <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider">
                   <tr>
                     <th className="px-3 sm:px-6 py-2.5 sm:py-4 rounded-tl-xl">To'lov usuli</th>
                     <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right">Sotuvlar soni</th>
                     <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right">Summa</th>
                     <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right rounded-tr-xl">Ulushi</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                   {PAYMENT_STRUCTURE.map((pay, i) => (
                     <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                       <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-medium text-slate-900 dark:text-white">{pay.method}</td>
                       <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-medium text-slate-900 dark:text-white">{pay.count}</td>
                       <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-slate-900 dark:text-white">{pay.amount} SO'M</td>
                       <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-medium text-slate-900 dark:text-white">{pay.percent}</td>
                     </tr>
                   ))}
                   <tr className="bg-slate-50 dark:bg-slate-800/30">
                     <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-bold text-slate-900 dark:text-white">Jami</td>
                     <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-slate-900 dark:text-white">5</td>
                     <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-slate-900 dark:text-white">11 000 SO'M</td>
                     <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-slate-900 dark:text-white">100%</td>
                   </tr>
                 </tbody>
               </table>
             </div>
           </Card>
         )}

         {activeTab === 'qarzlar' && (
           <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
             <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
               <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Qarzdorligi bor mijozlar</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-xs sm:text-sm text-left">
                 <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider">
                   <tr>
                     <th className="px-3 sm:px-6 py-2.5 sm:py-4 rounded-tl-xl">Mijoz</th>
                     <th className="px-3 sm:px-6 py-2.5 sm:py-4">Telefon</th>
                     <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right rounded-tr-xl">Qarzdorlik</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                   {DEBTORS.map((debtor, i) => (
                     <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                       <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-medium text-slate-900 dark:text-white">{debtor.name}</td>
                       <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-slate-600 dark:text-slate-400">{debtor.phone}</td>
                       <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-bold text-[#ff6b00] dark:text-amber-500">{debtor.debt} SO'M</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </Card>
         )}

      </div>

    </div>
  );
}

export default ReportsPage;
