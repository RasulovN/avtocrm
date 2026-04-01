import { useEffect, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { storeService } from '../../services/storeService';
import type { Store, StoreFormData } from '../../types';
import { formatDate } from '../../utils';

export function StoreListPage() {
  const { t } = useTranslation();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    address: '',
    phone: '',
    is_warehouse: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStores();
  }, [page]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await storeService.getAll({ page, limit });
      setStores(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load stores:', error);
      setStores([
        { id: '1', name: 'Main Store', address: 'Tashkent', phone: '+998901234567', is_warehouse: false, created_at: new Date().toISOString() },
        { id: '2', name: 'Warehouse', address: 'Tashkent', phone: '+998901234568', is_warehouse: true, created_at: new Date().toISOString() },
      ]);
      setTotal(2);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await storeService.delete(deleteId);
      loadStores();
    } catch (error) {
      console.error('Failed to delete store:', error);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleOpenDialog = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        address: store.address || '',
        phone: store.phone || '',
        is_warehouse: store.is_warehouse,
      });
    } else {
      setEditingStore(null);
      setFormData({ name: '', address: '', phone: '', is_warehouse: false });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingStore) {
        await storeService.update(editingStore.id, formData);
      } else {
        await storeService.create(formData);
      }
      setDialogOpen(false);
      loadStores();
    } catch (error) {
      console.error('Failed to save store:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Store>[] = [
    { key: 'name', header: t('stores.storeName') },
    { key: 'address', header: t('stores.address') },
    { key: 'phone', header: t('stores.phone') },
    {
      key: 'is_warehouse',
      header: t('stores.type'),
      render: (item: Store) => item.is_warehouse ? t('stores.warehouse') : t('stores.store'),
    },
    {
      key: 'created_at',
      header: t('common.createdAt'),
      render: (item: Store) => formatDate(item.created_at),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item: Store) => (
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
        title={t('stores.title')}
        description={t('stores.title')}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('stores.addStore')}
          </Button>
        }
      />

      <DataTable
        data={stores}
        columns={columns}
        loading={loading}
        pagination={{ page, limit, total, onPageChange: setPage }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        description={t('stores.storeDeleted')}
        confirmText={t('common.delete')}
        variant="destructive"
        loading={deleting}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStore ? t('stores.editStore') : t('stores.addStore')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('stores.storeName')}</Label>
              <Input value={formData.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('stores.address')}</Label>
              <Input value={formData.address} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('stores.phone')}</Label>
              <Input value={formData.phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.is_warehouse} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_warehouse: e.target.checked })} />
                {t('stores.isWarehouse')}
              </Label>
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
