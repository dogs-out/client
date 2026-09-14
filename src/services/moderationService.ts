import api from './api';

export interface BlockedUser {
  userId: number;
  name: string;
  profilePicture: string | null;
  blockedAt: string;
}

export const REPORT_REASONS = [
  'Inappropriate messages',
  'Harassment or bullying',
  'Spam or scam',
  'Fake profile',
  'Safety concern',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * What a profile is reported for, as opposed to a conversation.
 *
 * <p>Different list because there is no conversation yet: what is being reported
 * is the name, the bio or the photos, and "inappropriate messages" would be an
 * odd thing to pick from a swipe card.
 */
export const PROFILE_REPORT_REASONS = [
  'Inappropriate photos',
  'Inappropriate name or bio',
  'Fake profile',
  'Safety concern',
  'Other',
] as const;

export const moderationService = {
  blockUser: (userId: number): Promise<void> =>
    api.post(`/users/${userId}/block`).then(() => {}),

  unblockUser: (userId: number): Promise<void> =>
    api.delete(`/users/${userId}/block`).then(() => {}),

  getBlockedUsers: (): Promise<BlockedUser[]> =>
    api.get<BlockedUser[]>('/users/me/blocks').then(r => r.data),

  reportUser: (matchId: number, reason: string, message: string): Promise<void> =>
    api.post(`/matches/${matchId}/report`, { reason, message }).then(() => {}),

  /**
   * Reports a profile, with no match required.
   *
   * <p>The match-scoped report above needs both people to have swiped right,
   * which never happens for the profiles most worth reporting.
   */
  reportProfile: (userId: number, reason: string, message: string): Promise<void> =>
    api.post(`/users/${userId}/report`, { reason, message }).then(() => {}),

  unmatch: (matchId: number): Promise<void> =>
    api.delete(`/matches/${matchId}`).then(() => {}),
};
