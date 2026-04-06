import { useEffect, useState, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { latinToCyrillic } from 'uzbek-transliterator';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/Dialog';
import { Label } from '../../components/ui/Label';
import { categoryService } from '../../services/categoryService';
import type { Category, CategoryFormData } from '../../types';

export function CategoryListPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name_uz: '',
    name_uz_cyrl: '',
    description_uz: '',
    description_uz_cyrl: '',
    image: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

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

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setFormData((prev) => ({
      ...prev,
      image: file,
    }));
  };

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleOpenDialog = (category?: Category) => {
    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    if (category) {
      setEditingCategory(category);
      const nameValue = category.name || '';
      const descriptionValue = category.description || '';
      setFormData({
        name_uz: nameValue,
        name_uz_cyrl: latinToCyrillic(nameValue),
        description_uz: descriptionValue,
        description_uz_cyrl: latinToCyrillic(descriptionValue),
        image: category.image || '',
      });
      setImagePreview(category.image || '');
    } else {
      setEditingCategory(null);
      setFormData({
        name_uz: '',
        name_uz_cyrl: '',
        description_uz: '',
        description_uz_cyrl: '',
        image: null,
      });
      setImagePreview('');
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name_uz: '',
      name_uz_cyrl: '',
      description_uz: '',
      description_uz_cyrl: '',
      image: null,
    });
    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      if (editingCategory) {
        await categoryService.update(editingCategory.id, formData);
        toast.success(t('categories.categoryUpdated'));
      } else {
        await categoryService.create(formData);
        toast.success(t('categories.categoryAdded'));
      }
      await loadCategories();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    try {
      setDeleting(true);
      await categoryService.delete(id);
      toast.success(t('categories.categoryDeleted'));
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<Category>[] = [
    {
      key: 'image',
      header: 'Image',
      render: (item: Category) =>
        item.image ? (
          <img
            src={item.image}
            alt={item.name || 'Category image'}
            className="h-10 w-10 rounded-md object-cover"
          />
        ) : (
          '-'
        ),
    },
    {
      key: 'name',
      header: t('common.name'),
      className: 'font-medium',
    },
    {
      key: 'description',
      header: t('common.description'),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item: Category) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              handleOpenDialog(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setDeleteId(item.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('categories.title')}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('categories.addCategory')}
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable
        data={filteredCategories}
        columns={columns}
        loading={loading}
        emptyMessage={t('categories.noCategories')}
        loadingMessage={t('common.loading')}
        onRowClick={(item: Category) => handleOpenDialog(item)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title={t('common.delete')}
        description={t('categories.categoryDeleted')}
        confirmText={t('common.delete')}
        variant="destructive"
        loading={deleting}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? t('categories.editCategory')
                : t('categories.addCategory')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('categories.categoryName')}</Label>
                <Input
                  id="name"
                  value={formData.name_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_cyrl">{t('categories.categoryName')} (Cyrillic)</Label>
                <Input
                  id="name_cyrl"
                  value={formData.name_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, name_uz_cyrl: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('common.description')}</Label>
                <Input
                  id="description"
                  value={formData.description_uz}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleDescriptionChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description_cyrl">{t('common.description')} (Cyrillic)</Label>
                <Input
                  id="description_cyrl"
                  value={formData.description_uz_cyrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, description_uz_cyrl: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">{t('products.image') || 'Image'}</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview ? (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt={formData.name_uz || 'Category image'}
                      className="h-24 w-24 rounded-md object-cover border"
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
