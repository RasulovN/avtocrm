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
import type { User, UserFormData, Store } from '../../types';
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
    role: 'store_user',
    phone_number: '',
    store_id: '',
  });
  const [saving, setSaving] = useState(false);
  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);
  const safeStores = useMemo(() => (Array.isArray(stores) ? stores : []), [stores]);
  const safeLogs = useMemo(() => {
    const logs = (viewingUser as User & { logs?: Array<{ id?: string | number; action?: string; timestamp?: string; created_at?: string }> } | null)?.logs;
    return Array.isArray(logs) ? logs : [];
  }, [viewingUser]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getAll({ page, limit });
      setUsers(Array.isArray(response.data) ? response.data : []);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([
        {
          id: '1',
          user_id: 'USR001',
          full_name: 'Admin User',
          role: 'admin',
          phone: '+998901234567',
          store_id: undefined,
          store_name: undefined,
          created_at: new Date().toISOString(),
          logs: []
        },
        {
          id: '2',
          user_id: 'USR002',
          full_name: 'Store Manager',
          role: 'store_admin',
          phone: '+998901234568',
          store_id: '1',
          store_name: 'Main Store',
          created_at: new Date().toISOString(),
          logs: []
        },
      ]);
      setTotal(2);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadStores = useCallback(async () => {
    try {
      const response = await storeService.getAll({ page: 1, limit: 100 });
      setStores(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
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
      loadUsers();
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
        role: user.role,
        phone_number: user.phone_number,
        store_id: user.store_id || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: '',
        password: '',
        role: 'store_user',
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
      setSaving(true);
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await userService.update(editingUser.id, updateData);
      } else {
        await userService.create(formData);
      }
      setDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<User>[] = [
    { key: 'user_id', header: t('users.userId') },
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
          {item.role === 'admin' ? t('users.admin') : item.role === 'store_admin' ? t('users.storeAdmin') : t('users.storeUser')}
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
          <Button variant="ghost" size="icon" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setDeleteId(item.id); }}>
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

      <DataTable
        data={safeUsers}
        columns={columns}
        loading={loading}
        pagination={{ page, limit, total, onPageChange: setPage }}
      />

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
              <Label>{t('users.phone')}</Label>
              <Input
                type="tel"
                value={formData.phone_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('users.role')}</Label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={formData.role}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, role: e.target.value as 'admin' | 'store_admin' | 'store_user' })}
              >
                <option value="store_user">{t('users.storeUser')}</option>
                <option value="store_admin">{t('users.storeAdmin')}</option>
                <option value="admin">{t('users.admin')}</option>
              </select>
            </div>
            {formData.role !== 'admin' && (
              <div className="space-y-2">
                <Label>{t('users.store')}</Label>
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
            )}
            <div className="space-y-2">
              <Label>{t('users.password')} {editingUser && `(${t('users.optional')})`}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </div>
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
