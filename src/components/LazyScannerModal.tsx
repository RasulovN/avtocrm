import { lazy, Suspense } from 'react';

// Kamera-skaner kutubxonalari (@zxing, react-qr-barcode-scanner) ~400KB —
// sahifa yuklanishida emas, faqat skaner modali ochilganda dinamik yuklanadi.
// Aks holda POS/inventar sahifalarida mobil TBT keskin oshadi.
const ScannerModalInner = lazy(() =>
  import('./ScannerModal').then((m) => ({ default: m.ScannerModal })),
);

interface LazyScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => Promise<void> | void;
}

export function LazyScannerModal(props: LazyScannerModalProps) {
  if (!props.open) return null;
  return (
    <Suspense fallback={null}>
      <ScannerModalInner {...props} />
    </Suspense>
  );
}
