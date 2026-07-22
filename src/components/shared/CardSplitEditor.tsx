import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import type { BankCard } from '../../types';
import type { CardSplit } from '../../hooks/useCardSplits';

interface CardSplitEditorProps {
  bankCards: BankCard[];
  cardSplits: CardSplit[];
  onUpdateCard: (idx: number, bankCardId: string) => void;
  onUpdateAmount: (idx: number, digits: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  disabled?: boolean;
}

/**
 * Karta to'lovini bir nechta kartaga (Humo/Uzcard/...) taqsimlash UI —
 * sotuv kassasidagi bilan bir xil: har qator = karta tanlash + summa,
 * "Karta qo'shish" bilan yangi qator, X bilan olib tashlash.
 */
export function CardSplitEditor({
  bankCards,
  cardSplits,
  onUpdateCard,
  onUpdateAmount,
  onAdd,
  onRemove,
  disabled,
}: CardSplitEditorProps) {
  const { t } = useTranslation();

  if (bankCards.length === 0) {
    return (
      <p className="text-xs text-red-600">
        {t('sales.noBankCards', "Faol to'lov turi yo'q — Sozlamalar → To'lov turlaridan qo'shing")}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">
          {t('nav.paymentTypes', "To'lov turlari")} <span className="text-red-500">*</span>
        </Label>
        {bankCards.length > cardSplits.length && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onAdd}
            disabled={disabled}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t('sales.addCardType', "Karta qo'shish")}
          </Button>
        )}
      </div>

      {cardSplits.map((split, idx) => {
        const usedElsewhere = new Set(
          cardSplits.filter((_, i) => i !== idx).map((row) => row.bankCardId),
        );
        return (
          <div key={idx} className="flex items-center gap-2">
            <Select
              value={split.bankCardId}
              onValueChange={(value) => onUpdateCard(idx, value)}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder={t('sales.selectCardType', 'Karta turini tanlang')} />
              </SelectTrigger>
              <SelectContent>
                {bankCards
                  .filter((card) => !usedElsewhere.has(String(card.id)))
                  .map((card) => (
                    <SelectItem key={card.id} value={String(card.id)}>
                      {card.name}
                      {card.is_default ? ' ★' : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              className="h-9 w-32 text-right tabular-nums"
              value={split.amountText}
              onChange={(e) => onUpdateAmount(idx, e.target.value.replace(/\D/g, ''))}
              disabled={disabled}
            />
            {cardSplits.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-red-500"
                onClick={() => onRemove(idx)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
