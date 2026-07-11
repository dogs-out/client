import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { languageStorage } from './languageStorage';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map(l => l.code);

function detectDeviceLanguage(): LanguageCode {
  const deviceCode = Localization.getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED_CODES as string[]).includes(deviceCode) ? (deviceCode as LanguageCode) : 'en';
}

/** Resolves the language to use (persisted override, else device locale) and initializes i18next. Call once before rendering the app. */
export async function initI18n(): Promise<void> {
  const stored = await languageStorage.get();
  const language = stored && (SUPPORTED_CODES as string[]).includes(stored) ? stored : detectDeviceLanguage();

  await i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
    },
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export async function setLanguage(code: LanguageCode): Promise<void> {
  await i18next.changeLanguage(code);
  await languageStorage.set(code);
}

export default i18next;
