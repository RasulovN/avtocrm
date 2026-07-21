import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DateRangeCalendar } from './DateRangeCalendar';

interface DateRangeFilterProps {
  /** Boshlanish sanasi, YYYY-MM-DD ('' = tanlanmagan) */
  from: string;
  /** Tugash sanasi, YYYY-MM-DD ('' = tanlanmagan) */
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
}

/**
 * Filtr paneli uchun "dan–gacha" tanlov: input ko'rinishidagi tugma bosilganda
 * bitta kalendar ochiladi, oraliq tanlangach avtomatik yopiladi.
 */
export function DateRangeFilter({ from, to, onChange, className }: DateRangeFilterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const label =
    from && to ? `${from} — ${to}` : from ? `${from} — ...` : t('common.dateRange', 'Sana oralig‘i');

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange('', '');
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent/50"
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={`flex-1 truncate text-left ${from ? 'text-foreground' : 'text-muted-foreground'}`}>
          {label}
        </span>
        {(from || to) && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleClear(e as unknown as React.MouseEvent);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-accent"
            aria-label={t('common.cancel')}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-x-auto rounded-lg bg-popover shadow-xl">
          <DateRangeCalendar
            from={from || undefined}
            to={to || undefined}
            onChange={(newFrom, newTo) => {
              onChange(newFrom ?? '', newTo ?? '');
              // Oraliq to'liq tanlangach kalendar yopiladi
              if (newFrom && newTo) setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
