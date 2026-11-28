import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ variant = 'light', className = '' }) {
  const { i18n } = useTranslation();
  // Use local state so the button highlights instantly on click,
  // without waiting for the async changeLanguage() promise to resolve.
  const [current, setCurrent] = useState(() => (i18n.language === 'ar' ? 'ar' : 'en'));

  // Keep in sync if language changes from outside (e.g. on init or programmatic change)
  useEffect(() => {
    const onChanged = (lng) => setCurrent(lng === 'ar' ? 'ar' : 'en');
    i18n.on('languageChanged', onChanged);
    return () => i18n.off('languageChanged', onChanged);
  }, [i18n]);

  const setLang = (lng) => {
    if (lng !== current) {
      setCurrent(lng); // immediate visual feedback
      i18n.changeLanguage(lng);
    }
  };

  const containerCls =
    variant === 'sidebar'
      ? 'bg-theme-sidebar-surface border border-theme-sidebar-border text-theme-sidebar-text'
      : 'bg-theme-surface border border-theme-border text-theme-muted';

  const activeCls =
    variant === 'sidebar'
      ? 'bg-theme-card text-theme-ink shadow-sm'
      : 'bg-theme-primary text-white shadow-sm';

  const inactiveCls =
    variant === 'sidebar'
      ? 'text-theme-sidebar-text hover:text-white'
      : 'text-theme-muted hover:text-theme-ink';

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-full p-0.5 text-xs font-semibold ${containerCls} ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded-full transition-all ${current === 'en' ? activeCls : inactiveCls}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ar')}
        className={`px-2.5 py-1 rounded-full transition-all ${current === 'ar' ? activeCls : inactiveCls}`}
      >
        العربية
      </button>
    </div>
  );
}
