import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { productService } from '../../services/productService';
import { storeService } from '../../services/storeService';
import { supplierService } from '../../services/supplierService';
import type { Product, ProductFormData, Store, Supplier } from '../../types';
import { generateSKU, generateBarcode } from '../../utils';

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
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
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [storesRes, suppliersRes] = await Promise.all([
        storeService.getAll(),
        supplierService.getAll(),
      ]);
      setStores(storesRes.data);
      setSuppliers(suppliersRes.data);

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
          image: product.image,
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
    } finally {
      setLoading(false);
    }
  };

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

  const handleChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? 'Edit Product' : 'Add Product'}
        description={isEditing ? 'Update product information' : 'Create a new product'}
        breadcrumbs={[
          { label: 'Products', href: '/products' },
          { label: isEditing ? 'Edit' : 'Add' },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('description', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('category', e.target.value)}
                  placeholder="e.g., Filters, Brakes, Engine"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase Price</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('purchase_price', Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price</Label>
                <Input
                  id="selling_price"
                  type="number"
                  value={formData.selling_price}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('selling_price', Number(e.target.value))}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store_id">Store / Warehouse</Label>
                <Select
                  value={formData.store_id}
                  onValueChange={(value: string) => handleChange('store_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} {store.is_warehouse ? '(Warehouse)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Supplier</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value: string) => handleChange('supplier_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
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
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/products')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
