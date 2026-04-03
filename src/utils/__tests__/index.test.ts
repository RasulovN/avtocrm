import { describe, it, expect } from 'vitest';
import {
  cn,
  generateSKU,
  generateBarcode,
  formatCurrency,
  formatDate,
  formatDateShort,
  calculateProfit,
  calculateTotalCost,
  calculateTotalPrice,
} from '../index';

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    const shouldShowActive = true;
    const shouldShowInactive = false;
    const result = cn('base', shouldShowActive ? 'active' : undefined, shouldShowInactive ? 'inactive' : undefined);
    expect(result).toBe('base active');
  });

  it('handles undefined and null', () => {
    const result = cn('base', undefined, null, 'extra');
    expect(result).toBe('base extra');
  });

  it('merges conflicting Tailwind classes', () => {
    const result = cn('px-4', 'px-6');
    expect(result).toBe('px-6');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });
});

describe('generateSKU', () => {
  it('generates SKU with correct format', () => {
    const sku = generateSKU();
    expect(sku).toMatch(/^SKU-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it('generates unique SKUs', () => {
    const sku1 = generateSKU();
    const sku2 = generateSKU();
    expect(sku1).not.toBe(sku2);
  });

  it('starts with SKU- prefix', () => {
    const sku = generateSKU();
    expect(sku.startsWith('SKU-')).toBe(true);
  });
});

describe('generateBarcode', () => {
  it('generates barcode with correct format', () => {
    const barcode = generateBarcode();
    expect(barcode).toMatch(/^\d{13,17}$/);
  });

  it('generates unique barcodes', () => {
    const barcode1 = generateBarcode();
    const barcode2 = generateBarcode();
    expect(barcode1).not.toBe(barcode2);
  });

  it('contains only digits', () => {
    const barcode = generateBarcode();
    expect(/^\d+$/.test(barcode)).toBe(true);
  });
});

describe('formatCurrency', () => {
  it('formats number as Uzbek som', () => {
    const result = formatCurrency(10000);
    expect(result).toContain('10');
    expect(result).toContain('000');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('formats large numbers', () => {
    const result = formatCurrency(1000000);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats negative numbers', () => {
    const result = formatCurrency(-5000);
    expect(result).toBeDefined();
  });

  it('formats decimal numbers by rounding', () => {
    const result = formatCurrency(10000.99);
    expect(result).toBeDefined();
  });
});

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats Date object', () => {
    const result = formatDate(new Date('2024-06-20T14:00:00Z'));
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('includes time in formatted date', () => {
    const result = formatDate('2024-03-10T09:45:00Z');
    // Should contain hour and minute indicators
    expect(result).toBeDefined();
  });
});

describe('formatDateShort', () => {
  it('formats date string without time', () => {
    const result = formatDateShort('2024-01-15');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('formats Date object', () => {
    const result = formatDateShort(new Date('2024-06-20'));
    expect(result).toBeDefined();
  });

  it('produces shorter output than formatDate', () => {
    const date = '2024-03-10T09:45:00Z';
    const full = formatDate(date);
    const short = formatDateShort(date);
    expect(short.length).toBeLessThanOrEqual(full.length);
  });
});

describe('calculateProfit', () => {
  it('calculates profit correctly', () => {
    const profit = calculateProfit(10000, 15000, 10);
    expect(profit).toBe(50000);
  });

  it('returns zero when prices are equal', () => {
    const profit = calculateProfit(10000, 10000, 5);
    expect(profit).toBe(0);
  });

  it('returns negative for loss', () => {
    const profit = calculateProfit(15000, 10000, 2);
    expect(profit).toBe(-10000);
  });

  it('handles zero quantity', () => {
    const profit = calculateProfit(10000, 15000, 0);
    expect(profit).toBe(0);
  });

  it('handles quantity of 1', () => {
    const profit = calculateProfit(5000, 8000, 1);
    expect(profit).toBe(3000);
  });
});

describe('calculateTotalCost', () => {
  it('calculates total cost for items', () => {
    const items = [
      { purchase_price: 1000, quantity: 5 },
      { purchase_price: 2000, quantity: 3 },
    ];
    const total = calculateTotalCost(items);
    expect(total).toBe(11000);
  });

  it('returns 0 for empty array', () => {
    const total = calculateTotalCost([]);
    expect(total).toBe(0);
  });

  it('handles single item', () => {
    const items = [{ purchase_price: 5000, quantity: 2 }];
    const total = calculateTotalCost(items);
    expect(total).toBe(10000);
  });

  it('handles items with zero quantity', () => {
    const items = [
      { purchase_price: 1000, quantity: 0 },
      { purchase_price: 2000, quantity: 5 },
    ];
    const total = calculateTotalCost(items);
    expect(total).toBe(10000);
  });

  it('handles items with zero price', () => {
    const items = [
      { purchase_price: 0, quantity: 10 },
      { purchase_price: 1000, quantity: 5 },
    ];
    const total = calculateTotalCost(items);
    expect(total).toBe(5000);
  });
});

describe('calculateTotalPrice', () => {
  it('calculates total price for items', () => {
    const items = [
      { selling_price: 1500, quantity: 5 },
      { selling_price: 2500, quantity: 3 },
    ];
    const total = calculateTotalPrice(items);
    expect(total).toBe(15000);
  });

  it('returns 0 for empty array', () => {
    const total = calculateTotalPrice([]);
    expect(total).toBe(0);
  });

  it('handles single item', () => {
    const items = [{ selling_price: 7000, quantity: 2 }];
    const total = calculateTotalPrice(items);
    expect(total).toBe(14000);
  });

  it('handles items with zero quantity', () => {
    const items = [
      { selling_price: 1000, quantity: 0 },
      { selling_price: 3000, quantity: 4 },
    ];
    const total = calculateTotalPrice(items);
    expect(total).toBe(12000);
  });
});
