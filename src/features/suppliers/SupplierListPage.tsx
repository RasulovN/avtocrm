import { useEffect, useState, useCallback, type ChangeEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2 } from 'lucide-react';
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
      console.error('Failed to load suppliers:', error);
      setTotal(2);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await supplierService.delete(deleteId);
      loadSuppliers();
    } catch (error) {
      console.error('Failed to delete supplier:', error);
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
        console.error('Failed to load supplier:', error);
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
    try {
      setSaving(true);
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, formData);
      } else {
        await supplierService.create(formData);
      }
      setDialogOpen(false);
      loadSuppliers();
    } catch (error) {
      console.error('Failed to save supplier:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Supplier>[] = [
    { key: 'name', header: t('suppliers.supplierName') },
    { key: 'inn', header: t('suppliers.inn') },
    {
      key: 'phone',
      header: t('suppliers.phone'),
      render: (item: Supplier) => item.phone_number || item.phone || '-',
    },
    { key: 'address', header: t('suppliers.address') },
    {
      key: 'description',
      header: t('common.description'),
      render: (item: Supplier) => item.description ?? item.description_uz ?? '-',
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item: Supplier) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleOpenDialog(item); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setDeleteId(item.id); }}>
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
