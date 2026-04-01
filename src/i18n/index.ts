import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import uz from './locales/uz.json';
import ru from './locales/ru.json';

const resources = {
  uz: { translation: uz },
  ru: { translation: ru },
};

// Get saved language from localStorage or default to 'uz'
const savedLanguage = typeof window !== 'undefined' 
  ? localStorage.getItem('i18nextLng') || 'uz' 
  : 'uz';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru'],
    lng: savedLanguage,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('i18nextLng', lang);
};
