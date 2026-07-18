import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ScrollText, Monitor } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { DateRangeFilter } from '../../components/shared/DateRangeFilter';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { auditService } from '../../services/auditService';
import { roleService } from '../../services/roleService';
import type { AuditLogEntry, PermissionCatalogModule } from '../../types';
import { formatDate } from '../../utils';
import { handleError } from '../../utils/errorHandler';

const ACTION_KEYS: Record<string, string> = {
  create: 'audit.actionCreate',
  edit: 'audit.actionEdit',
  delete: 'audit.actionDelete',
  archive: 'audit.actionArchive',
  login: 'audit.actionLogin',
  logout: 'audit.actionLogout',
};

const ACTION_BADGES: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  edit: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  archive: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  login: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

// User-Agent'dan qisqa qurilma nomi
const shortDevice = (ua: string): string => {
  if (!ua) return '-';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ios/i.test(ua)) return 'iPhone/iPad';
  const browser =
    /edg\//i.test(ua) ? 'Edge' :
    /opr\//i.test(ua) ? 'Opera' :
    /chrome/i.test(ua) ? 'Chrome' :
    /firefox/i.test(ua) ? 'Firefox' :
    /safari/i.test(ua) ? 'Safari' : 'Brauzer';
  const os =
    /windows/i.test(ua) ? 'Windows' :
    /mac os/i.test(ua) ? 'macOS' :
    /linux/i.test(ua) ? 'Linux' : '';
  return os ? `${browser} · ${os}` : browser;
};

export function AuditLogPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [modules, setModules] = useState<PermissionCatalogModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewing, setViewing] = useState<AuditLogEntry | null>(null);

  const moduleLabels = useMemo(() => {
    const labels: Record<string, string> = { auth: t('audit.moduleAuth') };
    modules.forEach((m) => { labels[m.module] = m.label; });
    return labels;
  }, [modules, t]);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await auditService.getAll({
        page,
        limit,
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setLogs(response.data);
      setTotal(response.total);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) return;
      handleError(error, { showToast: true, logData: 'Failed to load audit logs' });
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, moduleFilter, actionFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    roleService.getCatalog().then(setModules).catch(() => setModules([]));
  }, []);

  // Qidiruv 400ms debounce bilan
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'created_at',
      header: t('audit.when'),
      render: (item) => (
        <span className="whitespace-nowrap tabular-nums text-xs">
          {formatDate(item.created_at)}{' '}
          {new Date(item.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'user_display',
      header: t('audit.who'),
      render: (item) => item.user_display || '-',
    },
    {
      key: 'module',
      header: t('audit.module'),
      render: (item) => moduleLabels[item.module] || item.module,
    },
    {
      key: 'action',
      header: t('audit.action'),
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${ACTION_BADGES[item.action] || 'bg-gray-100 text-gray-800'}`}>
          {ACTION_KEYS[item.action] ? t(ACTION_KEYS[item.action]) : item.action}
        </span>
      ),
    },
    {
      key: 'path',
      header: t('audit.target'),
      render: (item) => (
        <span className="text-xs text-muted-foreground font-mono" title={item.path}>
          {item.object_id ? `#${item.object_id} · ` : ''}{item.path.replace('/api/', '')}
        </span>
      ),
    },
    {
      key: 'status_code',
      header: t('audit.status'),
      render: (item) => item.status_code == null ? '-' : (
        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
          item.status_code < 300
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {item.status_code}
        </span>
      ),
    },
    {
      key: 'ip_address',
      header: 'IP',
      render: (item) => <span className="text-xs tabular-nums">{item.ip_address || '-'}</span>,
    },
    {
      key: 'user_agent',
      header: t('audit.device'),
      render: (item) => (
        <span className="text-xs inline-flex items-center gap-1" title={item.user_agent}>
          <Monitor className="h-3 w-3 text-muted-foreground" />
          {shortDevice(item.user_agent)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('audit.title')}
        description={t('audit.subtitle')}
      />

      {/* Filtrlar: mobilda ustma-ust to'liq enda, kengroq ekranda bir qatorda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('audit.searchPlaceholder')}
            value={searchInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm sm:w-auto"
          value={moduleFilter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => { setModuleFilter(e.target.value); setPage(1); }}
        >
          <option value="">{t('audit.allModules')}</option>
          <option value="auth">{t('audit.moduleAuth')}</option>
          {modules.map((m) => (
            <option key={m.module} value={m.module}>{m.label}</option>
          ))}
        </select>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm sm:w-auto"
          value={actionFilter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => { setActionFilter(e.target.value); setPage(1); }}
        >
          <option value="">{t('audit.allActions')}</option>
          {Object.entries(ACTION_KEYS).map(([action, key]) => (
            <option key={action} value={action}>{t(key)}</option>
          ))}
        </select>
        {/* Dan–gacha: bitta kalendarda oraliq bo'yalgan holda tanlanadi */}
        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
            setPage(1);
          }}
          className="w-full sm:w-64"
        />
      </div>

      <DataTable
        data={logs}
        columns={columns}
        loading={loading}
        onRowClick={(item: AuditLogEntry) => setViewing(item)}
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
          onLimitChange: (newLimit: number) => { setPage(1); setLimit(newLimit); },
        }}
      />

      {/* Tafsilotlar dialogi */}
      <Dialog open={!!viewing} onOpenChange={(open: boolean) => !open && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              {t('audit.detailsTitle')}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">{t('audit.who')}:</span> {viewing.user_display || '-'}</p>
              <p><span className="text-muted-foreground">{t('audit.when')}:</span> {formatDate(viewing.created_at)} {new Date(viewing.created_at).toLocaleTimeString('uz-UZ')}</p>
              <p><span className="text-muted-foreground">{t('audit.module')}:</span> {moduleLabels[viewing.module] || viewing.module}</p>
              <p><span className="text-muted-foreground">{t('audit.action')}:</span> {ACTION_KEYS[viewing.action] ? t(ACTION_KEYS[viewing.action]) : viewing.action} ({viewing.method} · {viewing.status_code ?? '-'})</p>
              <p className="font-mono text-xs break-all"><span className="text-muted-foreground font-sans">{t('audit.target')}:</span> {viewing.path}</p>
              <p><span className="text-muted-foreground">IP:</span> {viewing.ip_address || '-'}</p>
              <p className="text-xs break-all"><span className="text-muted-foreground">{t('audit.device')}:</span> {viewing.user_agent || '-'}</p>
              {viewing.details && (
                <div>
                  <p className="text-muted-foreground mb-1">{t('audit.requestBody')}:</p>
                  <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-64 overflow-y-auto">
                    {JSON.stringify(viewing.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AuditLogPage;
