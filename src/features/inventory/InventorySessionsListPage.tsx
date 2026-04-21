import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, FileText, Eye, CheckCircle2, Clock, CircleDot, Package } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Label } from '../../components/ui/Label';
import { useInventoryStore } from '../../store/inventory.store';
import { storeService } from '../../services/storeService';
import type { Store } from '../../types';
import { formatDate } from '../../utils';

export function InventorySessionsListPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const navigate = useNavigate();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { sessions, loading, fetchSessions, createSession } = useInventoryStore();

  const loadStores = useCallback(async () => {
    try {
      const res = await storeService.getAll();
      setStores(Array.isArray(res.data) ? res.data : []);
    } catch {
      console.error('Failed to load stores:');
    }
  }, []);

  useEffect(() => {
    loadStores();
    fetchSessions();
  }, [loadStores, fetchSessions]);

  useEffect(() => {
    fetchSessions(statusFilter !== 'all' ? { status: statusFilter } : undefined);
  }, [statusFilter, fetchSessions]);

  const handleCreateSession = async () => {
    if (!selectedStore) {
      toast.error(t('inventory.selectStore'));
      return;
    }

    try {
      const session = await createSession({ store_id: parseInt(selectedStore) });
      setShowCreateDialog(false);
      setSelectedStore('');
      toast.success(t('inventory.sessionCreated'));
      navigate(`/${lang}/inventory-session/${session.id}`);
    } catch {
      toast.error(t('inventory.createFailed'));
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          icon: CircleDot,
          label: t('inventory.statusDraft'),
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
      case 'in_progress':
        return {
          icon: Clock,
          label: t('inventory.statusInProgress'),
          className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          label: t('inventory.statusCompleted'),
          className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        };
      default:
        return {
          icon: CircleDot,
          label: status,
          className: 'bg-gray-100 text-gray-700',
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={t('inventory.sessions')}
          description={t('inventory.sessionsDescription')}
        />
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('inventory.startInventory')}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('inventory.filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inventory.allStatuses')}</SelectItem>
            <SelectItem value="draft">{t('inventory.statusDraft')}</SelectItem>
            <SelectItem value="in_progress">{t('inventory.statusInProgress')}</SelectItem>
            <SelectItem value="completed">{t('inventory.statusCompleted')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
          <p>{t('common.loading')}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('inventory.noSessions')}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('inventory.startInventory')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 md:hidden">
          {sessions.map((session) => {
            const statusConfig = getStatusConfig(session.status);
            const StatusIcon = statusConfig.icon;
            return (
              <Card key={session.id}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold">#{session.id}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {session.store_name || t('inventory.store')}: {session.store_id}
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${statusConfig.className}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t('inventory.totalItems')}
                      </p>
                      <p className="mt-1 font-semibold">{session.total_items || 0}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t('inventory.createdAt')}
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/${lang}/inventory-session/${session.id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" className="w-full">
                        <Eye className="mr-2 h-4 w-4" />
                        {t('inventory.openSession')}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="hidden rounded-md border md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('stores.title')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  {t('inventory.totalItems')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('common.status')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {t('inventory.createdAt')}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessions.map((session) => {
                const statusConfig = getStatusConfig(session.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <tr key={session.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">#{session.id}</td>
                    <td className="px-4 py-3">
                      {session.store_name || t('inventory.store')}: {session.store_id}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {session.total_items || 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs ${statusConfig.className}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(session.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/${lang}/inventory-session/${session.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inventory.startNewSession')}</DialogTitle>
            <DialogDescription>
              {t('inventory.startNewSessionDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('stores.title')}</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder={t('inventory.selectStore')} />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateDialog(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={handleCreateSession} disabled={!selectedStore}>
                {t('inventory.createSession')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}