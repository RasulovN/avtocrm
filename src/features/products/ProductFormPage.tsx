import { useEffect, useState, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { productService } from '../../services/productService';
import { API_ORIGIN } from '../../services/api';
import type { ProductFormData, ProductUnit, CategoryFormData, ProductUnitFormData } from '../../types';
import { latinToCyrillic } from '../../utils/transliteration';
import { handleError, extractErrorMessage, extractFieldErrors } from '../../utils/errorHandler';
import { useCategories } from '../../context/CategoryContext';
import { productUnitService } from '../../services/productUnitService';
import { productLocationService, type ProductLocation } from '../../services/productLocationService';
import { categoryService } from '../../services/categoryService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/Dialog';

const resolveImageUrl = (image?: string) => {
  if (!image || typeof image !== 'string') return '';
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  if (image.startsWith('/')) return `${API_ORIGIN}${image}`;
  return image;
};

// Backend maydon nomlari → forma maydonlari (frontend `name`ni backend `name_uz`
// sifatida yuboradi) — server validatsiya xatolarini to'g'ri inputga bog'lash uchun
const SERVER_FIELD_MAP: Record<string, string> = {
  name_uz: 'name',
  name_uz_cyrl: 'name_uz_cyrl',
  description_uz: 'description',
  description_uz_cyrl: 'description_uz_cyrl',
};

const initialFormData: ProductFormData = {
  name: '',
  name_uz_cyrl: '',
  description: '',
  description_uz_cyrl: '',
  category: '',
  unit_measurement: '',
  location: '',
  item_id: '',
  images: [],
  min_stock: undefined,
  is_active: true,
};

export function ProductFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const lang = i18n.language || 'uz';

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [categoryNameError, setCategoryNameError] = useState<string | null>(null);
  const [unitNameError, setUnitNameError] = useState<string | null>(null);
  const { categories, refreshCategories } = useCategories();
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // Mavjud rasmlar backenddan id bilan keladi — o'chirishda id delete_image_ids ga tushadi
  const [existingImages, setExistingImages] = useState<{ id?: number; url: string }[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryImageFileName, setCategoryImageFileName] = useState('');
  const [categoryImagePreview, setCategoryImagePreview] = useState('');
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name_uz: '',
    name_uz_cyrl: '',
    description_uz: '',
    description_uz_cyrl: '',
    image: '',
  });
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitFormData, setUnitFormData] = useState<ProductUnitFormData>({
    measurement_uz: '',
    measurement_uz_cyrl: '',
  });

  useEffect(() => {
    if (!isEditing) {
      navigate(`/${lang}/products?add=true`, { replace: true });
    }
  }, [isEditing, navigate, lang]);

  const loadOptions = useCallback(async () => {
    try {
      const [unitList, locationList] = await Promise.all([
        productUnitService.getAll(),
        productLocationService.getAll(),
      ]);
      setUnits(unitList);
      setLocations(locationList?.data || []);
    } catch (error) {
      console.error('Failed to load product form options:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      const product = await productService.getById(id);
      setFormData({
        name: product.name,
        name_uz_cyrl: product.name_uz_cyrl || latinToCyrillic(product.name ?? ''),
        description: product.description,
        description_uz_cyrl: product.description_uz_cyrl || latinToCyrillic(product.description ?? ''),
        category: product.category ? String(product.category) : '',
        unit_measurement: product.unit_measurement ? String(product.unit_measurement) : '',
        location: product.location_id ? String(product.location_id) : '',
        item_id: product.item_id ? String(product.item_id) : '',
        min_stock: product.min_stock,
        images: [],
        is_active: product.is_active ?? true,
      });

      const previews: { id?: number; url: string }[] = [];
      if (Array.isArray(product.images)) {
        product.images.forEach((img) => {
          let imageUrl: string | undefined;
          let imageId: number | undefined;
          if (typeof img === 'string') {
            imageUrl = img;
          } else if (typeof img === 'object' && img !== null && 'image' in img) {
            const imgObj = img as { id?: number; image?: string };
            imageUrl = imgObj.image;
            imageId = imgObj.id;
          }
          const resolved = resolveImageUrl(imageUrl);
          if (resolved) previews.push({ id: imageId, url: resolved });
        });
      } else if (product.images && typeof product.images === 'string') {
        const resolved = resolveImageUrl(product.images);
        if (resolved) previews.push({ url: resolved });
      } else if (product.image && typeof product.image === 'string') {
        const resolved = resolveImageUrl(product.image);
        if (resolved) previews.push({ url: resolved });
      }

      setExistingImages(previews);
      setDeletedImageIds([]);
      setImagePreviews([]);
      setImageFiles([]);
    } catch (error) {
      console.error('Failed to load product:', error);
      toast.error(t('errors.generic'));
    }
  }, [id, t]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (categories.length === 0) {
      void refreshCategories();
    }
  }, [categories.length, refreshCategories]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [imagePreviews]);

  // Foydalanuvchi maydonni tahrirlashni boshlashi bilan o'sha maydon xatosi o'chadi
  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Client-side validatsiya: majburiy maydonlar va minimal uzunliklar.
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const name = (formData.name || '').trim();
    if (!name) {
      errors.name = t('validation.productNameRequired', 'Mahsulot nomi kiritilishi shart');
    } else if (name.length < 3) {
      errors.name = t('validation.productNameMin', "Mahsulot nomi kamida 3 belgidan iborat bo'lishi kerak");
    }
    const desc = (formData.description || '').trim();
    if (desc && desc.length < 3) {
      errors.description = t('validation.descriptionMin', "Tavsif kamida 3 belgidan iborat bo'lishi kerak");
    }
    if (formData.min_stock !== undefined && Number(formData.min_stock) < 0) {
      errors.min_stock = t('validation.minStockNegative', "Minimal qoldiq manfiy bo'lishi mumkin emas");
    }
    setFieldErrors(errors);
    const first = Object.values(errors)[0];
    if (first) toast.error(first);
    return !first;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload: ProductFormData = {
        ...formData,
        // Tahrirlashda faqat yangi fayllar yuboriladi (backend: new_images),
        // o'chirilgan mavjud rasmlar esa delete_image_ids orqali
        images: imageFiles,
        delete_image_ids: isEditing ? deletedImageIds : undefined,
      };

      if (isEditing && id) {
        await productService.update(id, payload);
        toast.success(t('products.productUpdated'));
      } else {
        await productService.create(payload);
        toast.success(t('products.productAdded'));
      }

      navigate(`/${lang}/products`);
    } catch (error) {
      // Server validatsiya xatolarini inputlarga bog'lab, toastda aniq sababni ko'rsatamiz
      const serverErrors = extractFieldErrors(error);
      const mapped: Record<string, string> = {};
      for (const [key, msg] of Object.entries(serverErrors)) {
        mapped[SERVER_FIELD_MAP[key] ?? key] = msg;
      }
      setFieldErrors(mapped);
      const firstMsg = Object.values(mapped)[0];
      if (firstMsg) {
        toast.error(firstMsg);
        handleError(error, { showToast: false });
      } else {
        handleError(error, { showToast: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ProductFormData, value: string | boolean | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      name_uz_cyrl: latinToCyrillic(value),
    }));
    clearFieldError('name');
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
      description_uz_cyrl: latinToCyrillic(value),
    }));
    clearFieldError('description');
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    imagePreviews.forEach((preview) => {
      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });

    const previews = files.map((file) => URL.createObjectURL(file));
    setImageFiles(files);
    setImagePreviews(previews);
  };

  const handleRemoveExistingImage = (index: number) => {
    const removed = existingImages[index];
    if (removed?.id !== undefined) {
      const removedId = removed.id;
      setDeletedImageIds((ids) => (ids.includes(removedId) ? ids : [...ids, removedId]));
    }
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    const preview = imagePreviews[index];
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const allImages = [...existingImages, ...imagePreviews];

  const handleOpenCategoryDialog = () => {
    setIsCategoryDialogOpen(true);
    setCategoryNameError(null);
    setCategoryFormData({
      name_uz: '',
      name_uz_cyrl: '',
      description_uz: '',
      description_uz_cyrl: '',
      image: '',
    });
    setCategoryImagePreview('');
    setCategoryImageFileName('');
  };

  const handleCloseCategoryDialog = () => {
    setIsCategoryDialogOpen(false);
    if (categoryImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(categoryImagePreview);
    }
    setCategoryImagePreview('');
    setCategoryImageFileName('');
  };

  const handleCategoryNameChange = (value: string) => {
    setCategoryFormData((prev) => ({
      ...prev,
      name_uz: value,
      name_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleCategoryDescriptionChange = (value: string) => {
    setCategoryFormData((prev) => ({
      ...prev,
      description_uz: value,
      description_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleCategoryImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCategoryImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setCategoryFormData((prev) => ({
        ...prev,
        image: file,
      }));
      setCategoryImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCategorySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!categoryFormData.name_uz.trim()) {
      const msg = t('validation.categoryNameRequired', 'Kategoriya nomi kiritilishi shart');
      setCategoryNameError(msg);
      toast.error(msg);
      return;
    }
    try {
      setSavingCategory(true);
      const created = await categoryService.create(categoryFormData);
      toast.success(t('categories.categoryAdded'));
      await refreshCategories();
      handleChange('category', created.id);
      handleCloseCategoryDialog();
    } catch (error) {
      const serverErrors = extractFieldErrors(error);
      const msg = serverErrors.name_uz || serverErrors.name || extractErrorMessage(error);
      setCategoryNameError(serverErrors.name_uz || serverErrors.name || null);
      toast.error(msg);
      handleError(error, { showToast: false });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleOpenUnitDialog = () => {
    setIsUnitDialogOpen(true);
    setUnitNameError(null);
    setUnitFormData({
      measurement_uz: '',
      measurement_uz_cyrl: '',
    });
  };

  const handleCloseUnitDialog = () => {
    setIsUnitDialogOpen(false);
    setUnitFormData({
      measurement_uz: '',
      measurement_uz_cyrl: '',
    });
  };

  const handleUnitNameChange = (value: string) => {
    setUnitFormData((prev) => ({
      ...prev,
      measurement_uz: value,
      measurement_uz_cyrl: latinToCyrillic(value),
    }));
  };

  const handleUnitSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!unitFormData.measurement_uz.trim()) {
      const msg = t('validation.unitNameRequired', "O'lchov birligi nomi kiritilishi shart");
      setUnitNameError(msg);
      toast.error(msg);
      return;
    }
    try {
      setSavingUnit(true);
      const created = await productUnitService.create(unitFormData);
      toast.success(t('products.unitAdded'));
      const unitList = await productUnitService.getAll();
      setUnits(unitList);
      handleChange('unit_measurement', created.id);
      handleCloseUnitDialog();
    } catch (error) {
      const serverErrors = extractFieldErrors(error);
      const msg = serverErrors.measurement_uz || extractErrorMessage(error);
      setUnitNameError(serverErrors.measurement_uz || null);
      toast.error(msg);
      handleError(error, { showToast: false });
    } finally {
      setSavingUnit(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? t('products.editProduct') : t('products.addProduct')}
        description={isEditing ? t('products.productUpdated') : t('products.productAdded')}
        breadcrumbs={[
          { label: t('nav.products'), href: `/${lang}/products` },
          { label: isEditing ? t('common.edit') : t('common.add') },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate(`/${lang}/products`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('products.productName')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <div className='min-w-0 flex-1'>
                  <Label htmlFor="category">{t('products.category')}</Label>
                  <Select
                    value={formData.category || ''}
                    onValueChange={(value) => handleChange('category', value)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder={t('products.category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" className="shrink-0" onClick={handleOpenCategoryDialog}>
                  {t('products.categoriesAdd')}
                </Button>
              </div>

              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="unit_measurement">{t('products.unitMeasurement')}</Label>
                  <Select
                    value={formData.unit_measurement || ''}
                    onValueChange={(value) => handleChange('unit_measurement', value)}
                  >
                    <SelectTrigger id="unit_measurement">
                      <SelectValue placeholder={t('products.selectUnitMeasurement')} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.measurement_uz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" className="shrink-0" onClick={handleOpenUnitDialog}>
                  {t('products.categoriesAdd')}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" required>{t('products.productName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  className={fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500' : ''}
                />
                {fieldErrors.name && (
                  <p id="name-error" className="text-xs text-red-500">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_cyrl">{t('products.productName')} (Cyrillic)</Label>
                <Input
                  id="name_cyrl"
                  value={formData.name_uz_cyrl || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('name_uz_cyrl', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('common.description')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleDescriptionChange(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? 'description-error' : undefined}
                  className={fieldErrors.description ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500' : ''}
                />
                {fieldErrors.description && (
                  <p id="description-error" className="text-xs text-red-500">{fieldErrors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_cyrl">{t('common.description')} (Cyrillic)</Label>
                <Input
                  id="description_cyrl"
                  value={formData.description_uz_cyrl || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('description_uz_cyrl', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_stock">{t('products.minStock', 'Minimal qoldiq')}</Label>
                <Input
                  id="min_stock"
                  type="number"
                  min="0"
                  value={formData.min_stock === undefined ? '' : formData.min_stock}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    handleChange('min_stock', val === '' ? undefined : Number(val));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t('productLocations.locationName')}</Label>
                <Select
                  value={formData.location || ''}
                  onValueChange={(value) => handleChange('location', value)}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder={t('products.selectLocation')} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.location_uz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isEditing && (
                <label className="flex items-center gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_active)}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">{t('products.isActive')}</span>
                </label>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('products.image') || 'Images'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">{t('products.image') || 'Add Images'}</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
              </div>

              {allImages.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {existingImages.map((img, idx) => (
                    <div key={`existing-${img.id ?? idx}`} className="relative">
                      <img
                        src={img.url}
                        alt={formData.name || `Product image ${idx + 1}`}
                        className="h-24 w-24 rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(idx)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                        title={t('common.delete') || 'Delete'}
                      >
                        x
                      </button>
                    </div>
                  ))}

                  {imagePreviews.map((src, idx) => (
                    <div key={`new-${idx}`} className="relative">
                      <img
                        src={src}
                        alt={formData.name || `New image ${idx + 1}`}
                        className="h-24 w-24 rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(idx)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                        title={t('common.delete') || 'Delete'}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/${lang}/products`)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? t('common.loading') : t('products.productSaved')}
          </Button>
        </div>

        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('categories.addCategory')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCategorySubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cat_name" required>{t('categories.categoryName')}</Label>
                  <Input
                    id="cat_name"
                    value={categoryFormData.name_uz}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      handleCategoryNameChange(e.target.value);
                      if (categoryNameError) setCategoryNameError(null);
                    }}
                    aria-invalid={Boolean(categoryNameError)}
                    className={categoryNameError ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500' : ''}
                  />
                  {categoryNameError && (
                    <p className="text-xs text-red-500">{categoryNameError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat_name_cyrl">{t('categories.categoryName')} (Cyrillic)</Label>
                  <Input
                    id="cat_name_cyrl"
                    value={categoryFormData.name_uz_cyrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCategoryFormData((prev) => ({ ...prev, name_uz_cyrl: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat_description">{t('common.description')}</Label>
                  <Input
                    id="cat_description"
                    value={categoryFormData.description_uz}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleCategoryDescriptionChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat_description_cyrl">{t('common.description')} (Cyrillic)</Label>
                  <Input
                    id="cat_description_cyrl"
                    value={categoryFormData.description_uz_cyrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCategoryFormData((prev) => ({ ...prev, description_uz_cyrl: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat_image">{t('products.image') || 'Image'}</Label>
                  <Input
                    id="cat_image"
                    type="file"
                    accept="image/*"
                    onChange={handleCategoryImageChange}
                  />
                  {categoryImageFileName ? (
                    <p className="text-sm text-muted-foreground">{categoryImageFileName}</p>
                  ) : null}
                  {categoryImagePreview ? (
                    <div className="mt-2">
                      <img
                        src={categoryImagePreview}
                        alt={categoryFormData.name_uz || 'Category image'}
                        className="h-24 w-24 rounded-md border object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseCategoryDialog}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={savingCategory}>
                  {savingCategory ? t('common.localLoading') : t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('products.addUnit')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUnitSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_name" required>{t('products.unitName')}</Label>
                  <Input
                    id="unit_name"
                    value={unitFormData.measurement_uz}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      handleUnitNameChange(e.target.value);
                      if (unitNameError) setUnitNameError(null);
                    }}
                    aria-invalid={Boolean(unitNameError)}
                    className={unitNameError ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500' : ''}
                  />
                  {unitNameError && (
                    <p className="text-xs text-red-500">{unitNameError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_name_cyrl">{t('products.unitName')} (Cyrillic)</Label>
                  <Input
                    id="unit_name_cyrl"
                    value={unitFormData.measurement_uz_cyrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setUnitFormData((prev) => ({ ...prev, measurement_uz_cyrl: e.target.value }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseUnitDialog}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={savingUnit}>
                  {savingUnit ? t('common.localLoading') : t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </form>
    </div>
  );
}
