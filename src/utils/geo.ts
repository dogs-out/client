import { TFunction } from 'i18next';

/** Great-circle distance in kilometres. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - Math.min(1, a)));
}

/** "3 km away" / "less than 1 km away"; '' when either side has no location (the server sends -1). */
export function formatDistance(km: number, t: TFunction): string {
  if (km < 0) return '';
  if (km < 1) return t('matching.discover.lessThanOneKm');
  return t('matching.discover.distanceAway', { km: Math.round(km) });
}
