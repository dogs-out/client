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
    /**
     * A key with no translation renders as nothing rather than as its own path.
     *
     * <p>i18next's default is to return the key, which is how a tester on an
     * older build ended up reading "whosOutside.line.AT_HOME" in her friends
     * list: the server had started sending a status her app predated, and the
     * lookup fell through. Call sites that show server-provided values pass a
     * defaultValue for exactly that case; this is the backstop for the rest,
     * because an empty line is a blemish and a key path is a bug report.
     */
    parseMissingKeyHandler: (key: string, defaultValue?: string) => {
      if (__DEV__) console.warn('[i18n] missing key:', key);
      // The defaultValue MUST win. This handler overrides it rather than running
      // after it, which blanked every tag in English: tags have no en block at
      // all by design — they are stored as their English text and passed here as
      // the default — so ignoring it emptied every chip in the app.
      return defaultValue ?? '';
    },
  });
}

export async function setLanguage(code: LanguageCode): Promise<void> {
  await i18next.changeLanguage(code);
  await languageStorage.set(code);
}

export default i18next;
