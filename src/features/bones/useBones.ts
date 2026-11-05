import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { TFunction } from 'i18next';
import { BoneStatus, boneService } from '../../services/boneService';

/**
 * The signed-in user's bones, fetched whenever the screen gains focus — the count
 * changes at midnight and after a purchase or an ad, all of which happen away
 * from Discover. Null until known; callers treat that as "may swipe".
 */
export function useBones() {
  const [bones, setBones] = useState<BoneStatus | null>(null);

  const refresh = useCallback(() => {
    boneService.getStatus().then(setBones).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return { bones, setBones, refresh };
}

/** "3 h 12 min" / "12 min" until the given moment; "" once it has passed. */
export function timeUntil(iso: string, now: number, t: TFunction): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return '';
  const minutes = Math.ceil(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? t('bones.hoursMinutes', { h, m }) : t('bones.minutes', { m });
}
