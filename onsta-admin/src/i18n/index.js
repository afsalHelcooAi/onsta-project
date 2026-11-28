import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

const STORAGE_KEY = 'onsta_lang';

const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
};

const applyDocumentDirection = (lng) => {
  const isArabic = lng === 'ar';
  document.documentElement.lang = isArabic ? 'ar' : 'en';
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  try {
    localStorage.setItem(STORAGE_KEY, isArabic ? 'ar' : 'en');
  } catch {
    // ignore storage errors
  }
};

const initialLng = getInitialLanguage();
applyDocumentDirection(initialLng);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  applyDocumentDirection(lng);
});

export default i18n;
