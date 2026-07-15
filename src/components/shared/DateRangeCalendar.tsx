import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangeCalendarProps {
  /** Boshlanish sanasi, YYYY-MM-DD */
  from?: string;
  /** Tugash sanasi, YYYY-MM-DD */
  to?: string;
  onChange: (from?: string, to?: string) => void;
}

const toKey = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const parseKey = (key?: string): Date | null => {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/**
 * Bitta kalendarda "dan–gacha" oraliq tanlash:
 * birinchi bosishda boshlanish sanasi, ikkinchisida tugash sanasi belgilanadi,
 * oradagi kunlar ham ajratib ko'rsatiladi.
 */
export function DateRangeCalendar({ from, to, onChange }: DateRangeCalendarProps) {
  const { t } = useTranslation();
  const fromDate = parseKey(from);
  const toDate = parseKey(to);

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = fromDate ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [hovered, setHovered] = useState<string | null>(null);

  const weekdays = t('export.weekdaysShort', 'Du,Se,Ch,Pa,Ju,Sh,Ya').split(',');
  const months = t(
    'export.months',
    'Yanvar,Fevral,Mart,Aprel,May,Iyun,Iyul,Avgust,Sentabr,Oktabr,Noyabr,Dekabr',
  ).split(',');

  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    // Hafta dushanbadan boshlanadi
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (Date | null)[] = Array.from({ length: offset }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      result.push(new Date(year, month, day));
    }
    return result;
  }, [viewMonth]);

  const handleDayClick = (day: Date) => {
    const key = toKey(day);
    if (!from || (from && to)) {
      // Yangi tanlash boshlanadi
      onChange(key, undefined);
      return;
    }
    // Boshlanish bor, tugashni tanlaymiz; teskari bosilsa — o'rinlar almashadi
    if (key < from) {
      onChange(key, from);
    } else {
      onChange(from, key);
    }
  };

  // Oraliq ichidami? Tugash hali tanlanmagan bo'lsa, hover qilingan kungacha ko'rsatamiz
  const rangeEnd = to ?? (from && hovered && hovered > from ? hovered : undefined);
  const inRange = (key: string) =>
    Boolean(from && rangeEnd && key > from && key < rangeEnd);
  const isEdge = (key: string) => key === from || key === to;

  const todayKey = toKey(new Date());

  return (
    <div
      className="rounded-lg border border-border p-3 select-none"
      onMouseLeave={() => setHovered(null)}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
          }
          aria-label="previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {months[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
          }
          aria-label="next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {weekdays.map((w) => (
          <span key={w} className="py-1 text-[11px] font-medium text-muted-foreground">
            {w}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const key = toKey(day);
          const edge = isEdge(key);
          const middle = inRange(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => setHovered(key)}
              className={[
                'my-0.5 flex h-8 items-center justify-center text-sm transition-colors',
                edge
                  ? 'mx-auto w-8 rounded-md bg-primary font-semibold text-primary-foreground'
                  : middle
                    ? 'w-full bg-primary/15 text-foreground'
                    : 'mx-auto w-8 rounded-md hover:bg-accent',
                !edge && !middle && key === todayKey ? 'ring-1 ring-primary/50' : '',
              ].join(' ')}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
