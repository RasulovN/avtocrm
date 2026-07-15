import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Label } from '../ui/Label';
import { DateRangeCalendar } from './DateRangeCalendar';
import { exportService } from '../../services/exportService';
import { handleError } from '../../utils/errorHandler';

type RangePreset = 'all' | 'today' | 'week' | 'month' | 'halfYear' | 'year' | 'custom';

export interface ExportFilterDef {
  /** Query param nomi, masalan 'ordering' yoki 'has_debt' */
  param: string;
  label: string;
  /** value 'all' bo'lsa param yuborilmaydi ("hammasi") */
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}

interface ExportButtonProps {
  /** Backend eksport endpointi, masalan '/sales/export/' */
  endpoint: string;
  /** Yuklab olinadigan fayl nomi, masalan 'sotuvlar.xlsx' */
  filename: string;
  /** Sahifadagi joriy filtrlar (search, store_id, date_from, ...) — so'rovga qo'shiladi */
  params?: Record<string, string | undefined>;
  /** Ro'yxatga xos qo'shimcha filtrlar (saralash, qarzdorlar, holat, ...) — dialog rejimida */
  extraFilters?: ExportFilterDef[];
  /**
   * true — dialog ochilmaydi: bosilganda sahifadagi joriy filtrlar (params)
   * bilan darhol yuklab olinadi. Filtrlari sahifa tepasida turgan ro'yxatlar uchun.
   */
  direct?: boolean;
  className?: string;
}

const formatDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const presetRange = (preset: RangePreset): { date_from?: string; date_to?: string } => {
  const today = new Date();
  const from = new Date(today);
  switch (preset) {
    case 'today':
      break;
    case 'week':
      from.setDate(from.getDate() - 6);
      break;
    case 'month':
      from.setMonth(from.getMonth() - 1);
      break;
    case 'halfYear':
      from.setMonth(from.getMonth() - 6);
      break;
    case 'year':
      from.setFullYear(from.getFullYear() - 1);
      break;
    default:
      return {};
  }
  return { date_from: formatDate(from), date_to: formatDate(today) };
};

export function ExportButton({ endpoint, filename, params, extraFilters, direct, className }: ExportButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<RangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    (extraFilters ?? []).forEach((f) => {
      initial[f.param] = f.defaultValue ?? f.options[0]?.value ?? 'all';
    });
    return initial;
  });

  // Dialog har ochilganda defaultlar qayta o'rnatiladi — sahifadagi joriy
  // filtrlar (defaultValue orqali keladi) dialogda oldindan tanlangan bo'ladi
  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    (extraFilters ?? []).forEach((f) => {
      initial[f.param] = f.defaultValue ?? f.options[0]?.value ?? 'all';
    });
    setFilterValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const presets: { key: RangePreset; label: string }[] = [
    { key: 'all', label: t('export.all') },
    { key: 'today', label: t('export.today') },
    { key: 'week', label: t('export.last7') },
    { key: 'month', label: t('export.last30') },
    { key: 'halfYear', label: t('export.last180') },
    { key: 'year', label: t('export.last365') },
    { key: 'custom', label: t('export.custom') },
  ];

  const handleDownload = async () => {
    const range =
      preset === 'custom'
        ? { date_from: customFrom || undefined, date_to: customTo || undefined }
        : presetRange(preset);
    // 'all' — "hammasi" degani, bunday param yuborilmaydi
    const extra: Record<string, string | undefined> = {};
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== 'all') extra[key] = value;
    });
    try {
      setDownloading(true);
      await exportService.downloadExcel(endpoint, { ...params, ...extra, ...range }, filename);
      toast.success(t('export.success'));
      setOpen(false);
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Excel export failed' });
    } finally {
      setDownloading(false);
    }
  };

  // Direct rejim: modal yo'q — sahifadagi joriy filtrlar bilan darhol yuklab olinadi
  const handleDirectDownload = async () => {
    try {
      setDownloading(true);
      await exportService.downloadExcel(endpoint, { ...params }, filename);
      toast.success(t('export.success'));
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Excel export failed' });
    } finally {
      setDownloading(false);
    }
  };

  if (direct) {
    return (
      <Button variant="outline" className={className} disabled={downloading} onClick={handleDirectDownload}>
        {downloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
        )}
        {t('export.button')}
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}>
        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
        {t('export.button')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('export.title')}</DialogTitle>
            <DialogDescription>{t('export.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {extraFilters && extraFilters.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {extraFilters.map((filter) => (
                  <div key={filter.param} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                    <Select
                      value={filterValues[filter.param]}
                      onValueChange={(value) =>
                        setFilterValues((prev) => ({ ...prev, [filter.param]: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {presets.map((p) => (
                <Button
                  key={p.key}
                  type="button"
                  variant={preset === p.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreset(p.key)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="space-y-2">
                <DateRangeCalendar
                  from={customFrom || undefined}
                  to={customTo || undefined}
                  onChange={(newFrom, newTo) => {
                    setCustomFrom(newFrom ?? '');
                    setCustomTo(newTo ?? '');
                  }}
                />
                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    {t('export.from')}:{' '}
                    <span className="font-semibold text-foreground">{customFrom || '—'}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {t('export.to')}:{' '}
                    <span className="font-semibold text-foreground">{customTo || '—'}</span>
                  </span>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              {t('export.download')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
