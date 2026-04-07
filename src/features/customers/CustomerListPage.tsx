import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeDollarSign, CreditCard, Phone, Receipt, Search, ShoppingBag, Store, UserRound } from 'lucide-react';
import { useAuthStore } from '../../app/store';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { customerService } from '../../services/customerService';
import { storeService } from '../../services/storeService';
import type { Customer, Store as StoreType } from '../../types';
import { formatCurrency, formatDate } from '../../utils';

export function CustomerListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isSuperUser = Boolean(user?.is_superuser);
  const scopedStoreId = user?.store_id || '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState(isSuperUser ? 'all' : scopedStoreId);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!isSuperUser && scopedStoreId) {
      setSelectedStoreId(scopedStoreId);
    }
  }, [isSuperUser, scopedStoreId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customerResponse, storeResponse] = await Promise.all([
        customerService.getAll({ limit: 200 }),
        storeService.getAll({ limit: 100 }),
      ]);

      const scopedCustomers = isSuperUser
        ? customerResponse.data
        : customerResponse.data.filter((customer) => customer.store_id === scopedStoreId);
      const scopedStores = isSuperUser
        ? storeResponse.data
        : storeResponse.data.filter((store) => store.id === scopedStoreId);

      setCustomers(scopedCustomers);
      setStores(scopedStores);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesStore = selectedStoreId === 'all' || customer.store_id === selectedStoreId;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        customer.id.toLowerCase().includes(normalizedQuery) ||
        customer.full_name.toLowerCase().includes(normalizedQuery) ||
        customer.phone_number.toLowerCase().includes(normalizedQuery) ||
        customer.orders.some((order) => order.order_id.toLowerCase().includes(normalizedQuery));

      return matchesStore && matchesQuery;
    });
  }, [customers, search, selectedStoreId]);

  const summary = useMemo(() => {
    return filteredCustomers.reduce(
      (accumulator, customer) => {
        accumulator.customerCount += 1;
        accumulator.orderCount += customer.order_count;
        accumulator.totalPaid += customer.total_paid;
        accumulator.totalDebt += customer.total_debt;
        return accumulator;
      },
      {
        customerCount: 0,
        orderCount: 0,
        totalPaid: 0,
        totalDebt: 0,
      }
    );
  }, [filteredCustomers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customers.title')}
        description={t('customers.description')}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('customers.totalCustomers')}</CardDescription>
            <CardTitle className="text-3xl">{summary.customerCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('customers.totalOrders')}</CardDescription>
            <CardTitle className="text-3xl">{summary.orderCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('customers.totalPaid')}</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(summary.totalPaid)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('customers.totalDebt')}</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{formatCurrency(summary.totalDebt)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t('customers.customerList')}</CardTitle>
            <CardDescription>
              {isSuperUser ? t('customers.adminHint') : t('customers.storeHint')}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <div className="relative min-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('customers.searchPlaceholder')}
                className="pl-9"
              />
            </div>
            {isSuperUser && (
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="min-w-56">
                  <SelectValue placeholder={t('customers.storeFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('customers.allStores')}</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">{t('common.loading')}</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
              {t('customers.noCustomers')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('customers.customerId')}</TableHead>
                  <TableHead>{t('customers.fullName')}</TableHead>
                  <TableHead>{t('customers.phone')}</TableHead>
                  <TableHead>{t('customers.orderId')}</TableHead>
                  <TableHead>{t('stores.title')}</TableHead>
                  <TableHead>{t('customers.totalOrders')}</TableHead>
                  <TableHead>{t('customers.totalPaid')}</TableHead>
                  <TableHead>{t('customers.totalDebt')}</TableHead>
                  <TableHead>{t('customers.lastOrder')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={`${customer.store_id}-${customer.id}`}>
                    <TableCell className="font-medium">{customer.id}</TableCell>
                    <TableCell>{customer.full_name}</TableCell>
                    <TableCell>{customer.phone_number}</TableCell>
                    <TableCell>{customer.latest_order_id || '-'}</TableCell>
                    <TableCell>{customer.store_name || '-'}</TableCell>
                    <TableCell>{customer.order_count}</TableCell>
                    <TableCell>{formatCurrency(customer.total_paid)}</TableCell>
                    <TableCell className={customer.total_debt > 0 ? 'text-amber-600' : ''}>
                      {formatCurrency(customer.total_debt)}
                    </TableCell>
                    <TableCell>{formatDate(customer.last_order_at)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(customer)}>
                        {t('customers.viewDetails')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedCustomer)} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent size="xl">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCustomer.full_name}</DialogTitle>
                <DialogDescription>{t('customers.detailsDescription')}</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 pt-6">
                      <UserRound className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.customerId')}</p>
                        <p className="font-semibold">{selectedCustomer.id}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 pt-6">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.phone')}</p>
                        <p className="font-semibold">{selectedCustomer.phone_number}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 pt-6">
                      <Store className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('stores.title')}</p>
                        <p className="font-semibold">{selectedCustomer.store_name || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 pt-6">
                      <Receipt className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.totalOrders')}</p>
                        <p className="font-semibold">{selectedCustomer.order_count}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                      <BadgeDollarSign className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.totalSpent')}</p>
                        <p className="text-lg font-semibold">{formatCurrency(selectedCustomer.total_spent)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.totalPaid')}</p>
                        <p className="text-lg font-semibold">{formatCurrency(selectedCustomer.total_paid)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                      <ShoppingBag className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.totalDebt')}</p>
                        <p className="text-lg font-semibold">{formatCurrency(selectedCustomer.total_debt)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{t('customers.orderHistory')}</h3>
                    <p className="text-sm text-muted-foreground">{t('customers.orderHistoryDescription')}</p>
                  </div>

                  <div className="space-y-4">
                    {selectedCustomer.orders.map((order) => (
                      <Card key={order.id}>
                        <CardHeader className="gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <CardTitle className="text-xl">{order.order_id}</CardTitle>
                            <CardDescription>{formatDate(order.created_at)}</CardDescription>
                          </div>
                          <div className="grid gap-2 text-sm md:grid-cols-3">
                            <div className="rounded-lg bg-muted px-3 py-2">
                              <p className="text-xs text-muted-foreground">{t('customers.orderTotal')}</p>
                              <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
                            </div>
                            <div className="rounded-lg bg-muted px-3 py-2">
                              <p className="text-xs text-muted-foreground">{t('customers.paid')}</p>
                              <p className="font-semibold text-emerald-600">{formatCurrency(order.paid_amount)}</p>
                            </div>
                            <div className="rounded-lg bg-muted px-3 py-2">
                              <p className="text-xs text-muted-foreground">{t('customers.debt')}</p>
                              <p className="font-semibold text-amber-600">{formatCurrency(order.debt_amount)}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('customers.productName')}</TableHead>
                                <TableHead>{t('customers.quantity')}</TableHead>
                                <TableHead>{t('customers.unitPrice')}</TableHead>
                                <TableHead>{t('customers.lineTotal')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.items.map((item) => (
                                <TableRow key={`${order.id}-${item.product_id}`}>
                                  <TableCell className="font-medium">{item.product_name}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                                  <TableCell>{formatCurrency(item.total)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
