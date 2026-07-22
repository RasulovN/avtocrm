/**
 * O'zbekiston telefon raqami uchun umumiy mask/format yordamchilari.
 * (LoginPage'dagi sinalgan mantiq asosida — formalar shu utildan foydalanadi.)
 */

export const PHONE_NATIONAL_LENGTH = 9;
/** "+998 XX XXX XX XX" formatlangan ko'rinishning maksimal uzunligi */
export const PHONE_INPUT_MAX_LENGTH = 17;

/**
 * Kiritilgan matndan +998 dan keyingi 9 xonali raqamni ajratib oladi.
 * Harflar va boshqa belgilar tashlab yuboriladi; boshida 998 (davlat kodi)
 * bo'lsa u ham olib tashlanadi — shunda "+998 90 123 45 67", "998901234567"
 * va "901234567" bir xil o'qiladi.
 */
export const extractNational = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('998')) return digits.slice(3, 3 + PHONE_NATIONAL_LENGTH);
  // '+998' prefiksi qisman o'chirilgan holat ('+99', '+9') — raqam yo'q deb olamiz
  if (raw.startsWith('+') && '998'.startsWith(digits)) return '';
  return digits.slice(0, PHONE_NATIONAL_LENGTH);
};

/** +998 XX XXX XX XX ko'rinishida formatlaydi */
export const formatUzPhone = (national: string): string => {
  const d = national.slice(0, PHONE_NATIONAL_LENGTH);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.length ? `+998 ${parts.join(' ')}` : '+998';
};

/** Input onChange uchun tayyor mask: harflarni tashlab, formatlab qaytaradi */
export const maskUzPhoneInput = (raw: string): string => formatUzPhone(extractNational(raw));

/** Serverga yuboriladigan tekis ko'rinish: +998XXXXXXXXX */
export const normalizeUzPhone = (raw: string): string => {
  const national = extractNational(raw);
  return national ? `+998${national}` : '';
};

/** To'liq (9 xonali) raqam kiritilganmi */
export const isCompleteUzPhone = (raw: string): boolean =>
  extractNational(raw).length === PHONE_NATIONAL_LENGTH;
