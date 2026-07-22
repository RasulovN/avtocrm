import { useCallback, useEffect, useState } from 'react';
import { formatAmountInput } from '../utils';
import type { BankCard } from '../types';

/**
 * Karta to'lovini bir nechta kartaga (Humo/Uzcard/...) taqsimlash holati.
 * Sotuv kassasidagi (SalesPage) naqshning umumlashtirilgan varianti:
 * bu yerda karta jami summasi (cardTotal) tashqaridan boshqariladi va
 * qatorlar yig'indisi har doim cardTotal ga teng ushlab turiladi.
 */
export interface CardSplit {
  bankCardId: string;
  amount: number;
  amountText: string;
}

const splitText = (amount: number): string => (amount > 0 ? formatAmountInput(amount) : '');

export function useCardSplits(bankCards: BankCard[], cardTotal: number) {
  const [cardSplits, setCardSplits] = useState<CardSplit[]>([]);

  // cardTotal o'zgarganda qatorlar sinxronlanadi: avvalgi qatorlar saqlanadi,
  // oxirgi qator qoldiqni o'ziga oladi (yig'indi == cardTotal invarianti)
  useEffect(() => {
    setCardSplits((prev) => {
      if (cardTotal <= 0) return prev.length ? [] : prev;
      let rows = prev;
      if (rows.length === 0) {
        const defaultCard = bankCards.find((card) => card.is_default) ?? bankCards[0];
        rows = [{ bankCardId: defaultCard ? String(defaultCard.id) : '', amount: 0, amountText: '' }];
      }
      let remaining = cardTotal;
      const next = rows.map((row, idx) => {
        const isLast = idx === rows.length - 1;
        const amount = isLast ? remaining : Math.min(row.amount, remaining);
        remaining -= amount;
        return { ...row, amount, amountText: splitText(amount) };
      });
      return next;
    });
  }, [cardTotal, bankCards]);

  const updateSplitCard = useCallback((idx: number, bankCardId: string) => {
    setCardSplits((prev) => prev.map((row, i) => (i === idx ? { ...row, bankCardId } : row)));
  }, []);

  // Qator summasi tahrirlanganda boshqa qatorlar (oxiridan boshlab) moslashadi —
  // yig'indi har doim cardTotal bo'lib qoladi
  const updateSplitAmount = useCallback(
    (idx: number, digits: string) => {
      setCardSplits((prev) => {
        const raw = Number(digits.replace(/\D/g, '')) || 0;
        const amount = Math.min(raw, cardTotal);
        const next = prev.map((row, i) =>
          i === idx ? { ...row, amount, amountText: digits ? formatAmountInput(amount) : '' } : { ...row },
        );
        let othersTarget = cardTotal - amount;
        const otherIdxs = next.map((_, i) => i).filter((i) => i !== idx);
        otherIdxs.forEach((i, pos) => {
          const isLastOther = pos === otherIdxs.length - 1;
          const rowAmount = isLastOther ? othersTarget : Math.min(next[i].amount, othersTarget);
          othersTarget -= rowAmount;
          next[i] = { ...next[i], amount: rowAmount, amountText: splitText(rowAmount) };
        });
        return next;
      });
    },
    [cardTotal],
  );

  const addCardSplit = useCallback(() => {
    setCardSplits((prev) => {
      const used = new Set(prev.map((row) => row.bankCardId));
      const nextCard = bankCards.find((card) => !used.has(String(card.id)));
      if (!nextCard) return prev;
      return [...prev, { bankCardId: String(nextCard.id), amount: 0, amountText: '' }];
    });
  }, [bankCards]);

  const removeCardSplit = useCallback((idx: number) => {
    setCardSplits((prev) => {
      if (prev.length <= 1) return prev;
      const removed = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      if (removed.amount > 0 && next.length > 0) {
        const last = next.length - 1;
        const amount = next[last].amount + removed.amount;
        next[last] = { ...next[last], amount, amountText: splitText(amount) };
      }
      return next;
    });
  }, []);

  const activeSplits = cardSplits.filter((row) => row.amount > 0);
  const splitsSum = activeSplits.reduce((sum, row) => sum + row.amount, 0);
  // Karta to'lovi yaroqli: jami 0 yoki (yig'indi mos va har faol qatorda karta tanlangan)
  const splitsInvalid =
    cardTotal > 0 && (splitsSum !== cardTotal || activeSplits.some((row) => !row.bankCardId));

  return {
    cardSplits,
    setCardSplits,
    activeSplits,
    splitsInvalid,
    updateSplitCard,
    updateSplitAmount,
    addCardSplit,
    removeCardSplit,
  };
}
