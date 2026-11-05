import type { TFunction } from 'i18next';
import { translateBreed } from '../i18n/translateBreed';
import type { DogSex } from '../services/dogService';

/**
 * "Labrador · ♀ Female · Neutered" — breed, sex and neutered status as one line,
 * each part optional; '' if none is known.
 */
export function breedAndSex(
  dog: { breed?: string | null; sex?: DogSex | null; neutered?: boolean | null },
  t: TFunction,
  language: string,
): string {
  const parts: string[] = [];
  if (dog.breed) parts.push(translateBreed(dog.breed, language));
  if (dog.sex) parts.push(`${dog.sex === 'MALE' ? '♂' : '♀'} ${t(`dogs.sex.${dog.sex}`)}`);
  if (dog.neutered != null) parts.push(t(dog.neutered ? 'dogs.neutered.yes' : 'dogs.neutered.no'));
  return parts.join(' · ');
}
