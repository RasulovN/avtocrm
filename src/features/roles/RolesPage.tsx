import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { roleService } from '../../services/roleService';
import type { Role, PermissionCatalogModule } from '../../types';
import { handleError } from '../../utils/errorHandler';
import { useAuthStore } from '../../app/store';

// Ustunlar tartibi barqaror bo'lishi uchun amallarning kanonik tartibi
const ACTION_ORDER = ['view', 'create', 'edit', 'delete', 'archive'];

export function RolesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'uz';
  const { user: currentUser, hasPermission } = useAuthStore();
  const isSuper = Boolean(currentUser?.is_superuser || currentUser?.role === 'superuser');
  const canSeeUsers = isSuper || (Array.isArray(currentUser?.permissions) && hasPermission('users.view'));
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const actionColumns = useMemo(() => {
    const present = new Set<string>();
    catalog.forEach((m) => m.actions.forEach((a) => present.add(a.action)));
    return ACTION_ORDER.filter((a) => present.has(a));
  }, [catalog]);

  const actionLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    catalog.forEach((m) => m.actions.forEach((a) => { labels[a.action] = a.label; }));
    return labels;
  }, [catalog]);

  // "Hammasini tanlash" uchun katalogdagi barcha permission kodlari
  const allCodes = useMemo(
    () => catalog.flatMap((m) => m.actions.map((a) => a.code)),
    [catalog]
  );
  const allSelected = allCodes.length > 0 && allCodes.every((c) => selected.has(c));
  const someSelected = selected.size > 0 && !allSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allCodes));
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesData, catalogData] = await Promise.all([
        roleService.getAll(),
        roleService.getCatalog(),
      ]);
      setRoles(rolesData);
      setCatalog(catalogData);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: true, logData: 'Failed to load roles' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setName(role.name);
      setDescription(role.description || '');
      setSelected(new Set(role.permissions || []));
    } else {
      setEditingRole(null);
      setName('');
      setDescription('');
      setSelected(new Set());
    }
    setDialogOpen(true);
  };

  const toggleCode = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleModule = (module: PermissionCatalogModule) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const codes = module.actions.map((a) => a.code);
      const allOn = codes.every((c) => next.has(c));
      codes.forEach((c) => (allOn ? next.delete(c) : next.add(c)));
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('roles.nameRequired'));
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        permissions: Array.from(selected),
      };
      if (editingRole) {
        await roleService.update(editingRole.id, payload);
        toast.success(t('roles.roleUpdated'));
      } else {
        await roleService.create(payload);
        toast.success(t('roles.roleAdded'));
      }
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      setDeleting(true);
      await roleService.delete(deleteId);
      toast.success(t('roles.roleDeleted'));
      await loadData();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: t('roles.name'),
      render: (item: Role) => (
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: t('roles.description'),
      render: (item: Role) => item.description || '-',
    },
    {
      key: 'permissions',
      header: t('roles.permissions'),
      render: (item: Role) => (
        <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
          {item.permissions?.length || 0} {t('roles.permissionCount')}
        </span>
      ),
    },
    {
      key: 'users_count',
      header: t('roles.usersCount'),
      render: (item: Role) => item.users_count ?? 0,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item: Role) => (
        <div className="flex items-center justify-end gap-2">
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
      {/* Foydalanuvchilar / Rollar bo'lim tab'lari */}
      <div className="flex items-center gap-1 border-b border-border">
        {canSeeUsers && (
          <Link
            to={`/${lang}/settings/users`}
            className="px-4 py-2 -mb-px border-b-2 border-transparent text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            {t('users.title')}
          </Link>
        )}
        <Link
          to={`/${lang}/settings/roles`}
          className="px-4 py-2 -mb-px border-b-2 border-primary text-primary text-sm font-medium"
        >
          {t('roles.title')}
        </Link>
      </div>

      <PageHeader
        title={t('roles.title')}
        description={t('roles.subtitle')}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('roles.addRole')}
          </Button>
        }
      />

      <DataTable data={roles} columns={columns} loading={loading} />

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        description={t('roles.deleteConfirm')}
        confirmText={t('common.delete')}
        variant="destructive"
        loading={deleting}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? t('roles.editRole') : t('roles.addRole')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('roles.name')}</Label>
                <Input
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder={t('roles.namePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('roles.description')}</Label>
                <Input
                  value={description}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  placeholder={t('roles.descriptionPlaceholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('roles.permissions')}</Label>
              <p className="text-xs text-muted-foreground">{t('roles.permissionsHint')}</p>
              <div className="border rounded-lg overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">
                        <label className="flex items-center gap-2 cursor-pointer select-none" title={t('roles.selectAll')}>
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={allSelected}
                            onChange={toggleAll}
                          />
                          <span>{t('roles.module')}</span>
                        </label>
                      </th>
                      {actionColumns.map((action) => (
                        <th key={action} className="text-center px-3 py-2 font-medium whitespace-nowrap">
                          {actionLabels[action] || action}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((module) => {
                      const codes = module.actions.map((a) => a.code);
                      const allOn = codes.length > 0 && codes.every((c) => selected.has(c));
                      return (
                        <tr key={module.module} className="border-t hover:bg-accent/40">
                          <td className="px-3 py-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={allOn}
                                onChange={() => toggleModule(module)}
                              />
                              <span className="font-medium">{module.label}</span>
                            </label>
                          </td>
                          {actionColumns.map((action) => {
                            const entry = module.actions.find((a) => a.action === action);
                            return (
                              <td key={action} className="text-center px-3 py-2">
                                {entry ? (
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-primary cursor-pointer"
                                    checked={selected.has(entry.code)}
                                    onChange={() => toggleCode(entry.code)}
                                  />
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('roles.selectedCount', { count: selected.size })}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RolesPage;
