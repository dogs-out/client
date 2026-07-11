import { BREED_TRANSLATIONS } from '../constants/dogBreedTranslations';

type BreedLanguage = 'de' | 'fr' | 'it';

/**
 * Dog breeds are stored and sent to the backend as their canonical English string
 * (possibly a composite "Primary / Secondary" mix) — translating only happens at
 * display time via this lookup, so stored data and API payloads never change.
 */
export function translateBreed(breed: string, language: string): string {
  const lang = language.split('-')[0];
  if (lang !== 'de' && lang !== 'fr' && lang !== 'it') return breed;

  if (BREED_TRANSLATIONS[breed]?.[lang]) return BREED_TRANSLATIONS[breed][lang] as string;

  if (breed.includes(' / ')) {
    return breed.split(' / ').map(part => translateSingleBreed(part, lang)).join(' / ');
  }
  return translateSingleBreed(breed, lang);
}

function translateSingleBreed(breed: string, lang: BreedLanguage): string {
  return BREED_TRANSLATIONS[breed]?.[lang] ?? breed;
}
