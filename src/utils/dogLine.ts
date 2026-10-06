import type { TFunction } from 'i18next';
import { translateBreed } from '../i18n/translateBreed';
import type { DogSex } from '../services/dogService';

/** "Labrador · ♀ Female" — breed and sex as one line, either part optional; '' if neither is known. */
export function breedAndSex(dog: { breed?: string | null; sex?: DogSex | null }, t: TFunction, language: string): string {
  const parts: string[] = [];
  if (dog.breed) parts.push(translateBreed(dog.breed, language));
  if (dog.sex) parts.push(`${dog.sex === 'MALE' ? '♂' : '♀'} ${t(`dogs.sex.${dog.sex}`)}`);
  return parts.join(' · ');
}
