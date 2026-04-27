import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { useInventoryStore } from '../../store/inventory.store';
import { storeService } from '../../services/storeService';
import { useAuthStore } from '../../app/store';
import type { Store } from '../../types';

export default function InventoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const lang = params.lang || 'uz';
  const { user } = useAuthStore();
  const isAdmin = Boolean(user?.is_superuser);
  const userStoreId = user?.store_id || '';

  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState(userStoreId || '');

  const { startSession } = useInventoryStore();

  const loadStores = useCallback(async () => {
    try {
      setStoresLoading(true);
      const response = await storeService.getAll({ limit: 300 });
      const allStores = Array.isArray(response.data) ? response.data : [];
      setStores(isAdmin ? allStores : allStores.filter((store) => String(store.id) === String(userStoreId)));
    } catch {
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, [isAdmin, userStoreId]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  useEffect(() => {
    if (!isAdmin && userStoreId) {
      setSelectedStore(userStoreId);
    }
  }, [isAdmin, userStoreId]);

  const handleStart = async () => {
    if (!selectedStore) {
      toast.error(t('inventory.selectStore'));
      return;
    }
    try {
      const sessionId = await startSession(parseInt(selectedStore));
      navigate(`/${lang}/inventory-session/${sessionId}`);
    } catch {
      toast.error(t('inventory.createFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.startInventory')}
        description={t('inventory.startNewSessionDescription')}
      />
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">{t('inventory.startNewSession')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('inventory.startNewSessionDescription')}
          </p>
          <Select value={selectedStore} onValueChange={setSelectedStore} disabled={storesLoading}>
            <SelectTrigger>
              <SelectValue placeholder={t('inventory.selectStore')} />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={String(store.id)}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <Button onClick={handleStart} disabled={!selectedStore || storesLoading} className="w-full sm:w-auto">
              {t('inventory.startInventory')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

