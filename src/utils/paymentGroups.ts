/**
 * Bitta to'lov harakatining split qatorlarini (naqd + Humo + Uzcard ...) bitta
 * guruhga jamlaydi — tarix ro'yxatlarida bitta to'lov bloki bo'lib ko'rinishi uchun.
 * payment_group NULL bo'lgan eski yozuvlar har biri alohida guruh hisoblanadi.
 * Guruhlar kirish tartibida saqlanadi (odatda -created_at).
 */
export function groupByPaymentGroup<T extends { id: number; payment_group?: string | null }>(
  rows: T[],
): T[][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.payment_group || `solo-${row.id}`;
    const list = groups.get(key);
    if (list) {
      list.push(row);
    } else {
      groups.set(key, [row]);
    }
  }
  return Array.from(groups.values());
}
