import { lazy, Suspense, useState, useEffect, useCallback, type ChangeEvent, type FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, Eye, Search, X, ChevronLeft, ChevronRight, CreditCard, Printer, FileSpreadsheet, Banknote } from 'lucide-react';
import { generateBarcodePrintHtml, generateMultipleBarcodesPrintHtml, escapeHtml } from '../../utils/xss';

import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ExportButton } from '../../components/shared/ExportButton';
import { DateRangeFilter } from '../../components/shared/DateRangeFilter';
import { lastWeekRange } from '../../utils/dateRange';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Label } from '../../components/ui/Label';
import { inventoryService, type InventoryFilters } from '../../services/inventoryService';
import { purchaseSessionService } from '../../services/purchaseSessionService';
import type { PurchaseSession } from '../../types';
import { productService } from '../../services/productService';
import { supplierService } from '../../services/supplierService';
import { bankCardService } from '../../services/bankCardService';
import { CardSplitEditor } from '../../components/shared/CardSplitEditor';
import { useCardSplits } from '../../hooks/useCardSplits';
import { formatCurrency, formatDate } from '../../utils';
import { groupByPaymentGroup } from '../../utils/paymentGroups';
import { handleError } from '../../utils/errorHandler';
import type { InventoryItem, Supplier, BankCard } from '../../types';

// Dialoglar og'ir (wizard + import) — sahifa yuklanishida emas, birinchi ochilganda yuklanadi
const StockEntryCreateDialog = lazy(() =>
  import('./StockEntryCreateDialog').then(m => ({ default: m.StockEntryCreateDialog }))
);
const StockEntryImportDialog = lazy(() =>
  import('./StockEntryImportDialog').then(m => ({ default: m.StockEntryImportDialog }))
);

export interface SupplierPayment {
  id: number;
  supplier: number;
  entry: number;
  amount: string;
  type: string;
  payment_method?: 'cash' | 'card' | '';
  bank_card?: number | null;
  bank_card_name?: string | null;
  /** Bitta to'lov harakatining split qatorlarini bog'lovchi guruh ID (null — eski yozuvlar) */
  payment_group?: string | null;
  note: string;
  created_at?: string;
}

interface DisplayInventory {
  id: string;
  supplier_id: string;
  supplier_name: string;
  store_id: string;
  store_name: string;
  total: number;
  paid: number;
  debt: number;
  status: string;
  created_at: string;
  items: InventoryItem[];
  full_name: string;
  note?: string;
}

type DisplayInventoryRow = DisplayInventory & { rowNumber: number };

export function StockEntryListPage() {
  const { t } = useTranslation();

  const [inventory, setInventory] = useState<DisplayInventory[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  // Default — oxirgi 1 hafta; foydalanuvchi oraliqni o'zgartirsa yoki tozalasa
  // (dan-gacha bo'shatilsa) boshqa kirimlar ham chiqadi
  const [dateFrom, setDateFrom] = useState(() => lastWeekRange().from);
  const [dateTo, setDateTo] = useState(() => lastWeekRange().to);

  // Reference lists
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [selectedInventory, setSelectedInventory] = useState<DisplayInventory | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [paying, setPaying] = useState(false);
  // To'lov taqsimoti: naqd va karta summalari (ikkalasi birga = aralash to'lov).
  // Jami to'lov shu ikkisining yig'indisidan hisoblanadi — qarzdan kam bo'lsa
  // qisman to'lov bo'lib saqlanadi.
  const [payCash, setPayCash] = useState('');
  const [payCard, setPayCard] = useState('');
  const [paymentCards, setPaymentCards] = useState<BankCard[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<SupplierPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [printCounts, setPrintCounts] = useState<Record<string, number>>({});

  // Load initial reference data
  useEffect(() => {
    const loadReferences = async () => {
      try {
        const suppliersRes = await supplierService.getAll();
        setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
      } catch (err) {
        handleError(err, { showToast: true, logData: 'Failed to load filter data' });
      }
    };
    loadReferences();
  }, []);

const globalProductCache = new Map<string, { name: string; sku: string; barcode: string; shtrix_code: string }>();

  // silent=true — fonda yangilash: ro'yxat "Yuklanmoqda..." holatiga o'tmaydi
  // (to'lovdan keyin joyida yangilangan qatorlarni server qiymatlari bilan sinxronlaydi)
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const filterParams: InventoryFilters = {
        page,
        limit,
        search: searchTerm || undefined,
        store: (storeFilter && storeFilter !== 'all') ? storeFilter : undefined,
        supplier: (supplierFilter && supplierFilter !== 'all') ? supplierFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined
      };

      // Yakunlanmagan (jarayondagi) sessiyalar ham 1-sahifada, ro'yxat tepasida ko'rinadi
      const [response, activeSessions] = await Promise.all([
        inventoryService.getEntries(filterParams),
        page === 1
          ? purchaseSessionService.getActive().catch(() => [] as PurchaseSession[])
          : Promise.resolve([] as PurchaseSession[]),
      ]);
      const entries = response.data || [];
      setTotalCount(response.total || 0);

      const uniqueProductIds = new Set<string>();
      entries.forEach(entry => {
        if (entry.items) {
          entry.items.forEach(item => {
            if (item.product) uniqueProductIds.add(String(item.product));
          });
        }
      });

      const missingProductIds = Array.from(uniqueProductIds).filter(id => !globalProductCache.has(id));

      if (missingProductIds.length > 0) {
        await Promise.all(
          missingProductIds.map(async (key) => {
            try {
              const product = await productService.getById(key);
              const shtrixCode = product.shtrix_code || product.barcode || '';
              globalProductCache.set(key, {
                name: product.name || key,
                sku: product.sku || '',
                barcode: product.barcode || '',
                shtrix_code: shtrixCode
              });
            } catch {
              globalProductCache.set(key, { name: key, sku: '', barcode: '', shtrix_code: '' });
            }
          })
        );
      }

      const mapped: DisplayInventory[] = entries.map((entry) => {
        const items: InventoryItem[] = (entry.items || []).map((item) => {
          const prod = globalProductCache.get(String(item.product)) || { name: String(item.product), sku: '', barcode: '', shtrix_code: '' };
          const shtrixCode = item.shtrix_code || item.barcode || prod.shtrix_code || '';
          return {
            id: String(item.id),
            product_id: String(item.product),
            product_name: prod.name,
            product_sku: item.sku || prod.sku,
            product_barcode: item.barcode || prod.barcode,
            shtrix_code: shtrixCode,
            quantity: item.quantity,
            purchase_price: parseFloat(item.purchase_price || '0'),
            selling_price: item.selling_price ? parseFloat(item.selling_price) : undefined,
            total: item.quantity * parseFloat(item.purchase_price || '0')
          };
        });
        
        const total = items.reduce((sum, i) => sum + i.total, 0);
        // To'langan = kirim paytidagi boshlang'ich to'lov (paid_amount) + keyingi
        // qarz to'lovlari (total_paid — SupplierTransaction 'pay' yig'indisi).
        // Faqat paid_amount ko'rsatilsa keyingi to'lovlar "yo'qolib" 0 yoki
        // birinchi to'lovgina ko'rinardi.
        const initialPaid = entry.paid_amount ? parseFloat(entry.paid_amount) : 0;
        const laterPaid = entry.total_paid ? parseFloat(String(entry.total_paid)) : 0;
        return {
          id: String(entry.id),
          supplier_id: String(entry.supplier),
          supplier_name: entry.supplier_name || String(entry.supplier),
          store_id: String(entry.store),
          store_name: entry.store_name || String(entry.store),
          total,
          paid: initialPaid + laterPaid,
          debt: entry.debt ?? 0,
          status: 'completed',
          created_at: entry.created_at || new Date().toISOString(),
          items,
          full_name: entry.full_name || '',
          note: entry.note || ''
        };
      });

      // Jarayondagi sessiyalar — hali StockEntry emas, "Jarayonda" statusi bilan chiqadi
      const sessionRows: DisplayInventory[] = activeSessions.map((s) => {
        const itemsTotal = (s.items || []).reduce(
          (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.purchase_price) || 0),
          0,
        );
        return {
          id: `session-${s.id}`,
          supplier_id: String(s.supplier ?? ''),
          supplier_name: s.supplier_name || `#${s.supplier ?? '—'}`,
          store_id: String(s.store ?? ''),
          store_name: s.store_name || '',
          total: Number(s.total_amount) || itemsTotal,
          paid: (Number(s.cash_amount) || 0) + (Number(s.card_amount) || 0),
          debt: 0,
          status: 'in_progress',
          created_at: s.created_at || new Date().toISOString(),
          items: [],
          full_name: '',
          note: s.note || '',
        };
      });

      setInventory(page === 1 ? [...sessionRows, ...mapped] : mapped);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: true, logData: 'Failed to load inventory' });
      setInventory([]);
      setTotalCount(0);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, limit, searchTerm, storeFilter, supplierFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStoreFilter('');
    setSupplierFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleShowDetails = async (item: DisplayInventory) => {
    // Jarayondagi sessiya — tafsilot o'rniga wizard ochiladi (davom ettirish ro'yxati bilan)
    if (item.status === 'in_progress') {
      setShowCreateDialog(true);
      return;
    }
    setSelectedInventory(item);
    setShowDetails(true);
    setSelectedItems(new Set());
    const initialCounts: Record<string, number> = {};
    item.items.forEach(i => { initialCounts[i.id] = i.quantity; });
    setPrintCounts(initialCounts);
    setLoadingPayments(true);
    try {
      const res = await inventoryService.getSupplierPayment(item.id);
      setPaymentHistory(Array.isArray(res) ? res : []);
    } catch {
      setPaymentHistory([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (!selectedInventory) return;
    const allIds = selectedInventory.items.map(item => item.id);
    const allSelected = allIds.every(id => selectedItems.has(id));
    
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allIds));
    }
  };

  const handleDecreaseCount = (itemId: string) => {
    setPrintCounts(prev => ({
      ...prev,
      [itemId]: Math.max(1, (prev[itemId] || 1) - 1)
    }));
  };

  const handleIncreaseCount = (itemId: string) => {
    setPrintCounts(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 1) + 1
    }));
  };

  const handlePrintItem = (item: InventoryItem) => {
    const barcodeValue = item.shtrix_code || item.product_barcode || '';
    if (!barcodeValue) return;

    const count = printCounts[item.id] || item.quantity || 1;
    const barcodes = Array.from({ length: count }, () => ({
      value: barcodeValue,
      productName: item.product_name
    }));

    if (barcodes.length === 1) {
      const html = generateBarcodePrintHtml(barcodeValue);
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } else {
      const html = generateMultipleBarcodesPrintHtml(barcodes);
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    }
  };

  const handlePrintSelected = () => {
    if (!selectedInventory) return;

    const selectedBarcodes = selectedInventory.items
      .filter(item => selectedItems.has(item.id))
      .flatMap(item => {
        const barcodeValue = item.shtrix_code || item.product_barcode || '';
        if (!barcodeValue) return [];
        const count = printCounts[item.id] || item.quantity || 1;
        return Array.from({ length: count }, () => ({
          value: barcodeValue,
          productName: item.product_name
        }));
      });

    if (selectedBarcodes.length === 0) return;

    if (selectedBarcodes.length === 1) {
      const html = generateBarcodePrintHtml(selectedBarcodes[0].value);
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } else {
      const html = generateMultipleBarcodesPrintHtml(selectedBarcodes);
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    }
  };

  const handlePrintEntry = (inv: DisplayInventory) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const storeName = inv.store_name || inv.store_id;

    const rows = inv.items.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(item.product_name)}</td>
        <td>${escapeHtml(item.product_sku || item.product_barcode || '-')}</td>
        <td>${escapeHtml(item.purchase_price.toLocaleString('ru-RU'))}</td>
        <td>${escapeHtml(String(item.quantity))}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>${t('inventory.title')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 16px; }
  .header { font-size: 12px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 12px; }
  th { font-weight: bold; background: #fff; }
  td:first-child, th:first-child { width: 30px; text-align: center; }
  @media print { body { padding: 8px; } }
</style>
</head>
<body>
  <div class="header">${escapeHtml(dateStr)} ${escapeHtml(String(storeName))}</div>
  ${inv.note ? `<div class="header">${t('purchaseSession.note', 'Izoh')}: ${escapeHtml(inv.note)}</div>` : ''}
  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>${t('products.title')}</th>
        <th>${t('products.barcode')}</th>
        <th>${t('products.purchasePrice')}</th>
        <th>${t('sales.quantity')}</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
    }
  };

  const handlePayDebt = () => {
    if (!selectedInventory || !selectedInventory.debt) return;
    // Default: to'liq qarz naqd sifatida — foydalanuvchi kamaytirsa qisman to'lov bo'ladi
    setPayCash(String(selectedInventory.debt));
    setPayCard('');
    setShowPaymentDialog(true);
    // Kirim bo'limida ko'rinadigan to'lov turlari (scope: purchase + both)
    if (paymentCards.length === 0) {
      bankCardService
        .getAll({ is_active: true, scope: 'purchase' })
        .then(setPaymentCards)
        .catch(() => setPaymentCards([]));
    }
  };

  const paymentDebt = selectedInventory?.debt || 0;
  const payCashNum = Number(payCash) || 0;
  const payCardNum = Number(payCard) || 0;
  // Jami to'lov naqd + karta yig'indisidan hisoblanadi (tiyin darajasida — float xatosisiz)
  const paymentTotalNum = (Math.round(payCashNum * 100) + Math.round(payCardNum * 100)) / 100;
  const paymentExceedsDebt = Math.round(paymentTotalNum * 100) > Math.round(paymentDebt * 100);
  const paymentRemaining = Math.max(0, paymentDebt - paymentTotalNum);

  // Karta summasini bir nechta kartaga (Humo/Uzcard/...) taqsimlash
  const {
    cardSplits,
    activeSplits,
    splitsInvalid,
    updateSplitCard,
    updateSplitAmount,
    addCardSplit,
    removeCardSplit,
  } = useCardSplits(paymentCards, Math.round(payCardNum));

  const paymentInvalid = paymentTotalNum <= 0 || paymentExceedsDebt || splitsInvalid;

  const handleSubmitPayment = async () => {
    if (!selectedInventory || paymentInvalid) return;
    try {
      setPaying(true);
      // Split to'lovlar: naqd bitta qator + har bir karta alohida qator
      const paymentsPayload = [];
      if (payCashNum > 0) paymentsPayload.push({ type: 'cash' as const, amount: payCashNum.toFixed(2) });
      for (const split of activeSplits) {
        paymentsPayload.push({
          type: 'card' as const,
          amount: split.amount.toFixed(2),
          bank_card: Number(split.bankCardId),
        });
      }
      await supplierService.createPayment({
        supplier: parseInt(selectedInventory.supplier_id),
        entry: parseInt(selectedInventory.id),
        payments: paymentsPayload,
      });
      setShowPaymentDialog(false);
      setPayCash('');
      setPayCard('');

      // ─── Joyida yangilash: sahifa yangilashsiz, "Yuklanmoqda" holatisiz ───
      const paidNow = paymentTotalNum;
      const entryId = selectedInventory.id;
      // 1) Ro'yxatdagi qator: to'langan +, qarz −
      setInventory((prev) =>
        prev.map((row) =>
          row.id === entryId
            ? { ...row, paid: row.paid + paidNow, debt: Math.max(0, row.debt - paidNow) }
            : row,
        ),
      );
      // 2) Ochiq turgan tafsilot oynasidagi summalar ham darhol yangilanadi
      setSelectedInventory((prev) =>
        prev && prev.id === entryId
          ? { ...prev, paid: prev.paid + paidNow, debt: Math.max(0, prev.debt - paidNow) }
          : prev,
      );
      // 3) To'lovlar tarixida yangi to'lov ko'rinishi uchun qayta yuklaymiz
      inventoryService
        .getSupplierPayment(entryId)
        .then((res) => setPaymentHistory(Array.isArray(res) ? res : []))
        .catch(() => { /* tarix yangilanmasa ham asosiy summalar to'g'ri */ });
      // 4) Fonda server bilan sinxronlash — ro'yxat miltillamaydi
      void loadData(true);
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setPaying(false);
    }
  };

  const inventoryRows: DisplayInventoryRow[] = inventory.map((item, index) => ({
    ...item,
    rowNumber: index + 1,
  }));

  const columns: Column<DisplayInventoryRow>[] = [
    {
      key: 'rowNumber',
      header: '#',
      render: (item) => item.rowNumber,
    },
    {
      key: 'supplier_name',
      header: t('suppliers.title'),
      render: (item) => (
        <div className="min-w-0">
          <p>{item.supplier_name || item.supplier_id}</p>
          {item.note && (
            <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-muted-foreground" title={item.note}>
              📝 {item.note}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'store_name',
      header: t('stores.title'),
      render: (item) => item.store_name || item.store_id,
    },
    {
      key: 'total',
      header: t('common.total'),
      className: 'font-medium',
      render: (item) => formatCurrency(item.total),
    },
    {
      key: 'paid',
      header: t('inventory.paidAmount'),
      render: (item) => formatCurrency(item.paid),
    },
    {
      key: 'debt',
      header: t('suppliers.debt'),
      render: (item) => (
        <span className={item.debt > 0 ? 'text-red-600 dark:text-red-400' : ''}>
          {formatCurrency(item.debt)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: t('common.date'),
      render: (item) => formatDate(item.created_at),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          item.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
          item.status === 'in_progress' || item.status === 'pending'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
          {item.status === 'completed' ? t('common.completed') :
            item.status === 'in_progress' ? t('purchaseSession.inProgress', 'Jarayonda') :
            item.status === 'pending' ? t('common.pending') : t('common.cancelled')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('common.view', 'Ko‘rish')}
            onClick={(e) => {
              e.stopPropagation();
              void handleShowDetails(item);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={t('inventory.title')}
          description={t('inventory.listDescription')}
        />
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full sm:w-auto">
          <ExportButton
            direct
            endpoint="/contract/entry/export/"
            filename="xaridlar.xlsx"
            className="w-full sm:w-auto"
            params={{
              search: searchTerm || undefined,
              store: storeFilter && storeFilter !== 'all' ? storeFilter : undefined,
              supplier: supplierFilter && supplierFilter !== 'all' ? supplierFilter : undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            }}
          />
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowImportDialog(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {t('inventory.importFromExcel', 'Excel orqali kirim')}
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('inventory.createIncomingStock')}
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <Card className='border-none'>
        <CardContent className='p-4'>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>{t('common.search')}</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('placeholders.search')}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('suppliers.title')}</Label>
              <Select value={supplierFilter} onValueChange={(val) => { setSupplierFilter(val); setPage(1); }}>
                <SelectTrigger aria-label={t('placeholders.selectSupplier')}>
                  <SelectValue placeholder={t('placeholders.selectSupplier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {suppliers.map(sup => (
                    <SelectItem key={sup.id} value={String(sup.id)}>{sup.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.dateRange', 'Sana oralig‘i')}</Label>
              <div className="flex gap-2">
                <DateRangeFilter
                  from={dateFrom}
                  to={dateTo}
                  onChange={(newFrom, newTo) => {
                    setDateFrom(newFrom);
                    setDateTo(newTo);
                    setPage(1);
                  }}
                  className="flex-1"
                />
                {(searchTerm || storeFilter || supplierFilter || dateFrom || dateTo) && (
                  <Button variant="outline" size="icon" onClick={handleClearFilters} title={t('common.clear')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-base font-semibold">{t('inventory.history')}</h2>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('inventory.noData')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {inventory.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer overflow-hidden transition-colors hover:bg-accent/30"
                onClick={() => void handleShowDetails(item)}
              >
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold">{item.supplier_name || item.supplier_id}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.store_name || item.store_id}</p>
                      {item.note && (
                        <p className="mt-1 truncate text-xs text-muted-foreground" title={item.note}>
                          📝 {item.note}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${
                      item.status === 'completed' ? 'bg-green-100 text-green-800' :
                      item.status === 'in_progress' || item.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {item.status === 'completed' ? t('common.completed') :
                        item.status === 'in_progress' ? t('purchaseSession.inProgress', 'Jarayonda') :
                        item.status === 'pending' ? t('common.pending') : t('common.cancelled')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{t('common.total')}</p>
                      <p className="mt-1 font-semibold">{formatCurrency(item.total)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{t('inventory.paidAmount')}</p>
                      <p className="mt-1 font-semibold">{formatCurrency(item.paid)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{t('suppliers.debt')}</p>
                      <p className={`mt-1 font-semibold ${item.debt > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{formatCurrency(item.debt)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                      <p className="mt-1 font-semibold">{formatDate(item.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleShowDetails(item);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {t('common.view', 'Ko‘rish')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {totalCount > limit && (
              <div className="flex items-center justify-between mt-4 p-2 bg-card border rounded-lg">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> {t('common.previous')}
                </Button>
                <span className="text-sm font-medium">
                  {page} / {Math.ceil(totalCount / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * limit >= totalCount}
                  onClick={() => setPage(p => p + 1)}
                >
                  {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={inventoryRows}
              columns={columns}
              loading={loading}
              emptyMessage={t('inventory.noData')}
              loadingMessage={t('common.loading')}
              onRowClick={(item) => void handleShowDetails(item)}
              minWidth="980px"
              pagination={{
                page,
                limit,
                total: totalCount,
                onPageChange: setPage
              }}
            />
          </div>
        </>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl pb-6">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <div className="min-w-0">
                <DialogTitle>{t('inventory.detailsTitle')}</DialogTitle>
                <DialogDescription>
                  {formatDate(selectedInventory?.created_at || '')}
                </DialogDescription>
              </div>
              {selectedInventory && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintEntry(selectedInventory)}
                  className="flex shrink-0 items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Chop etish
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedInventory && (
            <div className="space-y-4 px-1 pb-1 overflow-y-auto max-h-[calc(90vh-7rem)]">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">{t('inventory.supplier')}:</span>
                  <span className="ml-2 font-medium">{selectedInventory.supplier_name || selectedInventory.supplier_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('inventory.store')}:</span>
                  <span className="ml-2 font-medium">{selectedInventory.store_name || selectedInventory.store_id}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground">{t('common.status')}:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    selectedInventory.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    selectedInventory.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {selectedInventory.status === 'completed' ? t('common.completed') :
                     selectedInventory.status === 'pending' ? t('common.pending') :
                     selectedInventory.status === 'cancelled' ? t('common.cancelled') :
                     selectedInventory.status}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('common.total')}:</span>
                  <span className="ml-2 font-medium">{formatCurrency(selectedInventory.total)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('inventory.paidAmount')}:</span>
                  <span className="ml-2 font-medium">{formatCurrency(selectedInventory.paid)}</span>
                </div>
                <div className={`col-span-1 sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2 p-3 mt-2 rounded-lg border ${
                  selectedInventory.debt > 0
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
                    : 'bg-green-50/50 dark:bg-green-950/10 border-green-100/50 dark:border-green-900/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${selectedInventory.debt > 0 ? 'text-red-800 dark:text-red-400' : 'text-green-800 dark:text-green-400'}`}>
                      {t('suppliers.debt')}:
                    </span>
                    <span className={`text-lg font-bold ${selectedInventory.debt > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(selectedInventory.debt)}
                    </span>
                  </div>
                  {selectedInventory.debt > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all duration-200 flex items-center gap-1.5"
                      onClick={handlePayDebt}
                    >
                      <CreditCard className="h-4 w-4" />
                      {t('customers.payNow')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Izoh (kirim yaratishda kiritilgan bo'lsa) */}
              {selectedInventory.note && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">{t('purchaseSession.note', 'Izoh')}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{selectedInventory.note}</p>
                </div>
              )}

              {selectedInventory.items && selectedInventory.items.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-sm font-semibold">{t('products.title')}</h4>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedInventory.items.every(item => selectedItems.has(item.id))}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {t('common.all')}
                      </label>
                      <Button variant="outline" size="sm" disabled={selectedItems.size === 0} onClick={handlePrintSelected}>
                        <Printer className="h-3.5 w-3.5 mr-1.5" />
                        {t('products.printBarcode')}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 md:hidden">
                    {selectedInventory.items.map((item, idx) => (
                      <Card key={idx}>
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedItems.has(item.id)}
                                onChange={() => handleSelectItem(item.id)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="mt-1 text-xs font-mono text-muted-foreground">{item.product_sku}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintItem(item)}
                              disabled={!item.shtrix_code && !item.product_barcode}
                              title={t('products.printBarcode')}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">{t('products.barcode')}</p>
                              <p className="mt-1 break-all font-mono text-xs">{item.product_barcode || '-'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">{t('products.sku')}</p>
                              <p className="mt-1 font-mono text-xs">{item.product_sku || '-'}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">{t('sales.quantity')}</p>
                              <p className="mt-1 font-semibold">{item.quantity}</p>
                            </div>

                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">{t('sales.price')}</p>
                              <p className="mt-1 font-semibold">{formatCurrency(item.purchase_price)}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">{t('sales.total')}</p>
                              <p className="mt-1 font-semibold">{formatCurrency(item.total)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="hidden rounded border md:block overflow-x-auto">
                    <Table className="min-w-[640px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              checked={selectedInventory.items.every(item => selectedItems.has(item.id))}
                              onChange={handleSelectAll}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </TableHead>
                          <TableHead>{t('products.title')}</TableHead>
                          <TableHead>{t('products.sku')}</TableHead>
                          <TableHead>{t('products.barcode')}</TableHead>
                          <TableHead>{t('sales.quantity')}</TableHead>

                          <TableHead>{t('sales.price')}</TableHead>
                          <TableHead>{t('sales.total')}</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInventory.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedItems.has(item.id)}
                                onChange={() => handleSelectItem(item.id)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{item.product_sku || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{item.product_barcode || '-'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.purchase_price)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrintItem(item)}
                                disabled={!item.shtrix_code && !item.product_barcode}
                                title={t('products.printBarcode')}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Payment History */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">{t('history.stockEntry')}</h4>
                {loadingPayments ? (
                  <div className="text-muted-foreground text-sm">{t('common.loading')}</div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-muted-foreground text-sm">{t('common.noData')}</div>
                ) : (
                  <div className="space-y-1.5">
                    {/* Bitta to'lov harakati (split: naqd + kartalar) — bitta blok,
                        qismlari ichida alohida ko'rinadi */}
                    {groupByPaymentGroup(paymentHistory).map((group) => {
                      const first = group[0];
                      const single = group.length === 1;
                      const isIntake = first.type === 'in';
                      const groupTotal = group.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                      return (
                        <div
                          key={first.id}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            isIntake ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/10' : 'bg-card'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              {isIntake ? (
                                <FileText className="h-4 w-4 shrink-0 text-amber-600" />
                              ) : single ? (
                                first.payment_method === 'card' ? (
                                  <CreditCard className="h-4 w-4 shrink-0 text-blue-500" />
                                ) : (
                                  <Banknote className="h-4 w-4 shrink-0 text-emerald-500" />
                                )
                              ) : (
                                <CreditCard className="h-4 w-4 shrink-0 text-violet-500" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {isIntake
                                    ? t('suppliers.debtRecorded', 'Qarzga yozildi')
                                    : single
                                      ? first.payment_method === 'card'
                                        ? first.bank_card_name || t('sales.card', 'Karta')
                                        : t('sales.cash', 'Naqd')
                                      : t('sales.mixedPayment', "Aralash to'lov")}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {first.created_at ? formatDate(first.created_at) : ''}
                                </p>
                              </div>
                            </div>
                            <span className={`shrink-0 font-semibold tabular-nums ${isIntake ? 'text-amber-600' : 'text-green-600'}`}>
                              {formatCurrency(groupTotal)}
                            </span>
                          </div>
                          {/* Qismlar: qaysi usuldan/kartadan qancha */}
                          {!single && (
                            <div className="ml-6 mt-1.5 space-y-1 border-l border-border/60 pl-3">
                              {group.map((p) => (
                                <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="flex min-w-0 items-center gap-1.5 truncate text-muted-foreground">
                                    {p.payment_method === 'card' ? (
                                      <CreditCard className="h-3 w-3 shrink-0" />
                                    ) : (
                                      <Banknote className="h-3 w-3 shrink-0" />
                                    )}
                                    {p.payment_method === 'card'
                                      ? p.bank_card_name || t('sales.card', 'Karta')
                                      : t('sales.cash', 'Naqd')}
                                  </span>
                                  <span className="shrink-0 tabular-nums">{formatCurrency(Number(p.amount) || 0)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className='pb-6'>
          <DialogHeader>
            <DialogTitle>{t('customers.debtPaymentTitle')}</DialogTitle>
            <DialogDescription>
              {t('inventory.payDebtDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">{t('dashboard.totalDebt')}</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(paymentDebt)}</p>
            </div>
            {/* Tez tanlov: jami summani bitta usulga o'tkazish */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('sales.paymentType', "To'lov usuli")}</label>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={() => {
                    setPayCash(String(paymentDebt));
                    setPayCard('');
                  }}
                >
                  {t('inventory.payFullDebt', "To'liq to'lash")} ({formatCurrency(paymentDebt)})
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={payCardNum === 0 && payCashNum > 0 ? 'default' : 'outline'}
                  onClick={() => {
                    setPayCash(String(paymentTotalNum > 0 ? paymentTotalNum : paymentDebt));
                    setPayCard('');
                  }}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  {t('sales.cash', 'Naqd')}
                </Button>
                <Button
                  type="button"
                  variant={payCashNum === 0 && payCardNum > 0 ? 'default' : 'outline'}
                  onClick={() => {
                    setPayCard(String(paymentTotalNum > 0 ? paymentTotalNum : paymentDebt));
                    setPayCash('');
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('sales.card', 'Karta')}
                </Button>
              </div>
            </div>

            {/* Naqd va karta summalari — jami to'lov shu yig'indidan hisoblanadi,
                qarzdan kam bo'lsa qisman to'lov bo'lib saqlanadi */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('sales.cash', 'Naqd')}</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={payCash}
                    onFocus={(e: FocusEvent<HTMLInputElement>) => e.target.select()}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPayCash(e.target.value)}
                    className={paymentExceedsDebt ? 'border-red-400 focus-visible:ring-red-400' : ''}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('sales.card', 'Karta')}</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={payCard}
                    onFocus={(e: FocusEvent<HTMLInputElement>) => e.target.select()}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPayCard(e.target.value)}
                    className={paymentExceedsDebt ? 'border-red-400 focus-visible:ring-red-400' : ''}
                  />
                </div>
              </div>

              {/* Karta ishlatilsa — summani kartalarga (Uzcard/Humo/...) taqsimlash */}
              {payCardNum > 0 && (
                <CardSplitEditor
                  bankCards={paymentCards}
                  cardSplits={cardSplits}
                  onUpdateCard={updateSplitCard}
                  onUpdateAmount={updateSplitAmount}
                  onAdd={addCardSplit}
                  onRemove={removeCardSplit}
                  disabled={paying}
                />
              )}
            </div>

            {/* Jami to'lov (naqd + karta) va qisman to'lovda qoladigan qarz */}
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('customers.paymentAmount', "To'lov summasi")}:</span>
                <span className="font-bold">{formatCurrency(paymentTotalNum)}</span>
              </div>
              {paymentExceedsDebt ? (
                <p className="text-xs font-medium text-red-500">
                  {t('inventory.paymentExceedsDebt', "To'lov summasi qoldiq qarzdan oshib ketdi")} —{' '}
                  {t('suppliers.debt', 'Qarz')}: {formatCurrency(paymentDebt)}
                </p>
              ) : paymentTotalNum > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t('inventory.remainingDebt', 'Qoladigan qarz')}:{' '}
                  <span className={paymentRemaining > 0 ? 'font-semibold text-red-500' : 'font-semibold text-green-600'}>
                    {formatCurrency(paymentRemaining)}
                  </span>
                  {paymentRemaining === 0 && ` — ${t('common.paid', "To'liq to'lanadi")}`}
                </p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={handleSubmitPayment} disabled={paying || paymentInvalid}>
                {paying ? t('common.loading') : t('customers.payNow')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showCreateDialog && (
        <Suspense fallback={null}>
          <StockEntryCreateDialog
            open={showCreateDialog}
            onOpenChange={(o: boolean) => {
              setShowCreateDialog(o);
              // Wizard qay holatda yopilmasin (tasdiqlangan, jarayonda qoldirilgan
              // yoki bekor qilingan) — ro'yxat avtomatik yangilanadi
              if (!o) void loadData();
            }}
          />
        </Suspense>
      )}

      {showImportDialog && (
        <Suspense fallback={null}>
          <StockEntryImportDialog
            open={showImportDialog}
            onOpenChange={(o: boolean) => {
              setShowImportDialog(o);
              if (!o) void loadData();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
