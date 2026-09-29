import api from './api';
import { Dog } from './dogService';

export interface LostDogAlert {
  id: number;
  dog: Dog;
  ownerId: number;
  ownerName: string;
  ownerProfilePicture: string | null;
  latitude: number;
  longitude: number;
  placeName: string | null;
  note: string | null;
  createdAt: string;
  open: boolean;
  found: boolean;
  mine: boolean;
  /** From your saved location; null when you have none. */
  distanceKm: number | null;
}

export interface RaiseAlertPayload {
  dogId: number;
  latitude: number;
  longitude: number;
  placeName?: string;
  note?: string;
}

/**
 * Lost-dog alerts. Raising one pushes everyone within 100 km of the last-seen
 * point, so the server limits it: one open alert per owner, three a week, and
 * each stops showing after 7 days.
 */
export const sosService = {
  raise: (payload: RaiseAlertPayload): Promise<LostDogAlert> =>
    api.post<LostDogAlert>('/sos', payload).then(r => r.data),

  /** Open alerts near your saved location, plus your own. */
  nearby: (): Promise<LostDogAlert[]> =>
    api.get<LostDogAlert[]>('/sos').then(r => r.data),

  get: (id: number): Promise<LostDogAlert> =>
    api.get<LostDogAlert>(`/sos/${id}`).then(r => r.data),

  close: (id: number, found: boolean): Promise<LostDogAlert> =>
    api.post<LostDogAlert>(`/sos/${id}/close`, { found }).then(r => r.data),

  /** Opens (or reuses) a chat with the owner; returns its match id. */
  contactOwner: (id: number): Promise<number> =>
    api.post<{ matchId: number }>(`/sos/${id}/contact`).then(r => r.data.matchId),
};
