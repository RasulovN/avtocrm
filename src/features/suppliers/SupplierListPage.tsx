import { useEffect, useState, useCallback, type ChangeEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Phone, Mail, MapPin, CheckCircle2, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { ExportButton } from '../../components/shared/ExportButton';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { supplierService } from '../../services/supplierService';
import type { Supplier, SupplierFormData } from '../../types';
import { latinToCyrillic, cyrillicToLatin } from '../../utils/transliteration';
import { formatCurrency } from '../../utils';
import { handleError } from '../../utils/errorHandler';
import {
  maskUzPhoneInput,
  normalizeUzPhone,
  isCompleteUzPhone,
  PHONE_INPUT_MAX_LENGTH,
} from '../../utils/phone';

// interface SupplierPayment {
//   id: number;
//   amount: string;
//   type: 'cash' | 'card';
//   note?: string;
//   created_at: string;
// }

export function SupplierListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const lang = params.lang || 'uz';
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Ro'yxat filtrlari — jadvalga ham, eksportga ham birdek qo'llanadi
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [orderingFilter, setOrderingFilter] = useState('name');
  const [debtFilter, setDebtFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({
    name_uz: '',
    name_uz_cyrl: '',
    description_uz: '',
    description_uz_cyrl: '',
    address_uz: '',
    address_uz_cyrl: '',
    phone_number: '',
    inn: '',
  });
  const [saving, setSaving] = useState(false);
  // Saqlashga urinishdan keyin bo'sh majburiy maydonlar qizil ko'rsatiladi
  const [showErrors, setShowErrors] = useState(false);

  // Lotin ↔ kirill ikki tomonlama sinxron: qaysi maydonga yozilsa,
  // ikkinchisi avtomatik transliteratsiya qilinadi.
  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name_uz: value,
      name_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleNameCyrlChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name_uz_cyrl: value,
      name_uz: cyrillicToLatin(value),
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description_uz: value,
      description_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleDescriptionCyrlChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description_uz_cyrl: value,
      description_uz: cyrillicToLatin(value),
    }));
  };

  const handleAddressChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      address_uz: value,
      address_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleAddressCyrlChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      address_uz_cyrl: value,
      address_uz: cyrillicToLatin(value),
    }));
  };

  const nameMissing = !formData.name_uz.trim() && !formData.name_uz_cyrl.trim();
  const phoneMissing = !formData.phone_number.trim();

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await supplierService.getAll({
        page,
        limit,
        search: debouncedSearch || undefined,
        ordering: orderingFilter !== 'name' ? orderingFilter : undefined,
        has_debt: debtFilter === 'true' ? 'true' : undefined,
      });
      setSuppliers(response.data);
      setTotal(response.total);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: true, logData: 'Failed to load suppliers' });
      setTotal(2);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, orderingFilter, debtFilter]);

  // Qidiruv debounce: yozish tugagach 400ms kutib, 1-sahifadan qayta yuklaymiz
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (typeof s.debt === 'number' ? s.debt : 0), 0);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await supplierService.delete(deleteId);
      toast.success(t('suppliers.supplierDeleted', "Ta'minotchi muvaffaqiyatli o'chirildi"));
      loadSuppliers();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleOpenDialog = async (supplier?: Supplier) => {
    setShowErrors(false);
    if (supplier) {
      setEditingSupplier(supplier);
      setDialogOpen(true);
      try {
        const fresh = await supplierService.getById(supplier.id);
        setEditingSupplier(fresh);
        setFormData({
          name_uz: fresh.name_uz || fresh.name || '',
          name_uz_cyrl: fresh.name_uz_cyrl || '',
          description_uz: fresh.description_uz || fresh.description || '',
          description_uz_cyrl: fresh.description_uz_cyrl || '',
          address_uz: fresh.address_uz || fresh.address || '',
          address_uz_cyrl: fresh.address_uz_cyrl || '',
          phone_number: maskUzPhoneInput(fresh.phone_number || fresh.phone || ''),
          inn: fresh.inn || '',
        });
      } catch (error) {
        const axiosErr = error as { response?: { status?: number } };
        if (axiosErr.response?.status === 401) return;
        handleError(error, { showToast: true, logData: 'Failed to load supplier' });
        setFormData({
          name_uz: supplier.name_uz || supplier.name || '',
          name_uz_cyrl: supplier.name_uz_cyrl || '',
          description_uz: supplier.description_uz || supplier.description || '',
          description_uz_cyrl: supplier.description_uz_cyrl || '',
          address_uz: supplier.address_uz || supplier.address || '',
          address_uz_cyrl: supplier.address_uz_cyrl || '',
          phone_number: maskUzPhoneInput(supplier.phone_number || supplier.phone || ''),
          inn: supplier.inn || '',
        });
      }
    } else {
      setEditingSupplier(null);
      setFormData({
        name_uz: '',
        name_uz_cyrl: '',
        description_uz: '',
        description_uz_cyrl: '',
        address_uz: '',
        address_uz_cyrl: '',
        phone_number: '',
        inn: '',
      });
      setDialogOpen(true);
    }
  };

  const handleSave = async () => {
    if (nameMissing || phoneMissing) {
      setShowErrors(true);
      toast.error(t('suppliers.fillRequired', 'Majburiy (*) maydonlarni to‘ldiring'));
      return;
    }
    if (!isCompleteUzPhone(formData.phone_number)) {
      setShowErrors(true);
      toast.error(t('auth.phoneInvalid', "Telefon raqam to'liq emas (masalan: +998 90 123 45 67)"));
      return;
    }

    try {
      setSaving(true);
      // Serverga tekis format yuboriladi: +998XXXXXXXXX
      const payload = { ...formData, phone_number: normalizeUzPhone(formData.phone_number) };
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, payload);
        toast.success(t('suppliers.supplierUpdated', "Ta'minotchi muvaffaqiyatli yangilandi"));
      } else {
        await supplierService.create(payload);
        toast.success(t('suppliers.supplierAdded', "Ta'minotchi muvaffaqiyatli qo'shildi"));
      }
      setDialogOpen(false);
      loadSuppliers();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'name_inn',
      header: t('suppliers.supplierName', 'Yetkazib beruvchi'),
      render: (item: Supplier) => (
        <div>
          <div className="font-semibold text-foreground">{item.name_uz || item.name || '-'}</div>
          <div className="text-xs text-muted-foreground mt-0.5">INN: {item.inn || '-'}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: t('suppliers.contact', 'Aloqa'),
      render: (item: Supplier) => (
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{item.phone_number || item.phone || '-'}</span>
          </div>
          {item.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span>{item.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-50">{item.address_uz || item.address || '-'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'total_purchases',
      header: t('suppliers.totalPurchases', 'Jami xaridlar'),
      render: (item: Supplier) => {
        const total = typeof item.total_purchase_amount !== 'undefined' ? Number(item.total_purchase_amount) : ((item as any).total_purchases || 0);
        if (total === 0) return <span className="text-muted-foreground">—</span>;
        return <span className="font-semibold">{formatCurrency(total)}</span>;
      },
    },
    {
      key: 'debt',
      header: t('suppliers.debt', 'Qarz'),
      render: (item: Supplier) => {
        const debt = typeof item.debt === 'number' ? item.debt : Number(item.debt) || 0;
        if (debt <= 0) {
          return (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 dark:border-green-900/30 dark:bg-green-900/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              To'landi
            </div>
          );
        }
        return (
          <div className="inline-flex items-center rounded bg-orange-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            {formatCurrency(debt)}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: t('common.actions', 'Amallar'),
      className: 'text-right',
      render: (item: Supplier) => (
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-blue-500"
            aria-label={t('common.edit', 'Tahrirlash')}
            onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleOpenDialog(item); }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-red-500"
            aria-label={t('common.delete', "O'chirish")}
            onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setDeleteId(item.id); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('suppliers.title')}
        description={t('suppliers.title')}
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton
              direct
              endpoint="/contract/supplier/export/"
              filename="taminotchilar.xlsx"
              params={{
                search: debouncedSearch || undefined,
                ordering: orderingFilter !== 'name' ? orderingFilter : undefined,
                has_debt: debtFilter === 'true' ? 'true' : undefined,
              }}
            />
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('suppliers.addSupplier')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('dashboard.totalSuppliers', 'Таъминотчилар сони')}</p>
          <p className="text-2xl font-bold">{suppliers.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('suppliers.totalPurchases', 'Jami xaridlar')}</p>
          <p className="text-2xl font-bold">{formatCurrency(suppliers.reduce((sum, s) => sum + (typeof s.total_purchase_amount !== 'undefined' ? Number(s.total_purchase_amount) : (Number((s as any).total_purchases) || 0)), 0))}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('dashboard.totalDebt', 'Жами қарздорлик')}</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalSupplierDebt)}</p>
        </div>
      </div>

      {/* Filtrlar — ro'yxatga ham, eksportga ham birdek qo'llanadi */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('suppliers.searchPlaceholder', 'Nomi, telefon yoki INN bo‘yicha qidirish...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={orderingFilter}
          onValueChange={(value) => {
            setOrderingFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-64" aria-label={t('export.sortBy', 'Saralash')}>
            <SelectValue placeholder={t('export.sortBy', 'Saralash')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{t('export.byName', 'Nomi bo‘yicha')}</SelectItem>
            <SelectItem value="-total_purchase_amount">{t('export.byTopPurchases', 'Eng ko‘p xarid qilinganlar')}</SelectItem>
            <SelectItem value="-total_debt">{t('export.byTopDebt', 'Eng katta qarz')}</SelectItem>
            <SelectItem value="-created_at">{t('export.byNewest', 'Eng yangilari')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={debtFilter}
          onValueChange={(value) => {
            setDebtFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label={t('suppliers.debt', 'Qarz')}>
            <SelectValue placeholder={t('suppliers.debt', 'Qarz')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('export.all', 'Hammasi')}</SelectItem>
            <SelectItem value="true">{t('export.onlyDebtors', 'Faqat qarzdorlar')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {suppliers.length > 0 && (
        <div className="space-y-3 md:hidden">
          {suppliers.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">#{index + 1}</p>
                  <p className="font-semibold text-foreground break-words">{item.name_uz || item.name || '-'}</p>
                  <p className="mt-1 text-sm text-muted-foreground break-words">{item.description_uz || item.description || '-'}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">ID: {item.id}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{t('suppliers.phone')}</p>
                  <p className="mt-1 font-medium">{item.phone_number || item.phone || '-'}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{t('suppliers.inn')}</p>
                  <p className="mt-1 font-medium">{item.inn || '-'}</p>
                </div>
                <div className="col-span-2 rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{t('suppliers.address')}</p>
                  <p className="mt-1 font-medium">{item.address_uz || item.address || '-'}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="col-span-2 w-full"
                  onClick={() => navigate(`/${lang}/suppliers/${item.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleOpenDialog(item)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setDeleteId(item.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="hidden md:block">
        <DataTable
          data={suppliers}
          columns={columns}
          loading={loading}
          onRowClick={(item) => navigate(`/${lang}/suppliers/${item.id}`)}
          pagination={{ page, limit, total, onPageChange: setPage }}
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        description={t('suppliers.supplierDeleted')}
        confirmText={t('common.delete')}
        variant="destructive"
        loading={deleting}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  {t('suppliers.supplierName')} (lotin) <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                  minLength={2}
                  maxLength={255}
                  className={showErrors && nameMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('suppliers.supplierName')} (kirill) <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameCyrlChange(e.target.value)}
                  maxLength={255}
                  className={showErrors && nameMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
              </div>
            </div>
            {showErrors && nameMissing && (
              <p className="-mt-2 text-xs text-red-600">
                {t('suppliers.supplierNameRequired', 'Yetkazib beruvchi nomi kiritilishi shart!')}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('common.description')} (lotin)</Label>
                <Input
                  value={formData.description_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleDescriptionChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('common.description')} (kirill)</Label>
                <Input
                  value={formData.description_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleDescriptionCyrlChange(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  {t('suppliers.phone')} <span className="text-red-500">*</span>
                </Label>
                {/* Faqat raqam, +998 XX XXX XX XX formatida — harflar yozib bo'lmaydi */}
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="+998 90 123 45 67"
                  value={formData.phone_number}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, phone_number: maskUzPhoneInput(e.target.value) })
                  }
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  className={showErrors && phoneMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {showErrors && phoneMissing && (
                  <p className="text-xs text-red-600">
                    {t('suppliers.phoneRequired', 'Telefon raqami kiritilishi shart!')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  {t('suppliers.inn')}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({t('common.optional', 'ixtiyoriy')})
                  </span>
                </Label>
                <Input
                  inputMode="numeric"
                  value={formData.inn}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, inn: e.target.value.replace(/\D/g, '').slice(0, 50) })
                  }
                  maxLength={50}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('suppliers.address')} (lotin)</Label>
                <Input
                  value={formData.address_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleAddressChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('suppliers.address')} (kirill)</Label>
                <Input
                  value={formData.address_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleAddressCyrlChange(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
