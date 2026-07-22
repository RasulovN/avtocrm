import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Play,
  Search,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DateRangeFilter } from '../../components/shared/DateRangeFilter';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card } from '../../components/ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import {
  reportBuilderService,
  type ReportParams,
  type ReportResult,
  type ReportTypeDef,
} from '../../services/reportBuilderService';
import { formatCurrency } from '../../utils';
import { extractErrorMessage } from '../../utils/errorHandler';

const PAGE_LIMIT = 25;

/**
 * Reports moduli — ERP uslubida: hisobot turi tanlanadi, unga mos DINAMIK
 * filtrlar chiqadi, "Hisobot yaratish" bosilgach server filtrlangan jadvalni
 * (summary kartalar + pagination) qaytaradi. Excel/CSV eksport jadval bilan
 * AYNAN bir xil filtrlar orqali yuklanadi. Hech narsa oldindan yuklanmaydi.
 */
export function ReportsModulePage() {
  const { t } = useTranslation();

  // ─── Meta: hisobot turlari + dinamik filtr sxemalari (backenddan) ───
  const [meta, setMeta] = useState<ReportTypeDef[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [reportType, setReportType] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'csv' | null>(null);
  const [error, setError] = useState('');
  // Jadval qaysi filtrlar bilan yaratilgan — eksport AYNAN shulardan foydalanadi
  const [generatedParams, setGeneratedParams] = useState<ReportParams | null>(null);

  useEffect(() => {
    reportBuilderService
      .getMeta()
      .then((m) => {
        setMeta(m.reports);
        if (m.reports.length > 0) setReportType(m.reports[0].key);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setMetaLoading(false));
  }, []);

  const currentDef = useMemo(
    () => meta.find((r) => r.key === reportType) || null,
    [meta, reportType],
  );

  // Hisobot turi almashganda filtrlar defaultga qaytadi, natija tozalanadi
  const handleReportTypeChange = (key: string) => {
    setReportType(key);
    setFilterValues({});
    setSearch('');
    setResult(null);
    setGeneratedParams(null);
    setError('');
  };

  const buildParams = useCallback(
    (page: number, searchValue: string): ReportParams => ({
      report_type: reportType,
      from: from || undefined,
      to: to || undefined,
      ...Object.fromEntries(
        Object.entries(filterValues).filter(([, v]) => v !== '' && v !== undefined),
      ),
      search: searchValue.trim() || undefined,
      page: String(page),
      limit: String(PAGE_LIMIT),
    }),
    [reportType, from, to, filterValues],
  );

  const fetchReport = useCallback(
    async (page: number, searchValue: string) => {
      if (!reportType) return;
      const params = buildParams(page, searchValue);
      try {
        setLoading(true);
        setError('');
        const data = await reportBuilderService.generate(params);
        setResult(data);
        setGeneratedParams(params);
      } catch (err) {
        setError(extractErrorMessage(err));
        setResult(null);
        setGeneratedParams(null);
      } finally {
        setLoading(false);
      }
    },
    [reportType, buildParams],
  );

  const handleGenerate = () => void fetchReport(1, search);
  const handlePageChange = (page: number) => void fetchReport(page, search);
  const handleSearch = () => void fetchReport(1, search);

  const handleExport = async (exportType: 'excel' | 'csv') => {
    if (!generatedParams) return;
    try {
      setExporting(exportType);
      // page/limit eksportga kerak emas — qolgan filtrlar AYNAN jadvaldagidek
      const { page: _p, limit: _l, ...exportParams } = generatedParams;
      await reportBuilderService.exportFile(exportParams, exportType);
      toast.success(t('export.success', 'Fayl yuklab olindi'));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className="space-y-4 sm:space-y-6 pb-10 max-w-400 mx-auto">
      <PageHeader
        title={t('reports.title', 'Hisobotlar')}
        description={t(
          'reports.moduleDescription',
          "Hisobot turini tanlang, filtrlang va yuklab oling",
        )}
      />

      {/* ─── 1. Filtr paneli ─── */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {t('reports.filters', 'Filtrlar')}
        </div>

        {metaLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Hisobot turi */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t('reports.reportType', 'Hisobot turi')}
              </Label>
              <Select value={reportType} onValueChange={handleReportTypeChange}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meta.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dinamik filtrlar — tanlangan hisobot turiga qarab o'zgaradi */}
            {(currentDef?.filters || []).map((f) =>
              f.type === 'daterange' ? (
                <div key={f.param} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <DateRangeFilter
                    from={from}
                    to={to}
                    onChange={(newFrom, newTo) => {
                      setFrom(newFrom);
                      setTo(newTo);
                    }}
                  />
                </div>
              ) : (
                <div key={f.param} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  {/* Radix Select bo'sh ("Barchasi") qiymatni qabul qilmaydi —
                      '' ⇄ '__all__' mapping bilan ishlanadi */}
                  <Select
                    value={(() => {
                      const current = filterValues[f.param] ?? f.options?.[0]?.value ?? '';
                      return current === '' ? '__all__' : current;
                    })()}
                    onValueChange={(v) =>
                      setFilterValues((prev) => ({ ...prev, [f.param]: v === '__all__' ? '' : v }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options || []).map((o) => (
                        <SelectItem key={o.value || '__all__'} value={o.value === '' ? '__all__' : o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ),
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <Button onClick={handleGenerate} disabled={loading || !reportType}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {t('reports.generate', 'Hisobot yaratish')}
          </Button>
          {/* Eksport faqat jadval yaratilgandan keyin — aynan o'sha filtrlar bilan */}
          {generatedParams && (
            <>
              <Button
                variant="outline"
                disabled={exporting !== null}
                onClick={() => void handleExport('excel')}
              >
                {exporting === 'excel' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                )}
                Excel
              </Button>
              <Button
                variant="outline"
                disabled={exporting !== null}
                onClick={() => void handleExport('csv')}
              >
                {exporting === 'csv' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4 text-blue-600" />
                )}
                CSV
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* ─── Xato holati ─── */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── 2. Natija ─── */}
      {result && (
        <>
          {/* Summary kartalar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {result.summary.map((s, i) => (
              <Card key={i} className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {s.kind === 'money'
                    ? formatCurrency(parseFloat(String(s.value)) || 0)
                    : Number(s.value).toLocaleString()}
                </p>
              </Card>
            ))}
          </div>

          {/* Qidiruv (hisobot turi qo'llab-quvvatlasa) */}
          {currentDef?.search && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t('common.search', 'Qidirish...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                />
              </div>
              <Button variant="outline" onClick={handleSearch} disabled={loading}>
                {t('common.search', 'Qidirish')}
              </Button>
            </div>
          )}

          {/* Jadval */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    {result.columns.map((c) => (
                      <th
                        key={c.key}
                        className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                          c.kind === 'money' ? 'text-right' : c.kind === 'int' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={result.columns.length} className="px-3 py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </td>
                    </tr>
                  ) : result.rows.length === 0 ? (
                    <tr>
                      <td colSpan={result.columns.length} className="px-3 py-12 text-center text-muted-foreground">
                        <Inbox className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        {t('common.noData', "Ma'lumot topilmadi")}
                      </td>
                    </tr>
                  ) : (
                    result.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-accent/40 transition-colors">
                        {result.columns.map((c) => {
                          const val = row[c.key];
                          return (
                            <td
                              key={c.key}
                              className={`px-3 py-2 ${
                                c.kind === 'money'
                                  ? 'text-right tabular-nums font-medium'
                                  : c.kind === 'int'
                                    ? 'text-center tabular-nums'
                                    : 'text-left'
                              }`}
                            >
                              {c.kind === 'money'
                                ? formatCurrency(parseFloat(String(val)) || 0)
                                : String(val ?? '-')}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {result.total > result.limit && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  {(result.page - 1) * result.limit + 1}–
                  {Math.min(result.page * result.limit, result.total)} / {result.total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page <= 1 || loading}
                    onClick={() => handlePageChange(result.page - 1)}
                  >
                    {t('common.back', 'Orqaga')}
                  </Button>
                  <span className="min-w-16 px-2 text-center font-medium">
                    {result.page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page >= totalPages || loading}
                    onClick={() => handlePageChange(result.page + 1)}
                  >
                    {t('common.next', 'Keyingi')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ─── Bo'sh holat: hali hisobot yaratilmagan ─── */}
      {!result && !error && !metaLoading && (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center text-muted-foreground">
          <Filter className="h-10 w-10 opacity-40" />
          <p className="text-sm">
            {t(
              'reports.emptyHint',
              "Filtrlarni tanlab «Hisobot yaratish» tugmasini bosing — natija shu yerda jadval ko'rinishida chiqadi",
            )}
          </p>
        </Card>
      )}
    </div>
  );
}
