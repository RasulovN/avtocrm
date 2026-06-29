import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/Dialog';
import { inventoryService, type ImportEntryResult, type ImportSkippedRow } from '../../services/inventoryService';
import { supplierService } from '../../services/supplierService';
import { handleError } from '../../utils/errorHandler';
import type { Supplier } from '../../types';

export function StockEntryImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [cashAmount, setCashAmount] = useState<number | ''>('');
  const [cardAmount, setCardAmount] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);

  const [supplierError, setSupplierError] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Reset form on open
    setSupplierId('');
    setCashAmount('');
    setCardAmount('');
    setFile(null);
    setSupplierError(false);
    setFileError(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const loadSuppliers = async () => {
      try {
        const res = await supplierService.getAll();
        setSuppliers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        handleError(err, { showToast: false, logData: 'Failed to load suppliers for import' });
      }
    };
    void loadSuppliers();
  }, [open]);

  // Skip bo'lgan satrlarni ro'yxat ko'rinishida toastda chiqarish
  const renderSkippedRows = (skipped: ImportSkippedRow[], detail?: string) => (
    <div className="text-sm">
      {detail && <p className="font-semibold mb-1">{detail}</p>}
      <ul className="list-disc pl-4 space-y-0.5 max-h-60 overflow-y-auto">
        {skipped.map((s, i) => (
          <li key={i}>
            <span className="font-medium">{t('inventory.row', 'Qator')} {s.row}:</span> {s.reason}
          </li>
        ))}
      </ul>
    </div>
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setFileError(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await inventoryService.downloadImportTemplate();
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Failed to download import template' });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (importing) return;

    let hasError = false;
    if (!supplierId) {
      setSupplierError(true);
      hasError = true;
    }
    if (!file) {
      setFileError(true);
      hasError = true;
    }
    if (hasError) {
      toast.error(t('errors.validationError', 'Barcha majburiy maydonlarni to\'ldiring'));
      return;
    }

    try {
      setImporting(true);
      const result = await inventoryService.importEntry({
        supplier: Number(supplierId),
        file: file as File,
        cash_amount: cashAmount === '' ? '0' : Number(cashAmount).toFixed(2),
        card_amount: cardAmount === '' ? '0' : Number(cardAmount).toFixed(2),
      });

      const created = result?.created ?? 0;
      const skipped = result?.skipped ?? [];

      if (created > 0) {
        toast.success(
          t('inventory.importCreated', '{{count}} ta satr muvaffaqiyatli kirim qilindi').replace('{{count}}', String(created))
        );
        // Qisman muvaffaqiyat: ba'zi satrlar o'tkazib yuborilgan bo'lsa, ogohlantirish
        if (skipped.length > 0) {
          toast.error(renderSkippedRows(skipped, t('inventory.importSkippedSome', 'Ba\'zi satrlar o\'tkazib yuborildi')), {
            duration: 10000,
          });
        }
        onSuccess?.();
        onOpenChange(false);
      } else {
        // Hech bir satr yaratilmadi — dialogni ochiq qoldiramiz, foydalanuvchi tuzatib qayta yuklasin
        toast.error(
          renderSkippedRows(skipped, result?.detail || t('inventory.importNoRows', 'Hech qanday yaroqli satr topilmadi, kirim yaratilmadi')),
          { duration: 10000 }
        );
      }
    } catch (error) {
      const data = (error as { response?: { data?: ImportEntryResult } }).response?.data;
      if (data && (data.skipped?.length || data.detail)) {
        toast.error(
          renderSkippedRows(data.skipped ?? [], data.detail || t('inventory.importNoRows', 'Hech qanday yaroqli satr topilmadi, kirim yaratilmadi')),
          { duration: 10000 }
        );
      } else {
        handleError(error, { showToast: true, logData: 'Failed to import stock entry from Excel' });
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg pb-6">
        <DialogHeader>
          <DialogTitle>{t('inventory.importFromExcel', 'Excel orqali kirim')}</DialogTitle>
          <DialogDescription>
            {t('inventory.importDescription', 'Shablonni yuklab olib, to\'ldiring va omborga kirim qiling')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Download template */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-4 bg-muted/20">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-green-600" />
              <span className="text-sm text-muted-foreground truncate">
                {t('inventory.downloadTemplateHint', 'Avval import shablonini yuklab oling')}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingTemplate
                ? t('common.loading', 'Yuklanmoqda...')
                : t('inventory.downloadTemplate', 'Shablon')}
            </Button>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label className={supplierError ? 'text-red-500' : ''}>
              {t('suppliers.title', 'Ta\'minotchi')} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={supplierId}
              onValueChange={(v) => { setSupplierId(v); setSupplierError(false); }}
            >
              <SelectTrigger className={supplierError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}>
                <SelectValue placeholder={t('inventory.selectSupplier', 'Ta\'minotchini tanlang')} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {t('payment.cash', 'Naqd')}
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCashAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {t('payment.card', 'Karta')}
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0.00"
                value={cardAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCardAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </div>

          {/* File picker */}
          <div className="space-y-2">
            <Label className={fileError ? 'text-red-500' : ''}>
              {t('inventory.excelFile', 'Excel fayl (.xlsx)')} <span className="text-red-500">*</span>
            </Label>
            <div
              className={`relative rounded-xl border border-dashed p-4 transition-colors cursor-pointer hover:bg-muted/30 ${
                fileError ? 'border-red-500' : 'border-border'
              } bg-muted/10`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-green-600" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
                  <Upload className="h-8 w-8 mb-2 text-muted-foreground/60" />
                  <span className="text-sm font-medium">
                    {t('inventory.selectExcelFile', 'Excel faylni tanlang')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Bekor qilish')}
            </Button>
            <Button type="submit" className="flex-1" disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? t('common.loading', 'Yuklanmoqda...') : t('inventory.import', 'Kirim qilish')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
