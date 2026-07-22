import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from '../errorHandler';

// DRF xato javoblarining har xil shakllaridan foydalanuvchiga
// ko'rinadigan xabar to'g'ri chiqishini tekshiradi
const axiosError = (data: unknown, message = 'Request failed with status code 400') => ({
  message,
  response: { data },
});

describe('extractErrorMessage', () => {
  it("servis xatosi — butun javob massiv (raise ValidationError('...'))", () => {
    expect(extractErrorMessage(axiosError(['Mahsulot mavjud emas']))).toBe('Mahsulot mavjud emas');
  });

  it('massivda bir nechta xabar', () => {
    expect(extractErrorMessage(axiosError(['Mahsulot mavjud emas', 'Mahsulot yetarli emas']))).toBe(
      'Mahsulot mavjud emas; Mahsulot yetarli emas',
    );
  });

  it('detail maydoni', () => {
    expect(extractErrorMessage(axiosError({ detail: 'Bu sotuvda qarz yo‘q' }))).toBe('Bu sotuvda qarz yo‘q');
  });

  it('non_field_errors', () => {
    expect(extractErrorMessage(axiosError({ non_field_errors: ["To'lov umumiy narxdan oshib ketdi!"] }))).toBe(
      "To'lov umumiy narxdan oshib ketdi!",
    );
  });

  it('maydon xatolari', () => {
    expect(extractErrorMessage(axiosError({ amount: ['Miqdor qarzdan oshib ketdi'] }))).toBe(
      'amount: Miqdor qarzdan oshib ketdi',
    );
  });

  it("nested list xatolari — items ichidagi obyektlar ('[object Object]' bo'lmasligi kerak)", () => {
    const data = { items: [{}, { quantity: ['Quantity > 0 bo‘lishi kerak'] }] };
    const msg = extractErrorMessage(axiosError(data));
    expect(msg).toContain('Quantity > 0');
    expect(msg).not.toContain('[object Object]');
  });

  it("javob tanasi bo'sh — axios (Error) xabariga tushadi", () => {
    const err = Object.assign(new Error('Request failed with status code 400'), {
      response: { data: undefined },
    });
    expect(extractErrorMessage(err)).toBe('Request failed with status code 400');
  });
});
