import { useEffect, useState, useMemo, useCallback, type ChangeEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { userService } from '../../services/userService';
import { storeService } from '../../services/storeService';
import { roleService } from '../../services/roleService';
import type { User, UserFormData, Store, Role } from '../../types';
import { formatDate } from '../../utils';
import { handleError } from '../../utils/errorHandler';
import { useAuthStore } from '../../app/store';

export function UserListPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'uz';
  const { user: currentUser, hasPermission } = useAuthStore();
  const isSuper = Boolean(currentUser?.is_superuser || currentUser?.role === 'superuser');
  const canSeeRoles = isSuper || (Array.isArray(currentUser?.permissions) && hasPermission('roles.view'));
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [systemRoles, setSystemRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    password: '',
    confirm_password: '',
    email: '',
    phone_number: '',
    store_id: '',
    role_id: null,
  });
  const [saving, setSaving] = useState(false);
  // Saqlashga urinishdan keyin bo'sh majburiy maydonlar qizil ko'rsatiladi
  const [showErrors, setShowErrors] = useState(false);

  const fullNameMissing = !formData.full_name?.trim();
  const emailMissing = !formData.email?.trim();
  const phoneMissing = !formData.phone_number?.trim();
  const passwordMissing = !editingUser && !formData.password;
  const confirmMissing = !editingUser && !formData.confirm_password;
  const passwordMismatch =
    !editingUser &&
    Boolean(formData.password) &&
    Boolean(formData.confirm_password) &&
    formData.password !== formData.confirm_password;

  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);
  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeLogs = useMemo(() => {
    const source = viewingUser as User & {
      logs?: Array<{ id?: string | number; action?: string; timestamp?: string; created_at?: string }>;
      history?: Array<{ id?: string | number; action?: string; timestamp?: string; created_at?: string }>;
    } | null;
    const logs = source?.logs ?? source?.history;
    return Array.isArray(logs) ? logs : [];
  }, [viewingUser]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getAll({ page, limit });
      setUsers(Array.isArray(response.data) ? response.data : []);
      setTotal(response.total);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: true, logData: 'Failed to load users' });
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const loadStores = useCallback(async () => {
    try {
      const response = await storeService.getAll({ page: 1, limit: 100 });
      setStores(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: true, logData: 'Failed to load stores' });
    }
  }, []);

  const loadSystemRoles = useCallback(async () => {
    try {
      setSystemRoles(await roleService.getAll());
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: false, logData: 'Failed to load roles' });
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadStores();
    void loadSystemRoles();
  }, [loadUsers, loadStores, loadSystemRoles]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await userService.delete(deleteId);
      await loadUsers();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name,
        password: '',
        confirm_password: '',
        email: user.email || '',
        phone_number: user.phone_number,
        store_id: user.store_id || '',
        role_id: user.role_id ?? null,
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: '',
        password: '',
        confirm_password: '',
        email: '',
        phone_number: '',
        store_id: '',
        role_id: null,
      });
    }
    setShowErrors(false);
    setDialogOpen(true);
  };

  const handleViewLogs = (user: User) => {
    setViewingUser(user);
    setLogsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (fullNameMissing || phoneMissing || emailMissing) {
        setShowErrors(true);
        toast.error(t('errors.requiredFields', 'Majburiy (*) maydonlarni to\'ldiring'));
        return;
      }
      if (passwordMissing || confirmMissing) {
        setShowErrors(true);
        toast.error(t('errors.requiredFields', 'Parol va tasdiqlash maydonlarini to\'ldiring'));
        return;
      }
      if (passwordMismatch) {
        setShowErrors(true);
        toast.error(t('errors.passwordMismatch', 'Parollar mos kelmadi'));
        return;
      }
      setSaving(true);
      if (editingUser) {
        const id = editingUser.id ?? editingUser.user_id;
        if (!id) {
          toast.error(t('errors.generic', 'Xatolik yuz berdi'));
          return;
        }
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          role_id: formData.role_id ?? null,
        };
        await userService.update(String(id), updateData);
      } else {
        // store ixtiyoriy: do'konga bog'lanmagan (admin turidagi) user ham yaratish mumkin
        const payload = { ...formData };
        if (!payload.store_id) delete payload.store_id;
        await userService.create(payload);
      }
      setDialogOpen(false);
      await loadUsers();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<User>[] = [
    { key: 'id', header: t('users.userId'), render: (item: User) => String(item.user_id || item.id || '') },
    { key: 'full_name', header: t('users.fullName') },
    { key: 'phone_number', header: t('users.phone') },
    {
      key: 'role_name',
      header: t('users.systemRole'),
      render: (item: User) => item.role_name
        ? <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">{item.role_name}</span>
        : <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">{t('users.noRole')}</span>,
    },
    {
      key: 'store_name',
      header: t('users.store'),
      render: (item: User) => item.store_name || '-',
    },
    {
      key: 'created_at',
      header: t('common.createdAt'),
      render: (item: User) => formatDate(item.created_at),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item: User) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleViewLogs(item); }} title={t('users.logs')}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleOpenDialog(item); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              const id = item.id ?? item.user_id;
              if (!id) return;
              setDeleteId(String(id));
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Foydalanuvchilar / Rollar bo'lim tab'lari */}
      <div className="flex items-center gap-1 border-b border-border">
        <Link
          to={`/${lang}/settings/users`}
          className="px-4 py-2 -mb-px border-b-2 border-primary text-primary text-sm font-medium"
        >
          {t('users.title')}
        </Link>
        {canSeeRoles && (
          <Link
            to={`/${lang}/settings/roles`}
            className="px-4 py-2 -mb-px border-b-2 border-transparent text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            {t('roles.title')}
          </Link>
        )}
      </div>

      <PageHeader
        title={t('users.title')}
        description={t('users.title')}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('users.addUser')}
          </Button>
        }
      />

      {safeUsers.length > 0 && (
        <div className="space-y-3 md:hidden">
          {safeUsers.map((item) => {
            const userId = item.user_id || item.id || '';
            return (
              <div key={userId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">ID: {userId}</p>
                    <p className="font-semibold text-foreground truncate">{item.full_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.phone_number}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                      item.role_name ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.role_name || t('users.noRole')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleViewLogs(item)} title={t('users.logs')}>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(item)} title={t('common.edit')}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setDeleteId(String(userId))} title={t('common.delete')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('users.store')}</p>
                    <p className="mt-1 font-medium">{item.store_name || '-'}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('common.email')}</p>
                    <p className="mt-1 font-medium text-xs truncate">{item.email || '-'}</p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t('common.createdAt')}</p>
                    <p className="mt-1 font-medium">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="hidden md:block">
        <DataTable
          data={safeUsers}
          columns={columns}
          loading={loading}
          pagination={{
            page,
            limit,
            total,
            onPageChange: setPage,
            onLimitChange: (newLimit) => {
              setPage(1);
              setLimit(newLimit);
            }
          }}
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        description={t('users.userDeleted')}
        confirmText={t('common.delete')}
        variant="destructive"
        loading={deleting}
      />

      {/* User Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? t('users.editUser') : t('users.addUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                {t('users.fullName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.full_name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                className={showErrors && fullNameMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {showErrors && fullNameMissing && (
                <p className="text-xs text-red-600">{t('users.fullNameRequired', 'F.I.Sh kiritilishi shart!')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                {t('users.email')} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                className={showErrors && emailMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {showErrors && emailMissing && (
                <p className="text-xs text-red-600">{t('users.emailRequired', 'Email kiritilishi shart!')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                {t('users.phone')} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="tel"
                placeholder="+998901234567"
                value={formData.phone_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone_number: e.target.value })}
                className={showErrors && phoneMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {showErrors && phoneMissing && (
                <p className="text-xs text-red-600">{t('users.phoneRequired', 'Telefon raqami kiritilishi shart!')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('users.systemRole')}</Label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={formData.role_id ?? ''}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, role_id: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">{t('users.noRole')}</option>
                {systemRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>
                    {t('users.store')}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({t('common.optional', 'ixtiyoriy')})
                    </span>
                  </Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={formData.store_id || ''}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, store_id: e.target.value })}
                  >
                    <option value="">{t('common.select')}</option>
                    {safeStores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {t('users.password')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                    className={
                      showErrors && (passwordMissing || passwordMismatch)
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : ''
                    }
                  />
                  {showErrors && passwordMissing && (
                    <p className="text-xs text-red-600">{t('users.passwordRequired', 'Parol kiritilishi shart!')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    {t('users.confirmPassword')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className={
                      showErrors && (confirmMissing || passwordMismatch)
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : ''
                    }
                  />
                  {showErrors && confirmMissing && (
                    <p className="text-xs text-red-600">
                      {t('users.confirmPasswordRequired', 'Parol tasdig‘i kiritilishi shart!')}
                    </p>
                  )}
                  {showErrors && passwordMismatch && (
                    <p className="text-xs text-red-600">{t('errors.passwordMismatch', 'Parollar mos kelmadi')}</p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
          </DialogFooter> 
        </DialogContent>
      </Dialog>

      {/* User Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('users.logs')} - {viewingUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {safeLogs.length > 0 ? (
              safeLogs.map((log, index) => (
                <div key={log.id ?? index} className="p-3 border rounded-md">
                  <p className="text-sm font-medium">{log.action || '-'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(log.timestamp || log.created_at || new Date().toISOString())}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">{t('users.noLogs')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
