import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  ShoppingCart,
  FileText,
  Calendar,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/Select';

// Report type definitions
export interface Report {
  id: string;
  name: string;
  type: 'sales' | 'inventory' | 'financial' | 'transfer';
  dateRange: string;
  generatedAt: string;
  status: 'ready' | 'processing';
}

// Mock reports data
const mockReports: Report[] = [
  { id: '1', name: 'Sales Report - March 2026', type: 'sales', dateRange: '01.03.2026 - 31.03.2026', generatedAt: '01.04.2026', status: 'ready' },
  { id: '2', name: 'Inventory Status Report', type: 'inventory', dateRange: '01.04.2026', generatedAt: '01.04.2026', status: 'ready' },
  { id: '3', name: 'Financial Report - Q1 2026', type: 'financial', dateRange: '01.01.2026 - 31.03.2026', generatedAt: '01.04.2026', status: 'ready' },
  { id: '4', name: 'Transfer Report - March 2026', type: 'transfer', dateRange: '01.03.2026 - 31.03.2026', generatedAt: '02.04.2026', status: 'ready' },
  { id: '5', name: 'Sales Report - February 2026', type: 'sales', dateRange: '01.02.2026 - 28.02.2026', generatedAt: '01.03.2026', status: 'ready' },
];

// Quick stats for reports
const quickStats = [
  {
    title: 'Total Sales',
    value: '12,450,000 ₽',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-green-500',
  },
  {
    title: 'Total Purchases',
    value: '8,320,000 ₽',
    change: '+8.2%',
    trend: 'up',
    icon: ShoppingCart,
    color: 'text-blue-500',
  },
  {
    title: 'Net Profit',
    value: '4,130,000 ₽',
    change: '+18.7%',
    trend: 'up',
    icon: TrendingUp,
    color: 'text-emerald-500',
  },
  {
    title: 'Total Debt',
    value: '1,250,000 ₽',
    change: '-5.3%',
    trend: 'down',
    icon: TrendingDown,
    color: 'text-red-500',
  },
];

export function ReportsPage() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');

  const filteredReports = mockReports.filter((report) => {
    if (selectedType === 'all') return true;
    return report.type === selectedType;
  });

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sales: t('reports.types.sales'),
      inventory: t('reports.types.inventory'),
      financial: t('reports.types.financial'),
      transfer: t('reports.types.transfer'),
    };
    return labels[type] || type;
  };

  const getReportTypeIcon = (type: string) => {
    const icons: Record<string, typeof FileText> = {
      sales: DollarSign,
      inventory: Package,
      financial: BarChart3,
      transfer: TrendingUp,
    };
    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.reports')}
        description={t('reports.description')}
      />

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t(`reports.stats.${stat.title.toLowerCase().replace(' ', '')}` as never) || stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-xs ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`h-12 w-12 rounded-full bg-muted flex items-center justify-center ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">{t('reports.filters')}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('reports.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allTypes')}</SelectItem>
                  <SelectItem value="sales">{t('reports.types.sales')}</SelectItem>
                  <SelectItem value="inventory">{t('reports.types.inventory')}</SelectItem>
                  <SelectItem value="financial">{t('reports.types.financial')}</SelectItem>
                  <SelectItem value="transfer">{t('reports.types.transfer')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('reports.periods.month')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t('reports.periods.week')}</SelectItem>
                  <SelectItem value="month">{t('reports.periods.month')}</SelectItem>
                  <SelectItem value="quarter">{t('reports.periods.quarter')}</SelectItem>
                  <SelectItem value="year">{t('reports.periods.year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Reports List */}
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getReportTypeIcon(report.type)}
                  </div>
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {report.dateRange}
                      </span>
                      <span>{report.generatedAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    report.status === 'ready' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {report.status === 'ready' ? t('reports.ready') : t('reports.processing')}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReportsPage;
