import { useEffect, useState, useCallback, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save, ArrowLeft } from 'lucide-react';
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
import type { ProductFormData } from '../../types';
import { latinToCyrillic } from '../../utils/transliteration';
import { useCategories } from '../../context/CategoryContext';

export function ProductFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [saving, setSaving] = useState(false);
  const { categories, refreshCategories } = useCategories();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    name_uz_cyrl: '',
    description: '',
    description_uz_cyrl: '',
    category: '',
    images: [],
    is_active: true,
  });

  const loadData = useCallback(async () => {
    if (id) {
      try {
        const product = await productService.getById(id);
        setFormData({
          name: product.name,
          name_uz_cyrl: product.name_uz_cyrl || latinToCyrillic(product.name ?? ''),
          description: product.description,
          description_uz_cyrl: product.description_uz_cyrl || latinToCyrillic(product.description ?? ''),
          category: product.category ? String(product.category) : '',
          images: [],
          is_active: product.is_active ?? true,
        });

        const previews: string[] = [];
        if (Array.isArray(product.images)) {
          product.images.forEach((img) => {
            if (typeof img === 'string' && img) {
              previews.push(img);
            }
          });
        } else if (product.images) {
          previews.push(String(product.images));
        } else if (product.image) {
          previews.push(product.image);
        }
        setExistingImages(previews);
        setImagePreviews([]);
        setImageFiles([]);
      } catch (error) {
        console.error('Failed to load product:', error);
      }
    }
  }, [id]);

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

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const allImages = [...existingImages, ...imageFiles];
      
      const payload: ProductFormData = {
        ...formData,
        images: allImages,
      };
      
      if (isEditing && id) {
        await productService.update(id, payload);
      } else {
        await productService.create(payload);
      }
      navigate('/products');
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ProductFormData, value: string | string[] | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      name_uz_cyrl: latinToCyrillic(value),
    }));
  };
  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
      description_uz_cyrl: latinToCyrillic(value),
    }));
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
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    const preview = imagePreviews[index];
    if (preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const allImages = [...existingImages, ...imagePreviews];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? t('products.editProduct') : t('products.addProduct')}
        description={isEditing ? t('products.productUpdated') : t('products.productAdded')}
        breadcrumbs={[
          { label: t('nav.products'), href: '/uz/products' },
          { label: isEditing ? t('common.edit') : t('common.add') },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate('/uz/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
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
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="name">{t('products.productName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                  required
                />
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description_cyrl">{t('common.description')} (Cyrillic)</Label>
                <Input
                  id="description_cyrl"
                  value={formData.description_uz_cyrl || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('description_uz_cyrl', e.target.value)}
                />
              </div>
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
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {existingImages.map((src, idx) => (
                    <div key={`existing-${idx}`} className="relative">
                      <img
                        src={src}
                        alt={formData.name || `Product image ${idx + 1}`}
                        className="h-24 w-24 rounded-md object-cover border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((src, idx) => (
                    <div key={`new-${idx}`} className="relative">
                      <img
                        src={src}
                        alt={formData.name || `New image ${idx + 1}`}
                        className="h-24 w-24 rounded-md object-cover border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/uz/products')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('common.loading') : t('products.productSaved')}
          </Button>
        </div>
      </form>
    </div>
  );
}