import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils';

interface BarcodeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onKeyDown'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  status?: 'idle' | 'scanning' | 'searching' | 'success' | 'not_found' | 'error';
}

export const BarcodeInput = forwardRef<HTMLInputElement, BarcodeInputProps>(
  ({ value, onChange, onKeyDown, status = 'idle', className, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Shtrixkodni skanerlang yoki kiriting..."
          className={cn(
            'w-full px-3 py-2 text-sm border rounded-md transition-colors',
            'bg-white dark:bg-gray-900',
            'border-gray-300 dark:border-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'placeholder:text-muted-foreground dark:placeholder:text-gray-500',
            'dark:text-white',
            status === 'success' && 'border-green-500 ring-green-500/20',
            status === 'not_found' && 'border-red-500 ring-red-500/20',
            status === 'error' && 'border-red-500 ring-red-500/20',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

BarcodeInput.displayName = 'BarcodeInput';
