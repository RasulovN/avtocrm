import { useEffect, useState, useCallback, useRef, type ChangeEvent, type MouseEvent } from 'react';
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
    phone_number: '',
    type: 's',
    latitude: '',
    longitude: '',
    is_warehouse: false,
  });
  const [saving, setSaving] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);

  const loadStores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await storeService.getAll({ page, limit });
      setStores(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load stores:', error);
      setTotal(2);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

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
        phone: store.phone_number || store.phone || '',
        phone_number: store.phone_number || store.phone || '',
        type: store.type || (store.is_warehouse ? 'w' : 's'),
        latitude: store.latitude || '',
        longitude: store.longitude || '',
        is_warehouse: store.is_warehouse,
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        phone_number: '',
        type: 's',
        latitude: '',
        longitude: '',
        is_warehouse: false,
      });
    }
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen) {
      mapRef.current?.destroy?.();
      mapRef.current = null;
      placemarkRef.current = null;
      return;
    }

    const apiKey = (import.meta as any).env?.VITE_YANDEX_MAPS_API_KEY as string | undefined;
    const src = apiKey
      ? `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${apiKey}`
      : 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';

    const loadYmaps = () => new Promise<void>((resolve, reject) => {
      if ((window as any).ymaps) {
        resolve();
        return;
      }
      const existing = document.getElementById('ymaps-script') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Yandex Maps failed to load')));
        return;
      }
      const script = document.createElement('script');
      script.id = 'ymaps-script';
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Yandex Maps failed to load'));
      document.body.appendChild(script);
    });

    let cancelled = false;
    void loadYmaps()
      .then(() => {
        if (cancelled) return;
        (window as any).ymaps.ready(() => {
          if (cancelled) return;
          if (!mapContainerRef.current) return;
          if (!mapRef.current) {
            const lat = Number(formData.latitude) || 41.311081;
            const lng = Number(formData.longitude) || 69.240562;
            mapRef.current = new (window as any).ymaps.Map(mapContainerRef.current, {
              center: [lat, lng],
              zoom: 12,
              controls: ['zoomControl', 'searchControl'],
            });
            mapRef.current.events.add('click', (e: any) => {
              const coords = e.get('coords') as number[];
              setFormData((prev) => ({
                ...prev,
                latitude: coords[0].toFixed(6),
                longitude: coords[1].toFixed(6),
              }));
            });
          }
        });
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, [dialogOpen]);

  useEffect(() => {
    const ymaps = (window as any).ymaps;
    if (!ymaps || !mapRef.current) return;
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng) || !formData.latitude || !formData.longitude) return;

    if (!placemarkRef.current) {
      placemarkRef.current = new ymaps.Placemark([lat, lng], {}, { draggable: true });
      placemarkRef.current.events.add('dragend', () => {
        const coords = placemarkRef.current.geometry.getCoordinates() as number[];
        setFormData((prev) => ({
          ...prev,
          latitude: coords[0].toFixed(6),
          longitude: coords[1].toFixed(6),
        }));
      });
      mapRef.current.geoObjects.add(placemarkRef.current);
    } else {
      placemarkRef.current.geometry.setCoordinates([lat, lng]);
    }
    mapRef.current.setCenter([lat, lng], mapRef.current.getZoom(), { duration: 200 });
  }, [formData.latitude, formData.longitude]);

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
    {
      key: 'phone',
      header: t('stores.phone'),
      render: (item: Store) => item.phone_number || item.phone || '-',
    },
    {
      key: 'is_warehouse',
      header: t('stores.type'),
      render: (item: Store) => {
        if (item.type === 'b') return t('stores.base');
        if (item.type === 's') return t('stores.store');
        return item.is_warehouse ? t('stores.warehouse') : t('stores.store');
      },
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
              <Label>{t('stores.phone')}</Label>
              <Input
                value={formData.phone_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, phone_number: e.target.value, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t('stores.type')}</Label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={formData.type || 's'}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, type: e.target.value, is_warehouse: false })
                }
              >
                <option value="s">{t('stores.store')}</option>
                <option value="b">{t('stores.base')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('stores.address')}</Label>
              <Input value={formData.address} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('stores.map')}</Label>
              <div ref={mapContainerRef} className="h-60 w-full rounded-md border" />
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
