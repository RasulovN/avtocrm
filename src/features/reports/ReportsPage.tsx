import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, DollarSign, TrendingUp, ShoppingCart, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('sotuvlar');

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hisobotlar va tahlillar</h1>
          <p className="text-sm text-slate-500 mt-1">Batafsil biznes tahlili</p>
        </div>
        <Button variant="default" className="bg-slate-900 text-white hover:bg-slate-800">
          <Download className="mr-2 h-4 w-4" />
          Excelga eksport qilish
        </Button>
      </div>

      {/* 4 Cards requested by user */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3 text-slate-900">
              <DollarSign className="h-4 w-4" />
              <p className="text-sm font-semibold">Umumiy tushum</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">11 000 RUB</h3>
            <p className="text-xs text-emerald-500 flex items-center gap-1">
               <TrendingUp className="h-3 w-3" />
               Marja: -93.3%
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3 text-slate-900">
              <TrendingUp className="h-4 w-4" />
              <p className="text-sm font-semibold">Sof foyda</p>
            </div>
            <h3 className="text-2xl font-bold text-emerald-600 mb-1">-154 150 RUB</h3>
            <p className="text-xs text-slate-500">-93.3% marjadorlik</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3 text-slate-900">
              <ShoppingCart className="h-4 w-4" />
              <p className="text-sm font-semibold">Jami buyurtmalar</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">324</h3>
            <p className="text-xs text-slate-500">Ushbu oyda</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3 text-slate-900">
              <Users className="h-4 w-4" />
              <p className="text-sm font-semibold">Mijozlar qarzlari</p>
            </div>
            <h3 className="text-2xl font-bold text-[#ff6b00] mb-1">345 000 RUB</h3>
            <p className="text-xs text-slate-500">3 mijoz</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-full overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[120px] px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
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
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl border border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Do'konlar bo'yicha sotuvlar</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={STORE_SALES} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 3800]} ticks={[0, 950, 1900, 2850, 3800]} />
                        <Tooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ backgroundColor: '#fff', color: '#0f172a', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          wrapperStyle={{ zIndex: 100 }}
                        />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Kategoriyalar bo'yicha sotuvlar</h3>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-8 min-h-[250px] sm:h-[250px] py-4 sm:py-0">
                    <div className="w-48 h-48 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={CATEGORY_STATS}
                            dataKey="percent"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={80}
                            stroke="none"
                          >
                            {CATEGORY_STATS.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#fff', color: '#0f172a', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            wrapperStyle={{ zIndex: 100 }}
                            formatter={(value: number) => [`${value}%`, 'Ulushi']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 w-full max-w-[200px]">
                      {CATEGORY_STATS.map((cat, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-slate-600">{cat.name}</span>
                          </div>
                          <span className="font-medium text-slate-900" style={{ color: cat.color }}>{cat.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border border-slate-200 shadow-sm mt-6 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Sotuvlar bo'yicha Top-10 tovarlar</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-xl">#</th>
                      <th className="px-6 py-4">Tovar</th>
                      <th className="px-6 py-4">Kategoriya</th>
                      <th className="px-6 py-4 text-right rounded-tr-xl">Sotilgan summa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {TOP_PRODUCTS.map((prod) => (
                      <tr key={prod.rank} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{prod.rank}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{prod.name}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">
                            {prod.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          {prod.revenue} RUB
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
          <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">To'lovlar tarkibi</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-xl">To'lov usuli</th>
                      <th className="px-6 py-4 text-right">Sotuvlar soni</th>
                      <th className="px-6 py-4 text-right">Summa</th>
                      <th className="px-6 py-4 text-right rounded-tr-xl">Ulushi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {PAYMENT_STRUCTURE.map((pay, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{pay.method}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">{pay.count}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{pay.amount} RUB</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">{pay.percent}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50">
                       <td className="px-6 py-4 font-bold text-slate-900">Jami</td>
                       <td className="px-6 py-4 text-right font-bold text-slate-900">5</td>
                       <td className="px-6 py-4 text-right font-bold text-slate-900">11 000 RUB</td>
                       <td className="px-6 py-4 text-right font-bold text-slate-900">100%</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </Card>
        )}

        {activeTab === 'qarzlar' && (
           <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Qarzdorligi bor mijozlar</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-xl">Mijoz</th>
                      <th className="px-6 py-4">Telefon</th>
                      <th className="px-6 py-4 text-right rounded-tr-xl">Qarzdorlik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {DEBTORS.map((debtor, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{debtor.name}</td>
                        <td className="px-6 py-4 text-slate-600">{debtor.phone}</td>
                        <td className="px-6 py-4 text-right font-bold text-[#ff6b00]">{debtor.debt} RUB</td>
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
