import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import ptTranslation from './locales/pt/translation.json';

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      pt: { translation: ptTranslation }
    },
    // Force EN on first load if no local storage is present
    detection: {
      order: ['localStorage'], // Remove 'navigator' to force EN if no local storage
      caches: ['localStorage'],
    },
    lng: localStorage.getItem('i18nextLng') || 'en', // Explicitly force to 'en' if not set
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already safes from xss
    }
  });

// Update the HTML language tag dynamically
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  
  // Set hreflang dynamically for SEO
  let linkEn = document.querySelector('link[hreflang="en"]');
  if (!linkEn) {
    linkEn = document.createElement('link');
    linkEn.setAttribute('rel', 'alternate');
    linkEn.setAttribute('hreflang', 'en');
    linkEn.setAttribute('href', window.location.origin + '/');
    document.head.appendChild(linkEn);
  }

  let linkPt = document.querySelector('link[hreflang="pt-BR"]');
  if (!linkPt) {
    linkPt = document.createElement('link');
    linkPt.setAttribute('rel', 'alternate');
    linkPt.setAttribute('hreflang', 'pt-BR');
    linkPt.setAttribute('href', window.location.origin + '/?lng=pt');
    document.head.appendChild(linkPt);
  }

  let linkX = document.querySelector('link[hreflang="x-default"]');
  if (!linkX) {
    linkX = document.createElement('link');
    linkX.setAttribute('rel', 'alternate');
    linkX.setAttribute('hreflang', 'x-default');
    linkX.setAttribute('href', window.location.origin + '/');
    document.head.appendChild(linkX);
  }
});

// Run once to set initial SEO tags
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
}

export default i18n;
