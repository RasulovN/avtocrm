import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { InventoryItem } from '../../../services/inventory.api';

interface InventoryRowProps {
  item: InventoryItem;
  onCountChange: (itemId: number, countedQty: number) => void;
  isUpdating: boolean;
}

export function InventoryRow({ item, onCountChange, isUpdating }: InventoryRowProps) {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState<string>(
    item.counted_qty === null ? '' : String(item.counted_qty)
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(item.counted_qty === null ? '' : String(item.counted_qty));
  }, [item.counted_qty]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);
  };

  const handleBlur = () => {
    const numValue = localValue === '' ? null : parseInt(localValue, 10);
    if (numValue !== item.counted_qty && !isNaN(numValue)) {
      onCountChange(item.id, numValue);
    } else if (localValue === '') {
      onCountChange(item.id, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  const getStatusStyles = () => {
    if (item.counted_qty === null) {
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-950/30',
        border: 'border-l-4 border-l-yellow-400',
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
      };
    }
    if (item.status === 'matched') {
      return {
        bg: 'bg-green-50 dark:bg-green-950/30',
        border: 'border-l-4 border-l-green-500',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      };
    }
    return {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-l-4 border-l-red-500',
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    };
  };

  const styles = getStatusStyles();
  const difference = item.counted_qty !== null ? item.counted_qty - item.expected_qty : null;

  return (
    <tr
      className={`transition-colors ${styles.bg} ${styles.border}`}
    >
      <td className="px-4 py-3">
        <div className="font-medium text-sm">{item.product_name}</div>
      </td>
      <td className="px-4 py-3">
        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{item.product_sku}</code>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-medium">{item.expected_qty}</span>
      </td>
      <td className="px-4 py-3">
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isUpdating}
          placeholder={t('inventory.enterQty')}
          className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />
      </td>
      <td className="px-4 py-3 text-center">
        {difference !== null ? (
          <span
            className={`font-medium ${
              difference === 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {difference > 0 ? `+${difference}` : difference}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {styles.icon}
      </td>
    </tr>
  );
}
