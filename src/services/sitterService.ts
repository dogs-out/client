import api from './api';
import { DiscoverProfile } from './discoverService';

export const sitterService = {
  /** Users who toggled "I'm looking for a dogsitter", distance-sorted — a sitter's jobs. */
  getSeekers: (): Promise<DiscoverProfile[]> =>
    api.get<DiscoverProfile[]>('/sitters/seekers').then(r => r.data),

  /** Users who toggled "I'm a dogsitter", distance-sorted — who an owner can ask. */
  getAvailableSitters: (): Promise<DiscoverProfile[]> =>
    api.get<DiscoverProfile[]>('/sitters/available').then(r => r.data),

  /** Opens a chat with an owner from the seeker pool (idempotent). */
  contact: (targetUserId: number): Promise<{ matchId: number }> =>
    api.post<{ matchId: number }>('/sitters/contact', { targetUserId }).then(r => r.data),
};
