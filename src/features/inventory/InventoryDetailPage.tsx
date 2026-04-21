import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { InventoryHeader } from './InventoryHeader';
import { InventoryTable } from './InventoryTable';
import { InventoryTableSkeleton, InventoryStatsSkeleton } from './InventorySkeleton';
import { useInventoryStore } from '../../store/inventory.store';

export function InventoryDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const sessionId = Number(params.id);

  const [searchQuery, setSearchQuery] = useState('');

  const {
    currentSession,
    items,
    stats,
    loading,
    itemsLoading,
    updatingItemId,
    error,
    fetchSession,
    loadProducts,
    fetchItems,
    updateItemCount,
    completeInventory,
    clearError,
  } = useInventoryStore();

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId);
      fetchItems(sessionId);
    }
  }, [sessionId, fetchSession, fetchItems]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleLoadProducts = useCallback(async () => {
    try {
      await loadProducts(sessionId);
      toast.success(t('inventory.productsLoaded'));
    } catch {
      toast.error(t('inventory.loadFailed'));
    }
  }, [sessionId, loadProducts, t]);

  const handleComplete = useCallback(async () => {
    if (!stats || stats.pending > 0) {
      toast.error(t('inventory.completeWithPendingWarning'));
      return;
    }

    try {
      await completeInventory(sessionId);
      toast.success(t('inventory.completedSuccess'));
    } catch {
      toast.error(t('inventory.completeFailed'));
    }
  }, [sessionId, stats, completeInventory, t]);

  const handleCountChange = useCallback(
    (itemId: number, countedQty: number) => {
      updateItemCount(itemId, countedQty);
    },
    [updateItemCount]
  );

  const isLoading = loading || !currentSession;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={t('inventory.countingTitle')}
            description={currentSession ? `#${currentSession.id}` : ''}
          />
        </div>
      </div>

      {isLoading ? (
        <>
          <InventoryStatsSkeleton />
          <InventoryTableSkeleton />
        </>
      ) : (
        <>
          <InventoryHeader
            session={currentSession}
            stats={stats}
            onLoadProducts={handleLoadProducts}
            onComplete={handleComplete}
            loading={loading}
            loadingProducts={itemsLoading}
          />

          {itemsLoading ? (
            <InventoryTableSkeleton />
          ) : (
            <InventoryTable
              items={items}
              onCountChange={handleCountChange}
              updatingItemId={updatingItemId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}
        </>
      )}
    </div>
  );
}
