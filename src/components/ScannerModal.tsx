import { useState, useEffect, useCallback } from 'react';
import QrScanner from 'react-qr-barcode-scanner';
import { BarcodeFormat, type Result } from '@zxing/library';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { CheckCircle, AlertCircle, Loader2, ScanBarcode } from 'lucide-react';
import { cn } from '../utils';
import { useTranslation } from 'react-i18next';

interface ScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => Promise<void> | void;
}

export type ScannerStatus = 'idle' | 'scanning' | 'searching' | 'success' | 'not_found' | 'error';

interface ScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => Promise<void> | void;
}

const normalizeBarcodeValue = (value: string): string => {
  const normalized = value.trim();
  if (
    normalized.includes('NotFoundException') ||
    normalized.includes('MultiFormat Readers were able to detect the code')
  ) {
    return '';
  }
  return normalized;
};

export function ScannerModal({ open, onOpenChange, onScan }: ScannerModalProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [message, setMessage] = useState("Камерани штрихкодга тўғри қаратиб туринг.");
  const [stopStream, setStopStream] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setStatus('scanning');
    setMessage(t('scanner.scanning', 'Камерани штрихкодга тўғри қаратиб туринг.'));
    setStopStream(false);
    setLastScannedCode('');

    const unreadTimeout = setTimeout(() => {
      setStatus((current) => (current === 'scanning' ? 'error' : current));
      setMessage((current) =>
        current === t('scanner.scanning', 'Камерани штрихкодга тўғри қаратиб туринг.')
          ? t('scanner.failed', "Штрих кодни ўқиб бўлмади. Камерани яқинроқ тутиб, қайта уриниб кўринг.")
          : current
      );
    }, 8000);

    return () => clearTimeout(unreadTimeout);
  }, [open]);

  const handleScan = useCallback(async (error: unknown, result?: Result) => {
    if (error) return;

    const data = typeof result?.getText === 'function' ? result.getText() : '';
    const normalizedBarcode = data ? normalizeBarcodeValue(data) : '';

    if (!normalizedBarcode || normalizedBarcode === lastScannedCode) return;

    setLastScannedCode(normalizedBarcode);
    setStatus('searching');
    setMessage(`${t('scanner.codeRead', 'Код ўқилди')}: ${normalizedBarcode}. ${t('common.loading', 'Қидирилмоқда')}...`);

    try {
      await onScan(normalizedBarcode);
      
      setStatus('success');
      setMessage(`${t('common.found', 'Топилди')}: ${normalizedBarcode}`);
      
      setStopStream(true);
      
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch {
      setStatus('not_found');
      setMessage(`${t('messages.productNotFound', 'Маҳсулот топилмади')}: ${normalizedBarcode}`);
      setLastScannedCode('');
    }
  }, [lastScannedCode, onScan, onOpenChange]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setStopStream(true);
    setLastScannedCode('');
    setTimeout(() => onOpenChange(isOpen), 0);
  }, [onOpenChange]);

  const statusStyles = {
    idle: 'border-primary/20 bg-primary/5 text-muted-foreground',
    scanning: 'border-primary/20 bg-primary/5 text-muted-foreground',
    searching: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
    success: 'border-green-500/30 bg-green-500/10 text-green-700',
    not_found: 'border-red-500/30 bg-red-500/10 text-red-700',
    error: 'border-red-500/30 bg-red-500/10 text-red-700',
  };

  const StatusIcon = {
    idle: ScanBarcode,
    scanning: ScanBarcode,
    searching: Loader2,
    success: CheckCircle,
    not_found: AlertCircle,
    error: AlertCircle,
  };

  const Icon = StatusIcon[status];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => {
        if (status === 'searching') {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>{t('scanner.title', 'Штрихкод сканери')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border bg-black">
            <QrScanner
              width="100%"
              height={280}
              delay={200}
              facingMode="environment"
              stopStream={stopStream}
              videoConstraints={{
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }}
              formats={[
                BarcodeFormat.CODE_128,
                BarcodeFormat.CODE_39,
                BarcodeFormat.EAN_13,
                BarcodeFormat.EAN_8,
                BarcodeFormat.UPC_A,
                BarcodeFormat.UPC_E,
                BarcodeFormat.ITF,
                BarcodeFormat.QR_CODE,
                BarcodeFormat.DATA_MATRIX,
              ]}
              onUpdate={handleScan}
              onError={(error) => {
                console.error('Scanner error:', error);
                setStatus('error');
                setMessage(t('scanner.connectionError', "Камерага уланишда муаммо бўлди ёки кодни ўқиб бўлмади."));
              }}
            />
          </div>
          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-sm flex items-center gap-2',
              statusStyles[status]
            )}
          >
            {status === 'scanning' || status === 'searching' ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Icon className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{message}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
