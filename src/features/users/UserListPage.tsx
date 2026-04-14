import { useEffect, useState, useMemo, useCallback, type ChangeEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { User, UserFormData, UserRole, Store } from '../../types';
import { formatDate } from '../../utils';

export function UserListPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
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
    role: 's',
    phone_number: '',
    store_id: '',
  });
  const [saving, setSaving] = useState(false);
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
      console.error('Failed to load users:', error);
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
      console.error('Failed to load stores:', error);
      setStores([
        { id: '1', name: 'Main Store', address: 'Tashkent', phone: '+998901234567', is_warehouse: false, created_at: new Date().toISOString() },
        { id: '2', name: 'Warehouse', address: 'Tashkent', phone: '+998901234568', is_warehouse: true, created_at: new Date().toISOString() },
      ]);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadStores();
  }, [loadUsers, loadStores]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await userService.delete(deleteId);
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
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
        role: user.role as UserRole,
        phone_number: user.phone_number,
        store_id: user.store_id || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: '',
        password: '',
        confirm_password: '',
        email: '',
        role: 's' as UserRole,
        phone_number: '',
        store_id: '',
      });
    }
    setDialogOpen(true);
  };

  const handleViewLogs = (user: User) => {
    setViewingUser(user);
    setLogsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.full_name || !formData.phone_number || !formData.email) {
        console.error('Missing required fields');
        return;
      }
      if (!editingUser && (!formData.password || !formData.confirm_password)) {
        console.error('Password and confirm password are required');
        return;
      }
      if (!editingUser && formData.password && formData.confirm_password && formData.password !== formData.confirm_password) {
        console.error('Passwords do not match');
        return;
      }
      setSaving(true);
      if (editingUser) {
        const id = editingUser.id ?? editingUser.user_id;
        if (!id) {
          console.error('Missing user id for update');
          return;
        }
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
        };
        await userService.update(String(id), updateData);
      } else {
        if (!formData.store_id) {
          console.error('Store is required');
          return;
        }
        await userService.create(formData);
      }
      setDialogOpen(false);
      await loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<User>[] = [
    { key: 'id', header: t('users.userId'), render: (item: User) => String(item.user_id || item.id || '') },
    { key: 'full_name', header: t('users.fullName') },
    { key: 'phone_number', header: t('users.phone') },
    {
      key: 'role',
      header: t('users.role'),
      render: (item: User) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          item.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
          item.role === 'store_admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        }`}>
          {item.role === 's' ? t('users.seller') : item.role === 'su' ? t('users.superUser') : item.role === 'admin' ? t('users.admin') : item.role === 'store_admin' ? t('users.storeAdmin') : t('users.storeUser')}
        </span>
      ),
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
                  <div>
                    <p className="text-xs text-muted-foreground">ID: {userId}</p>
                    <p className="font-semibold text-foreground">{item.full_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.phone_number}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                    item.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    item.role === 'store_admin' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.role === 's' ? t('users.seller') : item.role === 'su' ? t('users.superUser') : item.role === 'admin' ? t('users.admin') : item.role === 'store_admin' ? t('users.storeAdmin') : t('users.storeUser')}
                  </span>
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

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => handleViewLogs(item)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {t('users.logs')}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => handleOpenDialog(item)}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t('common.edit')}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setDeleteId(String(userId))}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common.delete')}
                  </Button>
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
          pagination={{ page, limit, total, onPageChange: setPage }}
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
              <Label>{t('users.fullName')}</Label>
              <Input
                value={formData.full_name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('users.email')}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('users.phone')}</Label>
              <Input
                type="tel"
                value={formData.phone_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone_number: e.target.value })}
                required
              />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>{t('users.store')}</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={formData.store_id || ''}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, store_id: e.target.value })}
                    required
                  >
                    <option value="">{t('common.select')}</option>
                    {safeStores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t('users.password')}</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('users.confirmPassword')}</Label>
                  <Input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, confirm_password: e.target.value })}
                    required
                  />
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
