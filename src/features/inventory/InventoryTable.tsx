import { useTranslation } from 'react-i18next';
import { InventoryRow } from './InventoryRow';
import type { InventoryItem } from '../../services/inventory.api';

interface InventoryTableProps {
  items: InventoryItem[];
  onCountChange: (itemId: number, countedQty: number) => void;
  updatingItemId: number | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function InventoryTable({
  items,
  onCountChange,
  updatingItemId,
  searchQuery,
  onSearchChange,
}: InventoryTableProps) {
  const { t } = useTranslation();

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(query) ||
      item.product_sku.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('inventory.searchPlaceholder')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? t('inventory.noSearchResults') : t('inventory.noItems')}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {t('inventory.productName')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {t('inventory.sku')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    {t('inventory.expectedQty')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    {t('inventory.countedQty')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    {t('inventory.difference')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    {t('inventory.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map((item) => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    onCountChange={onCountChange}
                    isUpdating={updatingItemId === item.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
