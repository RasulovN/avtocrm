import { useState, useEffect, useMemo, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Send, Check, X } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { storeService } from '../../../services/storeService';
import { productService } from '../../../services/productService';
import type { Store, Product } from '../../../types';
import type { ReactElement } from 'react';

// Transfer request item type
interface TransferRequestItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

// Transfer request type
interface TransferRequest {
  id: string;
  from_store_id: string;
  from_store_name: string;
  to_store_id: string;
  to_store_name: string;
  items: TransferRequestItem[];
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export function TransferRequestsPage(): ReactElement {
  const { t } = useTranslation();
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  // Existing requests
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const safeRequests = useMemo(() => (Array.isArray(requests) ? requests : []), [requests]);

  // Form state
  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [items, setItems] = useState<TransferRequestItem[]>([
    { product_id: '', product_name: '', quantity: 1 }
  ]);

  const loadData = useCallback(async () => {
    try {
      const [storesRes, productsRes] = await Promise.all([
        storeService.getAll(),
        productService.getAll({ limit: 100 }),
      ]);
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);

      // Mock existing requests
      setRequests([
        {
          id: '1',
          from_store_id: '1',
          from_store_name: 'Main Store',
          to_store_id: '2',
          to_store_name: 'Warehouse',
          items: [
            { product_id: '1', product_name: 'Oil Filter', quantity: 20 },
          ],
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      setStores([
        { id: '1', name: 'Main Store', is_warehouse: false, created_at: '' },
        { id: '2', name: 'Warehouse', is_warehouse: true, created_at: '' },
      ]);
      setProducts([
        { id: '1', name: 'Oil Filter', purchase_price: 15000, selling_price: 25000, category: 'Filters', supplier_id: '1', store_id: '1', sku: 'SKU-001', description: '', quantity: 100, created_at: '', updated_at: '' },
        { id: '2', name: 'Brake Pads', purchase_price: 45000, selling_price: 75000, category: 'Brakes', supplier_id: '1', store_id: '1', sku: 'SKU-002', description: '', quantity: 50, created_at: '', updated_at: '' },
      ]);
      setRequests([
        {
          id: '1',
          from_store_id: '1',
          from_store_name: 'Main Store',
          to_store_id: '2',
          to_store_name: 'Warehouse',
          items: [
            { product_id: '1', product_name: 'Oil Filter', quantity: 20 },
          ],
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleItemChange = (index: number, field: keyof TransferRequestItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const product = safeProducts.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value as string,
          product_name: product.name,
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSaving(true);

      const fromStore = safeStores.find(s => s.id === fromStoreId);
      const toStore = safeStores.find(s => s.id === toStoreId);

      const newRequest: TransferRequest = {
        id: Date.now().toString(),
        from_store_id: fromStoreId,
        from_store_name: fromStore?.name || '',
        to_store_id: toStoreId,
        to_store_name: toStore?.name || '',
        items: items.filter(item => item.product_id && item.quantity > 0),
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      setRequests(prev => [...prev, newRequest]);

      // Reset form
      setFromStoreId('');
      setToStoreId('');
      setItems([{ product_id: '', product_name: '', quantity: 1 }]);
    } catch (error) {
      console.error('Failed to create request:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptRequest = (id: string) => {
    setRequests(prev =>
      prev.map(req =>
        req.id === id ? { ...req, status: 'accepted' as const } : req
      )
    );
  };

  const handleRejectRequest = (id: string) => {
    setRequests(prev =>
      prev.map(req =>
        req.id === id ? { ...req, status: 'rejected' as const } : req
      )
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.transferRequests')}
        description={t('transfers.listDescription')}
      />
 

      {/* Create Request Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('transfers.createTransfer')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('transfers.fromStore')}</Label>
                  <Select value={fromStoreId} onValueChange={setFromStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('transfers.fromStore')} />
                    </SelectTrigger>
                    <SelectContent>
                      {safeStores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('transfers.toStore')}</Label>
                  <Select value={toStoreId} onValueChange={setToStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('transfers.toStore')} />
                    </SelectTrigger>
                    <SelectContent>
                      {safeStores.filter(s => s.id !== fromStoreId).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('products.title')}</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t('inventory.addProduct')}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('products.title')}</TableHead>
                    <TableHead>{t('products.quantity')}</TableHead>
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
                            <SelectValue placeholder={t('transfers.selectProduct')} />
                          </SelectTrigger>
                          <SelectContent>
                            {safeProducts.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
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
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={saving || !fromStoreId || !toStoreId || items.every(i => !i.product_id)}>
                <Send className="h-4 w-4 mr-2" />
                {saving ? t('common.loading') : 'So\'rov yuborish'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>


       {/* Existing Requests Table */}
      {safeRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>So'rovlar ro'yxati</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transfers.fromStore')}</TableHead>
                  <TableHead>{t('transfers.toStore')}</TableHead>
                  <TableHead>{t('products.title')}</TableHead>
                  <TableHead>{t('products.quantity')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <span className="text-orange-600 dark:text-orange-400">{request.from_store_name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600 dark:text-green-400">{request.to_store_name}</span>
                    </TableCell>
                    <TableCell>
                      {(Array.isArray(request.items) ? request.items : []).map((item, idx) => (
                        <div key={idx}>{item.product_name}</div>
                      ))}
                    </TableCell>
                    <TableCell>
                      {(Array.isArray(request.items) ? request.items : []).map((item, idx) => (
                        <div key={idx}>{item.quantity}</div>
                      ))}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : request.status === 'accepted'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {request.status === 'pending' && t('transfers.pending')}
                        {request.status === 'accepted' && t('transfers.accepted')}
                        {request.status === 'rejected' && t('transfers.rejected')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAcceptRequest(request.id)}
                            title={t('transfers.accepted')}
                            className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900 h-8 w-8"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRejectRequest(request.id)}
                            title={t('transfers.rejected')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900 h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TransferRequestsPage;
