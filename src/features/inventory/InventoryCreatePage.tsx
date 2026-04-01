import { useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { inventoryService } from '../../services/inventoryService';
import { storeService } from '../../services/storeService';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import type { Store, Supplier, Product } from '../../types';
import { formatCurrency } from '../../utils';

interface InventoryFormItem {
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  total: number;
}

export function InventoryCreatePage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [paid, setPaid] = useState(0);
  const [items, setItems] = useState<InventoryFormItem[]>([
    { product_id: '', product_name: '', quantity: 1, purchase_price: 0, total: 0 }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [storesRes, suppliersRes, productsRes] = await Promise.all([
        storeService.getAll(),
        supplierService.getAll(),
        productService.getAll({ limit: 100 }),
      ]);
      setStores(storesRes.data);
      setSuppliers(suppliersRes.data);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setStores([
        { id: '1', name: 'Main Store', is_warehouse: false, created_at: '' },
        { id: '2', name: 'Warehouse', is_warehouse: true, created_at: '' },
      ]);
      setSuppliers([
        { id: '1', name: 'AutoParts Co', debt: 0, created_at: '' },
      ]);
      setProducts([
        { id: '1', name: 'Oil Filter', purchase_price: 15000, selling_price: 25000, category: 'Filters', supplier_id: '1', store_id: '1', sku: 'SKU-001', description: '', quantity: 0, created_at: '', updated_at: '' },
        { id: '2', name: 'Brake Pads', purchase_price: 45000, selling_price: 75000, category: 'Brakes', supplier_id: '1', store_id: '1', sku: 'SKU-002', description: '', quantity: 0, created_at: '', updated_at: '' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof InventoryFormItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value as string,
          product_name: product.name,
          purchase_price: product.purchase_price,
          total: product.purchase_price * newItems[index].quantity,
        };
      }
    } else if (field === 'quantity') {
      newItems[index] = {
        ...newItems[index],
        quantity: value as number,
        total: (newItems[index].purchase_price || 0) * (value as number),
      };
    } else if (field === 'purchase_price') {
      newItems[index] = {
        ...newItems[index],
        purchase_price: value as number,
        total: (value as number) * newItems[index].quantity,
      };
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1, purchase_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.total, 0);
  const debt = total - paid;

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSaving(true);
      await inventoryService.create({
        supplier_id: supplierId,
        store_id: storeId,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          total: item.total,
        })),
        paid,
      });
      navigate('/inventory');
    } catch (error) {
      console.error('Failed to create inventory:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Incoming Stock"
        description="Add new inventory from supplier"
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Create' },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Store / Warehouse</Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Paid Amount</Label>
                  <Input
                    type="number"
                    value={paid}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPaid(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Products</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={item.product_id}
                          onValueChange={(v: string) => handleItemChange(index, 'product_id', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.purchase_price}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'purchase_price', Number(e.target.value))}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="space-y-1">
                <p className="text-lg font-medium">Total: {formatCurrency(total)}</p>
                <p className="text-sm text-muted-foreground">Debt: {formatCurrency(debt)}</p>
              </div>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Create Incoming Stock'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
