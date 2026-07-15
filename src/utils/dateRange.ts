/** Sana → YYYY-MM-DD (lokal vaqt bo'yicha) */
export const toDateKey = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Oxirgi 7 kunlik oraliq (bugungi kun bilan birga) — ro'yxatlarning default davri */
export const lastWeekRange = (): { from: string; to: string } => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from: toDateKey(from), to: toDateKey(to) };
};
