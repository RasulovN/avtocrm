import i18n from 'i18next';
import type { Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import uz from './locales/uz.json' with { type: 'json' };
import cyrl from './locales/cyrl.json' with { type: 'json' };

const resources: Resource = {
  uz: { translation: uz },
  cyrl: { translation: cyrl },
};

const normalizeLanguage = (lang: string | null | undefined): 'uz' | 'cyrl' => {
  if (!lang) return 'cyrl';
  const lower = lang.toLowerCase();
  if (lower.startsWith('uz-cyrl') || lower.startsWith('cyrl')) return 'cyrl';
  if (lower.startsWith('uz')) return 'uz';
  return 'cyrl';
};

const isBrowser = typeof window !== 'undefined';
// Get saved language from localStorage or default to 'uz'
const savedLanguage = isBrowser ? localStorage.getItem('i18nextLng') : null;
const normalizedLanguage = normalizeLanguage(savedLanguage);
if (isBrowser && savedLanguage !== normalizedLanguage) {
  localStorage.setItem('i18nextLng', normalizedLanguage);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'cyrl',
    supportedLngs: ['uz', 'cyrl'],
    lng: normalizedLanguage,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      convertDetectedLanguage: (lng: string) => normalizeLanguage(lng),
    },
  });

export default i18n;

export const changeLanguage = (lang: string) => {
  const normalized = normalizeLanguage(lang);
  i18n.changeLanguage(normalized);
  if (isBrowser) {
    localStorage.setItem('i18nextLng', normalized);
  }
};
