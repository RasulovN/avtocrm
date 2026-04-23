import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../app/store';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/Dialog';
import { Label } from '../../components/ui/Label';
import { productLocationService, type ProductLocation, type ProductLocationFormData } from '../../services/productLocationService';
import { latinToCyrillic } from '../../utils/transliteration';
import { formatDate } from '../../utils/index';

export function ProductLocationPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isSuperUser = Boolean(user?.is_superuser);
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ProductLocation | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<ProductLocationFormData>({
    location_uz: '',
    location_uz_cyrl: '',
    description_uz: '',
    description_uz_cyrl: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productLocationService.getAll();
      setLocations(data);
     } catch (error) {
       console.error('Failed to fetch locations:', error);
       toast.error(t('errors.generic'));
     } finally {
       setLoading(false);
     }
   }, [t]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleNameChange = (value: string) => {
    const cyrl = latinToCyrillic(value);
    setFormData((prev: ProductLocationFormData) => ({
      ...prev,
      location_uz: value,
      location_uz_cyrl: cyrl,
    }));
  };

  const handleDescriptionChange = (value: string) => {
    const cyrl = latinToCyrillic(value);
    setFormData((prev: ProductLocationFormData) => ({
      ...prev,
      description_uz: value,
      description_uz_cyrl: cyrl,
    }));
  };

  const handleOpenDialog = async (location?: ProductLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        location_uz: location.location_uz,
        location_uz_cyrl: location.location_uz_cyrl,
        description_uz: location.description_uz,
        description_uz_cyrl: location.description_uz_cyrl,
      });
    } else {
      setEditingLocation(null);
      setFormData({
        location_uz: '',
        location_uz_cyrl: '',
        description_uz: '',
        description_uz_cyrl: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLocation(null);
    setFormData({
      location_uz: '',
      location_uz_cyrl: '',
      description_uz: '',
      description_uz_cyrl: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_uz.trim()) return;

    try {
      setSaving(true);
       if (editingLocation) {
         await productLocationService.update(editingLocation.id, formData);
         toast.success(t('productLocations.locationUpdated') || 'Joylashuv yangilandi');
       } else {
         await productLocationService.create(formData);
         toast.success(t('productLocations.locationAdded') || 'Joylashuv qo\'shildi');
       }
      await fetchLocations();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save location:', error);
      toast.error(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

   const handleDelete = async () => {
      if (!deleteId) return;
      try {
        setDeleting(true);
        await productLocationService.delete(deleteId);
        toast.success(t('productLocations.locationDeleted'));
        await fetchLocations();
      } catch (error) {
        console.error('Failed to delete location:', error);
        toast.error(t('errors.generic'));
      } finally {
        setDeleting(false);
        setDeleteId(null);
        setIsConfirmOpen(false);
      }
    };

  const filteredLocations = locations.filter((location) =>
    location.location_uz.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<ProductLocation>[] = [
    {
      key: 'location_uz',
      header: t('productLocations.locationName'),
      className: 'font-medium',
      render: (item: ProductLocation) => item.location_uz,
    },
    {
      key: 'description_uz',
      header: t('common.description'),
      render: (item: ProductLocation) => item.description_uz,
    },
    {
      key: 'created_at',
      header: t('common.createdAt'),
      render: (item: ProductLocation) => formatDate(item.created_at || ''),
    },
  ];

  if (isSuperUser) {
    columns.push({
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item: ProductLocation) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleOpenDialog(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setDeleteId(item.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('productLocations.title')}
        actions={isSuperUser ? (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('productLocations.addLocation')}
          </Button>
        ) : undefined}
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('productLocations.searchPlaceholder')}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : filteredLocations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {t('productLocations.noLocations')}
            </CardContent>
          </Card>
        ) : (
          filteredLocations.map((location) => (
            <Card key={location.id}>
              <CardContent className="p-4 space-y-3">
                <div className="font-semibold">{location.location_uz}</div>
                <p className="text-sm text-muted-foreground">{location.description_uz}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(location.created_at || '')}
                </p>
                {isSuperUser && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenDialog(location)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setDeleteId(location.id); setIsConfirmOpen(true); }}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                       {t('common.delete')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <DataTable
          data={filteredLocations}
          columns={columns}
          loading={loading}
          emptyMessage={t('productLocations.noLocations')}
          loadingMessage={t('common.loading')}
          onRowClick={isSuperUser ? (item: ProductLocation) => handleOpenDialog(item) : undefined}
        />
      </div>

      {isSuperUser && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingLocation
                    ? t('productLocations.editLocation')
                    : t('productLocations.addLocation')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="location">{t('productLocations.locationName')}</Label>
                  <Input
                    id="location"
                    value={formData.location_uz}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                    required
                    placeholder="Joylashuv nomini kiriting"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_cyrl">{t('productLocations.locationNameCyrl')}</Label>
                  <Input
                    id="location_cyrl"
                    value={formData.location_uz_cyrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData((prev: ProductLocationFormData) => ({ 
                        ...prev, 
                        location_uz_cyrl: e.target.value 
                      }))
                    }
                    placeholder="Joylashuv nomini kirillcha kiriting"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t('common.description')}</Label>
                  <Input
                    id="description"
                    value={formData.description_uz}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleDescriptionChange(e.target.value)}
                    placeholder="Tavsifni kiriting"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_cyrl">{t('productLocations.descriptionCyrl')}</Label>
                  <Input
                    id="description_cyrl"
                    value={formData.description_uz_cyrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => 
                      setFormData((prev: ProductLocationFormData) => ({ 
                        ...prev, 
                        description_uz_cyrl: e.target.value 
                      }))
                    }
                    placeholder="Tavsifni kirillcha kiriting"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={saving || !formData.location_uz.trim()}>
                  {saving ? t('common.saving') : t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t('productLocations.deleteLocation')}
        description={t('productLocations.confirmDelete')}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

