import { useEffect, useState, useCallback, type ChangeEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { supplierService } from '../../services/supplierService';
import type { Supplier, SupplierFormData } from '../../types';
import { latinToCyrillic } from '../../utils/transliteration';
import { formatCurrency } from '../../utils';
import { handleError } from '../../utils/errorHandler';

// interface SupplierPayment {
//   id: number;
//   amount: string;
//   type: 'cash' | 'card';
//   note?: string;
//   created_at: string;
// }

export function SupplierListPage() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name_uz: value,
      name_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description_uz: value,
      description_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleAddressChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      address_uz: value,
      address_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await supplierService.getAll({ page, limit });
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
  }, [page]);

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
          phone_number: fresh.phone_number || fresh.phone || '',
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
          phone_number: supplier.phone_number || supplier.phone || '',
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
    if (!formData.name_uz.trim()) {
      toast.error(t('suppliers.supplierNameRequired', 'Yetkazib beruvchi nomi kiritilishi shart!'));
      return;
    }

    try {
      setSaving(true);
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, formData);
        toast.success(t('suppliers.supplierUpdated', "Ta'minotchi muvaffaqiyatli yangilandi"));
      } else {
        await supplierService.create(formData);
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
            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:border-green-900/30 dark:bg-green-900/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              To'landi
            </div>
          );
        }
        return (
          <div className="inline-flex items-center rounded bg-[#ff6b00] px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
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
            onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleOpenDialog(item); }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-red-500" 
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
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('suppliers.addSupplier')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {suppliers.length > 0 && (
        <div className="space-y-3 md:hidden">
          {suppliers.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">#{index + 1}</p>
                  <p className="font-semibold text-foreground">{item.name_uz || item.name || '-'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description_uz || item.description || '-'}</p>
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

              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleOpenDialog(item)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setDeleteId(item.id)}>
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
            <div className="space-y-2">
              <Label>{t('suppliers.supplierName')}</Label>
              <Input
                value={formData.name_uz}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('suppliers.supplierName')} (Cyrillic)</Label>
              <Input
                value={formData.name_uz_cyrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name_uz_cyrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input
                value={formData.description_uz}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleDescriptionChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')} (Cyrillic)</Label>
              <Input
                value={formData.description_uz_cyrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description_uz_cyrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('suppliers.phone')}</Label>
              <Input
                value={formData.phone_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t('suppliers.inn')}</Label>
              <Input
                value={formData.inn}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, inn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('suppliers.address')}</Label>
              <Input
                value={formData.address_uz}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleAddressChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('suppliers.address')} (Cyrillic)</Label>
              <Input
                value={formData.address_uz_cyrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address_uz_cyrl: e.target.value })}
              />
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
