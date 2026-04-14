import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Package, Loader2, Building2, Eye } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '../ui/Dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/Table';

export type ColumnKey<T> = keyof T | (string & {});

export interface Column<T> {
  key: ColumnKey<T>;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  width?: string;
}

export interface EnhancedColumn<T> extends Column<T> {
  truncate?: boolean;
  nowrap?: boolean;
  breakWords?: boolean;
}

export interface StoreInventory {
  store_id: string;
  store_name: string;
  quantity: number;
}

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
  inventoryByStore?: (item: T) => StoreInventory[];
  itemNameKey?: keyof T;
  selectableRows?: boolean;
  selectedRowIds?: string[];
  onToggleRowSelection?: (id: string) => void;
  onToggleAllRows?: (ids: string[]) => void;
}

export function DataTable<T extends { id: string }>({
  data = [],
  columns = [],
  loading = false,
  searchPlaceholder = 'Search...',
  onSearch,
  onRowClick,
  pagination,
  showFooter = false,
  showStoreStats = false,
  storeKey,
  quantityKey,
  minWidth = '640px',
  emptyMessage = 'No data available',
  loadingMessage = 'Loading data...',
  inventoryByStore,
  itemNameKey,
  selectableRows = false,
  selectedRowIds = [],
  onToggleRowSelection,
  onToggleAllRows,
}: DataTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false);
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<StoreInventory[]>([]);
  const [selectedItemName, setSelectedItemName] = useState('');
  const allSelected = selectableRows && safeData.length > 0 && safeData.every((item) => selectedRowIds.includes(item.id));

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const stats = useMemo(() => {
    if (!showFooter || safeData.length === 0) return null;

    let totalQuantity = 0;
    if (inventoryByStore) {
      safeData.forEach((item) => {
        const inventories = inventoryByStore(item);
        if (inventories) {
          inventories.forEach((inv) => {
            totalQuantity += inv.quantity;
          });
        }
      });
    } else if (quantityKey) {
      totalQuantity = safeData.reduce((sum, item) => {
        const qty = Number(item[quantityKey] ?? 0) || 0;
        return sum + qty;
      }, 0);
    }

    const storeQuantities: Record<string, number> = {};
    const storeProductCounts: Record<string, number> = {};
    if (showStoreStats) {
      if (inventoryByStore) {
        safeData.forEach((item) => {
          const inventories = inventoryByStore(item);
          if (inventories) {
            inventories.forEach((inv) => {
              storeQuantities[inv.store_name] = (storeQuantities[inv.store_name] || 0) + inv.quantity;
              if (inv.quantity > 0) {
                storeProductCounts[inv.store_name] = (storeProductCounts[inv.store_name] || 0) + 1;
              }
            });
          }
        });
      } else if (showStoreStats && storeKey) {
        safeData.forEach((item) => {
          const storeName = String(item[storeKey] ?? 'Unknown');
          const qty = quantityKey ? Number(item[quantityKey] ?? 0) || 0 : 0;
          storeQuantities[storeName] = (storeQuantities[storeName] || 0) + qty;
          if (qty > 0) {
            storeProductCounts[storeName] = (storeProductCounts[storeName] || 0) + 1;
          }
        });
      }
    }

    return {
      totalQuantity,
      storeQuantities,
      storeProductCounts,
    };
  }, [safeData, showFooter, showStoreStats, storeKey, quantityKey, inventoryByStore]);

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  const getColumnClass = (column: EnhancedColumn<T>): string => {
    const classes = [column.className || ''];
    
    if (column.truncate) classes.push('truncate');
    if (column.nowrap) classes.push('whitespace-nowrap');
    if (column.breakWords) classes.push('break-words');
    
    return classes.filter(Boolean).join(' ');
  };

  const renderStoreInventory = (item: T) => {
    if (!inventoryByStore) return null;
    
    const inventories = inventoryByStore(item);
    const total = inventories?.reduce((sum, inv) => sum + inv.quantity, 0) || 0;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const itemName = itemNameKey ? String(item[itemNameKey] ?? '') : '';
      setSelectedInventory(inventories || []);
      setSelectedItemName(itemName);
      setModalOpen(true);
    };

    return (
      <div className="flex items-center gap-2 cursor-pointer group" onClick={handleClick} title="Ko'rish uchun bosing">
        <span className="font-semibold text-base">{total.toLocaleString()}</span>
        <Eye className="h-4 w-4 text-muted-foreground group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onSearch && (
        <div className="flex items-center gap-2">
          <div className="relative w-full flex-1 sm:max-w-sm">
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

      <div className="w-full overflow-x-auto rounded-lg border bg-card">
        {isMobile ? (
          <div className="divide-y divide-border">
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">{loadingMessage}</span>
              </div>
            ) : safeData.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Package className="h-8 w-8 opacity-50" />
                <span className="text-sm">{emptyMessage}</span>
              </div>
            ) : (
              safeData.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'cursor-pointer p-4 transition-colors hover:bg-muted/50',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{String(item['name' as keyof T] ?? '')}</p>
                      <p className="text-sm text-muted-foreground font-mono">{String(item['sku' as keyof T] ?? '')}</p>
                    </div>
                    {selectableRows && (
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={selectedRowIds.includes(item.id)}
                        onChange={() => onToggleRowSelection?.(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border mt-1"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{String(item['category_name' as keyof T] ?? item['category' as keyof T] ?? '')}</span>
                    {inventoryByStore ? (
                      renderStoreInventory(item)
                    ) : (
                      <span className="font-semibold">{Number(item[quantityKey as keyof T] ?? 0).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-2 text-sm text-muted-foreground">
                    <span>{Number(item['purchase_price' as keyof T] ?? 0).toLocaleString()} / {Number(item['selling_price' as keyof T] ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="min-w-[640px] sm:min-w-[720px]" style={{ minWidth }}>
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                <TableRow className="hover:bg-transparent">
                  {selectableRows && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        aria-label="Select all rows"
                        checked={allSelected}
                        onChange={() => onToggleAllRows?.(safeData.map((item) => item.id))}
                        className="h-4 w-4 rounded border-border"
                      />
                    </TableHead>
                  )}
                  {safeColumns.map((column) => (
                    <TableHead
                      key={String(column.key)}
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

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={(safeColumns.length || 1) + (selectableRows ? 1 : 0)} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-sm">{loadingMessage}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : safeData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(safeColumns.length || 1) + (selectableRows ? 1 : 0)} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8 opacity-50" />
                        <span className="text-sm">{emptyMessage}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  safeData.map((item, index) => (
                    <TableRow
                      key={item.id}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        onRowClick && 'cursor-pointer',
                        'transition-colors hover:bg-muted/50'
                      )}
                    >
                      {selectableRows && (
                        <TableCell className="w-12">
                          <input
                            type="checkbox"
                            aria-label="Select row"
                            checked={selectedRowIds.includes(item.id)}
                            onChange={() => onToggleRowSelection?.(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-border"
                          />
                        </TableCell>
                      )}
                      {safeColumns.map((column) => (
                        <TableCell
                          key={String(column.key)}
                          className={cn(
                            getColumnClass(column),
                            index === 0 && 'font-medium'
                          )}
                        >
                          {inventoryByStore && column.key === 'quantity' ? (
                            renderStoreInventory(item)
                          ) : column.render
                            ? column.render(item)
                            : (column.key in item ? String(item[column.key as keyof T] ?? '') : '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {showFooter && stats && !isMobile && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="font-semibold">{stats.totalQuantity.toLocaleString()}</span>
          </div>
          
          {showStoreStats && Object.keys(stats.storeQuantities).length > 0 && (
            <div className="flex flex-wrap gap-3 border-t pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
              {Object.entries(stats.storeQuantities).map(([store, qty]) => (
                <div key={store} className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">{store}:</span>
                  <span className="font-medium">{qty.toLocaleString()}</span>
                  {stats.storeProductCounts && stats.storeProductCounts[store] !== undefined && (
                    <span className="text-muted-foreground/70">({stats.storeProductCounts[store]} ta)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pagination && totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {selectedItemName ? `${selectedItemName} - Do'konlar bo'yicha` : 'Do\'konlar bo\'yicha soni'}
            </DialogTitle>
            <DialogDescription>
              Jami miqdor: {selectedInventory.reduce((sum, inv) => sum + inv.quantity, 0).toLocaleString()} ta
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {selectedInventory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Ma'lumot yo'q</p>
            ) : (
              <div className="space-y-3">
                {selectedInventory.map((inv, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">{inv.store_name}</span>
                    </div>
                    <span className={cn(
                      "font-semibold",
                      inv.quantity === 0 && "text-muted-foreground",
                      inv.quantity > 0 && inv.quantity < 10 && "text-orange-500",
                      inv.quantity >= 10 && "text-green-600 dark:text-green-400"
                    )}>
                      {inv.quantity.toLocaleString()} ta
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DataTable;
