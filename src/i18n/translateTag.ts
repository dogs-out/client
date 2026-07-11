import { TFunction } from 'i18next';

/**
 * Tags/options (dog personality, owner lifestyle, relationship status, report reasons, etc.)
 * are stored and sent to the backend as their canonical English string — translating only
 * happens at display time via this lookup, so stored data and API payloads never change.
 */
export function translateTag(tag: string, t: TFunction): string {
  return t(`tags.${tag}`, { defaultValue: tag });
}
