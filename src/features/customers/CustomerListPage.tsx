import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Phone, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../app/store';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { customerApiService } from '../../services/customerService';
import { formatCurrency, formatDate } from '../../utils';

interface CustomerFromApi {
  id: number;
  full_name: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
  debt?: number;
  total_debt?: number;
}

type DialogMode = 'closed' | 'create' | 'edit' | 'view';

type CustomerRow = Omit<CustomerFromApi, 'id'> & {
  id: string;
  rawId: number;
};

export function CustomerListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const scopedStoreId = user?.store_id || '';

  const [customers, setCustomers] = useState<CustomerFromApi[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>('closed');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerFromApi | null>(null);
  const [formData, setFormData] = useState({ full_name: '', phone_number: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'card'>('cash');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const customersData = await customerApiService.getAll();
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) return customers;
    return customers.filter((customer) =>
      customer.full_name.toLowerCase().includes(normalizedQuery) ||
      customer.phone_number.toString().includes(normalizedQuery)
    );
  }, [customers, search]);

  const tableData = useMemo<CustomerRow[]>(
    () =>
      filteredCustomers.map((customer) => ({
        ...customer,
        id: String(customer.id),
        rawId: customer.id,
      })),
    [filteredCustomers]
  );

  const columns: Column<CustomerRow>[] = [
    {
      key: 'rawId',
      header: t('customers.customerId'),
      className: 'font-medium',
      render: (item) => item.rawId,
    },
    {
      key: 'full_name',
      header: t('customers.fullName'),
      render: (item) => item.full_name,
    },
    {
      key: 'phone_number',
      header: t('customers.phone'),
      render: (item) => item.phone_number,
    },
    {
      key: 'created_at',
      header: t('customers.createdAt'),
      render: (item) => formatDate(item.created_at),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openViewDialog({ ...item, id: item.rawId });
            }}
            title={t('customers.viewDetails')}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog({ ...item, id: item.rawId });
            }}
            title={t('common.edit')}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete(item.rawId);
            }}
            title={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const openCreateDialog = () => {
    setFormData({ full_name: '', phone_number: '' });
    setDialogMode('create');
    setSelectedCustomer(null);
  };

  const openEditDialog = (customer: CustomerFromApi) => {
    setSelectedCustomer(customer);
    setFormData({ full_name: customer.full_name, phone_number: customer.phone_number });
    setDialogMode('edit');
  };

  const openViewDialog = (customer: CustomerFromApi) => {
    setSelectedCustomer(customer);
    setDialogMode('view');
  };

  const closeDialog = () => {
    setSelectedCustomer(null);
    setDialogMode('closed');
    setFormData({ full_name: '', phone_number: '' });
  };

  const resolveCustomerDebt = (customer: CustomerFromApi | null) => {
    if (!customer) return 0;
    if (typeof customer.total_debt === 'number') return customer.total_debt;
    if (typeof customer.debt === 'number') return customer.debt;
    return 0;
  };

  const openPaymentDialog = () => {
    const debt = resolveCustomerDebt(selectedCustomer);
    if (!selectedCustomer || debt <= 0) return;
    setPaymentAmount(String(debt));
    setPaymentType('cash');
    setShowPaymentDialog(true);
  };

  const handleSubmitDebtPayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;
    try {
      setPaying(true);
      const parsedAmount = Number(paymentAmount);
      const normalizedAmount = Number.isFinite(parsedAmount)
        ? String(-Math.abs(parsedAmount))
        : paymentAmount;
      await customerApiService.createDebtPayment({
        customer: selectedCustomer.id,
        amount: normalizedAmount,
        type: paymentType,
      });
      setShowPaymentDialog(false);
      setPaymentAmount('');
      await loadData();
    } catch (error) {
      console.error('Error creating debt payment:', error);
    } finally {
      setPaying(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim() || !formData.phone_number.trim()) return;

    try {
      setSubmitting(true);
      if (dialogMode === 'create') {
        await customerApiService.create({
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim(),
        });
      } else if (dialogMode === 'edit' && selectedCustomer) {
        await customerApiService.update(selectedCustomer.id, {
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim(),
        });
      }
      await loadData();
      closeDialog();
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customerId: number) => {
    try {
      setSubmitting(true);
      await customerApiService.delete(customerId);
      await loadData();
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isDialogOpen = dialogMode !== 'closed';
  const selectedCustomerDebt = resolveCustomerDebt(selectedCustomer);

  return (
    <div className="space-y-6">
      <div className='flex justify-between items-center'>
        <PageHeader
          title={t('customers.title')}
          description={t('customers.description')}
        />
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
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t('customers.addCustomer')}
          </Button>
        </div>
      </div>

      <Card className='border-none'>
        <CardContent className='p-0'>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">{t('common.loading')}</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
              {t('customers.noCustomers')}
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">ID: {customer.id}</p>
                        <p className="font-semibold text-foreground">{customer.full_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{customer.phone_number}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" className="w-full" onClick={() => openViewDialog(customer)}>
                        {t('customers.viewDetails')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <DataTable
                  data={tableData}
                  columns={columns}
                  loading={loading}
                  emptyMessage={t('customers.noCustomers')}
                  loadingMessage={t('common.loading')}
                  onRowClick={(item: CustomerRow) => openViewDialog({ ...item, id: item.rawId })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent size="md">
          {dialogMode === 'create' && (
            <>
              <DialogHeader>
                <DialogTitle>{t('customers.addCustomer')}</DialogTitle>
                <DialogDescription>{t('customers.createDescription')}</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4 p-0">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('customers.fullName')}</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder={t('customers.fullNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('customers.phone')}</label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder={t('customers.phonePlaceholder')}
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting || !formData.full_name.trim() || !formData.phone_number.trim()}>
                  {submitting ? t('common.saving') : t('common.save')}
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogMode === 'edit' && selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{t('customers.editCustomer')}</DialogTitle>
                <DialogDescription>{t('customers.editDescription')}</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4 p-0">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('customers.fullName')}</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder={t('customers.fullNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('customers.phone')}</label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder={t('customers.phonePlaceholder')}
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => openViewDialog(selectedCustomer)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting || !formData.full_name.trim() || !formData.phone_number.trim()}>
                  {submitting ? t('common.saving') : t('common.save')}
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogMode === 'view' && selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCustomer.full_name}</DialogTitle>
                <DialogDescription>{t('customers.detailsDescription')}</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-6 px-0">
                <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('customers.totalDebt')}</p>
                      <p className={`mt-1 text-2xl font-semibold ${selectedCustomerDebt > 0 ? 'text-red-500' : ''}`}>
                        {formatCurrency(selectedCustomerDebt)}
                      </p>
                    </div>
                    {selectedCustomerDebt > 0 && (
                      <Button className="sm:min-w-40" onClick={openPaymentDialog}>
                        {t('customers.payDebt')}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.customerId')}</p>
                        <p className="font-semibold">{selectedCustomer.id}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 p-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.phone')}</p>
                        <p className="font-semibold">{selectedCustomer.phone_number}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.createdAt')}</p>
                        <p className="font-semibold">{formatDate(selectedCustomer.created_at)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.updatedAt')}</p>
                        <p className="font-semibold">{formatDate(selectedCustomer.updated_at)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className='pb-6'>
          <DialogHeader>
            <DialogTitle>{t('customers.debtPaymentTitle')}</DialogTitle>
            <DialogDescription>{t('customers.debtPaymentDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">{t('customers.totalDebt')}</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(selectedCustomerDebt)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('customers.paymentAmount')}</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={t('customers.paymentAmount')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sales.paymentMethod')}</label>
              <Select value={paymentType} onValueChange={(value) => setPaymentType(value as 'cash' | 'card')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('sales.cash')}</SelectItem>
                  <SelectItem value="card">{t('sales.card')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={handleSubmitDebtPayment} disabled={paying || !paymentAmount}>
                {paying ? t('common.saving') : t('customers.payNow')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
