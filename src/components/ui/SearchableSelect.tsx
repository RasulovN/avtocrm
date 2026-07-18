import * as React from 'react';
import { ChevronDown, Search, X, Loader2 } from 'lucide-react';
import { cn } from '../../utils';

interface Option {
  value: string;
  label: string;
  /** Ikkinchi qator: asosiy nomdan kichikroq ko'rsatiladigan qo'shimcha matn (masalan, telefon raqami) */
  sublabel?: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  pageSize?: number;
  countLabel?: string;
}

// Ro'yxat balandligi chegaralari: joy yetarli bo'lsa DESIRED, tor joyda MIN
const DROPDOWN_DESIRED_HEIGHT = 340;
const DROPDOWN_MIN_HEIGHT = 200;
const DROPDOWN_MARGIN = 8;

interface DropdownPlacement {
  openUpward: boolean;
  maxHeight: number;
}

/**
 * Trigger atrofidagi bo'sh joyni o'lchaydi. Modal (scroll-konteyner) ichida
 * bo'lsa, uning ko'rinadigan maydoni bilan viewport kesishmasi olinadi —
 * shunda ro'yxat modal chegarasidan chiqib "kesilib" qolmaydi.
 * Pastda joy kam, tepada ko'proq bo'lsa — ro'yxat tepaga ochiladi.
 */
function computePlacement(trigger: HTMLElement): DropdownPlacement {
  const rect = trigger.getBoundingClientRect();

  let boundTop = 0;
  let boundBottom = window.innerHeight;
  let node: HTMLElement | null = trigger.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll|hidden)/.test(style.overflowY) || /(auto|scroll|hidden)/.test(style.overflow)) {
      const r = node.getBoundingClientRect();
      boundTop = Math.max(boundTop, r.top);
      boundBottom = Math.min(boundBottom, r.bottom);
      break;
    }
    node = node.parentElement;
  }

  const spaceBelow = boundBottom - rect.bottom - DROPDOWN_MARGIN;
  const spaceAbove = rect.top - boundTop - DROPDOWN_MARGIN;
  const openUpward = spaceBelow < DROPDOWN_MIN_HEIGHT && spaceAbove > spaceBelow;
  const available = openUpward ? spaceAbove : spaceBelow;

  return {
    openUpward,
    maxHeight: Math.max(DROPDOWN_MIN_HEIGHT, Math.min(DROPDOWN_DESIRED_HEIGHT, available)),
  };
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  className,
  disabled = false,
  pageSize = 50,
  countLabel = 'ta mahsulot',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [placement, setPlacement] = React.useState<DropdownPlacement>({
    openUpward: false,
    maxHeight: DROPDOWN_DESIRED_HEIGHT,
  });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      setPlacement(computePlacement(containerRef.current));
    }
    setIsOpen((prev) => !prev);
  };

  // Reset visible count when search changes or dropdown opens/closes
  React.useEffect(() => {
    setVisibleCount(pageSize);
  }, [searchQuery, isOpen, pageSize]);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when dropdown opens
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // IntersectionObserver for infinite scroll sentinel
  React.useEffect(() => {
    if (!isOpen || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          // Small delay to prevent rapid firing
          setTimeout(() => {
            setVisibleCount((prev) => prev + pageSize);
            setIsLoadingMore(false);
          }, 150);
        }
      },
      {
        root: listRef.current,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isOpen, isLoadingMore, pageSize]);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase().trim();
    // Qidiruv label bilan birga sublabel bo'yicha ham ishlaydi (masalan, telefon raqami)
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.sublabel ? opt.sublabel.toLowerCase().includes(query) : false),
    );
  }, [options, searchQuery]);

  const visibleOptions = React.useMemo(
    () => filteredOptions.slice(0, visibleCount),
    [filteredOptions, visibleCount]
  );

  const hasMore = visibleCount < filteredOptions.length;

  const handleSelect = (val: string) => {
    onValueChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 text-left transition-all duration-200 shadow-none',
          isOpen && 'ring-2 ring-ring/30 border-primary/50'
        )}
      >
        <span className={cn('truncate block', !selectedOption && 'text-muted-foreground/60')}>
          {selectedOption ? (
            <>
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="ml-2 text-xs text-muted-foreground">{selectedOption.sublabel}</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 opacity-50 shrink-0 ml-2 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          style={{ maxHeight: placement.maxHeight }}
          className={cn(
            'absolute left-0 right-0 z-50 overflow-hidden rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-xl flex flex-col',
            placement.openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {/* Search input */}
          <div className="flex items-center border-b border-border/40 px-3 bg-muted/20 shrink-0">
            <Search className="h-4 w-4 shrink-0 opacity-50 mr-2" />
            <input
              ref={inputRef}
              type="text"
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Count info */}
          {filteredOptions.length > 0 && (
            <div className="px-3 py-1 text-xs text-muted-foreground bg-muted/10 border-b border-border/20 shrink-0">
              {visibleOptions.length} / {filteredOptions.length} {countLabel}
            </div>
          )}

          {/* Scrollable list */}
          <div ref={listRef} className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <>
                {visibleOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        'relative flex w-full cursor-default select-none flex-col items-start rounded-lg py-2 px-3 text-sm outline-none transition-colors text-left',
                        isSelected
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-accent hover:text-accent-foreground text-foreground'
                      )}
                    >
                      <span className="w-full truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span
                          className={cn(
                            'w-full truncate text-xs',
                            isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}
                        >
                          {opt.sublabel}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Sentinel div for IntersectionObserver */}
                {hasMore && (
                  <div ref={sentinelRef} className="flex items-center justify-center py-3">
                    {isLoadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Ko'proq yuklash uchun pastga suring...
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
