import type { TFunction } from 'i18next';

interface RoleUser {
  is_superuser?: boolean;
  role?: string;
  role_name?: string | null;
}

/**
 * Foydalanuvchi rolining ekranda ko'rsatiladigan nomi.
 * Xom `user.role` ("superuser") o'rniga i18n orqali qaytaradi —
 * til (lotin ↔ kirill) almashganda yozuv ham mos ravishda o'zgaradi.
 */
export function getRoleLabel(user: RoleUser | null | undefined, t: TFunction): string {
  if (!user) return '';
  if (user.is_superuser || user.role === 'superuser') return t('users.superUser', 'SuperAdmin');
  // RBAC roli biriktirilgan bo'lsa — rolning o'z nomi (masalan, "Kassir")
  if (user.role_name) return user.role_name;
  if (user.role === 's') return t('users.seller', 'Sotuvchi');
  if (user.role === 'admin') return t('users.admin', 'Admin');
  return user.role || '';
}
