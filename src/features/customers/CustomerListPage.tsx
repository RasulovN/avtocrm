import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Phone, Plus, Search, Trash2, User, CheckCircle2, Info } from 'lucide-react';
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
import { DataTable, type Column } from '../../components/shared/DataTable';
import { customerApiService } from '../../services/customerService';
import { formatDate, formatCurrency } from '../../utils';

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

  const [customers, setCustomers] = useState<CustomerFromApi[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>('closed');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerFromApi | null>(null);
  const [formData, setFormData] = useState({ full_name: '', phone_number: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customerApiService.getAll({ page, limit, search: search.trim() });
      setCustomers(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const filteredCustomers = useMemo(() => {
    return customers;
  }, [customers]);

  const stats = useMemo(() => {
    const totalCustomers = total;
    const totalDebt = customers.reduce((sum, c) => sum + (Number(c.debt) || Number(c.total_debt) || 0), 0);
    return { totalCustomers, totalDebt };
  }, [customers, total]);

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
      key: 'full_name',
      header: t('customers.fullName', 'Mijoz'),
      render: (item) => {
        const initial = item.full_name ? item.full_name.charAt(0).toUpperCase() : '?';
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-medium text-white">
              {initial}
            </div>
            <span className="font-medium text-foreground">{item.full_name}</span>
          </div>
        );
      },
    },
    {
      key: 'phone_number',
      header: t('customers.phone', 'Telefon'),
      render: (item) => item.phone_number,
    },
    {
      key: 'total_purchases',
      header: t('customers.totalPurchases', 'Jami xaridlar'),
      render: (item) => {
        // Fallback to random or 0 if not from API yet. We will format 0 as '—'
        const total = (item as any).total_purchases || 0;
        if (total === 0) return <span className="text-muted-foreground">—</span>;
        return formatCurrency(total);
      },
    },
    {
      key: 'debt',
      header: t('customers.debt', 'Qarz'),
      render: (item) => {
        const debt = Number(item.debt) || Number(item.total_debt) || 0;
        if (debt === 0) return <span className="text-muted-foreground">—</span>;
        return <span className="font-medium text-[#ff6b00]">{formatCurrency(debt)}</span>;
      },
    },
    {
      key: 'status',
      header: t('customers.status', 'Holat'),
      render: (item) => {
        const debt = Number(item.debt) || Number(item.total_debt) || 0;
        if (debt === 0) {
          return (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white">
              <CheckCircle2 className="h-3 w-3" />
              Qarz yo'q
            </div>
          );
        } else if (debt > 100000) {
          return (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-medium text-white">
              <Info className="h-3 w-3" />
              Katta qarz
            </div>
          );
        } else {
          return (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              <Info className="h-3 w-3" />
              Kichik qarz
            </div>
          );
        }
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-24',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openViewDialog({ ...item, id: item.rawId });
            }}
            title={t('customers.viewDetails')}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <User className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog({ ...item, id: item.rawId });
            }}
            title={t('common.edit')}
            className="h-8 w-8 text-muted-foreground hover:text-blue-500"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete(item.rawId);
            }}
            title={t('common.delete')}
            className="h-8 w-8 text-muted-foreground hover:text-red-500"
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4">
        <PageHeader
          title={t('customers.title')}
          description={t('customers.description')}
        />
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <div className="relative flex-1 sm:min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder={t('customers.searchPlaceholder')}
              className="pl-9 w-full"
            />
          </div>
          <Button onClick={openCreateDialog} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            {t('customers.addCustomer')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('customers.totalCustomers')}</p>
          <p className="text-2xl font-bold">{stats.totalCustomers}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('dashboard.totalDebt')}</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(stats.totalDebt)}</p>
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
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">ID: {customer.id}</p>
                        <p className="font-semibold text-foreground truncate">{customer.full_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{customer.phone_number}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(customer);
                          }}
                          title={t('common.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(customer.id);
                          }}
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" className="w-full h-9 text-sm" onClick={() => openViewDialog(customer)}>
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
                  pagination={{
                    page,
                    limit,
                    total,
                    onPageChange: setPage,
                  }}
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
    </div>
  );
}
