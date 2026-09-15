import api from './api';
import { DiscoverProfile } from './discoverService';

/** An owner asking for a sitter for a particular window of time. */
export interface SittingRequest {
  id: number;
  ownerId: number;
  ownerName: string;
  ownerProfilePicture: string | null;
  startsAt: string;
  endsAt: string;
  /** Which dogs, by name — one calm terrier and three is not the same job. */
  dogs: string[];
  note: string | null;
  status: 'OPEN' | 'CLOSED';
  /** True when the reader posted it, so the row offers closing instead of contacting. */
  mine: boolean;
  /** Rounded; -1 when either side has no location. */
  distanceKm: number;
}

export const sitterService = {
  /** Users who toggled "I'm looking for a dogsitter", distance-sorted — a sitter's jobs. */
  getSeekers: (): Promise<DiscoverProfile[]> =>
    api.get<DiscoverProfile[]>('/sitters/seekers').then(r => r.data),

  /**
   * Users who toggled "I'm a dogsitter", distance-sorted — who an owner can ask.
   *
   * <p>A weekday narrows it to sitters who said they are free then. Sitters who
   * named no days stay in the list: silence means "ask me", not "never".
   */
  getAvailableSitters: (weekday?: string | null): Promise<DiscoverProfile[]> =>
    api.get<DiscoverProfile[]>('/sitters/available', {
      params: weekday ? { weekday } : undefined,
    }).then(r => r.data),

  /** Opens a chat with an owner from the seeker pool (idempotent). */
  contact: (targetUserId: number): Promise<{ matchId: number }> =>
    api.post<{ matchId: number }>('/sitters/contact', { targetUserId }).then(r => r.data),

  /** Open jobs any sitter can still take, soonest first. */
  getOpenRequests: (): Promise<SittingRequest[]> =>
    api.get<SittingRequest[]>('/sitters/requests').then(r => r.data),

  /** What this account has posted, open or closed. */
  getMyRequests: (): Promise<SittingRequest[]> =>
    api.get<SittingRequest[]>('/sitters/requests/mine').then(r => r.data),

  createRequest: (body: {
    startsAt: string;
    endsAt: string;
    dogIds: number[];
    note?: string;
  }): Promise<SittingRequest> =>
    api.post<SittingRequest>('/sitters/requests', body).then(r => r.data),

  /** Closes a request once someone has been found. Only the owner may. */
  closeRequest: (id: number): Promise<SittingRequest> =>
    api.put<SittingRequest>(`/sitters/requests/${id}/close`, {}).then(r => r.data),
};
