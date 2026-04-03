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

export function ProductFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    purchase_price: 0,
    selling_price: 0,
    category: '',
    supplier_id: '',
    store_id: '',
    image: '',
    images: [],
  });
  const categories = ['Filters', 'Brakes', 'Engine'];

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
          description: product.description,
          purchase_price: product.purchase_price,
          selling_price: product.selling_price,
          category: product.category,
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
      }
    } catch (error) {
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

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSaving(true);
      const sku = generateSKU();
      const barcode = generateBarcode();
      
      if (isEditing && id) {
        await productService.update(id, formData);
      } else {
        await productService.create({ ...formData, sku, barcode });
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
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.readAsDataURL(file);
          })
      )
    ).then((results) => {
      const images = results.filter(Boolean);
      setFormData((prev) => ({
        ...prev,
        images,
        image: images[0] || '',
      }));
    });
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
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('common.description')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('description', e.target.value)}
                />
              </div>
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
                      <SelectItem key={cat} value={cat}>
                        {cat}
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
                {Array.isArray(formData.images) && formData.images.length ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {formData.images.map((src, idx) => (
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
