import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CreditCard, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { bankCardService } from '../../services/bankCardService';
import { useAuthStore } from '../../app/store';
import { formatDate } from '../../utils';
import { handleError } from '../../utils/errorHandler';
import type { BankCard, BankCardFormData } from '../../types';

export function BankCardsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isSuperUser = Boolean(user?.is_superuser || user?.role === 'superuser');

  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);
  const [formData, setFormData] = useState<BankCardFormData>({ name: '', is_default: false });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await bankCardService.getAll();
      setCards(data);
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Failed to load bank cards' });
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
  }, []);

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return cards;
    return cards.filter((card) => card.name.toLowerCase().includes(query));
  }, [cards, searchQuery]);

  const handleOpenDialog = (card?: BankCard) => {
    if (card) {
      setEditingCard(card);
      setFormData({ name: card.name, is_default: card.is_default });
    } else {
      setEditingCard(null);
      setFormData({ name: '', is_default: false });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      setSaving(true);
      if (editingCard) {
        await bankCardService.update(editingCard.id, {
          name: formData.name.trim(),
          is_default: formData.is_default,
        });
        toast.success(t('bankCards.cardUpdated', 'Karta yangilandi'));
      } else {
        await bankCardService.create({
          name: formData.name.trim(),
          is_default: formData.is_default,
        });
        toast.success(t('bankCards.cardAdded', 'Karta qo‘shildi'));
      }
      setIsDialogOpen(false);
      await loadCards();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleting(true);
      await bankCardService.remove(id);
      toast.success(t('bankCards.cardDeleted', 'Karta o‘chirildi (faolsizlantirildi)'));
      await loadCards();
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const statusBadge = (card: BankCard) => (
    <Badge variant={card.is_active ? 'success' : 'danger'}>
      {card.is_active ? t('bankCards.active', 'Faol') : t('bankCards.inactive', 'Faol emas')}
    </Badge>
  );

  const columns: Column<BankCard>[] = [
    {
      key: 'name',
      header: t('bankCards.cardName', 'Karta nomi'),
      className: 'font-medium',
      render: (item) => (
        <span className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          {item.name}
        </span>
      ),
    },
    {
      key: 'is_default',
      header: t('bankCards.isDefault', 'Asosiy'),
      render: (item) =>
        item.is_default ? <Badge variant="info">{t('bankCards.default', 'Asosiy')}</Badge> : '—',
    },
    {
      key: 'is_active',
      header: t('common.status'),
      render: statusBadge,
    },
    {
      key: 'created_at',
      header: t('common.date'),
      render: (item) => (item.created_at ? formatDate(item.created_at) : '—'),
    },
  ];

  if (isSuperUser) {
    columns.push({
      key: 'actions',
      header: t('common.actions'),
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              handleOpenDialog(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {item.is_active && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                setDeleteId(item.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('bankCards.title', 'Bank kartalari')}
        description={t('bankCards.description', 'To‘lov qabul qilinadigan bank kartalari ro‘yxati')}
        actions={
          isSuperUser ? (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('bankCards.addCard', 'Karta qo‘shish')}
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative w-full flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Mobile View */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {t('bankCards.noCards', 'Bank kartalari yo‘q')}
          </div>
        ) : (
          filteredCards.map((card) => (
            <Card key={card.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{card.name}</p>
                      {card.created_at && (
                        <p className="text-xs text-muted-foreground">{formatDate(card.created_at)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {statusBadge(card)}
                    {card.is_default && <Badge variant="info">{t('bankCards.default', 'Asosiy')}</Badge>}
                  </div>
                </div>
                {isSuperUser && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => handleOpenDialog(card)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t('common.edit')}
                    </Button>
                    {card.is_active && (
                      <Button variant="outline" className="flex-1" onClick={() => setDeleteId(card.id)}>
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                        {t('common.delete')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <DataTable
          data={filteredCards}
          columns={columns}
          loading={loading}
          emptyMessage={t('bankCards.noCards', 'Bank kartalari yo‘q')}
          loadingMessage={t('common.loading')}
          onRowClick={isSuperUser ? (item: BankCard) => handleOpenDialog(item) : undefined}
        />
      </div>

      {isSuperUser && (
        <>
          <ConfirmDialog
            open={deleteId !== null}
            onOpenChange={(open: boolean) => !open && setDeleteId(null)}
            onConfirm={() => deleteId !== null && handleDelete(deleteId)}
            title={t('common.delete')}
            description={t(
              'bankCards.deleteConfirm',
              'Karta o‘chirilmaydi, faolsizlantiriladi: yangi to‘lovda tanlab bo‘lmaydi, eski hisobotlarda ko‘rinaveradi.'
            )}
            confirmText={t('common.delete')}
            variant="destructive"
            loading={deleting}
          />

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCard
                    ? t('bankCards.editCard', 'Kartani tahrirlash')
                    : t('bankCards.addCard', 'Karta qo‘shish')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-name">{t('bankCards.cardName', 'Karta nomi')}</Label>
                    <Input
                      id="card-name"
                      value={formData.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Uzcard, Humo..."
                      required
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_default)}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev) => ({ ...prev, is_default: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input"
                    />
                    {t('bankCards.setDefault', 'Asosiy karta qilish')}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t('bankCards.defaultHint', 'Asosiy karta kassada avtomatik tanlanadi. Bir vaqtda faqat bitta asosiy karta bo‘ladi.')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving || !formData.name.trim()}>
                    {saving ? t('common.loading') : t('common.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
