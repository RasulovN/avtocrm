import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../components/ui/DropdownMenu';
import { exportService } from '../../services/exportService';
import { handleError } from '../../utils/errorHandler';

interface ReportExportMenuProps {
  filter: string;
  storeId: string;
  from?: string;
  to?: string;
}

/**
 * Hisobotlarni bo'limlab yuklab olish menyusi.
 * Joriy filtrlar (davr/do'kon/sana) barcha yuklamalarga bir xil qo'llanadi:
 *   - To'liq hisobot — barcha varaqlar (dashboard bilan)
 *   - Bo'limlar — /reports/export/?section=... (faqat shu bo'lim varag'i)
 *   - To'liq ro'yxatlar — tegishli modul eksportlari (mahsulotlar, sotuvlar,
 *     mijozlar, ta'minotchilar) o'z filtrlariga moslangan holda
 */
export function ReportExportMenu({ filter, storeId, from, to }: ReportExportMenuProps) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const reportParams = {
    filter,
    store_id: storeId,
    from: from || undefined,
    to: to || undefined,
  };
  // Modul eksportlari (sotuvlar, mahsulotlar, ...) boshqa param nomlarini ishlatadi
  const storeParam = storeId && storeId !== 'all' ? storeId : undefined;

  const download = async (
    endpoint: string,
    params: Record<string, string | undefined>,
    filename: string,
  ) => {
    if (downloading) return;
    try {
      setDownloading(true);
      await exportService.downloadExcel(endpoint, params, filename);
      toast.success(t('export.success', 'Fayl yuklab olindi'));
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Report export failed' });
    } finally {
      setDownloading(false);
    }
  };

  const sectionItems: Array<{ key: string; label: string }> = [
    { key: 'top_products', label: t('reports.topProducts', "Ko'p sotilgan mahsulotlar") },
    { key: 'branches', label: t('reports.branches', 'Filiallar kesimi') },
    { key: 'categories', label: t('reports.categories', 'Kategoriyalar kesimi') },
    { key: 'payments', label: t('reports.payments', "To'lov usullari") },
    { key: 'cards', label: t('reports.cardBreakdown', 'Kartalar kesimi') },
    { key: 'expenses', label: t('reports.expenses', 'Chiqimlar') },
    { key: 'customer_debts', label: t('reports.customerDebts', 'Qarzdorlar (mijozlar)') },
    { key: 'supplier_debts', label: t('reports.supplierDebts', "Ta'minotchi qarzlari") },
  ];

  const listItems: Array<{ label: string; endpoint: string; params: Record<string, string | undefined>; filename: string }> = [
    {
      label: t('reports.allProductsList', "Mahsulotlar ro'yxati (to'liq)"),
      endpoint: '/products/export/',
      params: { store_id: storeParam },
      filename: 'mahsulotlar.xlsx',
    },
    {
      label: t('reports.salesList', "Sotuvlar ro'yxati"),
      endpoint: '/sales/export/',
      params: { store: storeParam, date_from: from || undefined, date_to: to || undefined },
      filename: 'sotuvlar.xlsx',
    },
    {
      label: t('reports.customersList', "Mijozlar ro'yxati (to'liq)"),
      endpoint: '/users/customers/export/',
      params: {},
      filename: 'mijozlar.xlsx',
    },
    {
      label: t('reports.suppliersList', "Ta'minotchilar ro'yxati (to'liq)"),
      endpoint: '/contract/supplier/export/',
      params: {},
      filename: 'taminotchilar.xlsx',
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={downloading}>
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          {t('export.download', 'Yuklab olish')}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => void download('/reports/export/', reportParams, 'hisobot.xlsx')}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
          {t('reports.fullReport', "To'liq hisobot (barcha bo'limlar)")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('reports.bySection', "Bo'limlar (joriy filtr bilan)")}
        </DropdownMenuLabel>
        {sectionItems.map((item) => (
          <DropdownMenuItem
            key={item.key}
            onClick={() =>
              void download(
                '/reports/export/',
                { ...reportParams, section: item.key },
                `hisobot_${item.key}.xlsx`,
              )
            }
          >
            {item.label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('reports.fullLists', "To'liq ro'yxatlar")}
        </DropdownMenuLabel>
        {listItems.map((item) => (
          <DropdownMenuItem
            key={item.endpoint}
            onClick={() => void download(item.endpoint, item.params, item.filename)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
