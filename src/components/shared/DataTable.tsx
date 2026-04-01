import { useState, useMemo, type ReactNode } from 'react';
import { Search, ChevronLeft, ChevronRight, Package, Loader2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/Table';

// Column interface with optional properties for styling
export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  width?: string;
}

// Extended column interface with more options
export interface EnhancedColumn<T> extends Column<T> {
  truncate?: boolean;
  nowrap?: boolean;
  breakWords?: boolean;
}

// Props interface
interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: EnhancedColumn<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  onRowClick?: (item: T) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  showFooter?: boolean;
  showStoreStats?: boolean;
  storeKey?: keyof T;
  quantityKey?: keyof T;
  minWidth?: string;
  emptyMessage?: string;
  loadingMessage?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  searchPlaceholder = 'Search...',
  onSearch,
  onRowClick,
  pagination,
  showFooter = false,
  showStoreStats = false,
  storeKey,
  quantityKey,
  minWidth = '800px',
  emptyMessage = 'No data available',
  loadingMessage = 'Loading data...',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');

  // Calculate totals
  const stats = useMemo(() => {
    if (!showFooter || data.length === 0) return null;

    // Total quantity
    let totalQuantity = 0;
    if (quantityKey) {
      totalQuantity = data.reduce((sum, item) => {
        const qty = Number((item as Record<string, unknown>)[quantityKey as string]) || 0;
        return sum + qty;
      }, 0);
    }

    // Store-wise quantities
    const storeQuantities: Record<string, number> = {};
    if (showStoreStats && storeKey) {
      data.forEach((item) => {
        const storeName = String((item as Record<string, unknown>)[storeKey as string]) || 'Unknown';
        const qty = quantityKey ? Number((item as Record<string, unknown>)[quantityKey as string]) || 0 : 0;
        storeQuantities[storeName] = (storeQuantities[storeName] || 0) + qty;
      });
    }

    return {
      totalQuantity,
      storeQuantities,
    };
  }, [data, showFooter, showStoreStats, storeKey, quantityKey]);

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  // Get column className based on options
  const getColumnClass = (column: EnhancedColumn<T>): string => {
    const classes = [column.className || ''];
    
    if (column.truncate) classes.push('truncate');
    if (column.nowrap) classes.push('whitespace-nowrap');
    if (column.breakWords) classes.push('break-words');
    
    return classes.filter(Boolean).join(' ');
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      {onSearch && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="w-full overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[800px]" style={{ minWidth }}>
          <Table>
            {/* Sticky Header */}
            <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      getColumnClass(column),
                      column.width && `w-[${column.width}]`
                    )}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody>
              {/* Loading State */}
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-sm">{loadingMessage}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                /* Empty State */
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8 opacity-50" />
                      <span className="text-sm">{emptyMessage}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                /* Data Rows */
                data.map((item, index) => (
                  <TableRow
                    key={item.id}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      'transition-colors hover:bg-muted/50'
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          getColumnClass(column),
                          index === 0 && 'font-medium'
                        )}
                      >
                        {column.render
                          ? column.render(item)
                          : String((item as Record<string, unknown>)[column.key] || '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer with Stats */}
      {showFooter && stats && (
        <div className="flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="font-semibold">{stats.totalQuantity.toLocaleString()}</span>
          </div>
          
          {showStoreStats && Object.keys(stats.storeQuantities).length > 0 && (
            <div className="flex flex-wrap gap-3 border-l pl-3">
              {Object.entries(stats.storeQuantities).map(([store, qty]) => (
                <div key={store} className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">{store}:</span>
                  <span className="font-medium">{qty.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {pagination.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
