import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Wallet, CheckCircle2, Loader2, Banknote, CreditCard, Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { inventoryService } from '../../services/inventoryService';
import { supplierService } from '../../services/supplierService';
import { bankCardService } from '../../services/bankCardService';
import { formatCurrency, formatDate, formatAmountInput, parseAmountInput } from '../../utils';
import { handleError } from '../../utils/errorHandler';
import type { Supplier, ContractEntry, BankCard } from '../../types';

interface SupplierPayDialogProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** To'lovdan keyin sahifadagi barcha ma'lumotlarni yangilash */
  onPaid: () => void;
}

// Pul hisob-kitoblari float xatosiz bo'lishi uchun tiyinda (butun son) yuritiladi
const toCents = (value: unknown): number => Math.round((Number(value) || 0) * 100);

export function SupplierPayDialog({ supplier, open, onOpenChange, onPaid }: SupplierPayDialogProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ContractEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [amountInput, setAmountInput] = useState('');
  const [paying, setPaying] = useState(false);

  // To'lov taqsimoti: naqd va karta summalari (ikkalasi birga = aralash to'lov)
  const [cashInput, setCashInput] = useState('');
  const [cardInput, setCardInput] = useState('');
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [selectedBankCardId, setSelectedBankCardId] = useState('');

  const loadEntries = useCallback(async () => {
    if (!supplier) return;
    try {
      setLoadingEntries(true);
      const res = await inventoryService.getEntries({
        supplier: supplier.id,
        limit: 100,
        ordering: '-created_at',
      });
      setEntries(res.data || []);
    } catch (error) {
      handleError(error, { showToast: true, logData: 'Failed to load supplier entries' });
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, [supplier]);

  useEffect(() => {
    if (open && supplier) {
      setSelected({});
      setAmountInput('');
      void loadEntries();
      // Kirim bo'limida ko'rinadigan to'lov turlari (scope: purchase + both)
      bankCardService
        .getAll({ is_active: true, scope: 'purchase' })
        .then((cards) => {
          setBankCards(cards);
          const defaultCard = cards.find((card) => card.is_default) ?? cards[0];
          setSelectedBankCardId(defaultCard ? String(defaultCard.id) : '');
        })
        .catch(() => setBankCards([]));
    }
  }, [open, supplier, loadEntries]);

  const debtCentsOf = (entry: ContractEntry) => toCents(entry.debt);

  const debtEntries = useMemo(() => entries.filter((e) => debtCentsOf(e) > 0), [entries]);
  const totalDebtCents = useMemo(
    () => debtEntries.reduce((sum, e) => sum + debtCentsOf(e), 0),
    [debtEntries],
  );

  // To'lov taqsimoti eng eski kirimdan boshlanadi
  const selectedEntries = useMemo(
    () =>
      debtEntries
        .filter((e) => selected[e.id])
        .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')),
    [debtEntries, selected],
  );
  const selectedDebtCents = useMemo(
    () => selectedEntries.reduce((sum, e) => sum + debtCentsOf(e), 0),
    [selectedEntries],
  );

  // Tanlov o'zgarganda summa avtomatik tanlangan qarzning to'liq miqdoriga qo'yiladi
  useEffect(() => {
    setAmountInput(selectedDebtCents > 0 ? formatAmountInput(selectedDebtCents / 100) : '');
  }, [selectedDebtCents]);

  const amountCents = toCents(parseAmountInput(amountInput));
  const amountTooBig = amountCents > selectedDebtCents;

  // Summa o'zgarganda taqsimot defaultga qaytadi — hammasi naqd
  useEffect(() => {
    setCashInput(amountCents > 0 ? formatAmountInput(amountCents / 100) : '');
    setCardInput('');
  }, [amountCents]);

  const cashCents = toCents(parseAmountInput(cashInput));
  const cardCents = toCents(parseAmountInput(cardInput));
  const splitMismatch = amountCents > 0 && cashCents + cardCents !== amountCents;
  const cardMissing = cardCents > 0 && !selectedBankCardId;

  const amountInvalid =
    selectedEntries.length > 0 && (amountCents <= 0 || amountTooBig || splitMismatch || cardMissing);

  // Taqsimot: har kirimga ko'pi bilan o'z qarzi, jami esa kiritilgan summadan oshmaydi
  const allocations = useMemo(() => {
    let remaining = Math.min(amountCents, selectedDebtCents);
    return selectedEntries.map((entry) => {
      const pay = Math.max(0, Math.min(remaining, debtCentsOf(entry)));
      remaining -= pay;
      return { entry, cents: pay };
    });
  }, [selectedEntries, amountCents, selectedDebtCents]);

  const toggleEntry = (entry: ContractEntry) => {
    if (debtCentsOf(entry) <= 0) return;
    setSelected((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }));
  };

  const allSelected = debtEntries.length > 0 && debtEntries.every((e) => selected[e.id]);
  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<number, boolean> = {};
      debtEntries.forEach((e) => {
        next[e.id] = true;
      });
      setSelected(next);
    }
  };

  const handlePay = async () => {
    if (!supplier || amountInvalid || selectedEntries.length === 0 || amountCents <= 0) return;
    setPaying(true);
    let paidCount = 0;
    try {
      // Naqd va karta "hovuzlari": har kirim ulushi avval naqddan, yetmasa kartadan yopiladi.
      // Aralash to'lovda bitta kirimga 2 ta tranzaksiya (naqd + karta) tushishi mumkin.
      let cashPool = cashCents;
      let cardPool = cardCents;
      for (const alloc of allocations) {
        if (alloc.cents <= 0) continue;
        let remaining = alloc.cents;
        const cashPart = Math.min(cashPool, remaining);
        cashPool -= cashPart;
        remaining -= cashPart;
        const cardPart = Math.min(cardPool, remaining);
        cardPool -= cardPart;

        // Har kirim bo'yicha alohida to'lov — backend qoldiqdan oshiq summani qabul qilmaydi
        if (cashPart > 0) {
          await supplierService.createPayment({
            supplier: Number(supplier.id),
            entry: alloc.entry.id,
            amount: (cashPart / 100).toFixed(2),
            payment_type: 'cash',
          });
        }
        if (cardPart > 0) {
          await supplierService.createPayment({
            supplier: Number(supplier.id),
            entry: alloc.entry.id,
            amount: (cardPart / 100).toFixed(2),
            payment_type: 'card',
            bank_card: Number(selectedBankCardId),
          });
        }
        paidCount += 1;
      }
      toast.success(
        `${t('suppliers.paymentSuccess', 'To‘lov qabul qilindi')}: ${formatCurrency(amountCents / 100)}`,
      );
      setSelected({});
      onOpenChange(false);
    } catch (error) {
      if (paidCount > 0) {
        toast.error(
          t(
            'suppliers.paymentPartial',
            'Bir qism to‘lovlar o‘tdi, qolganida xato — ro‘yxat yangilandi, tekshirib qayta urinib ko‘ring',
          ),
        );
      }
      handleError(error, { showToast: true, logData: 'Supplier payment failed' });
      await loadEntries();
    } finally {
      setPaying(false);
      onPaid();
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t('suppliers.payDebt', 'Qarz to‘lash')} — {supplier.name_uz || supplier.name}
          </DialogTitle>
          <DialogDescription>
            {t('suppliers.debt', 'Qarzdorlik')}:{' '}
            <span className={`font-semibold ${totalDebtCents > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {formatCurrency(totalDebtCents / 100)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Qarzdor kirimlar ro'yxati */}
          <div className="rounded-lg border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium">
                {t('suppliers.unpaidEntries', 'To‘lanmagan kirimlar')} ({debtEntries.length})
              </span>
              {debtEntries.length > 0 && (
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {allSelected
                    ? t('suppliers.unselectAll', 'Tanlovni bekor qilish')
                    : t('suppliers.selectAllDebts', 'Barcha qarzlarni tanlash')}
                </Button>
              )}
            </div>

            <div className="max-h-64 divide-y divide-border/60 overflow-y-auto">
              {loadingEntries ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
              ) : debtEntries.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('suppliers.noDebts', 'Qarzdorlik yo‘q — barcha kirimlar to‘langan')}
                </div>
              ) : (
                debtEntries.map((entry) => {
                  const debtCents = debtCentsOf(entry);
                  const isChecked = Boolean(selected[entry.id]);
                  return (
                    <label
                      key={entry.id}
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent/40 ${
                        isChecked ? 'bg-primary/5' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleEntry(entry)}
                        className="h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          №{entry.id}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {entry.created_at ? formatDate(entry.created_at) : ''}
                            {entry.store_name ? ` · ${entry.store_name}` : ''}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('common.total')}:{' '}
                          {formatCurrency(
                            Number(entry.total_amount) ||
                              (Number(entry.paid_amount) || 0) + (Number(entry.total_in) || 0),
                          )}{' '}
                          · {t('inventory.paid', 'To‘langan')}:{' '}
                          {formatCurrency((Number(entry.paid_amount) || 0) + (Number(entry.total_paid) || 0))}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-[#ff6b00] px-2 py-0.5 text-xs font-semibold text-white">
                        {formatCurrency(debtCents / 100)}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* To'lov paneli */}
          {selectedEntries.length > 0 && (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Wallet className="h-4 w-4" />
                  {t('suppliers.payDebt', 'Qarz to‘lash')} ({selectedEntries.length}{' '}
                  {t('suppliers.entriesSelected', 'ta kirim')})
                </span>
                <span className="text-muted-foreground">
                  {t('suppliers.selectedDebt', 'Tanlangan qarz')}:{' '}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(selectedDebtCents / 100)}
                  </span>
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('suppliers.paymentAmount', 'To‘lov summasi')}
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className={amountTooBig || amountCents <= 0 ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {amountTooBig && (
                  <p className="text-xs text-red-600">
                    {t('suppliers.amountExceedsDebt', 'Summa tanlangan qarzdan oshib ketdi')} (max{' '}
                    {formatCurrency(selectedDebtCents / 100)})
                  </p>
                )}
              </div>

              {/* To'lov usuli: naqd / karta / aralash (ikkala inputga ham yozish mumkin) */}
              {amountCents > 0 && !amountTooBig && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">
                      {t('sales.paymentType', "To'lov usuli")}
                    </Label>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={cardCents === 0 && cashCents > 0 ? 'default' : 'outline'}
                        onClick={() => {
                          setCashInput(formatAmountInput(amountCents / 100));
                          setCardInput('');
                        }}
                      >
                        <Banknote className="mr-1 h-3.5 w-3.5" />
                        {t('sales.cash', 'Naqd')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={cashCents === 0 && cardCents > 0 ? 'default' : 'outline'}
                        onClick={() => {
                          setCardInput(formatAmountInput(amountCents / 100));
                          setCashInput('');
                        }}
                      >
                        <CreditCard className="mr-1 h-3.5 w-3.5" />
                        {t('sales.card', 'Karta')}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('sales.cash', 'Naqd')}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={cashInput}
                        onChange={(e) => setCashInput(e.target.value)}
                        className={splitMismatch ? 'border-red-400 focus-visible:ring-red-400' : ''}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('sales.card', 'Karta')}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={cardInput}
                        onChange={(e) => setCardInput(e.target.value)}
                        className={splitMismatch ? 'border-red-400 focus-visible:ring-red-400' : ''}
                      />
                    </div>
                  </div>
                  {splitMismatch && (
                    <p className="text-xs text-red-600">
                      {t('suppliers.splitMismatch', "Naqd va karta yig'indisi to'lov summasiga teng bo'lishi kerak")}{' '}
                      ({formatCurrency(amountCents / 100)})
                    </p>
                  )}

                  {/* Karta ishlatilsa — to'lov turini (Uzcard/Humo/...) tanlash */}
                  {cardCents > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {t('nav.paymentTypes', "To'lov turlari")} <span className="text-red-500">*</span>
                      </Label>
                      {bankCards.length === 0 ? (
                        <p className="text-xs text-red-600">
                          {t('sales.noBankCards', "Faol to'lov turi yo'q — Sozlamalar → To'lov turlaridan qo'shing")}
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {bankCards.map((card) => {
                            const isSelected = String(card.id) === selectedBankCardId;
                            return (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => setSelectedBankCardId(String(card.id))}
                                aria-pressed={isSelected}
                                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/40 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : 'border-border bg-background text-foreground hover:bg-accent'
                                }`}
                              >
                                <CreditCard className={`h-4 w-4 shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                                <span className="min-w-0 truncate">{card.name}</span>
                                {card.is_default && <Star className="h-3 w-3 shrink-0 text-amber-500" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Taqsimot: qaysi kirimga qancha tushishi oldindan ko'rinadi */}
              {amountCents > 0 && !amountTooBig && (
                <div className="space-y-1 rounded-md bg-background/60 p-2 text-xs">
                  {allocations.map(({ entry, cents }) => (
                    <div key={entry.id} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        №{entry.id} ({entry.created_at ? formatDate(entry.created_at) : ''})
                      </span>
                      <span className="tabular-nums">
                        {cents > 0 ? formatCurrency(cents / 100) : '—'}
                        {cents > 0 && cents === debtCentsOf(entry) && (
                          <span className="ml-1 text-green-600">✓ {t('suppliers.fullyPaid', 'to‘liq')}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full" disabled={amountInvalid || amountCents <= 0 || paying} onClick={handlePay}>
                {paying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                {t('suppliers.pay', 'To‘lash')}
                {amountCents > 0 && !amountTooBig ? ` · ${formatCurrency(amountCents / 100)}` : ''}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
