import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Eye, TriangleAlert } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { useInventoryStore } from '../../store/inventory.store';
import { formatDate } from '../../utils';

export function InventoryShortagesPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lang = params.lang || 'uz';
  const { sessions, loading, fetchSessions } = useInventoryStore();

  useEffect(() => {
    fetchSessions({ status: 'completed' });
  }, [fetchSessions]);

  const shortageSessions = useMemo(
    () => sessions.filter((session) => (session.mismatched_items || 0) > 0),
    [sessions]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.shortages')}
        description={t('inventory.shortagesDescription')}
      />

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          <TriangleAlert className="mx-auto mb-4 h-12 w-12 animate-pulse opacity-50" />
          <p>{t('common.loading')}</p>
        </div>
      ) : shortageSessions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <TriangleAlert className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>{t('common.noData')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {shortageSessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold">#{session.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {`${t('inventory.store')}: ${session.store}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(session.started_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                    {t('inventory.shortageCount')}: {session.mismatched_items || 0}
                  </div>
                  <Link to={`/${lang}/inventory-session/${session.id}`}>
                    <Button variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      {t('inventory.openSession')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
