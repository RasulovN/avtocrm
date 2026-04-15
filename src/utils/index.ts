import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSKU(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SKU-${timestamp}-${random}`;
}

export function generateBarcode(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${timestamp}${random}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Convert millimeters to pixels for a given DPI
 * Formula: (mm / 25.4) * DPI
 * @param mm - millimeters
 * @param dpi - dots per inch (default 203 for label printers)
 * @returns pixels
 */
export function mmToPx(mm: number, dpi: number = 203): number {
  return (mm / 25.4) * dpi;
}

/**
 * Convert pixels to millimeters for a given DPI
 * @param px - pixels
 * @param dpi - dots per inch (default 203)
 * @returns millimeters
 */
export function pxToMm(px: number, dpi: number = 203): number {
  return (px * 25.4) / dpi;
}

export function formatTime(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

export function calculateProfit(purchasePrice: number, sellingPrice: number, quantity: number): number {
  return (sellingPrice - purchasePrice) * quantity;
}

export function calculateTotalCost(items: { purchase_price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
}

export function calculateTotalPrice(items: { selling_price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
}
