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
import { storeService } from '../../services/storeService';
import { supplierService } from '../../services/supplierService';
import type { ProductFormData, Store, Supplier } from '../../types';
import { generateSKU, generateBarcode } from '../../utils';
import { latinToCyrillic } from '../../utils/transliteration';
import { useCategories } from '../../context/CategoryContext';

export function ProductFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const { categories, refreshCategories } = useCategories();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    name_uz_cyrl: '',
    description: '',
    description_uz_cyrl: '',
    purchase_price: 0,
    selling_price: 0,
    total_count: 0,
    category_id: '',
    supplier_id: '',
    store_id: '',
    image: null,
    images: [],
  });

  const loadData = useCallback(async () => {
    try {
      const [storesRes, suppliersRes] = await Promise.all([
        storeService.getAll(),
        supplierService.getAll(),
      ]);
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);

      if (id) {
        const product = await productService.getById(id);
        setFormData({
          name: product.name,
          name_uz_cyrl: latinToCyrillic(product.name ?? ''),
          description: product.description,
          description_uz_cyrl: latinToCyrillic(product.description ?? ''),
          purchase_price: product.purchase_price,
          selling_price: product.selling_price,
          total_count: product.total_count ?? product.quantity ?? 0,
          category_id: product.category_id ?? '',
          supplier_id: product.supplier_id,
          store_id: product.store_id,
          image: product.image || '',
          images: Array.isArray(product.images)
            ? product.images
            : product.images
              ? [product.images]
              : product.image
                ? [product.image]
                : [],
        });
        const previews = Array.isArray(product.images)
          ? product.images.filter(Boolean) as string[]
          : product.images
            ? [product.images as string]
            : product.image
              ? [product.image]
              : [];
        setImagePreviews(previews);
        setImageFiles([]);
      }
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      console.error('Failed to load data:', error);
      // Mock data for demo
      setStores([
        { id: '1', name: 'Main Store', is_warehouse: false, created_at: '' },
        { id: '2', name: 'Warehouse', is_warehouse: true, created_at: '' },
      ]);
      setSuppliers([
        { id: '1', name: 'AutoParts Co', debt: 0, created_at: '' },
        { id: '2', name: 'Global Parts', debt: 0, created_at: '' },
      ]);
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
      const sku = generateSKU();
      const barcode = generateBarcode();
      const payload: ProductFormData = {
        ...formData,
        image: imageFiles[0] ?? (formData.image ?? null),
        images: imageFiles.length ? imageFiles : formData.images,
      };
      
      if (isEditing && id) {
        await productService.update(id, payload);
      } else {
        await productService.create({ ...payload, sku, barcode });
      }
      navigate('/products');
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ProductFormData, value: string | number | string[]) => {
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
              <div className="space-y-2">
                <Label htmlFor="category">{t('products.category')}</Label>
                <Select
                  value={formData.category_id || ''}
                  onValueChange={(value) => handleChange('category_id', value)}
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
                <Label htmlFor="image">{t('products.image') || 'Image'}</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
                {imagePreviews.length ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {imagePreviews.map((src, idx) => (
                      <img
                        key={`${src}-${idx}`}
                        src={src}
                        alt={formData.name || `Product image ${idx + 1}`}
                        className="h-24 w-24 rounded-md object-cover border"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('products.sellingPrice')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">{t('products.purchasePrice')}</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('purchase_price', Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price">{t('products.sellingPrice')}</Label>
                <Input
                  id="selling_price"
                  type="number"
                  value={formData.selling_price}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('selling_price', Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_count">{t('products.quantity')}</Label>
                <Input
                  id="total_count"
                  type="number"
                  value={formData.total_count ?? 0}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('total_count', Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_id">{t('nav.suppliers')}</Label>
                <Select
                  value={formData.supplier_id || ''}
                  onValueChange={(value) => handleChange('supplier_id', value)}
                >
                  <SelectTrigger id="supplier_id">
                    <SelectValue placeholder={t('nav.suppliers')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_id">{t('nav.stores')}</Label>
                <Select
                  value={formData.store_id || ''}
                  onValueChange={(value) => handleChange('store_id', value)}
                >
                  <SelectTrigger id="store_id">
                    <SelectValue placeholder={t('nav.stores')} />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
