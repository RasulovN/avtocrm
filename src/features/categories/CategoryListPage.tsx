import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleError } from '../../utils/errorHandler';
import { useAuthStore } from '../../app/store';
import { PageHeader } from '../../components/shared/PageHeader';
import { ExportButton } from '../../components/shared/ExportButton';
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
import { useEffect, useCallback } from 'react';
import { categoryService } from '../../services/categoryService';
import { useCategories } from '../../context/CategoryContext';
import { latinToCyrillic } from '../../utils/transliteration';
import type { Category, CategoryFormData } from '../../types';

export function CategoryListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isSuperUser = Boolean(user?.is_superuser || user?.role === 'superuser');
  const { refreshCategories } = useCategories();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [localLoadingCategory, setLocalLoadingCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageFileName, setImageFileName] = useState('');
  const [formData, setFormData] = useState<CategoryFormData>({
    name_uz: '',
    name_uz_cyrl: '',
    description_uz: '',
    description_uz_cyrl: '',
    image: '',
  });
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAll({
        page,
        limit,
        search: debouncedSearch,
      });
      setCategories(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Failed to load categories' });
      toast.error(t('errors.generic') || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, t]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

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

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setFormData((prev) => ({
        ...prev,
        image: file,
      }));
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenDialog = async (category?: Category) => {
    if (category) {
      setIsDialogOpen(true);
      setEditingCategory(category);
      setLocalLoadingCategory(true);
      try {
        const fresh = await categoryService.getById(category.id);
        const nameValue = fresh.name_uz ?? fresh.name ?? '';
        const descriptionValue = fresh.description_uz ?? fresh.description ?? '';
        setFormData({
          name_uz: nameValue,
          name_uz_cyrl: fresh.name_uz_cyrl ?? latinToCyrillic(nameValue),
          description_uz: descriptionValue,
          description_uz_cyrl: fresh.description_uz_cyrl ?? latinToCyrillic(descriptionValue),
          image: null,
        });
        setImagePreview(fresh.image || '');
        const fileLabel = fresh.image ? fresh.image.split('/').pop() || '' : '';
        setImageFileName(fileLabel);
      } catch (error) {
        handleError(error, { showToast: true, logData: 'Failed to load category by id' });
        const nameValue = category.name_uz ?? category.name ?? '';
        const descriptionValue = category.description_uz ?? category.description ?? '';
        setFormData({
          name_uz: nameValue,
          name_uz_cyrl: category.name_uz_cyrl ?? latinToCyrillic(nameValue),
          description_uz: descriptionValue,
          description_uz_cyrl: category.description_uz_cyrl ?? latinToCyrillic(descriptionValue),
          image: null,
        });
        setImagePreview(category.image || '');
        const fileLabel = category.image ? category.image.split('/').pop() || '' : '';
        setImageFileName(fileLabel);
      } finally {
        setLocalLoadingCategory(false);
      }
      return;
    }

    setEditingCategory(null);
    setFormData({
      name_uz: '',
      name_uz_cyrl: '',
      description_uz: '',
      description_uz_cyrl: '',
      image: '',
    });
    setImagePreview('');
    setImageFileName('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setLocalLoadingCategory(false);
    setFormData({
      name_uz: '',
      name_uz_cyrl: '',
      description_uz: '',
      description_uz_cyrl: '',
      image: '',
    });
    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview('');
    setImageFileName('');
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
      await refreshCategories();
      await fetchCategories();
      handleCloseDialog();
    } catch (error) {
      handleError(error, { showToast: true });
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
      refreshCategories();
      fetchCategories();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Removed local filtering
  const currentCategories = categories;

  const columns: Column<Category>[] = [
    {
      key: 'image',
      header: t('products.image') || 'Image',
      render: (item: Category) =>
        item.image ? (
          <img
            src={item.image}
            alt={item.name_uz ?? item.name ?? 'Category image'}
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
      render: (item: Category) => item.name_uz ?? item.name ?? '',
    },
    {
      key: 'description',
      header: t('common.description'),
      render: (item: Category) => item.description_uz ?? item.description ?? '',
    },
  ];

  if (isSuperUser) {
    columns.push({
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
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('categories.title')}
        actions={(
          <div className="flex flex-wrap gap-2">
            <ExportButton
              direct
              endpoint="/products/categories/export/"
              filename="kategoriyalar.xlsx"
              params={{ search: searchQuery.trim() || undefined }}
            />
            {isSuperUser && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t('categories.addCategory')}
              </Button>
            )}
          </div>
        )}
      />

      <div className="flex items-center gap-4">
        <div className="relative w-full flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : currentCategories.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {t('categories.noCategories')}
          </div>
        ) : (
          currentCategories.map((category) => (
            <Card key={category.id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name || 'Category image'}
                      className="h-14 w-14 rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                      IMG
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{category.name_uz ?? category.name ?? ''}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {category.description_uz ?? category.description ?? t('common.noData')}
                    </p>
                  </div>
                </div>

                {isSuperUser && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-30"
                      onClick={() => handleOpenDialog(category)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-30"
                      onClick={() => setDeleteId(category.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('common.delete')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}

        {!loading && total > limit && (
          <div className="flex items-center justify-between mt-4 pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {page} / {Math.ceil(total / limit)}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <DataTable
          data={currentCategories}
          columns={columns}
          loading={loading}
          emptyMessage={t('categories.noCategories')}
          loadingMessage={t('common.loading')}
          onRowClick={isSuperUser ? (item: Category) => handleOpenDialog(item) : undefined}
          pagination={{
            page,
            limit,
            total,
            onPageChange: setPage,
          }}
        />
      </div>

      {isSuperUser && (
        <>
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
                    <Label htmlFor="name_cyrl">{t('categories.categoryName')} (Кириллча)</Label>
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
                    <Label htmlFor="description_cyrl">{t('common.description')} (Кириллча)</Label>
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
                      disabled={localLoadingCategory}
                    />
                    {imageFileName ? (
                      <p className="text-sm text-muted-foreground">
                        {imageFileName}
                      </p>
                    ) : null}
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
                  <Button type="submit" disabled={saving || localLoadingCategory}>
                    {saving || localLoadingCategory ? t('common.localLoading') : t('common.save')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}