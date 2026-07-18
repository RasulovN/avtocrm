import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface UseColumnSplitterOptions {
  /** localStorage kaliti — har sahifa o'z kengliklarini alohida eslab qoladi */
  storageKey: string;
  /** Panellarning boshlang'ich kengliklari (%), yig'indisi ~100 */
  defaults: number[];
  /** Har bir panelning minimal kengligi (%) */
  min?: number;
}

/**
 * Yonma-yon panellar orasidagi suriladigan splitter (faqat xl >= 1280px ekranlarda).
 *
 * Foydalanish:
 *   const split = useColumnSplitter({ storageKey: '...', defaults: [40, 35, 25] });
 *   <div ref={split.containerRef} className="flex flex-col gap-3 xl:flex-row xl:gap-0">
 *     <div style={split.panelStyle(0)}>...</div>
 *     {split.splitter(0)}
 *     <div style={split.panelStyle(1)}>...</div>
 *     {split.splitter(1)}
 *     <div style={split.panelStyle(2)}>...</div>
 *   </div>
 *
 * Splitter surilganda faqat ikki qo'shni panel qayta taqsimlanadi, kengliklar
 * localStorage'da saqlanadi, ikki marta bosilsa default holatga qaytadi.
 */
export function useColumnSplitter({ storageKey, defaults, min = 16 }: UseColumnSplitterOptions) {
  const { t } = useTranslation();
  const [widths, setWidths] = useState<number[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '');
      if (
        Array.isArray(saved) &&
        saved.length === defaults.length &&
        saved.every((n) => typeof n === 'number' && n >= min && n <= 100)
      ) {
        return saved;
      }
    } catch { /* saqlangan qiymat buzuq — default ishlatiladi */ }
    return defaults;
  });
  const [isWide, setIsWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = () => setIsWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Splitter surilganda: ikkala qo'shni panel kengligi umumiy yig'indisi
  // saqlangan holda qayta taqsimlanadi, qolgan panellar o'zgarmaydi
  const startDrag = (index: number, e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const startX = e.clientX;
    const startWidths = [...widths];
    const totalWidth = container.getBoundingClientRect().width;
    if (totalWidth <= 0) return;

    const onMove = (ev: globalThis.PointerEvent) => {
      const deltaPct = ((ev.clientX - startX) / totalWidth) * 100;
      const pair = startWidths[index] + startWidths[index + 1];
      const left = Math.max(min, Math.min(pair - min, startWidths[index] + deltaPct));
      const next = [...startWidths];
      next[index] = left;
      next[index + 1] = pair - left;
      setWidths(next);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidths((w) => {
        localStorage.setItem(storageKey, JSON.stringify(w));
        return w;
      });
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const reset = () => {
    setWidths(defaults);
    localStorage.setItem(storageKey, JSON.stringify(defaults));
  };

  // xl da flex-basis % orqali kenglik; kichik ekranlarda odatiy stack (style yo'q)
  const panelStyle = (i: number): CSSProperties | undefined =>
    isWide ? { flexBasis: `${widths[i]}%`, flexGrow: 0, flexShrink: 1, minWidth: 0 } : undefined;

  const splitter = (index: number) => (
    <div
      role="separator"
      aria-orientation="vertical"
      title={t('sales.splitterHint', 'Kengligini o‘zgartirish uchun torting, ikki marta bosib tiklang')}
      onPointerDown={(e) => startDrag(index, e)}
      onDoubleClick={reset}
      className="group hidden shrink-0 cursor-col-resize touch-none items-center justify-center px-1 xl:flex"
    >
      <div className="h-16 w-1 rounded-full bg-border transition-colors group-hover:bg-primary/60 group-active:bg-primary" />
    </div>
  );

  return { containerRef, panelStyle, splitter };
}
