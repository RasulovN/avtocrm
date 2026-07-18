import { useEffect, useMemo, useState, useCallback, type FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Pencil, Phone, Plus, Search, Trash2, User, CheckCircle2, Info, Banknote, CreditCard, Check, Loader2, Wallet } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { ExportButton } from '../../components/shared/ExportButton';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
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
import { customerApiService, type CustomerPaymentRow } from '../../services/customerService';
import { bankCardService } from '../../services/bankCardService';
import { formatDate, formatCurrency, cn } from '../../utils';
import { handleError } from '../../utils/errorHandler';
import type { BankCard } from '../../types';

interface CustomerFromApi {
  id: number;
  full_name: string;
  phone_number: string;
  total_purchase_amount?: string | number;
  total_debt?: string | number;
  store_debts?: Array<{ store: string; debt: number }>;
  sales?: any[];
  created_at?: string;
  updated_at?: string;
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
  const [debtFilter, setDebtFilter] = useState<'all' | 'with_debt' | 'no_debt'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>('closed');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerFromApi | null>(null);
  const [formData, setFormData] = useState({ full_name: '', phone_number: '' });
  // Maydon darajasidagi xatolar — qaysi input noto'g'ri to'ldirilganini ko'rsatadi
  const [fieldErrors, setFieldErrors] = useState<{ full_name?: string; phone_number?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // ─── Qarz to'lash (FIFO) va to'lovlar tarixi ───
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState<'cash' | 'card'>('cash');
  const [payBankCardId, setPayBankCardId] = useState('');
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [paying, setPaying] = useState(false);
  const [payments, setPayments] = useState<CustomerPaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customerApiService.getAll({ page, limit, search: search.trim() });
      setCustomers(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Error loading customers' });
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
    if (debtFilter === 'with_debt') return customers.filter(c => (Number(c.total_debt) || 0) > 0);
    if (debtFilter === 'no_debt') return customers.filter(c => (Number(c.total_debt) || 0) === 0);
    return customers;
  }, [customers, debtFilter]);

  const stats = useMemo(() => {
    const totalCustomers = total;
    const totalDebt = customers.reduce((sum, c) => sum + (Number(c.total_debt) || 0), 0);
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
        const total = Number(item.total_purchase_amount) || 0;
        if (total === 0) return <span className="text-muted-foreground">—</span>;
        return formatCurrency(total);
      },
    },
    {
      key: 'debt',
      header: t('customers.debt', 'Qarz'),
      render: (item) => {
        const debt = Number(item.total_debt) || 0;
        if (debt === 0) return <span className="text-muted-foreground">—</span>;
        return <span className="font-medium text-[#ff6b00]">{formatCurrency(debt)}</span>;
      },
    },
    {
      key: 'status',
      header: t('customers.status', 'Holat'),
      render: (item) => {
        const debt = Number(item.total_debt) || 0;
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

  // Telefon inputiga faqat raqam va boshida '+' kiritishga ruxsat beramiz
  const sanitizePhone = (raw: string): string => {
    let value = raw.replace(/[^\d+]/g, '');
    value = value.startsWith('+')
      ? '+' + value.slice(1).replace(/\+/g, '')
      : value.replace(/\+/g, '');
    return value.slice(0, 16);
  };

  const validateForm = (): boolean => {
    const errors: { full_name?: string; phone_number?: string } = {};
    if (!formData.full_name.trim()) {
      errors.full_name = t('customers.nameRequired', "Ism-familiya kiritilishi shart");
    }
    const phone = formData.phone_number.trim();
    if (!phone) {
      errors.phone_number = t('customers.phoneRequired', "Telefon raqam kiritilishi shart");
    } else if (!/^\+?\d{7,15}$/.test(phone)) {
      errors.phone_number = t('customers.phoneInvalid', "Telefon raqam noto'g'ri (masalan: +998901234567)");
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateDialog = () => {
    setFormData({ full_name: '', phone_number: '' });
    setFieldErrors({});
    setDialogMode('create');
    setSelectedCustomer(null);
  };

  const openEditDialog = (customer: CustomerFromApi) => {
    setSelectedCustomer(customer);
    setFormData({ full_name: customer.full_name, phone_number: customer.phone_number });
    setFieldErrors({});
    setDialogMode('edit');
  };

  const openViewDialog = (customer: CustomerFromApi) => {
    // Jadval qatori darhol ko'rsatiladi; sotuvlar tarixi va do'kon qarzlari
    // (ro'yxat API'sida endi yo'q — tezlik uchun) detail API'dan yuklanadi.
    setSelectedCustomer(customer);
    setDialogMode('view');
    void customerApiService
      .getById(customer.id)
      .then((full) => {
        setSelectedCustomer((prev) => (prev && prev.id === customer.id ? { ...prev, ...full } : prev));
      })
      .catch((error) => {
        handleError(error, { showToast: false, logData: 'Failed to load customer detail' });
      });
  };

  const closeDialog = () => {
    setSelectedCustomer(null);
    setDialogMode('closed');
    setFormData({ full_name: '', phone_number: '' });
    setFieldErrors({});
    setPayAmount('');
    setPayType('cash');
    setPayments([]);
  };

  // ─── Qarz to'lash (FIFO) ───

  const loadPayments = useCallback(async (customerId: number) => {
    try {
      setLoadingPayments(true);
      const rows = await customerApiService.getCustomerPayments(customerId);
      setPayments(rows);
    } catch (error) {
      handleError(error, { showToast: false, logData: 'Failed to load customer payments' });
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  // Modal ochilganda to'lovlar tarixi yuklanadi
  const selectedCustomerId = selectedCustomer?.id;
  useEffect(() => {
    if (dialogMode === 'view' && selectedCustomerId) {
      void loadPayments(selectedCustomerId);
    }
  }, [dialogMode, selectedCustomerId, loadPayments]);

  // Sotuv bo'limi uchun ruxsat etilgan to'lov usullari (bir marta yuklanadi)
  useEffect(() => {
    if (dialogMode !== 'view' || bankCards.length > 0) return;
    bankCardService
      .getAll({ is_active: true, scope: 'sale' })
      .then((cards) => {
        setBankCards(cards);
        const def = cards.find((c) => c.is_default) ?? cards[0];
        setPayBankCardId((prev) => prev || (def ? String(def.id) : ''));
      })
      .catch(() => {});
  }, [dialogMode, bankCards.length]);

  const totalDebt = Number(selectedCustomer?.total_debt) || 0;
  const payAmountNum = Number(payAmount) || 0;
  const payExceeds = payAmountNum > totalDebt;
  const payInvalid =
    payAmountNum <= 0 ||
    payExceeds ||
    (payType === 'card' && !payBankCardId);

  // Qarzli sotuvlar — eng eskisidan (FIFO tartibi, backend bilan bir xil)
  const debtSales = useMemo(() => {
    return (selectedCustomer?.sales || [])
      .filter((s: any) => s.status !== 'r' && Number(s.total_amount) - Number(s.paid_amount) > 0)
      .sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [selectedCustomer]);

  // Jonli taqsimot ko'rinishi: kiritilgan summa qaysi buyurtmalarga bo'linadi
  const allocationPreview = useMemo(() => {
    let left = payAmountNum;
    return debtSales.map((s: any) => {
      const debt = Number(s.total_amount) - Number(s.paid_amount);
      const alloc = Math.max(0, Math.min(debt, left));
      left -= alloc;
      return {
        id: s.id,
        store_name: s.store_name,
        created_at: s.created_at,
        debt,
        alloc,
        closed: alloc >= debt && debt > 0,
      };
    });
  }, [debtSales, payAmountNum]);

  const handlePayDebt = async () => {
    if (!selectedCustomer || payInvalid || paying) return;
    try {
      setPaying(true);
      await customerApiService.payCustomerDebt({
        customer: selectedCustomer.id,
        amount: payAmountNum.toFixed(2),
        type: payType,
        bank_card: payType === 'card' ? Number(payBankCardId) : undefined,
      });
      toast.success(t('customers.debtPaid', "Qarz to'lovi qabul qilindi"));
      setPayAmount('');
      // Modal ma'lumotlari (qarz, sotuvlar) va ro'yxatni yangilash
      const fresh = await customerApiService.getById(selectedCustomer.id);
      setSelectedCustomer(fresh);
      void loadPayments(selectedCustomer.id);
      void loadData();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setPaying(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

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
      // Backend'dan kelgan maydon xatolarini tegishli inputlarga bog'laymiz
      const data = (error as { response?: { data?: unknown } }).response?.data;
      if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        const apiErrors: { full_name?: string; phone_number?: string } = {};
        if (Array.isArray(obj.full_name)) apiErrors.full_name = obj.full_name.map(String).join(' ');
        if (Array.isArray(obj.phone_number)) apiErrors.phone_number = obj.phone_number.map(String).join(' ');
        if (Object.keys(apiErrors).length > 0) setFieldErrors(apiErrors);
      }
      handleError(error, { showToast: true });
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
      handleError(error, { showToast: true });
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
            <ExportButton
              direct
              endpoint="/users/customers/export/"
              filename="mijozlar.xlsx"
              params={{
                search: search.trim() || undefined,
                // Sahifadagi qarz filtri eksportga ham birdek qo'llanadi
                has_debt:
                  debtFilter === 'with_debt' ? 'true' : debtFilter === 'no_debt' ? 'false' : undefined,
              }}
            />
            <div className="relative flex-1 sm:min-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder={t('customers.searchPlaceholder')}
                className="pl-9 w-full"
              />
            </div>
            <Select value={debtFilter} onValueChange={(v: 'all' | 'with_debt' | 'no_debt') => { setDebtFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t('customers.debtFilter', 'Qarz filtri')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('customers.all', 'Hammasi')}</SelectItem>
                <SelectItem value="with_debt">{t('customers.withDebt', 'Qarzdorlar')}</SelectItem>
                <SelectItem value="no_debt">{t('customers.noDebt', 'Qarzi yo\'q')}</SelectItem>
              </SelectContent>
            </Select>
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
                  <label className="text-sm font-medium">
                    {t('customers.fullName')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => {
                      setFormData({ ...formData, full_name: e.target.value });
                      if (fieldErrors.full_name) setFieldErrors((prev) => ({ ...prev, full_name: undefined }));
                    }}
                    placeholder={t('customers.fullNamePlaceholder')}
                    className={fieldErrors.full_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    aria-invalid={Boolean(fieldErrors.full_name)}
                  />
                  {fieldErrors.full_name && (
                    <p className="text-xs text-red-500">{fieldErrors.full_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('customers.phone')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={formData.phone_number}
                    onChange={(e) => {
                      setFormData({ ...formData, phone_number: sanitizePhone(e.target.value) });
                      if (fieldErrors.phone_number) setFieldErrors((prev) => ({ ...prev, phone_number: undefined }));
                    }}
                    placeholder={t('customers.phonePlaceholder')}
                    className={fieldErrors.phone_number ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    aria-invalid={Boolean(fieldErrors.phone_number)}
                  />
                  {fieldErrors.phone_number && (
                    <p className="text-xs text-red-500">{fieldErrors.phone_number}</p>
                  )}
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
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
                  <label className="text-sm font-medium">
                    {t('customers.fullName')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => {
                      setFormData({ ...formData, full_name: e.target.value });
                      if (fieldErrors.full_name) setFieldErrors((prev) => ({ ...prev, full_name: undefined }));
                    }}
                    placeholder={t('customers.fullNamePlaceholder')}
                    className={fieldErrors.full_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    aria-invalid={Boolean(fieldErrors.full_name)}
                  />
                  {fieldErrors.full_name && (
                    <p className="text-xs text-red-500">{fieldErrors.full_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('customers.phone')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={formData.phone_number}
                    onChange={(e) => {
                      setFormData({ ...formData, phone_number: sanitizePhone(e.target.value) });
                      if (fieldErrors.phone_number) setFieldErrors((prev) => ({ ...prev, phone_number: undefined }));
                    }}
                    placeholder={t('customers.phonePlaceholder')}
                    className={fieldErrors.phone_number ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    aria-invalid={Boolean(fieldErrors.phone_number)}
                  />
                  {fieldErrors.phone_number && (
                    <p className="text-xs text-red-500">{fieldErrors.phone_number}</p>
                  )}
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => openViewDialog(selectedCustomer)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
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
                        <p className="text-xs text-muted-foreground">{t('customers.totalPurchases')}</p>
                        <p className="font-semibold">{formatCurrency(Number(selectedCustomer.total_purchase_amount) || 0)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.debt')}</p>
                        <p className={`font-semibold ${Number(selectedCustomer.total_debt) > 0 ? 'text-[#ff6b00]' : ''}`}>
                          {formatCurrency(Number(selectedCustomer.total_debt) || 0)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  {/* to'lov sanasi */}
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('customers.payDate')}</p>
                        <p className={`font-semibold ${Number(selectedCustomer.total_debt) > 0 ? 'text-[#ff6b00]' : ''}`}>
                          30.3.2026
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {selectedCustomer.created_at && (
                    <Card className="border-dashed">
                      <CardContent className="flex items-center gap-3 p-3">
                        <div>
                          <p className="text-xs text-muted-foreground">{t('customers.createdAt')}</p>
                          <p className="font-semibold">{formatDate(selectedCustomer.created_at)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedCustomer.updated_at && (
                    <Card className="border-dashed">
                      <CardContent className="flex items-center gap-3 p-3">
                        <div>
                          <p className="text-xs text-muted-foreground">{t('customers.updatedAt')}</p>
                          <p className="font-semibold">{formatDate(selectedCustomer.updated_at)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* ─── Qarz to'lash (FIFO: eng eski buyurtmadan boshlab) ─── */}
                {totalDebt > 0 && (
                  <div className="rounded-lg border p-4 space-y-4 bg-muted/10">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        {t('customers.payDebtTitle', "Qarz to'lash")}
                      </h4>
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={() => setPayAmount(String(totalDebt))}
                      >
                        {t('customers.payFullDebt', "To'liq to'lash")} ({formatCurrency(totalDebt)})
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('customers.paymentAmount', "To'lov summasi")}</Label>
                        <Input
                          type="number"
                          min="0"
                          max={totalDebt}
                          placeholder="0.00"
                          value={payAmount}
                          onFocus={(e: FocusEvent<HTMLInputElement>) => e.target.select()}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className={payExceeds ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                        />
                        {payExceeds && (
                          <p className="text-xs font-medium text-red-500">
                            {t('customers.paymentExceedsDebt', "To'lov summasi qarzdan oshib ketdi")}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('payment.title', "To'lov turi")}</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={payType === 'cash' ? 'default' : 'outline'}
                            className={cn('h-10 text-xs', payType === 'cash' && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                            onClick={() => setPayType('cash')}
                          >
                            <Banknote className="h-4 w-4 mr-1.5" />
                            {t('payment.cash', 'Naqd')}
                          </Button>
                          <Button
                            type="button"
                            variant={payType === 'card' ? 'default' : 'outline'}
                            className={cn('h-10 text-xs', payType === 'card' && 'bg-blue-600 hover:bg-blue-700 text-white')}
                            onClick={() => setPayType('card')}
                          >
                            <CreditCard className="h-4 w-4 mr-1.5" />
                            {t('payment.card', 'Karta')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Karta tanlash — tugmalar bilan */}
                    {payType === 'card' && (
                      bankCards.length === 0 ? (
                        <p className="text-xs text-red-500">
                          {t('sales.noBankCards', "Faol bank kartasi yo'q — sozlamalardan qo'shing")}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {bankCards.map((card) => {
                            const selected = payBankCardId === String(card.id);
                            return (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => setPayBankCardId(String(card.id))}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                                  selected
                                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                    : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'
                                )}
                              >
                                <CreditCard className="h-3 w-3" />
                                {card.name}
                                {selected && <Check className="h-3 w-3" />}
                              </button>
                            );
                          })}
                        </div>
                      )
                    )}

                    {/* FIFO taqsimot ko'rinishi: to'lov qaysi buyurtmalarga bo'linadi */}
                    {payAmountNum > 0 && !payExceeds && (
                      <div className="rounded-lg border border-dashed p-3 space-y-1.5 bg-card">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('customers.fifoHint', "To'lov eng eski qarzdan boshlab taqsimlanadi")}
                        </p>
                        {allocationPreview.filter((a) => a.alloc > 0).map((a) => (
                          <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground truncate">
                              #{a.id} — {a.store_name} ({formatDate(a.created_at)})
                            </span>
                            <span className="font-semibold whitespace-nowrap">
                              {formatCurrency(a.alloc)}{' '}
                              {a.closed ? (
                                <span className="text-green-600">✓ {t('customers.willClose', 'yopiladi')}</span>
                              ) : (
                                <span className="text-[#ff6b00]">
                                  {t('customers.willRemain', 'qoladi')}: {formatCurrency(a.debt - a.alloc)}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handlePayDebt}
                      disabled={paying || payInvalid}
                    >
                      {paying ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {t('customers.payNow', "To'lash")}
                      {payAmountNum > 0 && !payExceeds ? ` — ${formatCurrency(payAmountNum)}` : ''}
                    </Button>
                  </div>
                )}

                {/* ─── To'lovlar tarixi ─── */}
                {(payments.length > 0 || loadingPayments) && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">{t('customers.paymentsHistory', "To'lovlar tarixi")}</h4>
                    {loadingPayments ? (
                      <p className="text-xs text-muted-foreground">{t('common.loading', 'Yuklanmoqda...')}</p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                        {payments.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 bg-card text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {p.type === 'card' ? (
                                <CreditCard className="h-4 w-4 text-blue-500 shrink-0" />
                              ) : (
                                <Banknote className="h-4 w-4 text-emerald-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {p.type === 'card'
                                    ? `${t('payment.card', 'Karta')}${p.bank_card_name ? ` — ${p.bank_card_name}` : ''}`
                                    : t('payment.cash', 'Naqd')}
                                  {p.sale ? ` · #${p.sale}` : ''}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {p.created_at ? new Date(p.created_at).toLocaleString() : ''}
                                </p>
                              </div>
                            </div>
                            <span className={cn('font-semibold whitespace-nowrap', p.is_refund ? 'text-red-500' : 'text-green-600')}>
                              {p.is_refund ? '-' : '+'}{formatCurrency(Number(p.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedCustomer.sales && selectedCustomer.sales.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">{t('customers.salesHistory', 'Xaridlar tarixi')}</h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {selectedCustomer.sales.map((sale: any) => (
                        <div key={sale.id} className="rounded-lg border p-3 space-y-2 bg-card">
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-sm font-semibold">{sale.store_name}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            {sale.items?.map((item: any) => (
                              <div key={item.id} className="flex justify-between items-start gap-4">
                                <span className="text-muted-foreground">
                                  {item.product_name} <span className="text-xs">x{item.quantity}</span>
                                </span>
                                <span className="font-medium whitespace-nowrap">{formatCurrency(Number(item.total_price))}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between pt-2 border-t mt-2 gap-1 sm:gap-4">
                            <span className="text-sm font-medium">{t('customers.totalAmount', 'Jami')}: {formatCurrency(Number(sale.total_amount))}</span>
                            <span className={`text-sm font-semibold ${sale.status === 'paid' ? 'text-green-600' : 'text-[#ff6b00]'}`}>
                              {sale.status === 'paid' ? t('customers.statusPaid', 'To\'langan') : t('customers.debt', 'Qarz') + ': ' + formatCurrency(Number(sale.total_amount) - Number(sale.paid_amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
